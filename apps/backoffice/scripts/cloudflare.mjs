export function cloudflareClient(accountId, token, fetcher = fetch) {
  if (!/^[a-f0-9]{32}$/i.test(accountId ?? '') || !token)
    throw new Error(
      'Configurer CLOUDFLARE_ACCOUNT_ID et le secret CLOUDFLARE_API_TOKEN.'
    );
  return async (path, method = 'GET', input) => {
    const response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(input !== undefined && { body: JSON.stringify(input) }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok)
      throw new Error(
        `Opération Cloudflare impossible (HTTP ${response.status}). Vérifier les droits du jeton et Zero Trust.`
      );
    const body = await response.json();
    if (body.success !== true || body.result == null)
      throw new Error('Réponse Cloudflare invalide.');
    return body.result;
  };
}
