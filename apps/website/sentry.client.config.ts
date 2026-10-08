import * as Sentry from '@sentry/astro';

import { BROWSER_EXTENSION_IGNORE_ERRORS } from './src/lib/observability/browserExtensionNoise.js';
import { sanitizeModuleDiagnosticEvent } from './src/lib/observability/sanitizeTelemetryUrl.js';

const MODULE_SCRIPT_ERROR_MESSAGE = 'Importing a module script failed.';

function getScriptResourceSnapshot() {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return [];
  }

  return performance
    .getEntriesByType('resource')
    .filter(
      (entry): entry is PerformanceResourceTiming =>
        entry instanceof PerformanceResourceTiming &&
        entry.initiatorType === 'script'
    )
    .slice(-20)
    .map((entry) => ({
      name: entry.name,
      durationMs: Math.round(entry.duration),
      transferSize: entry.transferSize,
      decodedBodySize: entry.decodedBodySize,
      encodedBodySize: entry.encodedBodySize,
      nextHopProtocol: entry.nextHopProtocol,
    }));
}

function getScriptTagSnapshot() {
  if (typeof document === 'undefined') {
    return [];
  }

  return Array.from(document.scripts)
    .slice(-20)
    .map((script) => ({
      src: script.src || null,
      type: script.type || null,
      async: script.async,
      defer: script.defer,
      crossOrigin: script.crossOrigin === '' ? null : script.crossOrigin,
    }));
}

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  enabled: Boolean(import.meta.env.PUBLIC_SENTRY_DSN),
  // Preserve the restricted collection used by sendDefaultPii: false in v10.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
    },
    httpBodies: [],
    urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
  },
  tracesSampleRate: 1,
  ignoreErrors: BROWSER_EXTENSION_IGNORE_ERRORS,
  beforeSend(event) {
    const message = event.message ?? event.exception?.values?.[0]?.value;

    if (message?.includes(MODULE_SCRIPT_ERROR_MESSAGE)) {
      event.tags = {
        ...event.tags,
        module_script_failure: 'true',
      };

      event.contexts = {
        ...event.contexts,
        module_script_debug: {
          href: typeof window !== 'undefined' ? window.location.href : null,
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : null,
          online:
            typeof navigator !== 'undefined' ? navigator.onLine : undefined,
          scriptResources: getScriptResourceSnapshot(),
          scriptTags: getScriptTagSnapshot(),
        },
      };
    }

    return sanitizeModuleDiagnosticEvent(event);
  },
});
