import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
export function options(argv = process.argv.slice(2)) {
  const value = (flag) =>
    argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined;
  const environment = value('--env');
  const local = argv.includes('--local');
  if (
    local === Boolean(environment) ||
    (environment && !['staging', 'production'].includes(environment))
  )
    throw new Error('Choisir --local ou --env staging|production.');
  const config =
    value('--config') ?? (local ? 'wrangler.jsonc' : 'wrangler.local.json');
  const args = [
    '--config',
    config,
    ...(environment ? ['--env', environment] : []),
  ];
  if (!local) {
    const file = JSON.parse(readFileSync(config, 'utf8'));
    const target = file.env?.[environment];
    if (
      !target?.d1_databases?.[0]?.database_id ||
      target.d1_databases[0].database_id.startsWith('00000000')
    )
      throw new Error('Configurer une base D1 réelle pour cet environnement.');
    if (
      Object.values(target.vars ?? {}).some((v) =>
        String(v).startsWith('configure-')
      )
    )
      throw new Error(
        'Configurer les identifiants de compte et l’adresse Google attendue.'
      );
  }
  return { local, environment, config, args, argv, value };
}
export function wrangler(args, input) {
  const result = spawnSync(
    process.execPath,
    [
      join(
        dirname(require.resolve('wrangler/package.json')),
        'bin/wrangler.js'
      ),
      ...args,
    ],
    {
      input,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    }
  );
  if (result.status !== 0)
    throw new Error(
      'Commande Wrangler échouée. Vérifier la connexion, la configuration et les droits Cloudflare (sortie masquée).'
    );
  return result.stdout;
}
export function uploadSecrets(secrets, opts) {
  if (opts.local)
    throw new Error('Le transfert de secrets exige --env staging|production.');
  wrangler(['secret', 'bulk', ...opts.args], JSON.stringify(secrets));
}
