// Explicit operator action. Uses the existing Wrangler login, never a browser session.
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { configurationValues, deploymentConfig } from './environments.mjs';
import { copyContactsToPreview } from '../src/preview-copy.ts';

if (process.argv.length > 2)
  throw new Error('Usage : yarn workspace @osteo/backoffice preview:copy');
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const parsed = ts.parseConfigFileTextToJson(
  'wrangler.jsonc',
  await readFile('wrangler.jsonc', 'utf8')
);
if (parsed.error) throw new Error('Configuration Wrangler invalide.');
const production = deploymentConfig(
  parsed.config,
  'production',
  configurationValues('production')
);
const preview = deploymentConfig(
  parsed.config,
  'preview',
  configurationValues('preview')
);
const source = production.env.production;
const target = preview.env.preview;
if (
  production.account_id !== preview.account_id ||
  source.d1_databases[1].database_id !== target.d1_databases[0].database_id ||
  source.r2_buckets[1].bucket_name !== target.r2_buckets[0].bucket_name
)
  throw new Error(
    'Les configurations production et preview ne correspondent pas.'
  );

process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_WRITE_LOGS = 'false';
process.env.WRANGLER_LOG = 'error';
const { getPlatformProxy } = await import('wrangler');
const directory = await mkdtemp(join(tmpdir(), 'osteo-preview-copy-'));
let platform;
try {
  const configPath = join(directory, 'wrangler.json');
  await writeFile(
    configPath,
    JSON.stringify({
      name: 'osteo-backoffice-copy',
      account_id: production.account_id,
      compatibility_date: production.compatibility_date,
      workers_dev: false,
      preview_urls: false,
      vars: {
        APP_ENVIRONMENT: 'production',
        APP_ORIGIN: source.vars.APP_ORIGIN,
      },
      d1_databases: source.d1_databases.map(
        ({ migrations_dir, ...binding }) => ({
          ...binding,
          remote: true,
        })
      ),
      r2_buckets: source.r2_buckets.map((binding) => ({
        ...binding,
        remote: true,
      })),
      services: source.services.map((binding) => ({
        ...binding,
        remote: true,
      })),
    }),
    { mode: 0o600 }
  );
  platform = await getPlatformProxy({
    configPath,
    persist: false,
    envFiles: [],
    remoteBindings: true,
  });
  const deadline = Date.now() + 15 * 60 * 1000;
  let result = await copyContactsToPreview({ action: 'start' }, platform.env);
  let progress;
  while (result.next) {
    if (Date.now() >= deadline) throw new Error('copy_time_limit');
    result = await copyContactsToPreview(
      { action: 'continue', id: result.id },
      platform.env
    );
    const state = await platform.env.PREVIEW_DB.prepare(
      'SELECT phase FROM preview_state WHERE id=1'
    ).first();
    const current = `${state.phase} : ${result.copied} contacts`;
    if (current !== progress) {
      console.log(current);
      progress = current;
    }
  }
  console.log(`Copie complète activée en preview : ${result.copied} contacts.`);
} catch {
  // Upstream errors may contain private data. Only report the operation state.
  console.error(
    'Copie interrompue. La dernière copie complète reste active. Vérifier la session Wrangler et les services, puis relancer la même commande pour reprendre.'
  );
  process.exitCode = 1;
} finally {
  await platform?.dispose();
  await rm(directory, { recursive: true, force: true });
}
