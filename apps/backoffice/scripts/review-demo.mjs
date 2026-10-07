// Explicit, isolated UI rehearsal. Uses fictitious contacts and a separate SQLite file.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createLocalTransport } from './local-database.mjs';
import { createDemoData } from './preview-data.mjs';
import { renderFrame } from '../src/views.ts';
import { CONTACTS_ACCOUNT_EMAIL } from '../src/config.ts';
const data = createDemoData();
Object.assign(data.contacts[0], {
  name: 'Martin Camille (Luna)',
  givenName: 'Martin Camille (Luna)',
  familyName: '',
  animals: [],
});
const transport = createLocalTransport(
  data,
  new URL('../.credentials/review-demo.sqlite', import.meta.url)
);
const port = 8790;
createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (url.pathname.startsWith('/api/')) {
      if (
        !['GET', 'HEAD'].includes(req.method) &&
        req.headers.origin !== `http://localhost:${port}`
      ) {
        res.writeHead(403).end();
        return;
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 65536) {
          res.writeHead(413).end();
          return;
        }
      }
      const result = await transport(url.pathname + url.search, {
        method: req.method,
        body: body || undefined,
      });
      res
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify(result));
      return;
    }
    if (url.pathname === '/') {
      res
        .writeHead(200, { 'Content-Type': 'text/html' })
        .end(
          renderFrame(
            { email: CONTACTS_ACCOUNT_EMAIL, name: 'Démo fictive' },
            'contacts',
            true,
            false,
            true
          )
        );
      return;
    }
    if (
      !/^\/assets\/[\w./-]+$/.test(url.pathname) ||
      url.pathname.includes('..')
    ) {
      res.writeHead(404).end();
      return;
    }
    const body = await readFile(
      new URL(`../dist/assets${url.pathname}`, import.meta.url)
    );
    res
      .writeHead(200, {
        'Content-Type': url.pathname.endsWith('.js')
          ? 'application/javascript'
          : url.pathname.endsWith('.css')
            ? 'text/css'
            : 'font/woff2',
      })
      .end(body);
  } catch {
    res
      .writeHead(400, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'demo_request_failed' }));
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Revue fictive : http://localhost:${port}`)
);
