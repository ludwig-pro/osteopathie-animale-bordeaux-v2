import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  enabled: Boolean(import.meta.env.PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 1,
});
