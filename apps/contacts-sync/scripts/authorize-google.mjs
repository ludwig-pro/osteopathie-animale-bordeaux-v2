import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { options, uploadSecrets } from './common.mjs';

let server;
try {
  const opts = options();
  const calendarScope =
    'https://www.googleapis.com/auth/calendar.events.owned.readonly';
  const calendar = opts.argv.includes('--calendar');
  if (opts.local)
    throw new Error(
      'Utiliser un environnement distant pour enregistrer le jeton comme secret.'
    );
  const credentialsPath = opts.value('--credentials');
  if (!credentialsPath)
    throw new Error(
      'Indiquer --credentials /chemin/vers/client-oauth.json (type Application de bureau).'
    );
  const credentials = JSON.parse(
    readFileSync(credentialsPath, 'utf8')
  ).installed;
  if (!credentials?.client_id)
    throw new Error(
      'Un client OAuth de type Application de bureau est requis.'
    );
  const config = JSON.parse(readFileSync(opts.config, 'utf8'));
  const expected =
    config.env[
      opts.environment
    ].vars.EXPECTED_GOOGLE_EMAIL.trim().toLowerCase();
  const verifier = randomBytes(32).toString('base64url'),
    state = randomBytes(32).toString('base64url');
  let resolveCode, rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/callback') {
      res.writeHead(404).end();
      return;
    }
    if (url.searchParams.get('state') !== state) {
      res.writeHead(400).end('État invalide.');
      return;
    }
    if (!url.searchParams.get('code')) {
      res.writeHead(400).end('Autorisation refusée.');
      rejectCode(new Error('Autorisation Google refusée.'));
      return;
    }
    res
      .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('Autorisation reçue. Revenir au terminal pour la confirmation.');
    resolveCode(url.searchParams.get('code'));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}/callback`;
  const params = new URLSearchParams({
    client_id: credentials.client_id,
    redirect_uri: redirect,
    response_type: 'code',
    scope: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/contacts',
      ...(calendar ? [calendarScope] : []),
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    login_hint: expected,
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  const opener = spawn(
    process.platform === 'darwin' ? 'open' : 'xdg-open',
    [url],
    { stdio: 'ignore' }
  );
  opener.on('error', () =>
    rejectCode(new Error('Impossible d’ouvrir le navigateur système.'))
  );
  const timer = setTimeout(
    () => rejectCode(new Error('Autorisation expirée après cinq minutes.')),
    300000
  );
  let code;
  try {
    code = await codePromise;
  } finally {
    clearTimeout(timer);
    server.close();
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret ?? '',
      code,
      code_verifier: verifier,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Échange OAuth refusé.');
  const tokens = await response.json();
  if (!tokens.refresh_token)
    throw new Error('Google n’a pas fourni de jeton de renouvellement.');
  if (
    calendar &&
    !['https://www.googleapis.com/auth/contacts', calendarScope].every(
      (scope) => tokens.scope?.split(' ').includes(scope)
    )
  )
    throw new Error(
      'Les accès Contacts et événements Google Calendar en lecture seule sont requis.'
    );
  const identityResponse = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!identityResponse.ok)
    throw new Error('Impossible de vérifier le compte Google.');
  const identity = await identityResponse.json();
  if (
    !identity.email_verified ||
    identity.email?.toLowerCase() !== expected ||
    !identity.sub
  )
    throw new Error(
      'Le compte Google autorisé ne correspond pas au destinataire configuré.'
    );
  if (
    tokens.refresh_token_expires_in &&
    tokens.refresh_token_expires_in <= 604800
  )
    throw new Error(
      'Autorisation courte détectée. Vérifier le statut En production puis réautoriser.'
    );
  uploadSecrets(
    {
      GOOGLE_OAUTH: JSON.stringify({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret ?? '',
        refresh_token: tokens.refresh_token,
        sub: identity.sub,
      }),
    },
    opts
  );
  console.log(
    'Compte vérifié. Autorisation enregistrée directement dans les secrets Cloudflare.'
  );
} catch {
  console.error(
    'Autorisation non terminée. Vérifier le client de bureau, le statut OAuth, le compte choisi et les droits Cloudflare. Aucun jeton affiché.'
  );
  process.exitCode = 1;
} finally {
  server?.close();
}
