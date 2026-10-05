import { publicPage } from './public-pages.ts';
import { webhook } from './webhook.ts';
import { run } from './runner.ts';
import type { Env } from './types.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const page = publicPage(url.pathname);
      if (page) return page;
    }
    if (url.pathname === '/health' && request.method === 'GET')
      return Response.json({ service: 'contacts-sync' });
    if (url.pathname !== '/webhooks/calendly')
      return new Response('Not found', { status: 404 });
    if (request.method !== 'POST')
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'POST' },
      });
    try {
      return await webhook(request, env);
    } catch {
      return new Response('Temporarily unavailable', { status: 503 });
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await run(env, fetch, 30);
  },
} satisfies ExportedHandler<Env>;
