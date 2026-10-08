// Interface-only local preview. Never imported by the Cloudflare Worker.
// Loopback only. Loads a private preview copy or fictitious demo data.
// Never calls Google or any hosted API.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CONTACTS_ACCOUNT_EMAIL } from '../src/config.ts';
import { renderFrame } from '../src/views.ts';
import { createDemoData, createDemoTransport } from './preview-data.mjs';
import { createLocalTransport } from './local-database.mjs';
import { loadLocalPreview } from './local-preview-data.mjs';
import { createDemoReport, demoConsultationPdf } from './demo-report.mjs';

const localData = await loadLocalPreview({
  demo: process.env['BACKOFFICE_PREVIEW_DEMO'] === '1',
});
const demoData = localData ? null : createDemoData();
const demoReport = demoData ? createDemoReport(demoData.contacts[2]) : null;
const transport = localData
  ? createLocalTransport(localData)
  : createDemoTransport(demoData, {
      reports: [{ contactId: demoReport.contactId, ...demoReport.report }],
    });

const port = Number(process.env['BACKOFFICE_PREVIEW_PORT'] ?? 8788);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('Port de prévisualisation invalide.');
}
const assets = new Map([
  [
    '/assets/backoffice.css',
    ['../dist/assets/assets/backoffice.css', 'text/css'],
  ],
  [
    '/assets/backoffice.js',
    ['../dist/assets/assets/backoffice.js', 'text/javascript'],
  ],
  [
    '/assets/backoffice.js.LEGAL.txt',
    ['../dist/assets/assets/backoffice.js.LEGAL.txt', 'text/plain'],
  ],
  ['/favicon.svg', ['../public/favicon.svg', 'image/svg+xml']],
  [
    '/assets/fonts/dm-sans.woff2',
    ['../dist/assets/assets/fonts/dm-sans.woff2', 'font/woff2'],
  ],
  [
    '/assets/fonts/lora.woff2',
    ['../dist/assets/assets/fonts/lora.woff2', 'font/woff2'],
  ],
]);
assets.set('/assets/pdf.worker.min.mjs', [
  '../dist/assets/assets/pdf.worker.min.mjs',
  'text/javascript',
]);
for (const name of await readdir(
  new URL('../dist/assets/assets/pdf-fonts/', import.meta.url)
)) {
  if (/^[a-zA-Z0-9_.-]+$/.test(name))
    assets.set(`/assets/pdf-fonts/${name}`, [
      `../dist/assets/assets/pdf-fonts/${name}`,
      'application/octet-stream',
    ]);
}
function page(path) {
  return renderFrame(
    { email: CONTACTS_ACCOUNT_EMAIL, name: 'Agathe Lescout' },
    path === '/contacts' ? 'contacts' : 'home',
    true,
    false,
    Boolean(localData)
  );
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  // Codex annotations inject styles into a shadow root in the local browser.
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  );
  const host = request.headers.host;
  if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(host)) {
    response.writeHead(403).end('Aperçu accessible uniquement en local.');
    return;
  }
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (
        !['GET', 'HEAD'].includes(request.method) &&
        ![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(
          request.headers.origin
        )
      ) {
        response.writeHead(403).end();
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 65536) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      try {
        if (demoReport && url.pathname === '/api/consultation-pdf') {
          const result = demoConsultationPdf(
            demoReport,
            url.searchParams.get('id'),
            request.method
          );
          response.writeHead(result.status, Object.fromEntries(result.headers));
          response.end(
            request.method === 'HEAD'
              ? undefined
              : Buffer.from(await result.arrayBuffer())
          );
          return;
        }
        if (transport.fetchResponse) {
          const result = await transport.fetchResponse(
            url.pathname + url.search,
            {
              method: request.method,
              body: chunks.length
                ? Buffer.concat(chunks).toString()
                : undefined,
            }
          );
          response.writeHead(result.status, Object.fromEntries(result.headers));
          response.end(
            request.method === 'HEAD'
              ? undefined
              : Buffer.from(await result.arrayBuffer())
          );
          return;
        }
        const result = await transport(url.pathname + url.search, {
          method: request.method,
          body: chunks.length ? Buffer.concat(chunks).toString() : undefined,
        });
        response
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify(result));
      } catch (error) {
        response
          .writeHead(400, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: error.message }));
      }
      return;
    }
    if (request.method === 'POST' && url.pathname === '/logout') {
      response.writeHead(303, { Location: '/_preview/signed-out' }).end();
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let body;
    let contentType;
    if (['/', '/contacts'].includes(url.pathname)) {
      body = page(url.pathname);
      contentType = 'text/html; charset=utf-8';
    } else if (url.pathname === '/_preview/signed-out') {
      body =
        '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aperçu — Agathe Lescout</title><link rel="stylesheet" href="/assets/backoffice.css"></head><body><main class="mx-auto max-w-md px-6 py-24"><h1 class="font-display text-3xl">Session locale terminée.</h1><a class="mt-6 block underline" href="/">Revenir à l’aperçu</a></main></body></html>';
      contentType = 'text/html; charset=utf-8';
    } else {
      const asset = assets.get(url.pathname);
      if (!asset) {
        response.writeHead(404).end('Page introuvable dans cet aperçu.');
        return;
      }
      body = await readFile(fileURLToPath(new URL(asset[0], import.meta.url)));
      contentType = asset[1];
    }
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500).end('Impossible de charger cet aperçu.');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Aperçu local du backoffice : http://localhost:${port}`);
  console.log(
    localData
      ? `Copie locale des données réelles : ${localData.contacts.length} contacts. Modifications locales conservées dans SQLite.`
      : 'Interface de démonstration, sans connexion Google ni contacts réels.'
  );
});
