import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
const env = process.argv[2];
if (!['staging', 'production'].includes(env))
  throw new Error('Préciser staging ou production.');
const required = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CONTACTS_SYNC_D1_ID',
  'EXPECTED_GOOGLE_EMAIL',
  'CALENDLY_USER_URI',
  'CALENDLY_ORGANIZATION_URI',
];
if (required.some((k) => !process.env[k]))
  throw new Error(
    'Configuration incomplète. Consulter le guide d’installation.'
  );
const source = existsSync('wrangler.local.json')
  ? 'wrangler.local.json'
  : 'wrangler.jsonc';
const parsed = ts.parseConfigFileTextToJson(
  source,
  readFileSync(source, 'utf8')
);
if (parsed.error) throw new Error('Configuration Wrangler invalide.');
const config = parsed.config;
config.account_id = process.env.CLOUDFLARE_ACCOUNT_ID;
config.env[env].d1_databases[0].database_id = process.env.CONTACTS_SYNC_D1_ID;
for (const key of required.slice(2))
  config.env[env].vars[key] = process.env[key];
writeFileSync('wrangler.local.json', JSON.stringify(config, null, 2) + '\n', {
  mode: 0o600,
});
console.log('Configuration privée écrite dans wrangler.local.json.');
