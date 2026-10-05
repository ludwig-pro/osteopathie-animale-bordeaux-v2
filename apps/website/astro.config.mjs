import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sentry from '@sentry/astro';

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
  integrations: [react(), sentryIntegration],
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
  compressHTML: true,
  image: {
    responsiveStyles: true,
  },
  // adapter: netlify() retiré pour le mode statique
});
