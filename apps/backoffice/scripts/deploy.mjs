import { spawnSync } from 'node:child_process';
import { environmentProfile } from './environments.mjs';

const environment = process.argv[2];
environmentProfile(environment);
function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.error || result.status !== 0)
    throw new Error('Déploiement interrompu : corriger le contrôle précédent.');
}
run(process.execPath, ['scripts/configure.mjs', environment]);
run(process.execPath, ['scripts/check-access.mjs', environment]);
run('yarn', ['assets:build']);
const target = ['--config', 'wrangler.local.json', '--env', environment];
run('yarn', [
  'wrangler',
  'deploy',
  '--dry-run',
  ...target,
  '--outdir',
  `dist/worker/${environment}`,
]);
run('yarn', [
  'wrangler',
  'd1',
  'migrations',
  'apply',
  'DB',
  '--remote',
  ...target,
]);
run('yarn', ['wrangler', 'deploy', ...target]);
