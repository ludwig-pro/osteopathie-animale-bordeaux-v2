import type { Env } from './config.ts';
import type { AccessVerifier } from './auth.ts';
import { createBackofficeHandler } from './index.ts';
import { previewContacts } from './preview-contacts.ts';

export function createPreviewHandler(verify?: AccessVerifier) {
  const handler = createBackofficeHandler(verify, true);
  return async (request: Request, env: Env): Promise<Response> => {
    // This entrypoint never uses a Google binding, even if one is supplied.
    if (
      env.APP_ENVIRONMENT !== 'preview' ||
      !env.DB ||
      env.APP_ORIGIN !==
        'https://backoffice-preview.osteopathie-animale-bordeaux.fr'
    )
      return new Response('Preview indisponible.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    return handler(request, {
      ...env,
      PREVIEW_DB: undefined,
      GOOGLE_CONTACTS: previewContacts(env.DB),
    });
  };
}
export default { fetch: createPreviewHandler() } satisfies ExportedHandler<Env>;
