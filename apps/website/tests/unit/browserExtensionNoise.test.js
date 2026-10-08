import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BrowserClient,
  createTransport,
  defaultStackParser,
  eventFiltersIntegration,
} from '@sentry/browser';

import { BROWSER_EXTENSION_IGNORE_ERRORS } from '../../src/lib/observability/browserExtensionNoise.js';

const WEBKIT_EXTENSION_MESSAGE =
  'Invalid call to runtime.sendMessage(). Tab not found.';
const SITE_ERROR_MESSAGE = 'Cannot read properties of undefined (reading map)';

function createRecordingClient() {
  const sentMessages = [];
  const client = new BrowserClient({
    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
    stackParser: defaultStackParser,
    integrations: [eventFiltersIntegration()],
    ignoreErrors: BROWSER_EXTENSION_IGNORE_ERRORS,
    transport: (options) =>
      createTransport(options, async (request) => {
        // An envelope is a header line followed by item header and payload line pairs.
        const lines = String(request.body).split('\n');
        for (let index = 1; index < lines.length; index += 2) {
          if (JSON.parse(lines[index]).type === 'event') {
            const event = JSON.parse(lines[index + 1]);
            sentMessages.push(event.exception.values[0].value);
          }
        }
        return { statusCode: 200 };
      }),
  });
  client.init();
  return { client, sentMessages };
}

test('drops the Safari WebExtension runtime.sendMessage rejection and keeps a site error', async () => {
  const { client, sentMessages } = createRecordingClient();
  const extensionError = new Error(WEBKIT_EXTENSION_MESSAGE);
  extensionError.stack = '';

  client.captureException(extensionError, {
    mechanism: {
      handled: false,
      type: 'auto.browser.global_handlers.onunhandledrejection',
    },
  });
  client.captureException(new TypeError(SITE_ERROR_MESSAGE), {
    mechanism: {
      handled: false,
      type: 'auto.browser.global_handlers.onunhandledrejection',
    },
  });
  await client.flush(2000);

  assert.deepEqual(sentMessages, [SITE_ERROR_MESSAGE]);
});
