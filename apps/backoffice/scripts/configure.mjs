import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { configurationValues, deploymentConfig } from './environments.mjs';

const environment = process.argv[2];
const parsed = ts.parseConfigFileTextToJson(
  'wrangler.jsonc',
  readFileSync('wrangler.jsonc', 'utf8')
);
if (parsed.error) throw new Error('Configuration Wrangler invalide.');
const config = deploymentConfig(
  parsed.config,
  environment,
  configurationValues(environment)
);
writeFileSync('wrangler.local.json', JSON.stringify(config, null, 2) + '\n', {
  mode: 0o600,
});
console.log(`Configuration ${environment} préparée dans wrangler.local.json.`);
