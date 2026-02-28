/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_GTM_ID?: string;
  readonly PUBLIC_POSTHOG_KEY?: string;
  readonly PUBLIC_POSTHOG_HOST?: string;
  readonly PUBLIC_ANALYTICS_GTM_DELAY_MS?: string;
  readonly PUBLIC_ANALYTICS_POSTHOG_DELAY_MS?: string;
  readonly SENTRY_AUTH_TOKEN?: string;
  readonly SENTRY_ORG?: string;
  readonly SENTRY_PROJECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
