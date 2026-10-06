import { readFileSync } from 'node:fs';
import { getAccessConfig } from '../src/config.ts';
import { assertAccessSetup } from './access-policy.mjs';

const environment = process.argv[2];
if (!['staging', 'production'].includes(environment)) {
  throw new Error('Préciser staging ou production.');
}
const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
const applicationId = process.env['ACCESS_APPLICATION_ID'];
const googleIdpId = process.env['GOOGLE_IDP_ID'];
const token = process.env['CLOUDFLARE_API_TOKEN'];
if (
  !token ||
  !/^[a-f0-9]{32}$/i.test(accountId ?? '') ||
  !/^[a-f0-9-]{36}$/i.test(applicationId ?? '') ||
  !/^[a-f0-9-]{36}$/i.test(googleIdpId ?? '')
) {
  throw new Error('Configurer les identifiants Cloudflare et le jeton privé.');
}
const config = JSON.parse(readFileSync('wrangler.local.json', 'utf8'));
const target = config.env[environment];
const { origin, issuer, audience } = getAccessConfig(target.vars);
const hostname = new URL(origin).hostname;
if (
  config.account_id !== accountId ||
  config.assets.run_worker_first !== true ||
  target.workers_dev !== false ||
  target.preview_urls !== false ||
  target.routes?.length !== 1 ||
  target.routes[0].pattern !== hostname ||
  target.routes[0].custom_domain !== true
) {
  throw new Error('Configuration de déploiement invalide.');
}
async function readCloudflare(path) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Vérification Cloudflare impossible (HTTP ${response.status}).`
    );
  }
  const body = await response.json();
  if (body.success !== true || !body.result) {
    throw new Error('Réponse Cloudflare invalide.');
  }
  return body.result;
}
// Read-only. Do not print upstream bodies (IdP configuration can contain secrets).
const organization = await readCloudflare('organizations');
if (new URL(`https://${organization.auth_domain}`).origin !== issuer) {
  throw new Error(
    'Le domaine Zero Trust ne correspond pas au compte Cloudflare.'
  );
}
const application = await readCloudflare(`apps/${applicationId}`);
const policies = await readCloudflare(
  `apps/${applicationId}/policies?per_page=100`
);
const identityProvider = await readCloudflare(
  `identity_providers/${googleIdpId}`
);
assertAccessSetup(application, policies, identityProvider, {
  hostname,
  audience,
  googleIdpId,
});
console.log('Access vérifié : Google uniquement, compte d’Agathe uniquement.');
