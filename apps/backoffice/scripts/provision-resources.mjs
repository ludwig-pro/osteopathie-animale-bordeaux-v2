import { ALLOWED_EMAILS } from '../src/config.ts';
import { assertAccessSetup } from './access-policy.mjs';
import { environmentProfile } from './environments.mjs';

export async function provisionResources(environment, api, googleIdpId) {
  const profile = environmentProfile(environment);
  const organization = await api('access/organizations');
  if (
    !/^[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/.test(
      organization.auth_domain ?? ''
    )
  )
    throw new Error('Configurer d’abord l’organisation Zero Trust.');
  const provider = await api(`access/identity_providers/${googleIdpId}`);
  if (provider.type !== 'google' || provider.id !== googleIdpId)
    throw new Error('Configurer un fournisseur Google dans Zero Trust.');
  // Paginate instead of assuming the first page contains all applications/databases.
  async function list(path) {
    const items = [];
    for (let page = 1; page <= 100; page++) {
      const batch = await api(`${path}?per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new Error('Liste Cloudflare invalide.');
      items.push(...batch);
      if (batch.length < 100) return items;
    }
    throw new Error(
      'Trop de ressources ; configurer les identifiants explicitement.'
    );
  }
  const apps = await list('access/apps');
  const matches = apps.filter((app) => app.domain === profile.hostname);
  if (matches.length > 1)
    throw new Error('Plusieurs applications Access protègent ce domaine.');
  let application = matches[0];
  if (!application)
    application = await api('access/apps', 'POST', {
      name: profile.name,
      domain: profile.hostname,
      type: 'self_hosted',
      session_duration: '8h',
      allowed_idps: [googleIdpId],
      auto_redirect_to_identity: true,
    });
  const expectedPolicy = {
    decision: 'allow',
    include: ALLOWED_EMAILS.map((email) => ({ email: { email } })),
    require: [{ login_method: { id: googleIdpId } }],
    exclude: [],
  };
  assertAccessSetup(application, [expectedPolicy], provider, {
    hostname: profile.hostname,
    audience: application.aud,
    googleIdpId,
  });
  let policies = await api(
    `access/apps/${application.id}/policies?per_page=100`
  );
  if (!policies.length && application.name === profile.name) {
    await api(`access/apps/${application.id}/policies`, 'POST', {
      name: 'Agathe et Ludwig uniquement',
      decision: 'allow',
      precedence: 1,
      include: ALLOWED_EMAILS.map((email) => ({ email: { email } })),
      require: [{ login_method: { id: googleIdpId } }],
      exclude: [],
    });
    policies = await api(`access/apps/${application.id}/policies?per_page=100`);
  }
  assertAccessSetup(application, policies, provider, {
    hostname: profile.hostname,
    audience: application.aud,
    googleIdpId,
  });
  const databases = await list('d1/database');
  let database = databases.find((item) => item.name === profile.name);
  if (!database)
    database = await api('d1/database', 'POST', { name: profile.name });
  const previewDatabase =
    environment === 'production'
      ? databases.find((item) => item.name === 'osteo-backoffice-preview')
      : null;
  if (environment === 'production' && !previewDatabase)
    throw new Error('Préparer la preview avant la production.');
  return {
    BACKOFFICE_HOSTNAME: profile.hostname,
    ACCESS_TEAM_DOMAIN: `https://${organization.auth_domain}`,
    ACCESS_AUD: application.aud,
    ACCESS_APPLICATION_ID: application.id,
    GOOGLE_IDP_ID: googleIdpId,
    BACKOFFICE_D1_ID: database.uuid,
    ...(previewDatabase && { PREVIEW_D1_ID: previewDatabase.uuid }),
  };
}
