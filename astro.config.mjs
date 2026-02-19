import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sentry from '@sentry/astro';

const sentryDsn = process.env.PUBLIC_SENTRY_DSN;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

const sentryIntegration = sentryDsn
  ? sentry({
      dsn: sentryDsn,
      sourceMapsUploadOptions:
        sentryAuthToken && sentryOrg && sentryProject
          ? {
              authToken: sentryAuthToken,
              org: sentryOrg,
              project: sentryProject,
            }
          : undefined,
    })
  : null;

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
    ...(sentryIntegration ? [sentryIntegration] : []),
  ],
  output: 'static',
  image: {
    responsiveStyles: true,
  },
  // adapter: netlify() retiré pour le mode statique
});
