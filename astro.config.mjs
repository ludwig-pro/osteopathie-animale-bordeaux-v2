import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import sentry from '@sentry/astro';
import { SITE_CONFIG } from './site.config.mjs';

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

const sentryIntegration = sentry({
  enabled: { client: true, server: false },
  ...(sentryAuthToken && sentryOrg && sentryProject
    ? {
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
      }
    : {}),
});

export default defineConfig({
  site: SITE_CONFIG.url,
  integrations: [react(), tailwind(), sitemap(), sentryIntegration],
  output: 'static',
  image: {
    responsiveStyles: true,
  },
  // adapter: netlify() retiré pour le mode statique
});
