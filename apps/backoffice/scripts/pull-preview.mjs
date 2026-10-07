// Explicit operator action. Reads only the preview D1, never Google/production.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  readFile,
  mkdtemp,
  writeFile,
  rm,
  rename,
  access,
} from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  previewSnapshotQuery,
  snapshotFromRows,
  saveLocalPreview,
} from './local-preview-data.mjs';

const resetLocal = process.argv.includes('--reset-local');
const localDatabase = new URL(
  '../.credentials/local-backoffice.sqlite',
  import.meta.url
);
if (resetLocal) {
  const running = await new Promise((resolve) => {
    const socket = createConnection({
      host: '127.0.0.1',
      port: Number(process.env.BACKOFFICE_PREVIEW_PORT ?? 8788),
    });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
  if (running)
    throw new Error('Arrêter le serveur local avant de réimporter sa base.');
}
const workspace = fileURLToPath(new URL('..', import.meta.url));
const configuration = JSON.parse(
  await readFile(
    new URL('../.credentials/backoffice-preview.json', import.meta.url),
    'utf8'
  )
);
const account = configuration.CLOUDFLARE_ACCOUNT_ID;
const database = configuration.BACKOFFICE_D1_ID;
if (
  !/^[a-f0-9]{32}$/i.test(account ?? '') ||
  !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(database ?? '')
)
  throw new Error('Configurer les identifiants de la preview.');
const directory = await mkdtemp(join(tmpdir(), 'osteo-preview-read-'));
try {
  const path = join(directory, 'wrangler.json');
  await writeFile(
    path,
    JSON.stringify({
      name: 'osteo-preview-reader',
      account_id: account,
      compatibility_date: '2026-10-05',
      d1_databases: [
        {
          binding: 'PREVIEW_DB',
          database_name: 'osteo-backoffice-preview',
          database_id: database,
        },
      ],
    }),
    { mode: 0o600 }
  );
  let output;
  try {
    const result = await promisify(execFile)(
      process.execPath,
      [
        fileURLToPath(
          new URL(
            '../../../node_modules/wrangler/bin/wrangler.js',
            import.meta.url
          )
        ),
        'd1',
        'execute',
        'PREVIEW_DB',
        '--config',
        path,
        '--remote',
        '--command',
        previewSnapshotQuery,
        '--json',
      ],
      {
        cwd: workspace,
        maxBuffer: 32 * 1024 * 1024,
        env: {
          ...process.env,
          WRANGLER_SEND_METRICS: 'false',
          WRANGLER_LOG: 'log',
          WRANGLER_WRITE_LOGS: 'false',
          WRANGLER_LOG_PATH: join(directory, 'read.log'),
        },
      }
    );
    output = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      'Lecture de la preview impossible. Vérifier la session Wrangler et les droits D1.'
    );
  }
  if (output.length !== 1 || output[0].success !== true)
    throw new Error('Lecture de la preview incomplète.');
  const data = snapshotFromRows(output[0].results);
  await saveLocalPreview(data);
  if (resetLocal) {
    try {
      await rename(
        localDatabase,
        new URL(
          `../.credentials/local-backoffice-${Date.now()}.backup.sqlite`,
          import.meta.url
        )
      );
      console.log(
        'Ancienne base locale conservée dans un fichier privé .backup.sqlite.'
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  } else {
    try {
      await access(localDatabase);
      console.log(
        'Base locale existante conservée. Pour charger cette nouvelle copie : arrêter le serveur, puis relancer cette commande avec --reset-local.'
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  console.log(
    `Copie locale : ${data.contacts.length} contacts, ${data.labels.length} libellés, ${data.lists.length} listes actives.`
  );
  console.log(
    'Redémarrer preview:backoffice pour charger cette copie. Les modifications locales restent isolées.'
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
