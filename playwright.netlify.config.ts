import { execFileSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';

const NETLIFY_SITE_HOST = 'hopeful-lumiere-46fc2e.netlify.app';

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set`);
  }

  return value;
}

const deployId = requireEnvironmentVariable('NETLIFY_FORM_TEST_DEPLOY_ID');
const commitSha = requireEnvironmentVariable('NETLIFY_FORM_TEST_COMMIT_SHA');
const configuredUrl = requireEnvironmentVariable('NETLIFY_FORM_TEST_URL');

if (!/^[0-9a-f]{24}$/.test(deployId)) {
  throw new Error(
    'NETLIFY_FORM_TEST_DEPLOY_ID must be 24 lowercase hexadecimal characters'
  );
}

if (!/^[0-9a-f]{40}$/.test(commitSha)) {
  throw new Error(
    'NETLIFY_FORM_TEST_COMMIT_SHA must be a full lowercase 40-character SHA'
  );
}

const localCommitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim();

if (commitSha !== localCommitSha) {
  throw new Error(
    'NETLIFY_FORM_TEST_COMMIT_SHA must exactly match the local HEAD'
  );
}

let atomicUrl: URL;

try {
  atomicUrl = new URL(configuredUrl);
} catch {
  throw new Error('NETLIFY_FORM_TEST_URL must be a valid URL');
}

const expectedHostname = `${deployId}--${NETLIFY_SITE_HOST}`;

if (atomicUrl.protocol !== 'https:') {
  throw new Error('NETLIFY_FORM_TEST_URL must use HTTPS');
}

if (atomicUrl.username || atomicUrl.password) {
  throw new Error('NETLIFY_FORM_TEST_URL must not contain credentials');
}

if (atomicUrl.port) {
  throw new Error('NETLIFY_FORM_TEST_URL must not contain an explicit port');
}

if (atomicUrl.hostname !== expectedHostname) {
  throw new Error(
    'NETLIFY_FORM_TEST_URL must use the exact atomic deploy hostname for the configured site and deploy ID'
  );
}

if (atomicUrl.pathname !== '/') {
  throw new Error('NETLIFY_FORM_TEST_URL pathname must be /');
}

if (atomicUrl.search) {
  throw new Error('NETLIFY_FORM_TEST_URL must not contain a query');
}

if (atomicUrl.hash) {
  throw new Error('NETLIFY_FORM_TEST_URL must not contain a fragment');
}

if (configuredUrl !== `https://${expectedHostname}/`) {
  throw new Error(
    'NETLIFY_FORM_TEST_URL must exactly match the canonical atomic URL without an explicit default port'
  );
}

export default defineConfig({
  testDir: './tests/netlify',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: atomicUrl.href,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
