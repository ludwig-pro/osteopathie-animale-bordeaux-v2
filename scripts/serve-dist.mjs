import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const DIST_DIR = resolve(process.cwd(), 'dist');
const PORT = Number.parseInt(process.env.PORT ?? '4321', 10);

const CONTENT_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

const fileExists = async (filePath) => {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
};

const resolveAssetPath = async (pathname) => {
  const safePathname = pathname === '/' ? '/index.html' : pathname;
  const normalizedPath = normalize(decodeURIComponent(safePathname)).replace(
    /^(\.\.(\/|\\|$))+?/,
    ''
  );
  const absoluteCandidate = resolve(DIST_DIR, `.${normalizedPath}`);

  if (!absoluteCandidate.startsWith(DIST_DIR)) {
    return null;
  }

  if (await fileExists(absoluteCandidate)) {
    return absoluteCandidate;
  }

  if (extname(absoluteCandidate)) {
    return null;
  }

  const htmlCandidate = `${absoluteCandidate}.html`;
  if (await fileExists(htmlCandidate)) {
    return htmlCandidate;
  }

  const indexCandidate = join(absoluteCandidate, 'index.html');
  if (await fileExists(indexCandidate)) {
    return indexCandidate;
  }

  return null;
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host}`
    );
    const filePath = await resolveAssetPath(requestUrl.pathname);

    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const extension = extname(filePath);
    const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream';

    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': contentType,
    });

    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Server error');
    console.error(error);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Static preview available at http://127.0.0.1:${PORT}`);
});
