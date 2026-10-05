// @ts-check

/** @typedef {Record<string, unknown>} PlainRecord */

/**
 * @param {unknown} value
 * @returns {value is PlainRecord}
 */
function isPlainRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {PlainRecord} record
 * @param {string} key
 * @returns {boolean}
 */
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function sanitizeTelemetryUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    const url = new globalThis.URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} value
 * @param {'name' | 'src'} urlKey
 * @returns {unknown}
 */
function sanitizeDiagnosticEntries(value, urlKey) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!isPlainRecord(entry)) {
      return entry;
    }

    const sanitizedEntry = { ...entry };

    if (hasOwn(entry, urlKey)) {
      sanitizedEntry[urlKey] = sanitizeTelemetryUrl(entry[urlKey]);
    }

    return sanitizedEntry;
  });
}

/**
 * @param {PlainRecord} debugContext
 * @returns {PlainRecord}
 */
function sanitizeDebugContext(debugContext) {
  const sanitizedContext = { ...debugContext };

  if (hasOwn(debugContext, 'href')) {
    sanitizedContext['href'] = sanitizeTelemetryUrl(debugContext['href']);
  }

  if (
    hasOwn(debugContext, 'scriptResources') &&
    Array.isArray(debugContext['scriptResources'])
  ) {
    sanitizedContext['scriptResources'] = sanitizeDiagnosticEntries(
      debugContext['scriptResources'],
      'name'
    );
  }

  if (
    hasOwn(debugContext, 'scriptTags') &&
    Array.isArray(debugContext['scriptTags'])
  ) {
    sanitizedContext['scriptTags'] = sanitizeDiagnosticEntries(
      debugContext['scriptTags'],
      'src'
    );
  }

  return sanitizedContext;
}

/**
 * @param {PlainRecord} contexts
 * @returns {PlainRecord}
 */
function sanitizeContexts(contexts) {
  const sanitizedContexts = { ...contexts };
  const debugContext = contexts['module_script_debug'];

  if (hasOwn(contexts, 'module_script_debug') && isPlainRecord(debugContext)) {
    sanitizedContexts['module_script_debug'] =
      sanitizeDebugContext(debugContext);
  }

  return sanitizedContexts;
}

/**
 * @param {PlainRecord} request
 * @returns {PlainRecord}
 */
function sanitizeRequest(request) {
  const sanitizedRequest = { ...request };

  Reflect.deleteProperty(sanitizedRequest, 'query_string');

  if (hasOwn(request, 'url')) {
    const sanitizedUrl = sanitizeTelemetryUrl(request['url']);

    if (sanitizedUrl === null) {
      Reflect.deleteProperty(sanitizedRequest, 'url');
    } else {
      sanitizedRequest['url'] = sanitizedUrl;
    }
  }

  return sanitizedRequest;
}

/**
 * @template {object} T
 * @param {T} event
 * @returns {T}
 */
export function sanitizeModuleDiagnosticEvent(event) {
  if (!isPlainRecord(event)) {
    return event;
  }

  const tags = event['tags'];

  if (!isPlainRecord(tags) || tags['module_script_failure'] !== 'true') {
    return event;
  }

  /** @type {PlainRecord} */
  const sanitizedFields = {};
  const contexts = event['contexts'];
  const request = event['request'];

  if (hasOwn(event, 'contexts') && isPlainRecord(contexts)) {
    sanitizedFields['contexts'] = sanitizeContexts(contexts);
  }

  if (hasOwn(event, 'request') && isPlainRecord(request)) {
    sanitizedFields['request'] = sanitizeRequest(request);
  }

  return Object.assign({}, event, sanitizedFields);
}
