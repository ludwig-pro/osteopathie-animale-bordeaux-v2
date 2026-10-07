import { WorkerEntrypoint } from 'cloudflare:workers';
import { readGoogleContacts } from './contacts-reader.ts';
import type { Env } from './types.ts';

export { default } from './index.ts';

// Reachable through a service binding selecting this entrypoint only.
// The public Worker keeps its webhook/health routes and cannot serve contacts.
export class GoogleContactsService extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    return readGoogleContacts(request, this.env);
  }
}
