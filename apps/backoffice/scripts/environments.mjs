import { existsSync, readFileSync } from 'node:fs';
import { getAccessConfig } from '../src/config.ts';

const profiles = {
  preview: {
    name: 'osteo-backoffice-preview',
    hostname: 'admin-preview.osteopathie-animale-bordeaux.fr',
    main: 'src/preview.ts',
  },
  production: {
    name: 'osteo-backoffice',
    hostname: 'admin.osteopathie-animale-bordeaux.fr',
    main: 'src/index.ts',
  },
};
export function environmentProfile(environment) {
  if (!Object.hasOwn(profiles, environment))
    throw new Error('Préciser preview ou production.');
  return profiles[environment];
}
function deploymentHostname(profile, hostname = profile.hostname) {
  if (
    hostname !== profile.hostname &&
    !new RegExp(`^${profile.name}\\.[a-z0-9][a-z0-9-]*\\.workers\\.dev$`).test(
      hostname
    )
  )
    throw new Error('Le domaine ne correspond pas à cet environnement.');
  return hostname;
}
export function configurationValues(environment) {
  environmentProfile(environment);
  const path = `.credentials/backoffice-${environment}.json`;
  const stored = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  return { ...stored, ...process.env };
}
export function deploymentConfig(template, environment, values) {
  const profile = environmentProfile(environment);
  const accountId = values.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = values.BACKOFFICE_D1_ID;
  if (!/^[a-f0-9]{32}$/i.test(accountId ?? ''))
    throw new Error('Configurer CLOUDFLARE_ACCOUNT_ID.');
  const hostname = deploymentHostname(profile, values.BACKOFFICE_HOSTNAME);
  if (
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(databaseId ?? '') ||
    databaseId.startsWith('00000000-')
  )
    throw new Error('Configurer la base D1 dédiée à cet environnement.');
  if (
    values.CONTACTS_SYNC_WORKER_NAME &&
    (environment !== 'production' ||
      values.CONTACTS_SYNC_WORKER_NAME !== 'osteo-contacts-sync')
  )
    throw new Error('Le service Google est réservé à la production.');
  const vars = {
    APP_ENVIRONMENT: environment,
    APP_ORIGIN: `https://${hostname}`,
    ACCESS_TEAM_DOMAIN: values.ACCESS_TEAM_DOMAIN,
    ACCESS_AUD: values.ACCESS_AUD,
  };
  getAccessConfig(vars);
  const config = structuredClone(template);
  const target = config.env[environment];
  config.account_id = accountId;
  target.vars = { ...target.vars, ...vars };
  target.d1_databases[0].database_id = databaseId;
  const reportsBucket =
    values.BACKOFFICE_REPORTS_BUCKET ?? `${profile.name}-reports`;
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(reportsBucket))
    throw new Error('Configurer le bucket privé des comptes rendus.');
  target.r2_buckets[0].bucket_name = reportsBucket;
  if (environment === 'production') {
    const previewId = values.PREVIEW_D1_ID;
    if (
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(previewId ?? '') ||
      previewId.startsWith('00000000-') ||
      previewId === databaseId
    )
      throw new Error(
        'Configurer PREVIEW_D1_ID avec une base différente de la production.'
      );
    target.d1_databases[1].database_id = previewId;
    const previewBucket =
      values.PREVIEW_REPORTS_BUCKET ?? 'osteo-backoffice-preview-reports';
    if (
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(previewBucket) ||
      previewBucket === reportsBucket
    )
      throw new Error(
        'Le bucket de preview doit être distinct de la production.'
      );
    target.r2_buckets[1].bucket_name = previewBucket;
  }
  target.workers_dev = hostname.endsWith('.workers.dev');
  target.routes = target.workers_dev
    ? []
    : [{ pattern: hostname, custom_domain: true }];
  config.env = { [environment]: target };
  assertDeploymentConfig(config, environment);
  return config;
}
export function assertDeploymentConfig(config, environment) {
  const profile = environmentProfile(environment);
  const target = config.env?.[environment];
  const hostname = deploymentHostname(
    profile,
    new URL(target?.vars?.APP_ORIGIN).hostname
  );
  const workersDev = hostname.endsWith('.workers.dev');
  if (
    !target ||
    target.name !== profile.name ||
    (target.main ?? config.main) !== profile.main ||
    target.vars?.APP_ENVIRONMENT !== environment ||
    target.vars?.APP_ORIGIN !== `https://${hostname}` ||
    config.assets?.run_worker_first !== true ||
    target.workers_dev !== workersDev ||
    target.preview_urls !== false ||
    (workersDev
      ? target.routes?.length !== 0
      : target.routes?.length !== 1 ||
        target.routes[0].pattern !== hostname ||
        target.routes[0].custom_domain !== true) ||
    target.r2_buckets?.length !== (environment === 'production' ? 2 : 1) ||
    target.r2_buckets[0].binding !== 'REPORTS' ||
    (environment === 'production' &&
      (target.r2_buckets[1].binding !== 'PREVIEW_REPORTS' ||
        target.r2_buckets[1].bucket_name ===
          target.r2_buckets[0].bucket_name)) ||
    target.d1_databases?.length !== (environment === 'production' ? 2 : 1) ||
    target.d1_databases[0].binding !== 'DB' ||
    target.d1_databases[0].database_name !== profile.name ||
    (environment === 'production' &&
      (target.d1_databases[1].binding !== 'PREVIEW_DB' ||
        target.d1_databases[1].database_name !== 'osteo-backoffice-preview' ||
        target.d1_databases[1].database_id ===
          target.d1_databases[0].database_id)) ||
    (environment === 'preview'
      ? (target.services?.length ?? 0) !== 0 ||
        (target.triggers?.crons?.length ?? 0) !== 0
      : target.services?.length !== 1 ||
        target.services[0].binding !== 'GOOGLE_CONTACTS' ||
        target.services[0].service !== 'osteo-contacts-sync' ||
        target.services[0].entrypoint !== 'GoogleContactsService')
  )
    throw new Error(
      'Configuration incohérente : preview et production doivent rester isolées.'
    );
  return target;
}
