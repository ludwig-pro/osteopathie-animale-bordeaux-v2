import assert from 'node:assert/strict';
import { test } from 'node:test';
import { URL as NodeURL, fileURLToPath } from 'node:url';
import { ALLOWED_EMAIL } from '../src/config.ts';
import { assertAccessSetup } from '../scripts/access-policy.mjs';

function fixture() {
  const expected = {
    hostname: 'backoffice.osteopathie-animale-bordeaux.fr',
    audience: 'a'.repeat(64),
    googleIdpId: 'fictitious-google-idp',
  };
  const application = {
    type: 'self_hosted',
    domain: expected.hostname,
    aud: expected.audience,
    session_duration: '8h',
    allowed_idps: [expected.googleIdpId],
  };
  const policies = [
    {
      decision: 'allow',
      include: [{ email: { email: ALLOWED_EMAIL } }],
      require: [{ login_method: { id: expected.googleIdpId } }],
      exclude: [],
    },
  ];
  const identityProvider = { id: expected.googleIdpId, type: 'google' };
  return { application, policies, identityProvider, expected };
}

test('the exact owner and Google-only Access policy is accepted', () => {
  const f = fixture();
  assert.doesNotThrow(() =>
    assertAccessSetup(f.application, f.policies, f.identityProvider, f.expected)
  );
});

test('a broader email rule, OTP login, or a bypass policy blocks deployment', () => {
  for (const include of [
    [{ everyone: {} }],
    [{ email_domain: { domain: 'gmail.com' } }],
    [{ email: { email: ALLOWED_EMAIL } }, { everyone: {} }],
  ]) {
    const f = fixture();
    assert.throws(() =>
      assertAccessSetup(
        f.application,
        [{ ...f.policies[0], include }],
        f.identityProvider,
        f.expected
      )
    );
  }
  for (const decision of ['bypass', 'non_identity']) {
    const f = fixture();
    assert.throws(() =>
      assertAccessSetup(
        f.application,
        [...f.policies, { decision }],
        f.identityProvider,
        f.expected
      )
    );
  }
  for (const require of [
    [],
    [{ login_method: { id: 'fictitious-otp-idp' } }],
  ]) {
    const f = fixture();
    assert.throws(() =>
      assertAccessSetup(
        f.application,
        [{ ...f.policies[0], require }],
        f.identityProvider,
        f.expected
      )
    );
  }
});

test('another hostname, issuer application or identity provider is rejected', () => {
  for (const changes of [
    { domain: 'backoffice.osteopathie-animale-bordeaux.fr/public' },
    { aud: 'b'.repeat(64) },
    { allowed_idps: ['fictitious-google-idp', 'fictitious-otp-idp'] },
    { session_duration: '24h' },
    {
      self_hosted_domains: [
        'backoffice.osteopathie-animale-bordeaux.fr',
        'example.test',
      ],
    },
    { destinations: [{ type: 'public', uri: 'example.test' }] },
  ]) {
    const f = fixture();
    assert.throws(() =>
      assertAccessSetup(
        { ...f.application, ...changes },
        f.policies,
        f.identityProvider,
        f.expected
      )
    );
  }
  const f = fixture();
  assert.throws(() =>
    assertAccessSetup(
      f.application,
      f.policies,
      { ...f.identityProvider, type: 'onetimepin' },
      f.expected
    )
  );
});

test('Wrangler protects every asset and disables public alternate URLs', async () => {
  const { readFile } = await import('node:fs/promises');
  const ts = await import('typescript');
  const source = await readFile(
    fileURLToPath(new NodeURL('../wrangler.jsonc', import.meta.url)),
    'utf8'
  );
  const { config } = ts.default.parseConfigFileTextToJson(
    'wrangler.jsonc',
    source
  );
  assert.equal(config.assets.run_worker_first, true);
  for (const environment of [
    config,
    config.env.preview,
    config.env.production,
  ]) {
    assert.equal(environment.workers_dev, false);
    assert.equal(environment.preview_urls, false);
  }
});
