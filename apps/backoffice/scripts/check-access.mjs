import { readFileSync } from 'node:fs';
import { getAccessConfig } from '../src/config.ts';
import { assertAccessSetup } from './access-policy.mjs';
import {
  assertDeploymentConfig,
  configurationValues,
} from './environments.mjs';
import { cloudflareClient } from './cloudflare.mjs';

const environment = process.argv[2];
const values = configurationValues(environment);
const applicationId = values.ACCESS_APPLICATION_ID;
const googleIdpId = values.GOOGLE_IDP_ID;
if (
  ![applicationId, googleIdpId].every((value) =>
    /^[a-f0-9-]{36}$/i.test(value ?? '')
  )
)
  throw new Error('Configurer ACCESS_APPLICATION_ID et GOOGLE_IDP_ID.');
const config = JSON.parse(readFileSync('wrangler.local.json', 'utf8'));
const target = assertDeploymentConfig(config, environment);
if (config.account_id !== values.CLOUDFLARE_ACCOUNT_ID)
  throw new Error('Compte Cloudflare incohérent.');
const { origin, issuer, audience } = getAccessConfig(target.vars);
const api = cloudflareClient(
  values.CLOUDFLARE_ACCOUNT_ID,
  values.CLOUDFLARE_API_TOKEN
);
const organization = await api('access/organizations');
if (new URL(`https://${organization.auth_domain}`).origin !== issuer)
  throw new Error('Organisation Zero Trust incohérente.');
const application = await api(`access/apps/${applicationId}`);
const policies = await api(
  `access/apps/${applicationId}/policies?per_page=100`
);
const identityProvider = await api(`access/identity_providers/${googleIdpId}`);
assertAccessSetup(application, policies, identityProvider, {
  hostname: new URL(origin).hostname,
  audience,
  googleIdpId,
});
for (const binding of target.d1_databases) {
  const database = await api(`d1/database/${binding.database_id}`);
  if (database.name !== binding.database_name)
    throw new Error(
      'La base D1 ne correspond pas à cet environnement. Déploiement refusé.'
    );
}
console.log(`Access Google et isolation D1 vérifiés pour ${environment}.`);
