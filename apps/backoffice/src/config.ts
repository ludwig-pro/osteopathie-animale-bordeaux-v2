export const ALLOWED_EMAIL = 'agathe.lescout.osteo@gmail.com';

export interface Env {
  ASSETS: Fetcher;
  APP_ENVIRONMENT?: 'local' | 'preview' | 'production';
  APP_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  GOOGLE_CONTACTS?: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
  PREVIEW_DB?: D1Database;
}

export interface AccessConfig {
  origin: string;
  issuer: string;
  audience: string;
}

export class AccessError extends Error {
  readonly status: 401 | 403 | 503;
  readonly code: string;

  constructor(status: 401 | 403 | 503, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function getAccessConfig(
  env: Pick<Env, 'APP_ORIGIN' | 'ACCESS_TEAM_DOMAIN' | 'ACCESS_AUD'>
): AccessConfig {
  try {
    const app = new URL(env.APP_ORIGIN);
    const issuer = new URL(env.ACCESS_TEAM_DOMAIN);
    const local =
      app.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(app.hostname);
    if (
      (!local && app.protocol !== 'https:') ||
      app.origin !== env.APP_ORIGIN ||
      issuer.protocol !== 'https:' ||
      !/^[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/.test(issuer.hostname) ||
      issuer.origin !== env.ACCESS_TEAM_DOMAIN ||
      issuer.port ||
      !/^[a-f0-9]{64}$/i.test(env.ACCESS_AUD)
    ) {
      throw new Error('invalid_configuration');
    }
    return {
      origin: app.origin,
      issuer: issuer.origin,
      audience: env.ACCESS_AUD,
    };
  } catch {
    throw new AccessError(503, 'authentication_unavailable');
  }
}
