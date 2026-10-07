import assert from 'node:assert/strict';
import { test } from 'node:test';
import { URL as NodeURL, fileURLToPath } from 'node:url';
import { CONTACTS_ACCOUNT_EMAIL, ALLOWED_EMAILS } from '../src/config.ts';
import { assertAccessSetup } from '../scripts/access-policy.mjs';

function fixture() {
  const expected = {
    hostname: 'osteo-backoffice.lvantours.workers.dev',
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
      include: ALLOWED_EMAILS.map((email) => ({ email: { email } })),
      require: [{ login_method: { id: expected.googleIdpId } }],
      exclude: [],
    },
  ];
  const identityProvider = { id: expected.googleIdpId, type: 'google' };
  return { application, policies, identityProvider, expected };
}

test('the two exact users and Google-only Access policy is accepted', () => {
  const f = fixture();
  assert.doesNotThrow(() =>
    assertAccessSetup(f.application, f.policies, f.identityProvider, f.expected)
  );
});

test('a broader email rule, OTP login, or a bypass policy blocks deployment', () => {
  for (const include of [
    [{ everyone: {} }],
    [{ email_domain: { domain: 'gmail.com' } }],
    [{ email: { email: CONTACTS_ACCOUNT_EMAIL } }, { everyone: {} }],
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
    { domain: 'osteo-backoffice.lvantours.workers.dev/public' },
    { aud: 'b'.repeat(64) },
    { allowed_idps: ['fictitious-google-idp', 'fictitious-otp-idp'] },
    { session_duration: '24h' },
    {
      self_hosted_domains: [
        'osteo-backoffice.lvantours.workers.dev',
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

test('Wrangler authenticates every asset and disables version URLs', async () => {
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

test('missing users, duplicate users and an additional user are rejected', () => {
  const f = fixture();
  for (const emails of [
    [ALLOWED_EMAILS[0]],
    [ALLOWED_EMAILS[0], ALLOWED_EMAILS[0]],
    [...ALLOWED_EMAILS, 'someone@example.test'],
  ]) {
    assert.throws(() =>
      assertAccessSetup(
        f.application,
        [
          {
            ...f.policies[0],
            include: emails.map((email) => ({ email: { email } })),
          },
        ],
        f.identityProvider,
        f.expected
      )
    );
  }
});
