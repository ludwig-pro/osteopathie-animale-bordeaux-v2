// Standalone preview with fictitious, in-memory data. Not deployed with the Worker.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_EMAIL } from '../src/config.ts';
import { renderFrame } from '../src/views.ts';
import { createDemoData, createDemoTransport } from './preview-data.mjs';

const output = resolve(
  process.argv[2] ??
    fileURLToPath(new URL('../dist/backoffice-apercu.html', import.meta.url))
);
let css = await readFile(
  new URL('../dist/assets/assets/backoffice.css', import.meta.url),
  'utf8'
);
for (const family of ['dm-sans', 'lora']) {
  const font = await readFile(
    new URL(`../dist/assets/assets/fonts/${family}.woff2`, import.meta.url)
  );
  css = css.replaceAll(
    `/assets/fonts/${family}.woff2`,
    `data:font/woff2;base64,${font.toString('base64')}`
  );
}
const favicon = await readFile(
  new URL('../public/favicon.svg', import.meta.url)
);
const script = await readFile(
  new URL('../dist/assets/assets/backoffice.js', import.meta.url),
  'utf8'
);
const legal = await readFile(
  new URL('../dist/assets/assets/backoffice.js.LEGAL.txt', import.meta.url),
  'utf8'
);
const data = JSON.stringify(createDemoData()).replaceAll('<', '\\u003c');
const previewScript = `
  ${createDemoTransport.toString()}
  window.__BACKOFFICE_PREVIEW_TRANSPORT__ = createDemoTransport(${data});
  ${script}
  /* ${legal.replaceAll('*/', '* /')} */
`.replaceAll('</script', '<\\/script');
const html = renderFrame(
  { email: ALLOWED_EMAIL, name: 'Agathe Lescout' },
  'contacts',
  true
)
  .replace(/\s*<link rel="preload"[^>]+>/g, '')
  .replace(
    'href="/favicon.svg"',
    `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`
  )
  .replace(
    '<link rel="stylesheet" href="/assets/backoffice.css" />',
    `<style>${css}</style>`
  )
  .replace('<script defer src="/assets/backoffice.js"></script>', '')
  .replace(
    '</head>',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'" /></head>`
  )
  .replace('</body>', `<script>${previewScript}</script></body>`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`Aperçu Catalyst autonome : ${output}`);
