import { mkdirSync, writeFileSync } from 'node:fs';
import { configurationValues } from './environments.mjs';
import { cloudflareClient } from './cloudflare.mjs';
import { provisionResources } from './provision-resources.mjs';

const environment = process.argv[2];
const values = configurationValues(environment);
if (!/^[a-f0-9-]{36}$/i.test(values.GOOGLE_IDP_ID ?? ''))
  throw new Error(
    'Configurer GOOGLE_IDP_ID après la connexion Google dans Zero Trust.'
  );
const api = cloudflareClient(
  values.CLOUDFLARE_ACCOUNT_ID,
  values.CLOUDFLARE_API_TOKEN
);
const settings = await provisionResources(
  environment,
  api,
  values.GOOGLE_IDP_ID
);
mkdirSync('.credentials', { recursive: true, mode: 0o700 });
writeFileSync(
  `.credentials/backoffice-${environment}.json`,
  JSON.stringify(
    { CLOUDFLARE_ACCOUNT_ID: values.CLOUDFLARE_ACCOUNT_ID, ...settings },
    null,
    2
  ) + '\n',
  { mode: 0o600 }
);
console.log(
  `Application Access et base D1 ${environment} préparées. Configuration privée enregistrée ; aucun Worker déployé.`
);
