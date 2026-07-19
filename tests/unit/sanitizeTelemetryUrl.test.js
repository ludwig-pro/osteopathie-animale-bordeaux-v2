import assert from 'node:assert/strict';
import test from 'node:test';

import {
  sanitizeModuleDiagnosticEvent,
  sanitizeTelemetryUrl,
} from '../../src/lib/observability/sanitizeTelemetryUrl.js';

test('removes query and fragment from an HTTPS page URL', () => {
  assert.equal(
    sanitizeTelemetryUrl(
      'https://example.test/contact?campaign=summer#appointment'
    ),
    'https://example.test/contact'
  );
});

test('retains the origin and pathname of an HTTP script URL', () => {
  assert.equal(
    sanitizeTelemetryUrl('http://assets.example.test/build/entry.js'),
    'http://assets.example.test/build/entry.js'
  );
});

test('removes credentials from an absolute URL', () => {
  assert.equal(
    sanitizeTelemetryUrl(
      'https://placeholder-user:placeholder-pass@example.test/private.js'
    ),
    'https://example.test/private.js'
  );
});

test('rejects malformed and relative URLs', () => {
  assert.equal(sanitizeTelemetryUrl('not a URL'), null);
  assert.equal(sanitizeTelemetryUrl('/build/entry.js?token=placeholder'), null);
});

test('rejects non-HTTP protocols', () => {
  assert.equal(sanitizeTelemetryUrl('data:text/plain,placeholder'), null);
  assert.equal(
    sanitizeTelemetryUrl('blob:https://example.test/placeholder'),
    null
  );
  assert.equal(sanitizeTelemetryUrl('javascript:void(0)'), null);
});

test('rejects empty and non-string values', () => {
  assert.equal(sanitizeTelemetryUrl(''), null);
  assert.equal(sanitizeTelemetryUrl(null), null);
  assert.equal(sanitizeTelemetryUrl(undefined), null);
  assert.equal(sanitizeTelemetryUrl(42), null);
});

test('sanitizes every URL-bearing field on a tagged module event immutably', () => {
  const event = {
    message: 'Importing a module script failed.',
    tags: {
      module_script_failure: 'true',
      environment: 'test',
    },
    contexts: {
      runtime: {
        name: 'browser',
      },
      module_script_debug: {
        href: 'https://page-user:page-pass@example.test/contact?page=secret#form',
        userAgent: 'Example Browser',
        scriptResources: [
          {
            name: 'https://resource-user:resource-pass@example.test/build/app.js?resource=secret#chunk',
            durationMs: 12,
          },
        ],
        scriptTags: [
          {
            src: 'https://script-user:script-pass@example.test/build/runtime.js?script=secret#entry',
            type: 'module',
          },
        ],
      },
    },
    request: {
      url: 'https://request-user:request-pass@example.test/contact?request=secret#submit',
      query_string: 'request=secret',
      method: 'GET',
      headers: {
        accept: 'text/html',
      },
    },
    extra: {
      retained: true,
    },
  };
  const original = structuredClone(event);

  const result = sanitizeModuleDiagnosticEvent(event);

  assert.notStrictEqual(result, event);
  assert.notStrictEqual(result.contexts, event.contexts);
  assert.notStrictEqual(
    result.contexts.module_script_debug,
    event.contexts.module_script_debug
  );
  assert.notStrictEqual(
    result.contexts.module_script_debug.scriptResources,
    event.contexts.module_script_debug.scriptResources
  );
  assert.notStrictEqual(
    result.contexts.module_script_debug.scriptResources[0],
    event.contexts.module_script_debug.scriptResources[0]
  );
  assert.notStrictEqual(
    result.contexts.module_script_debug.scriptTags[0],
    event.contexts.module_script_debug.scriptTags[0]
  );
  assert.notStrictEqual(result.request, event.request);
  assert.equal(
    result.contexts.module_script_debug.href,
    'https://example.test/contact'
  );
  assert.equal(
    result.contexts.module_script_debug.scriptResources[0].name,
    'https://example.test/build/app.js'
  );
  assert.equal(
    result.contexts.module_script_debug.scriptTags[0].src,
    'https://example.test/build/runtime.js'
  );
  assert.equal(result.request.url, 'https://example.test/contact');
  assert.equal(Object.hasOwn(result.request, 'query_string'), false);
  assert.equal(result.request.method, 'GET');
  assert.deepEqual(result.request.headers, {
    accept: 'text/html',
  });
  assert.deepEqual(result.contexts.runtime, {
    name: 'browser',
  });
  assert.deepEqual(result.extra, {
    retained: true,
  });
  assert.deepEqual(event, original);

  const serialized = JSON.stringify(result);
  for (const removedValue of [
    'page-user',
    'page-pass',
    'page=secret',
    'resource-user',
    'resource-pass',
    'resource=secret',
    'script-user',
    'script-pass',
    'script=secret',
    'request-user',
    'request-pass',
    'request=secret',
  ]) {
    assert.equal(serialized.includes(removedValue), false);
  }
});

test('omits an invalid targeted request URL while preserving request metadata', () => {
  const event = {
    tags: {
      module_script_failure: 'true',
    },
    request: {
      url: 'not a valid absolute URL',
      query_string: 'token=placeholder',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    },
  };

  const result = sanitizeModuleDiagnosticEvent(event);

  assert.equal(Object.hasOwn(result.request, 'url'), false);
  assert.equal(Object.hasOwn(result.request, 'query_string'), false);
  assert.equal(result.request.method, 'POST');
  assert.deepEqual(result.request.headers, {
    'content-type': 'application/json',
  });
  assert.deepEqual(event.request, {
    url: 'not a valid absolute URL',
    query_string: 'token=placeholder',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });
});

test('replaces invalid diagnostic href and collection URLs with null', () => {
  const event = {
    tags: {
      module_script_failure: 'true',
    },
    contexts: {
      module_script_debug: {
        href: '/relative/page?token=placeholder',
        scriptResources: [
          {
            name: 'data:text/javascript,placeholder',
            durationMs: 3,
          },
        ],
        scriptTags: [
          {
            src: 'blob:https://example.test/placeholder',
            type: 'module',
          },
        ],
      },
    },
  };
  const original = structuredClone(event);

  const result = sanitizeModuleDiagnosticEvent(event);
  const debug = result.contexts.module_script_debug;

  assert.equal(debug.href, null);
  assert.equal(debug.scriptResources[0].name, null);
  assert.equal(debug.scriptTags[0].src, null);
  assert.deepEqual(event, original);
});

test('returns a non-target event by identity without changing it', () => {
  const event = {
    tags: {
      module_script_failure: 'false',
    },
    contexts: {
      module_script_debug: {
        href: 'https://example.test/contact?retained=yes#retained',
      },
    },
    request: {
      url: 'https://example.test/contact?retained=yes#retained',
      query_string: 'retained=yes',
    },
  };
  const original = structuredClone(event);

  const result = sanitizeModuleDiagnosticEvent(event);

  assert.strictEqual(result, event);
  assert.deepEqual(result, original);
});

test('does not invent optional fields on a sparse targeted event', () => {
  const event = {
    tags: {
      module_script_failure: 'true',
    },
    message: 'Importing a module script failed.',
  };

  const result = sanitizeModuleDiagnosticEvent(event);

  assert.notStrictEqual(result, event);
  assert.equal(Object.hasOwn(result, 'contexts'), false);
  assert.equal(Object.hasOwn(result, 'request'), false);
  assert.deepEqual(result, event);
});

test('keeps partial existing structures sparse', () => {
  const event = {
    tags: {
      module_script_failure: 'true',
    },
    contexts: {
      module_script_debug: {
        userAgent: 'Example Browser',
        scriptResources: [
          {
            durationMs: 5,
          },
        ],
        scriptTags: [
          {
            type: 'module',
          },
        ],
      },
    },
    request: {
      method: 'GET',
    },
  };

  const result = sanitizeModuleDiagnosticEvent(event);
  const debug = result.contexts.module_script_debug;

  assert.equal(Object.hasOwn(debug, 'href'), false);
  assert.equal(Object.hasOwn(debug.scriptResources[0], 'name'), false);
  assert.equal(Object.hasOwn(debug.scriptTags[0], 'src'), false);
  assert.equal(Object.hasOwn(result.request, 'url'), false);
  assert.equal(Object.hasOwn(result.request, 'query_string'), false);
  assert.deepEqual(result, event);
  assert.notStrictEqual(result, event);
  assert.notStrictEqual(result.request, event.request);
  assert.notStrictEqual(debug, event.contexts.module_script_debug);
});
