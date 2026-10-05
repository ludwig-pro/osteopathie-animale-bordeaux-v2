import { SyncError } from './errors.ts';
import type { Env, Fetcher, Invitee, Person, ScheduledEvent } from './types.ts';
import { calendlyUri, normalizeEmail } from './model.ts';

export const PERSON_FIELDS =
  'names,emailAddresses,phoneNumbers,biographies,memberships,userDefined,metadata';
export interface Page<T> {
  collection: T[];
  pagination: { next_page_token?: string | null };
}
export class Clients {
  readonly env: Env;
  readonly fetcher: Fetcher;
  private googleToken?: string;
  private calendlyChecked = false;
  private calendlyIdentity?: Promise<void>;
  requests = 0;
  constructor(env: Env, fetcher: Fetcher = fetch) {
    this.env = env;
    this.fetcher = (input, init) => fetcher(input, init);
  }
  private async request<T>(
    url: string,
    init: RequestInit,
    service: string
  ): Promise<T> {
    // A Free Worker allows 50 external subrequests. Leave headroom and stop
    // before sending anything when a batch has exhausted its budget.
    if (this.requests >= 45) throw new SyncError('request_budget', true);
    this.requests++;
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new SyncError(`${service}_network`, true);
    }
    if (!response.ok) {
      const retryHeader = response.headers.get('retry-after');
      const parsedDelay = retryHeader
        ? Number(retryHeader) || (Date.parse(retryHeader) - Date.now()) / 1000
        : 0;
      const retryAfter = Number.isFinite(parsedDelay)
        ? Math.max(0, parsedDelay)
        : 0;
      if (
        response.status === 401 ||
        (service === 'oauth' && response.status === 400)
      )
        throw new SyncError(`${service}_reauthorize`);
      throw new SyncError(
        `${service}_http_${response.status}`,
        response.status === 429 ||
          response.status >= 500 ||
          (service === 'google_update' && response.status === 400),
        retryAfter
      );
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new SyncError(`${service}_invalid_response`, true);
    }
  }
  private async googleAuth(): Promise<string> {
    if (this.googleToken) return this.googleToken;
    let secret: {
      client_id: string;
      client_secret: string;
      refresh_token: string;
      sub: string;
    };
    try {
      secret = JSON.parse(this.env.GOOGLE_OAUTH);
    } catch {
      throw new SyncError('google_configuration_missing');
    }
    if (!secret.client_id || !secret.refresh_token || !secret.sub)
      throw new SyncError('google_configuration_missing');
    const token = await this.request<{ access_token: string }>(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: secret.client_id,
          client_secret: secret.client_secret ?? '',
          refresh_token: secret.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      },
      'oauth'
    );
    if (!token.access_token)
      throw new SyncError('google_configuration_missing');
    const identity = await this.request<{
      email: string;
      email_verified: boolean;
      sub: string;
    }>(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { Authorization: `Bearer ${token.access_token}` } },
      'google_identity'
    );
    if (
      !identity.email_verified ||
      identity.sub !== secret.sub ||
      normalizeEmail(identity.email) !==
        normalizeEmail(this.env.EXPECTED_GOOGLE_EMAIL)
    )
      throw new SyncError('google_account_mismatch');
    this.googleToken = token.access_token;
    return this.googleToken;
  }
  async google<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//'))
      throw new SyncError('invalid_google_path');
    const token = await this.googleAuth();
    return this.request<T>(
      `https://people.googleapis.com/v1${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      method === 'PATCH' ? 'google_update' : 'google'
    );
  }
  async calendly<T>(path: string): Promise<T> {
    if (!this.env.CALENDLY_TOKEN)
      throw new SyncError('calendly_configuration_missing');
    if (!path.startsWith('/') || path.startsWith('//'))
      throw new SyncError('invalid_calendly_uri');
    const headers = { Authorization: `Bearer ${this.env.CALENDLY_TOKEN}` };
    if (!this.calendlyChecked) {
      this.calendlyIdentity ??= this.checkCalendlyIdentity(headers);
      await this.calendlyIdentity;
    }
    return this.request<T>(
      `https://api.calendly.com${path}`,
      { headers },
      'calendly'
    );
  }
  private async checkCalendlyIdentity(headers: Record<string, string>) {
    const { resource } = await this.request<{
      resource: { uri: string; current_organization: string };
    }>('https://api.calendly.com/users/me', { headers }, 'calendly');
    if (
      resource.uri !== this.env.CALENDLY_USER_URI ||
      resource.current_organization !== this.env.CALENDLY_ORGANIZATION_URI
    )
      throw new SyncError('calendly_account_mismatch');
    this.calendlyChecked = true;
  }
  async event(uri: string) {
    const { resource } = await this.calendly<{ resource: ScheduledEvent }>(
      new URL(calendlyUri(uri, 'event')).pathname
    );
    if (
      resource.uri !== uri ||
      !resource.event_memberships.some(
        (m) => m.user === this.env.CALENDLY_USER_URI
      )
    )
      throw new SyncError('event_outside_personal_scope');
    return resource;
  }
  async invitee(uri: string) {
    const { resource } = await this.calendly<{ resource: Invitee }>(
      new URL(calendlyUri(uri, 'invitee')).pathname
    );
    if (resource.uri !== uri) throw new SyncError('invitee_uri_mismatch');
    return resource;
  }
  personPath(resource: string) {
    if (!/^people\/[A-Za-z0-9_-]+$/.test(resource))
      throw new SyncError('invalid_google_resource');
    return `/${resource}`;
  }
  async person(resource: string): Promise<Person> {
    try {
      const person = await this.google<Person>(
        `${this.personPath(resource)}?personFields=${PERSON_FIELDS}&sources=READ_SOURCE_TYPE_CONTACT`
      );
      if (person.metadata?.deleted)
        throw new SyncError('google_contact_deleted');
      return person;
    } catch (error) {
      if (error instanceof SyncError && error.code === 'google_http_404')
        throw new SyncError('google_contact_deleted');
      throw error;
    }
  }
}
