import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { getAccessConfig } from '../src/config.ts';

const environment = process.argv[2];
if (!['staging', 'production'].includes(environment)) {
  throw new Error('Préciser staging ou production.');
}
const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
const hostname = process.env['BACKOFFICE_HOSTNAME'];
const issuer = process.env['ACCESS_TEAM_DOMAIN'];
const audience = process.env['ACCESS_AUD'];
const databaseId = process.env['BACKOFFICE_D1_ID'];
if (
  !/^[a-f0-9]{32}$/i.test(accountId ?? '') ||
  !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(hostname ?? '')
) {
  throw new Error('Compte Cloudflare ou domaine manquant/invalide.');
}
const vars = {
  APP_ORIGIN: `https://${hostname}`,
  ACCESS_TEAM_DOMAIN: issuer,
  ACCESS_AUD: audience,
};
getAccessConfig(vars);
if (
  !/^[a-f0-9-]{36}$/i.test(databaseId ?? '') ||
  /^0+-0+-0+-0+-0+$/.test(databaseId)
)
  throw new Error(
    'Configurer BACKOFFICE_D1_ID avec la base dédiée à cet environnement.'
  );
const parsed = ts.parseConfigFileTextToJson(
  'wrangler.jsonc',
  readFileSync('wrangler.jsonc', 'utf8')
);
if (parsed.error) throw new Error('Configuration Wrangler invalide.');
const config = parsed.config;
config.account_id = accountId;
config.env[environment].vars = vars;
config.env[environment].d1_databases[0].database_id = databaseId;
const contactsWorker = process.env['CONTACTS_SYNC_WORKER_NAME'];
if (contactsWorker) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(contactsWorker))
    throw new Error('Nom du Worker contacts invalide.');
  config.env[environment].services[0].service = contactsWorker;
}
config.env[environment].routes = [{ pattern: hostname, custom_domain: true }];
writeFileSync('wrangler.local.json', JSON.stringify(config, null, 2) + '\n', {
  mode: 0o600,
});
console.log('Configuration du backoffice préparée dans wrangler.local.json.');
