import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { options, uploadSecrets } from './common.mjs';

try {
  const opts = options();
  const endpoint = opts.value('--url');
  if (!endpoint || !opts.argv.includes('--confirm-subscription'))
    throw new Error(
      'Indiquer --url https://worker/webhooks/calendly et --confirm-subscription.'
    );
  const url = new URL(endpoint);
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/webhooks/calendly' ||
    url.search ||
    url.username ||
    url.password
  )
    throw new Error('Endpoint HTTPS invalide.');
  const vars = JSON.parse(readFileSync(opts.config, 'utf8')).env[
    opts.environment
  ].vars;
  // Pipe from a password manager or a hidden shell prompt. Never pass a token as an argument.
  if (process.stdin.isTTY)
    throw new Error(
      'Fournir le jeton Calendly sur stdin, sans le saisir dans la commande.'
    );
  let token = '';
  for await (const chunk of process.stdin) {
    token += chunk;
    if (token.length > 20000) throw new Error('Entrée trop longue.');
  }
  token = token.trim();
  if (!token) throw new Error('Jeton absent.');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const get = async (path) => {
    const res = await fetch(`https://api.calendly.com${path}`, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error('Lecture Calendly refusée.');
    return res.json();
  };
  const { resource: user } = await get('/users/me');
  if (
    user.uri !== vars.CALENDLY_USER_URI ||
    user.current_organization !== vars.CALENDLY_ORGANIZATION_URI
  )
    throw new Error('Compte Calendly différent de la configuration.');
  const query = new URLSearchParams({
    organization: user.current_organization,
    user: user.uri,
    scope: 'user',
    count: '100',
  });
  let next;
  do {
    if (next) query.set('page_token', next);
    const page = await get(`/webhook_subscriptions?${query}`);
    if (page.collection.some((w) => w.callback_url === url.href))
      throw new Error(
        'Un abonnement existe déjà pour cet endpoint. Vérifier son état et sa clé sans en créer un autre.'
      );
    next = page.pagination?.next_page_token;
  } while (next);
  const key = randomBytes(32).toString('hex');
  uploadSecrets({ CALENDLY_TOKEN: token, CALENDLY_SIGNING_KEY: key }, opts);
  const result = await fetch('https://api.calendly.com/webhook_subscriptions', {
    method: 'POST',
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      url: url.href,
      events: ['invitee.created', 'invitee.canceled'],
      organization: user.current_organization,
      user: user.uri,
      scope: 'user',
      signing_key: key,
    }),
  });
  if (!result.ok)
    throw new Error(
      'Création non confirmée. Les secrets sont enregistrés ; vérifier les abonnements avant toute reprise.'
    );
  console.log(
    'Abonnement personnel créé. Secrets transmis directement à Cloudflare.'
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
