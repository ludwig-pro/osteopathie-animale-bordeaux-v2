import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const output = join(root, 'dist/assets');
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets/fonts'), { recursive: true });
const stylesheet = await postcss([
  tailwindcss({ base: root, optimize: true }),
]).process(await readFile(join(root, 'public/backoffice.css'), 'utf8'), {
  from: join(root, 'public/backoffice.css'),
  map: false,
});
await writeFile(join(output, 'assets/backoffice.css'), stylesheet.css);
await cp(join(root, 'public/favicon.svg'), join(output, 'favicon.svg'));
for (const [family, filename] of [
  ['dm-sans', 'dm-sans.woff2'],
  ['lora', 'lora.woff2'],
]) {
  const packageRoot = dirname(
    require.resolve(`@fontsource-variable/${family}/package.json`)
  );
  await cp(
    join(packageRoot, `files/${family}-latin-wght-normal.woff2`),
    join(output, 'assets/fonts', filename)
  );
}
await build({
  entryPoints: [join(root, 'src/browser/entry.tsx')],
  outfile: join(output, 'assets/backoffice.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'linked',
});
console.log('Composants Catalyst, Tailwind et polices locales préparés.');
