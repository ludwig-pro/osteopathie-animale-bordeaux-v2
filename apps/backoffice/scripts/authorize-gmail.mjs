// Separate desktop OAuth grant: Gmail read-only, never Gmail send/modify.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { CONTACTS_ACCOUNT_EMAIL } from '../src/config.ts';
import { GMAIL_READONLY } from './gmail-readonly.mjs';

let server;
try {
  const { values } = parseArgs({
    options: {
      credentials: { type: 'string' },
      output: {
        type: 'string',
        default: 'apps/backoffice/.credentials/gmail-readonly.json',
      },
    },
  });
  if (!values.credentials) throw new Error('desktop_client_required');
  const client = JSON.parse(readFileSync(values.credentials, 'utf8')).installed;
  if (
    !client?.client_id ||
    !client.client_id.endsWith('.apps.googleusercontent.com')
  )
    throw new Error('desktop_client_required');
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(32).toString('base64url');
  let acceptCode, rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    acceptCode = resolve;
    rejectCode = reject;
  });
  server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (
      request.method !== 'GET' ||
      url.pathname !== '/callback' ||
      url.searchParams.get('state') !== state
    ) {
      response.writeHead(400).end('Requête OAuth invalide.');
      return;
    }
    const code = url.searchParams.get('code');
    response
      .writeHead(code ? 200 : 400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      .end(
        code
          ? 'Autorisation reçue. Retournez dans Codex pour la vérification du compte.'
          : 'Autorisation refusée.'
      );
    if (code) acceptCode(code);
    else rejectCode(new Error('authorization_denied'));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}/callback`;
  const params = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirect,
    response_type: 'code',
    scope: GMAIL_READONLY,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    login_hint: CONTACTS_ACCOUNT_EMAIL,
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  // Open this public OAuth URL in the browser. No tokens or client secret in it.
  console.log(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  const timer = setTimeout(
    () => rejectCode(new Error('authorization_timeout')),
    600000
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
      client_id: client.client_id,
      client_secret: client.client_secret ?? '',
      code,
      code_verifier: verifier,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('token_exchange_failed');
  const token = await response.json();
  // A dedicated client avoids accidentally retaining an older write grant.
  const scopes = new Set((token.scope ?? '').split(' '));
  if (!token.refresh_token || scopes.size !== 1 || !scopes.has(GMAIL_READONLY))
    throw new Error('readonly_scope_required');
  const profileResponse = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!profileResponse.ok) throw new Error('gmail_api_unavailable');
  const profile = await profileResponse.json();
  if (profile.emailAddress?.toLowerCase() !== CONTACTS_ACCOUNT_EMAIL)
    throw new Error('wrong_gmail_account');
  const output = resolve(values.output);
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  // No accidental replacement of an existing grant. Choose a new path to renew.
  writeFileSync(
    output,
    JSON.stringify({
      client_id: client.client_id,
      client_secret: client.client_secret ?? '',
      refresh_token: token.refresh_token,
      account: CONTACTS_ACCOUNT_EMAIL,
      scope: GMAIL_READONLY,
    }),
    { flag: 'wx', mode: 0o600 }
  );
  console.log(
    'Compte Agathe vérifié. Accès Gmail en lecture seule enregistré localement.'
  );
} catch (error) {
  const codes = [
    'desktop_client_required',
    'authorization_denied',
    'authorization_timeout',
    'readonly_scope_required',
    'gmail_api_unavailable',
    'wrong_gmail_account',
  ];
  console.error(
    codes.includes(error.message)
      ? error.message
      : 'Autorisation Gmail non terminée. Aucun secret affiché.'
  );
  process.exitCode = 1;
} finally {
  server?.close();
}
