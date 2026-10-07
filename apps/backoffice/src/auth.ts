import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import { ALLOWED_USERS, AccessError, type AccessConfig } from './config.ts';

export interface Identity {
  email: keyof typeof ALLOWED_USERS;
  name: string;
}

export type AccessVerifier = (
  request: Request,
  config: AccessConfig
) => Promise<Identity>;
export type KeySetFactory = (issuer: string) => JWTVerifyGetKey;

const keySets = new Map<string, JWTVerifyGetKey>();
const remoteKeySet: KeySetFactory = (issuer) => {
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
      timeoutDuration: 5000,
      cooldownDuration: 30000,
      cacheMaxAge: 600000,
    });
    keySets.set(issuer, keys);
  }
  return keys;
};

// Tests inject ephemeral signing keys. Production always uses Access's JWKS.
// No environment variable, cookie or request header can bypass verification.
export function createAccessVerifier(
  keySetFactory: KeySetFactory = remoteKeySet
): AccessVerifier {
  return async (request, config) => {
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token || token.length > 20000) {
      throw new AccessError(401, 'authentication_required');
    }
    let payload;
    try {
      ({ payload } = await jwtVerify(token, keySetFactory(config.issuer), {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'email', 'iat', 'exp', 'type'],
        maxTokenAge: '8h',
        clockTolerance: 5,
      }));
    } catch (error) {
      if (
        error instanceof errors.JOSEError &&
        !['ERR_JWKS_TIMEOUT', 'ERR_JWKS_INVALID'].includes(error.code)
      ) {
        throw new AccessError(401, 'authentication_required');
      }
      throw new AccessError(503, 'authentication_unavailable');
    }
    if (
      payload['type'] !== 'app' ||
      typeof payload.sub !== 'string' ||
      !payload.sub.trim()
    ) {
      throw new AccessError(401, 'authentication_required');
    }
    if (
      typeof payload['email'] !== 'string' ||
      !Object.hasOwn(ALLOWED_USERS, payload['email'])
    ) {
      throw new AccessError(403, 'account_not_allowed');
    }
    const email = payload['email'] as keyof typeof ALLOWED_USERS;
    return { email, name: ALLOWED_USERS[email] };
  };
}
