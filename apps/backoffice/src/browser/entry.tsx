import { createRoot } from 'react-dom/client';
import { App } from './app';
import type { ContactsTransport } from './contacts-model';

declare global {
  interface Window {
    __BACKOFFICE_PREVIEW_TRANSPORT__?: ContactsTransport;
  }
}

const transport: ContactsTransport = async (path, init = {}) => {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 401 || response.status === 403)
    throw new Error('session_expired');
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'contacts_request_failed');
  return data;
};
const root = document.getElementById('backoffice-root');
if (root)
  createRoot(root).render(
    <App
      identity={{
        email: root.dataset['email'] ?? '',
        name: root.dataset['name'] ?? 'Agathe Lescout',
      }}
      initial={root.dataset['page'] === 'home' ? 'home' : 'contacts'}
      preview={root.dataset['preview'] === 'true'}
      hostedPreview={root.dataset['hostedPreview'] === 'true'}
      offline={Boolean(window.__BACKOFFICE_PREVIEW_TRANSPORT__)}
      transport={window.__BACKOFFICE_PREVIEW_TRANSPORT__ ?? transport}
    />
  );
