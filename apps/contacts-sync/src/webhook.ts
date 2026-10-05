import { calendlyUri } from './model.ts';
import { enqueue } from './store.ts';
import type { Env } from './types.ts';

export async function validSignature(
  raw: string,
  header: string | null,
  secret: string,
  now = Date.now()
): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(',').map((part) => part.trim().split('='));
  const times = parts.filter(([key]) => key === 't');
  const timestamp = times[0]?.[1];
  if (
    times.length !== 1 ||
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 180
  )
    return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  for (const [version, hex] of parts) {
    if (version !== 'v1' || !hex || !/^[a-fA-F0-9]{64}$/.test(hex)) continue;
    const signature = Uint8Array.from(hex.match(/../g)!, (value) =>
      parseInt(value, 16)
    );
    if (
      await crypto.subtle.verify(
        'HMAC',
        key,
        signature,
        new TextEncoder().encode(`${timestamp}.${raw}`)
      )
    )
      return true;
  }
  return false;
}
export async function webhook(request: Request, env: Env): Promise<Response> {
  if (!env.CALENDLY_SIGNING_KEY)
    return new Response('Not configured', { status: 503 });
  if (Number(request.headers.get('content-length')) > 262144)
    return new Response('Too large', { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response('Missing body', { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 262144) {
      await reader.cancel();
      return new Response('Too large', { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
    bytes
  );
  if (
    !(await validSignature(
      raw,
      request.headers.get('Calendly-Webhook-Signature'),
      env.CALENDLY_SIGNING_KEY
    ))
  )
    return new Response('Invalid signature', { status: 401 });
  let uri: string;
  try {
    const body = JSON.parse(raw);
    if (!['invitee.created', 'invitee.canceled'].includes(body.event))
      return new Response(null, { status: 204 });
    uri = calendlyUri(body.payload?.uri, 'invitee');
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }
  // Persist only the resource locator. The job fetches authoritative, in-scope data.
  await enqueue(env.DB, 'invitee', uri, { uri }).run();
  return new Response(null, { status: 202 });
}
