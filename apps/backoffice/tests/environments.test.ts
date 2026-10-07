import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import ts from 'typescript';
import {
  deploymentConfig,
  assertDeploymentConfig,
} from '../scripts/environments.mjs';
import { provisionResources } from '../scripts/provision-resources.mjs';
import { ALLOWED_EMAILS } from '../src/config.ts';

const template = ts.parseConfigFileTextToJson(
  'wrangler.jsonc',
  readFileSync(new NodeURL('../wrangler.jsonc', import.meta.url), 'utf8')
).config;
const values = {
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  ACCESS_TEAM_DOMAIN: 'https://fictitious-tests.cloudflareaccess.com',
  ACCESS_AUD: 'b'.repeat(64),
  BACKOFFICE_D1_ID: 'aaaaaaaa-1111-2222-3333-444444444444',
  PREVIEW_D1_ID: 'bbbbbbbb-1111-2222-3333-444444444444',
};

test('preview and production use separate entrypoints, domains, bindings and databases', () => {
  const preview = deploymentConfig(template, 'preview', values);
  assert.deepEqual(Object.keys(preview.env), ['preview']);
  assert.equal(preview.env.preview.main, 'src/preview.ts');
  assert.equal(preview.env.preview.services.length, 0);
  assert.equal(preview.env.preview.d1_databases.length, 1);
  const production = deploymentConfig(template, 'production', values);
  assert.equal(
    production.env.production.services[0].service,
    'osteo-contacts-sync'
  );
  assert.equal(
    production.env.production.d1_databases[1].database_id,
    values.PREVIEW_D1_ID
  );
  assert.throws(() => deploymentConfig(template, 'staging', values));
  assert.throws(() =>
    deploymentConfig(template, 'preview', {
      ...values,
      BACKOFFICE_HOSTNAME: 'admin.osteopathie-animale-bordeaux.fr',
    })
  );
  assert.throws(() =>
    deploymentConfig(template, 'production', {
      ...values,
      PREVIEW_D1_ID: values.BACKOFFICE_D1_ID,
    })
  );
  assert.throws(() =>
    deploymentConfig(template, 'preview', {
      ...values,
      CONTACTS_SYNC_WORKER_NAME: 'osteo-contacts-sync',
    })
  );
  preview.env.preview.services.push(production.env.production.services[0]);
  assert.throws(() => assertDeploymentConfig(preview, 'preview'));
  assert.equal(
    template.env.preview.d1_databases[0].database_id,
    '00000000-0000-0000-0000-000000000001'
  );
});

test('provisioning is idempotent and creates only a restricted Google Access application', async () => {
  const idp = 'dddddddd-1111-2222-3333-444444444444';
  const app = {
    id: 'cccccccc-1111-2222-3333-444444444444',
    aud: 'c'.repeat(64),
  } as Record<string, unknown>;
  let exists = false;
  const policies: unknown[] = [],
    databases: Record<string, unknown>[] = [],
    writes: string[] = [];
  const api = async (
    path: string,
    method = 'GET',
    input?: Record<string, unknown>
  ) => {
    if (method !== 'GET') writes.push(path);
    if (path === 'access/organizations')
      return { auth_domain: 'fictitious-tests.cloudflareaccess.com' };
    if (path === `access/identity_providers/${idp}`)
      return { id: idp, type: 'google' };
    if (path.startsWith('access/apps?')) return exists ? [app] : [];
    if (path === 'access/apps' && method === 'POST') {
      Object.assign(app, input);
      exists = true;
      return app;
    }
    if (path.startsWith(`access/apps/${app.id}/policies`)) {
      if (method === 'POST') {
        policies.push(input);
        return input;
      }
      return policies;
    }
    if (path.startsWith('d1/database?')) return databases;
    if (path === 'd1/database' && method === 'POST') {
      const db = { uuid: values.BACKOFFICE_D1_ID, ...input };
      databases.push(db);
      return db;
    }
    throw new Error(`Unexpected path: ${path}`);
  };
  const first = await provisionResources('preview', api, idp);
  const before = writes.length;
  assert.deepEqual(await provisionResources('preview', api, idp), first);
  assert.equal(writes.length, before);
  assert.deepEqual(
    (policies[0] as { include: unknown }).include,
    ALLOWED_EMAILS.map((email) => ({ email: { email } }))
  );
  assert.equal(
    first.BACKOFFICE_HOSTNAME,
    'admin-preview.osteopathie-animale-bordeaux.fr'
  );
  Object.assign(app, { allowed_idps: [idp, 'another-provider'] });
  await assert.rejects(provisionResources('preview', api, idp));
  assert.equal(writes.length, before);
});

test('public alternative routes and version URLs cannot be enabled', () => {
  for (const change of [
    { routes: [{ pattern: 'example.test', custom_domain: true }] },
    { preview_urls: true },
    { workers_dev: true },
  ]) {
    const config = deploymentConfig(template, 'preview', values);
    Object.assign(config.env.preview, change);
    assert.throws(() => assertDeploymentConfig(config, 'preview'));
  }
});
