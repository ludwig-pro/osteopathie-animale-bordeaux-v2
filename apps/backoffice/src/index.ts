import { saveContactAnimals } from './contact-animals.ts';
import { createAccessVerifier, type AccessVerifier } from './auth.ts';
import { AccessError, getAccessConfig, type Env } from './config.ts';
import { renderContacts, renderError, renderHome } from './views.ts';
import { contactsPage, ContactsError, saveContact } from './contacts.ts';
import {
  assignLists,
  changeMailingList,
  mailingLists,
  replaceContactLists,
} from './mailing-lists.ts';
import {
  identityHistory,
  reviewIdentity,
  normalizeIdentities,
} from './identity-review.ts';
import { jsonBody } from './request-body.ts';
import { copyContactsToPreview } from './preview-copy.ts';
import {
  consultationReports,
  consultationPdf,
} from './consultation-reports.ts';
import { contactSummary, requestSummaryRefresh } from './contact-summary.ts';
import { runSummaries } from './summary-runner.ts';
import { nextAppointment, calendarAgenda, calendarWindow } from './calendar.ts';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
const html = (value: string, status = 200) =>
  new Response(value, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

function secureResponse(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  );
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.append('Vary', 'Cf-Access-Jwt-Assertion');
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createBackofficeHandler(
  verify: AccessVerifier = createAccessVerifier(),
  hostedPreview = false
) {
  return async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url);
    let response: Response;
    try {
      const config = getAccessConfig(env);
      if (url.origin !== config.origin) {
        throw new AccessError(403, 'origin_not_allowed');
      }
      // Authenticate before routing, including every static asset and API path.
      const identity = await verify(request, config);
      if (url.pathname === '/logout') {
        if (request.method !== 'POST') {
          response = new Response(null, {
            status: 405,
            headers: { Allow: 'POST' },
          });
        } else if (request.headers.get('Origin') !== config.origin) {
          throw new AccessError(403, 'origin_not_allowed');
        } else {
          response = new Response(null, {
            status: 303,
            headers: { Location: '/cdn-cgi/access/logout' },
          });
        }
      } else if (
        [
          '/api/preview-copy',
          '/api/contact',
          '/api/contact-identity',
          '/api/contact-animals',
          '/api/contact-normalization',
          '/api/mailing-lists',
          '/api/list-memberships',
          '/api/contact-summary/refresh',
        ].includes(url.pathname) &&
        !['GET', 'HEAD'].includes(request.method)
      ) {
        if (request.headers.get('Origin') !== config.origin)
          throw new AccessError(403, 'origin_not_allowed');
        const method = request.method;
        if (
          (url.pathname === '/api/preview-copy' && method === 'POST') ||
          (url.pathname === '/api/contact-summary/refresh' &&
            method === 'POST') ||
          (url.pathname === '/api/contact' && method === 'PATCH') ||
          (url.pathname === '/api/contact-animals' && method === 'PATCH') ||
          (url.pathname === '/api/contact-identity' && method === 'POST') ||
          (url.pathname === '/api/contact-normalization' &&
            method === 'POST') ||
          (url.pathname === '/api/mailing-lists' &&
            ['POST', 'PATCH', 'DELETE'].includes(method)) ||
          (url.pathname === '/api/list-memberships' &&
            ['POST', 'PUT'].includes(method))
        ) {
          const input = await jsonBody(request);
          const result =
            url.pathname === '/api/contact-summary/refresh'
              ? await requestSummaryRefresh(input, env)
              : url.pathname === '/api/contact-animals'
                ? await saveContactAnimals(input, env)
                : url.pathname === '/api/contact-normalization'
                  ? await normalizeIdentities(input, env, identity.email)
                  : url.pathname === '/api/contact-identity'
                    ? await reviewIdentity(input, env, identity.email)
                    : url.pathname === '/api/preview-copy'
                      ? await copyContactsToPreview(input, env)
                      : url.pathname === '/api/contact'
                        ? await saveContact(input, env)
                        : url.pathname === '/api/mailing-lists'
                          ? await changeMailingList(method, input, env)
                          : method === 'POST'
                            ? await assignLists(input, env)
                            : await replaceContactLists(input, env);
          response = json(result);
        } else response = json({ error: 'method_not_allowed' }, 405);
      } else if (!['GET', 'HEAD'].includes(request.method)) {
        response = new Response(null, {
          status: 405,
          headers: { Allow: 'GET, HEAD' },
        });
      } else if (url.pathname === '/') {
        response = html(renderHome(identity, hostedPreview));
      } else if (url.pathname === '/contacts') {
        response = html(renderContacts(identity, hostedPreview));
      } else if (url.pathname === '/api/session') {
        response = json({ user: identity });
      } else if (url.pathname === '/api/next-appointment') {
        if (url.search)
          throw new ContactsError(400, 'invalid_calendar_request');
        response =
          request.method === 'HEAD'
            ? json(null)
            : json(await nextAppointment(env));
      } else if (url.pathname === '/api/calendar-appointments') {
        const { from, to } = calendarWindow(url);
        response =
          request.method === 'HEAD'
            ? json(null)
            : json(await calendarAgenda(env, from, to));
      } else if (
        ['/api/contacts', '/api/contact-labels'].includes(url.pathname)
      ) {
        response =
          request.method === 'HEAD'
            ? json(null)
            : json(await contactsPage(url, env));
      } else if (url.pathname === '/api/consultation-reports') {
        response = json(
          await consultationReports(
            url.searchParams.get('contactId') ?? '',
            env
          )
        );
      } else if (url.pathname === '/api/consultation-pdf') {
        response = await consultationPdf(url.searchParams.get('id') ?? '', env);
      } else if (url.pathname === '/api/contact-identity') {
        response = json(
          await identityHistory(url.searchParams.get('id') ?? '', env)
        );
      } else if (url.pathname === '/api/contact-summary') {
        if (
          [...url.searchParams.keys()].some((key) => key !== 'id') ||
          url.searchParams.getAll('id').length !== 1
        )
          throw new ContactsError(400, 'invalid_contact');
        response =
          request.method === 'HEAD'
            ? json(null)
            : json(await contactSummary(url.searchParams.get('id') ?? '', env));
      } else if (url.pathname === '/api/mailing-lists') {
        response =
          request.method === 'HEAD'
            ? json(null)
            : json(await mailingLists(env));
      } else if (url.pathname.startsWith('/api/')) {
        response = json({ error: 'not_found' }, 404);
      } else if (
        url.pathname.startsWith('/assets/') ||
        url.pathname === '/favicon.svg'
      ) {
        response = await env.ASSETS.fetch(request);
      } else {
        response = html(renderError(404), 404);
      }
    } catch (error) {
      const status =
        error instanceof AccessError || error instanceof ContactsError
          ? error.status
          : 503;
      const code =
        error instanceof AccessError || error instanceof ContactsError
          ? error.code
          : 'application_unavailable';
      // Never echo authentication tokens, claims, upstream errors or secrets.
      response = url.pathname.startsWith('/api/')
        ? json({ error: code }, status)
        : html(renderError(status), status);
    }
    return secureResponse(request, response);
  };
}

export default {
  fetch: createBackofficeHandler(),
  async scheduled(_controller: ScheduledController, env: Env) {
    await runSummaries(env);
  },
} satisfies ExportedHandler<Env>;
