import { existsSync, readFileSync } from 'node:fs';
import { getAccessConfig } from '../src/config.ts';

const profiles = {
  preview: {
    name: 'osteo-backoffice-preview',
    hostname: 'backoffice-preview.osteopathie-animale-bordeaux.fr',
    main: 'src/preview.ts',
  },
  production: {
    name: 'osteo-backoffice',
    hostname: 'backoffice.osteopathie-animale-bordeaux.fr',
    main: 'src/index.ts',
  },
};
export function environmentProfile(environment) {
  if (!Object.hasOwn(profiles, environment))
    throw new Error('Préciser preview ou production.');
  return profiles[environment];
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
  if (
    values.BACKOFFICE_HOSTNAME &&
    values.BACKOFFICE_HOSTNAME !== profile.hostname
  )
    throw new Error('Le domaine ne correspond pas à cet environnement.');
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
    APP_ORIGIN: `https://${profile.hostname}`,
    ACCESS_TEAM_DOMAIN: values.ACCESS_TEAM_DOMAIN,
    ACCESS_AUD: values.ACCESS_AUD,
  };
  getAccessConfig(vars);
  const config = structuredClone(template);
  const target = config.env[environment];
  config.account_id = accountId;
  target.vars = vars;
  target.d1_databases[0].database_id = databaseId;
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
  }
  target.routes = [{ pattern: profile.hostname, custom_domain: true }];
  config.env = { [environment]: target };
  assertDeploymentConfig(config, environment);
  return config;
}
export function assertDeploymentConfig(config, environment) {
  const profile = environmentProfile(environment);
  const target = config.env?.[environment];
  if (
    !target ||
    target.name !== profile.name ||
    (target.main ?? config.main) !== profile.main ||
    target.vars?.APP_ENVIRONMENT !== environment ||
    target.vars?.APP_ORIGIN !== `https://${profile.hostname}` ||
    config.assets?.run_worker_first !== true ||
    target.workers_dev !== false ||
    target.preview_urls !== false ||
    target.routes?.length !== 1 ||
    target.routes[0].pattern !== profile.hostname ||
    target.routes[0].custom_domain !== true ||
    target.d1_databases?.length !== (environment === 'production' ? 2 : 1) ||
    target.d1_databases[0].binding !== 'DB' ||
    target.d1_databases[0].database_name !== profile.name ||
    (environment === 'production' &&
      (target.d1_databases[1].binding !== 'PREVIEW_DB' ||
        target.d1_databases[1].database_name !== 'osteo-backoffice-preview' ||
        target.d1_databases[1].database_id ===
          target.d1_databases[0].database_id)) ||
    (environment === 'preview'
      ? (target.services?.length ?? 0) !== 0
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
