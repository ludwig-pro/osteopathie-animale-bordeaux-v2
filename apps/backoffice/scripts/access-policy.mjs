import { ALLOWED_EMAIL } from '../src/config.ts';

export function assertAccessSetup(
  application,
  policies,
  identityProvider,
  expected
) {
  const domains = application.self_hosted_domains ?? [application.domain];
  const destinations = application.destinations ?? [];
  const policy = policies[0];
  if (
    application.type !== 'self_hosted' ||
    application.domain !== expected.hostname ||
    domains.length > 1 ||
    domains.some((domain) => domain !== expected.hostname) ||
    destinations.some(
      (destination) =>
        destination.type !== 'public' || destination.uri !== expected.hostname
    ) ||
    application.aud !== expected.audience ||
    application.session_duration !== '8h' ||
    application.allowed_idps?.length !== 1 ||
    application.allowed_idps[0] !== expected.googleIdpId ||
    identityProvider.id !== expected.googleIdpId ||
    identityProvider.type !== 'google' ||
    policies.length !== 1 ||
    policy?.decision !== 'allow' ||
    policy.include?.length !== 1 ||
    Object.keys(policy.include[0]).length !== 1 ||
    policy.include[0].email?.email !== ALLOWED_EMAIL ||
    policy.require?.length !== 1 ||
    Object.keys(policy.require[0]).length !== 1 ||
    policy.require[0].login_method?.id !== expected.googleIdpId ||
    (policy.exclude?.length ?? 0) !== 0
  ) {
    throw new Error(
      'Access doit protéger ce seul domaine avec Google uniquement et le seul compte autorisé. Consulter le guide du backoffice.'
    );
  }
}
