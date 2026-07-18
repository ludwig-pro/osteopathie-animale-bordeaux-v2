const FILE_EXTENSION_PATTERN = /\/[^/]+\.[^/]+$/;

export function normalizeCanonicalPath(inputPath: string): string {
  const [pathWithoutQueryOrHash = ''] = inputPath.split(/[?#]/, 1);
  const pathWithLeadingSlash = pathWithoutQueryOrHash.startsWith('/')
    ? pathWithoutQueryOrHash
    : `/${pathWithoutQueryOrHash}`;
  const pathWithoutTrailingSlashes = pathWithLeadingSlash.replace(/\/+$/, '');

  if (pathWithoutTrailingSlashes === '') {
    return '/';
  }

  if (FILE_EXTENSION_PATTERN.test(pathWithoutTrailingSlashes)) {
    return pathWithoutTrailingSlashes;
  }

  return `${pathWithoutTrailingSlashes}/`;
}
