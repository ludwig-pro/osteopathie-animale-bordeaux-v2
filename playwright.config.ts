import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  webServer: {
    // Keep the server in the foreground when Astro detects an agent.
    command:
      'yarn build && yarn preview --ignore-lock --host 127.0.0.1 --port 4321',
    env: {
      PUBLIC_GTM_ID: 'GTM-TESTCONSENT',
      PUBLIC_POSTHOG_KEY: 'phc_test_consent',
      PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
      PUBLIC_SENTRY_DSN: '',
    },
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !isCI,
    timeout: 360000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
