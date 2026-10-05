import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { options, wrangler } from './common.mjs';

try {
  const opts = options();
  const [command, argument] = opts.argv;
  const resetContacts = `INSERT INTO jobs(job_key,kind,payload,created_at) SELECT 'contact:'||email,'contact',json_object('email',email),${Date.now()} FROM contacts WHERE true ON CONFLICT(job_key) DO UPDATE SET state=CASE WHEN jobs.state='conflict' THEN 'conflict' ELSE 'pending' END,version=jobs.version+1,attempts=0,due_at=0;`;
  let sql;
  if (command === 'status')
    sql = `SELECT mode,last_success,last_error,retry_at,next_scan,scan_active,index_active,index_complete,lease_until FROM settings;
    SELECT state,kind,count(*) AS count,min(created_at) AS oldest_created,CASE WHEN state='pending' THEN max(0,${Date.now()}-min(created_at)) ELSE NULL END AS lag_ms FROM jobs GROUP BY state,kind;
    SELECT CASE WHEN last_error LIKE '%reauthorize%' OR last_error='google_account_mismatch' OR EXISTS(SELECT 1 FROM jobs WHERE state='conflict' AND (error_code LIKE '%reauthorize%' OR error_code='google_account_mismatch')) THEN 1 ELSE 0 END AS needs_reconnection FROM settings;
    SELECT max(synced_at) AS last_google_success FROM contacts;
    SELECT outcome,count(*) AS count FROM contacts GROUP BY outcome;
    SELECT count(*) AS bookings,min(json_extract(data,'$.start')) AS oldest_booking FROM bookings;
    SELECT id,kind,state,attempts,error_code FROM jobs WHERE state='conflict' ORDER BY id;`;
  else if (command === 'pause')
    sql = "UPDATE settings SET mode='paused' WHERE id=1;";
  else if (['simulate', 'pilot', 'live'].includes(command)) {
    if (
      command !== 'simulate' &&
      !opts.argv.includes('--confirm-google-writes')
    )
      throw new Error(
        'Ajouter --confirm-google-writes après validation de la simulation ou du pilote.'
      );
    sql = `UPDATE settings SET mode='${command}',last_error=NULL,retry_at=0 WHERE id=1; ${resetContacts}`;
  } else if (command === 'import')
    sql =
      'UPDATE settings SET scan_active=1,scan_cursor=NULL,next_scan=0 WHERE id=1;';
  else if (command === 'reconcile-all')
    sql =
      'UPDATE settings SET scan_active=1,scan_cursor=NULL,next_scan=0 WHERE id=1;';
  else if (command === 'refresh-index')
    sql =
      'UPDATE settings SET index_complete=0,index_active=0,index_cursor=NULL WHERE id=1;';
  else if (command === 'retry' && /^\d+$/.test(argument ?? ''))
    sql = `UPDATE jobs SET state='pending',attempts=0,due_at=0,error_code=NULL,version=version+1 WHERE id=${argument}; UPDATE settings SET retry_at=0 WHERE id=1;`;
  else
    throw new Error(
      'Commandes : status, pause, simulate, import, pilot, live, reconcile-all, refresh-index, retry <id>.'
    );
  const dir = mkdtempSync(join(tmpdir(), 'contacts-sync-'));
  try {
    const file = join(dir, 'command.sql');
    writeFileSync(file, sql, { mode: 0o600 });
    const output = wrangler([
      'd1',
      'execute',
      'DB',
      opts.local ? '--local' : '--remote',
      ...opts.args,
      '--file',
      file,
      '--json',
    ]);
    if (command === 'status') {
      const result = JSON.parse(output);
      console.log(
        JSON.stringify(
          result.map((r) => r.results),
          null,
          2
        )
      );
    } else
      console.log(
        `Commande ${command} enregistrée. Consulter status pour suivre le prochain passage.`
      );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
