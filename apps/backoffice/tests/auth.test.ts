import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { createAccessVerifier } from '../src/auth.ts';
import { CONTACTS_ACCOUNT_EMAIL, type Env } from '../src/config.ts';
import worker, { createBackofficeHandler } from '../src/index.ts';

const origin = 'https://backoffice.osteopathie-animale-bordeaux.fr';
const issuer = 'https://fictitious-tests.cloudflareaccess.com';
const audience = 'a'.repeat(64);
let privateKey: CryptoKey;
let keys: JWTVerifyGetKey;
let jwks: { keys: Awaited<ReturnType<typeof exportJWK>>[] };
before(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  jwks = {
    keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'RS256' }],
  };
  keys = createLocalJWKSet(jwks);
});

async function signedToken(overrides: JWTPayload = {}, remove: string[] = []) {
  const now = Math.floor(Date.now() / 1000);
  const claims: JWTPayload = {
    iss: issuer,
    aud: [audience],
    sub: 'fictitious-google-subject',
    email: CONTACTS_ACCOUNT_EMAIL,
    type: 'app',
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
  for (const key of remove) delete claims[key];
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .sign(privateKey);
}

function fixture() {
  let assetRequests = 0;
  const env = {
    APP_ORIGIN: origin,
    ACCESS_TEAM_DOMAIN: issuer,
    ACCESS_AUD: audience,
    ASSETS: {
      async fetch() {
        assetRequests += 1;
        return new Response('test asset', {
          headers: { 'Cache-Control': 'public, max-age=3600' },
        });
      },
    },
  } as unknown as Env;
  const handle = createBackofficeHandler(createAccessVerifier(() => keys));
  return { env, handle, assetsRead: () => assetRequests };
}

function request(path = '/', token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Cf-Access-Jwt-Assertion', token);
  return new Request(new URL(path, origin), { ...init, headers });
}

test('only the verified owner can load the home and session', async () => {
  const { env, handle } = fixture();
  const token = await signedToken();
  const home = await handle(request('/', token), env);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Bonjour Agathe/);
  const session = await handle(request('/api/session', token), env);
  assert.deepEqual(await session.json(), {
    user: { email: CONTACTS_ACCOUNT_EMAIL, name: 'Agathe Lescout' },
  });
});

test('Ludwig can authenticate on pages, assets and session with his own identity', async () => {
  const { env, handle } = fixture();
  const token = await signedToken({ email: 'vantoursludwig@gmail.com' });
  for (const path of ['/', '/contacts', '/assets/backoffice.css']) {
    assert.equal((await handle(request(path, token), env)).status, 200);
  }
  const session = await handle(request('/api/session', token), env);
  assert.deepEqual(await session.json(), {
    user: { email: 'vantoursludwig@gmail.com', name: 'Ludwig Vantours' },
  });
});

test('the production verifier fetches only the configured Access public keys', async () => {
  const { env } = fixture();
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), `${issuer}/cdn-cgi/access/certs`);
    requests += 1;
    return new Response(JSON.stringify(jwks), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const response = await worker.fetch(
      request('/api/session', await signedToken()),
      env
    );
    assert.equal(response.status, 200);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unauthenticated HTML, APIs, fonts and favicon never reach assets', async () => {
  const { env, handle, assetsRead } = fixture();
  for (const path of [
    '/',
    '/api/session',
    '/assets/backoffice.css',
    '/assets/fonts/lora.woff2',
    '/favicon.svg',
    '/contacts',
  ]) {
    assert.equal((await handle(request(path), env)).status, 401, path);
    assert.equal(
      (await handle(request(path, undefined, { method: 'HEAD' }), env)).status,
      401,
      path
    );
  }
  assert.equal(assetsRead(), 0);
});

test('untrusted email headers and cookies cannot authenticate a request', async () => {
  const { env, handle } = fixture();
  const response = await handle(
    request('/api/session', undefined, {
      headers: {
        'Cf-Access-Authenticated-User-Email': CONTACTS_ACCOUNT_EMAIL,
        Cookie: `CF_Authorization=${await signedToken()}`,
      },
    }),
    env
  );
  assert.equal(response.status, 401);
});

test('another Google email is forbidden on every route', async () => {
  const { env, handle, assetsRead } = fixture();
  const token = await signedToken({ email: 'someone@example.test' });
  for (const path of [
    '/',
    '/api/session',
    '/assets/backoffice.css',
    '/favicon.svg',
    '/logout',
  ]) {
    assert.equal((await handle(request(path, token), env)).status, 403);
  }
  assert.equal(assetsRead(), 0);
});

test('email aliases are not added to the allowlist', async () => {
  const { env, handle } = fixture();
  for (const email of [
    'agathe.lescout.osteo+admin@gmail.com',
    'vantoursludwig+admin@gmail.com',
    'vantours.ludwig@gmail.com',
    'agathelescoutosteo@gmail.com',
    'agathe.lescout.osteo@gmail.com.example.test',
  ]) {
    assert.equal(
      (await handle(request('/', await signedToken({ email })), env)).status,
      403
    );
  }
});

test('bad signatures and unsigned tokens are rejected', async () => {
  const { env, handle } = fixture();
  const pair = await generateKeyPair('RS256');
  const wrongSignature = await new SignJWT({ email: CONTACTS_ACCOUNT_EMAIL })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .sign(pair.privateKey);
  const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ email: CONTACTS_ACCOUNT_EMAIL })).toString('base64url')}.`;
  for (const token of [
    wrongSignature,
    unsigned,
    'malformed.token',
    'a'.repeat(20001),
  ]) {
    assert.equal(
      (await handle(request('/api/session', token), env)).status,
      401
    );
  }
});

test('issuer, audience, expiration, future and old sessions are enforced', async () => {
  const { env, handle } = fixture();
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [
    { iss: 'https://other-team.cloudflareaccess.com' },
    { aud: ['b'.repeat(64)] },
    { exp: now - 60 },
    { iat: now + 600 },
    { iat: now - 9 * 3600 },
    { nbf: now + 600 },
    { type: 'service' },
    { sub: '' },
  ]) {
    assert.equal(
      (await handle(request('/api/session', await signedToken(claims)), env))
        .status,
      401,
      JSON.stringify(claims)
    );
  }
});

test('required identity and lifetime claims cannot be omitted', async () => {
  const { env, handle } = fixture();
  for (const claim of ['email', 'sub', 'type', 'iat', 'exp', 'iss', 'aud']) {
    assert.equal(
      (await handle(request('/', await signedToken({}, [claim])), env)).status,
      401,
      claim
    );
  }
});

test('missing or invalid configuration fails closed', async () => {
  const { env, handle, assetsRead } = fixture();
  const token = await signedToken();
  for (const overrides of [
    { ACCESS_AUD: '' },
    { ACCESS_TEAM_DOMAIN: 'https://example.test' },
    { ACCESS_TEAM_DOMAIN: `${issuer}/another-path` },
    { ACCESS_TEAM_DOMAIN: 'http://fictitious-tests.cloudflareaccess.com' },
    { APP_ORIGIN: 'https://example.test/path' },
  ]) {
    assert.equal(
      (
        await handle(request('/assets/backoffice.css', token), {
          ...env,
          ...overrides,
        })
      ).status,
      503
    );
  }
  assert.equal(assetsRead(), 0);
});

test('a valid token cannot expose the Worker through an alternate hostname', async () => {
  const { env, handle, assetsRead } = fixture();
  const token = await signedToken();
  for (const host of [
    'https://osteo-backoffice.example.workers.dev',
    'https://preview.example.workers.dev',
  ]) {
    assert.equal(
      (
        await handle(
          new Request(`${host}/`, {
            headers: { 'Cf-Access-Jwt-Assertion': token },
          }),
          env
        )
      ).status,
      403
    );
  }
  assert.equal(assetsRead(), 0);
});

test('authenticated assets and all responses have private cache and frame rules', async () => {
  const { env, handle, assetsRead } = fixture();
  const token = await signedToken();
  for (const path of ['/', '/api/session', '/assets/backoffice.css']) {
    const response = await handle(request(path, token), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.match(
      response.headers.get('Content-Security-Policy') ?? '',
      /frame-ancestors 'none'/
    );
    assert.match(response.headers.get('X-Robots-Tag') ?? '', /noindex/);
  }
  assert.equal(assetsRead(), 1);
});

test('logout requires an authenticated same-origin POST and has no open redirect', async () => {
  const { env, handle } = fixture();
  const token = await signedToken();
  assert.equal((await handle(request('/logout', token), env)).status, 405);
  assert.equal(
    (await handle(request('/logout', token, { method: 'POST' }), env)).status,
    403
  );
  assert.equal(
    (
      await handle(
        request('/logout', token, {
          method: 'POST',
          headers: { Origin: 'https://example.test' },
        }),
        env
      )
    ).status,
    403
  );
  const response = await handle(
    request('/logout?returnTo=https://example.test', token, {
      method: 'POST',
      headers: { Origin: origin },
    }),
    env
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/cdn-cgi/access/logout');
});

test('JWKS failures never authorize and never echo upstream details', async () => {
  const { env } = fixture();
  const handle = createBackofficeHandler(
    createAccessVerifier(() => {
      throw new Error('sensitive-upstream-details');
    })
  );
  const response = await handle(
    request('/api/session', await signedToken()),
    env
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /sensitive-upstream/);
});

test('HEAD has no body and unconfigured Google contacts fail closed', async () => {
  const { env, handle } = fixture();
  const token = await signedToken();
  const head = await handle(request('/', token, { method: 'HEAD' }), env);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(
    (await handle(request('/api/contacts', token), env)).status,
    503
  );
  assert.equal(
    (await handle(request('/api/session', token, { method: 'POST' }), env))
      .status,
    405
  );
});
