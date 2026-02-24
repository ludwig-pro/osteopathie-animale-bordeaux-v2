/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_POSTHOG_KEY?: string;
  readonly PUBLIC_POSTHOG_HOST?: string;
  readonly SENTRY_AUTH_TOKEN?: string;
  readonly SENTRY_ORG?: string;
  readonly SENTRY_PROJECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
