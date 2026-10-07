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
      ![
        'https://admin-preview.osteopathie-animale-bordeaux.fr',
        'https://osteo-backoffice-preview.lvantours.workers.dev',
        'https://backoffice-preview.osteopathie-animale-bordeaux.fr',
      ].includes(env.APP_ORIGIN)
    )
      return new Response('Preview indisponible.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    return handler(request, {
      ...env,
      PREVIEW_DB: undefined,
      PREVIEW_REPORTS: undefined,
      OPENAI_API_KEY: undefined,
      GOOGLE_CONTACTS: previewContacts(env.DB),
    });
  };
}
export default { fetch: createPreviewHandler() } satisfies ExportedHandler<Env>;
