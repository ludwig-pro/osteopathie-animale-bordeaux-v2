import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const command = args[0];
const local = args.includes('--local');
const config = local ? 'wrangler.jsonc' : 'wrangler.local.json';
const allowed = ['status', 'pause', 'observe', 'pilot', 'live', 'rescan'];
try {
  const fileIndex = args.indexOf('--contacts-file');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
  if (
    !allowed.includes(command) ||
    args.some(
      (argument, index) =>
        index > 0 &&
        !(fileIndex >= 0 && index === fileIndex + 1) &&
        !['--local', '--confirm-model-calls', '--contacts-file'].includes(
          argument
        )
    )
  )
    throw new Error(
      'Commandes : status, pause, observe, pilot, live, rescan. Options : --local, --confirm-model-calls, --contacts-file <fichier privé>. La cible distante est la production.'
    );
  if (!local && !existsSync(config))
    throw new Error(
      'Préparer wrangler.local.json pour la production avec yarn configure production.'
    );
  if (!local) {
    const target = JSON.parse(readFileSync(config, 'utf8')).env?.production;
    if (
      target?.name !== 'osteo-backoffice' ||
      target?.vars?.APP_ENVIRONMENT !== 'production' ||
      target?.d1_databases?.[0]?.database_name !== 'osteo-backoffice'
    )
      throw new Error(
        'La configuration doit viser uniquement le backoffice de production.'
      );
  }
  if (
    ['pilot', 'live'].includes(command) &&
    !args.includes('--confirm-model-calls')
  )
    throw new Error(
      'Ajouter --confirm-model-calls après validation des sources ou du pilote.'
    );
  let selection = '';
  if (command === 'pilot') {
    if (!file)
      throw new Error(
        'Choisir 20 contacts variés et fournir --contacts-file avec leurs identifiants dans un tableau JSON privé.'
      );
    const ids = JSON.parse(readFileSync(file, 'utf8'));
    if (
      !Array.isArray(ids) ||
      ids.length !== 20 ||
      new Set(ids).size !== 20 ||
      !ids.every(
        (id) =>
          typeof id === 'string' &&
          /^people\/[\w-]+$/.test(id) &&
          id.length <= 200
      )
    )
      throw new Error(
        'Le fichier pilote doit contenir exactement 20 identifiants Google distincts.'
      );
    // All slots are pre-reserved: the runner cannot auto-select other contacts.
    selection = `INSERT OR IGNORE INTO summary_pilot_contacts SELECT value FROM json_each('${JSON.stringify(ids)}'); `;
  } else if (fileIndex >= 0)
    throw new Error('--contacts-file est réservé au pilote.');
  const sql =
    command === 'status'
      ? `SELECT mode,pilot_limit,scan_active,next_scan,retry_at,last_error,lease_until FROM summary_settings;
       SELECT state,COUNT(*) AS count FROM contact_summary_sources GROUP BY state;
       SELECT kind,state,error_code,COUNT(*) AS count FROM summary_jobs GROUP BY kind,state,error_code;
       SELECT COUNT(*) AS count,SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens,AVG(duration_ms) AS average_duration_ms FROM contact_summaries;
       SELECT COUNT(*) AS reserved_pilot_contacts FROM summary_pilot_contacts;`
      : command === 'rescan'
        ? 'UPDATE summary_settings SET next_scan=0,retry_at=0 WHERE id=1;'
        : `${selection}UPDATE summary_settings SET mode='${command === 'pause' ? 'paused' : command}',retry_at=0,last_error=NULL WHERE id=1;`;
  const result = spawnSync(
    'yarn',
    [
      '--silent',
      'wrangler',
      'd1',
      'execute',
      'DB',
      local ? '--local' : '--remote',
      '--config',
      config,
      ...(!local ? ['--env', 'production'] : []),
      '--command',
      sql,
      '--json',
    ],
    {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    }
  );
  if (result.error || result.status !== 0)
    throw new Error(
      'Commande interrompue. Vérifier la configuration et les migrations de la base cible.'
    );
  if (command === 'status')
    console.log(
      JSON.stringify(
        JSON.parse(result.stdout).map((row) => row.results),
        null,
        2
      )
    );
  else
    console.log(
      `Mode ou demande ${command} enregistré. Consulter status pour suivre le traitement.`
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
