import { CONTACTS_ACCOUNT_EMAIL } from '../src/config.ts';

export const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';

// Credentials stay local, are never logged, and are independent of Contacts OAuth.
export function gmailClient(
  credentials,
  fetcher = fetch,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
) {
  let accessToken;
  let expiresAt = 0;
  async function token() {
    if (accessToken && Date.now() < expiresAt) return accessToken;
    const response = await fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret ?? '',
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('gmail_reauthorization_required');
    const result = await response.json();
    if (!result.access_token) throw new Error('gmail_reauthorization_required');
    accessToken = result.access_token;
    expiresAt =
      Date.now() + Math.max(0, Number(result.expires_in ?? 3600) - 60) * 1000;
    return accessToken;
  }
  async function get(path) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const response = await fetcher(
        `https://gmail.googleapis.com/gmail/v1/users/me/${path}`,
        {
          headers: { Authorization: `Bearer ${await token()}` },
          signal: AbortSignal.timeout(60000),
        }
      );
      if (response.ok) return response.json();
      if (response.status === 401 && attempt === 0) {
        expiresAt = 0;
        continue;
      }
      const error = await response.json().catch(() => ({}));
      const quota =
        response.status === 403 &&
        error.error?.errors?.some(({ reason }) =>
          ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason)
        );
      if (
        (quota || response.status === 429 || response.status >= 500) &&
        attempt < 7
      ) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        await wait(
          Math.min(
            60000,
            Math.max(
              Number.isFinite(retryAfter) ? retryAfter * 1000 : 0,
              5000 * 2 ** attempt
            )
          )
        );
        continue;
      }
      throw new Error(`gmail_read_failed_${response.status}`);
    }
    throw new Error('gmail_read_failed');
  }
  return {
    async *messages({ seenIds = new Set() } = {}) {
      const profile = await get('profile');
      if (profile.emailAddress?.toLowerCase() !== CONTACTS_ACCOUNT_EMAIL)
        throw new Error('wrong_gmail_account');
      let cursor;
      const seen = new Set();
      do {
        const query = new URLSearchParams({
          q: 'in:sent has:attachment filename:pdf',
          maxResults: '100',
        });
        if (cursor) query.set('pageToken', cursor);
        const page = await get(`messages?${query}`);
        const messages = (page.messages ?? []).filter(
          ({ id }) => !seenIds.has(id)
        );
        // Bound both Gmail request concurrency and in-memory MIME payloads.
        for (let offset = 0; offset < messages.length; offset += 4) {
          const batch = await Promise.allSettled(
            messages
              .slice(offset, offset + 4)
              .map(({ id }) =>
                get(`messages/${encodeURIComponent(id)}?format=raw`)
              )
          );
          for (const [index, result] of batch.entries()) {
            if (result.status === 'rejected') throw result.reason;
            const message = result.value;
            if (
              !message.labelIds?.includes('SENT') ||
              typeof message.raw !== 'string'
            )
              continue;
            yield {
              raw: Buffer.from(message.raw, 'base64url'),
              gmailId: messages[offset + index].id,
            };
          }
          // Leave headroom under Gmail's 6,000 units/minute/user quota
          // (messages.get costs 20 units). Retries still handle shared usage.
          if (offset + 4 < messages.length) await wait(1000);
        }
        cursor = page.nextPageToken;
        if (cursor && seen.has(cursor))
          throw new Error('gmail_repeated_cursor');
        seen.add(cursor);
      } while (cursor);
    },
  };
}
