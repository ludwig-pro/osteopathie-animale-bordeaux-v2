// @ts-check

/**
 * Sentry `ignoreErrors` patterns for errors that browser extensions raise
 * inside the page. Safari dispatches a content script's unhandled rejection
 * on the page window, and WebKit creates the error natively with no stack
 * frames, so `denyUrls` cannot match it. The message is the only handle.
 *
 * @type {Array<string | RegExp>}
 */
export const BROWSER_EXTENSION_IGNORE_ERRORS = [
  // WebKit WebExtensionContextAPIRuntimeCocoa.mm: runtime.sendMessage() from a
  // content script whose tab is gone. Seen with 1Password on iOS Safari.
  /Invalid call to runtime\.sendMessage\(\)/,
];
