# Plan 009: Strip sensitive URL data from Sentry module diagnostics

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Plan-corpus prerequisite (run first)**: `git diff --quiet HEAD -- plans && test -z "$(git ls-files --others --exclude-standard -- plans)" && test "$(git ls-files 'plans/*.md' | wc -l | tr -d ' ')" -eq 14 && git ls-files --error-unmatch plans/README.md plans/001-consent-gated-analytics.md plans/002-contact-form-validation.md plans/003-netlify-form-deploy-verification.md plans/004-directions-geolocation-fallback.md plans/005-mapbox-on-demand.md plans/006-module-recovery-reload-guard.md plans/007-ci-least-privilege.md plans/008-lighthouse-current-deploy-correlation.md plans/009-sentry-url-sanitization.md plans/010-responsive-content-images.md plans/011-remove-static-react-hydration.md plans/012-repository-wide-static-checks.md plans/013-horse-cattle-offer-spike.md >/dev/null`
> If this fails, STOP and ask the operator to commit the complete plan corpus
> before execution; do not stage or commit plans yourself.
>
> **Drift check (run second)**:
> `git diff --stat 9aece8f..HEAD -- sentry.client.config.ts src/lib/observability/sanitizeTelemetryUrl.js tests/unit/sanitizeTelemetryUrl.test.js`
> `git diff --stat HEAD -- sentry.client.config.ts src/lib/observability/sanitizeTelemetryUrl.js tests/unit/sanitizeTelemetryUrl.test.js`
> `git ls-files --others --exclude-standard -- sentry.client.config.ts src/lib/observability/sanitizeTelemetryUrl.js tests/unit/sanitizeTelemetryUrl.test.js`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

Sentry's default PII option is disabled, but custom module-failure diagnostics
explicitly attach the full page URL plus recent script/resource URLs. Query
strings and fragments can contain campaign identifiers, form context, or other
visitor-specific data that is unnecessary for diagnosing stale Astro chunks.
This plan retains the useful origin and pathname while deterministically
dropping query strings, fragments, credentials, malformed values, and
non-HTTP(S) URLs before an event leaves the browser.

## Current state

- `sentry.client.config.ts:44-48` initializes Sentry with a public DSN location
  and `sendDefaultPii: false`. Do not change DSN handling, enablement, tracing,
  or sampling in this plan.
- `getScriptResourceSnapshot()` currently copies each resource URL verbatim:

  ```ts
  // sentry.client.config.ts:18-25
  .map((entry) => ({
    name: entry.name,
    durationMs: Math.round(entry.duration),
    transferSize: entry.transferSize,
    decodedBodySize: entry.decodedBodySize,
    encodedBodySize: entry.encodedBodySize,
    nextHopProtocol: entry.nextHopProtocol,
  }));
  ```

- `getScriptTagSnapshot()` similarly copies `script.src` verbatim:

  ```ts
  // sentry.client.config.ts:33-41
  return Array.from(document.scripts)
    .slice(-20)
    .map((script) => ({
      src: script.src || null,
      type: script.type || null,
      async: script.async,
      defer: script.defer,
      crossOrigin: script.crossOrigin || null,
    }));
  ```

- The module-error context contains the complete current URL:

  ```ts
  // sentry.client.config.ts:61-71
  event.contexts = {
    ...event.contexts,
    module_script_debug: {
      href: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: ...,
      online: ...,
      scriptResources: getScriptResourceSnapshot(),
      scriptTags: getScriptTagSnapshot(),
    },
  };
  ```

- The Sentry SDK may also provide `event.request.url`; sanitize that field for
  the same targeted module-script events rather than assuming
  `sendDefaultPii: false` strips its query and fragment.
- This repository has no unit-test dependency, but Node 22.13 provides the
  built-in `node:test` runner. A small ESM JavaScript helper can be imported by
  both the TypeScript Sentry config and a dependency-free `.test.js` file.

## Commands you will need

| Purpose    | Command                                                                                                                               | Expected on success                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Install    | `yarn install --frozen-lockfile`                                                                                                      | exit 0 without changing `yarn.lock`     |
| Format     | `yarn prettier --write sentry.client.config.ts src/lib/observability/sanitizeTelemetryUrl.js tests/unit/sanitizeTelemetryUrl.test.js` | exit 0; only in-scope code is formatted |
| Unit test  | `node --test tests/unit/sanitizeTelemetryUrl.test.js`                                                                                 | all sanitizer cases pass                |
| Lint       | `yarn lint`                                                                                                                           | exit 0, no errors                       |
| Build      | `yarn build`                                                                                                                          | exit 0; Astro check and build succeed   |
| Full tests | `yarn test:e2e`                                                                                                                       | all Playwright tests pass               |
| Diff check | `git diff --check`                                                                                                                    | exit 0, no whitespace errors            |

## Scope

**In scope** (the only files you should modify):

- `sentry.client.config.ts`
- `src/lib/observability/sanitizeTelemetryUrl.js` (create)
- `tests/unit/sanitizeTelemetryUrl.test.js` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- Sentry DSN values, credentials, project settings, sampling rates, release
  configuration, source maps, or alerting.
- Removing module-script diagnostics or changing which events are tagged.
- Capturing query strings, fragments, form values, cookies, local storage, IP
  addresses, or user identity in another field.
- Analytics consent, PostHog, GTM, or ReCAPTCHA.
- Adding a test framework or dependency; use Node's built-in runner.
- Sanitizing every Sentry event type; this plan is scoped to the custom
  module-script diagnostic path.

## Git workflow

- Branch: `codex/009-sentry-url-sanitization`
- Make one logical commit with the short imperative message
  `fix: sanitize Sentry diagnostic URLs`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create fail-closed pure URL and event sanitizers

Create `src/lib/observability/sanitizeTelemetryUrl.js` with one named ESM
export `sanitizeTelemetryUrl` and one named ESM export
`sanitizeModuleDiagnosticEvent`. Add precise JSDoc types with no `any`, so
Astro's strict TypeScript check can infer both contracts when imported from the
Sentry config.

The function must:

1. Return `null` for non-string or empty values.
2. Parse only absolute URLs with `new globalThis.URL(value)`; do not supply a
   base URL. Using `globalThis.URL` keeps the helper valid in browsers and Node
   without expanding the repository's current ESLint globals.
3. Return `null` unless the protocol is exactly `http:` or `https:`.
4. Return only `${url.origin}${url.pathname}` for accepted URLs.
5. Catch parsing failures and return `null`.

This shape removes username/password, query, and hash data while retaining the
host and asset/page path needed to diagnose stale chunks. Do not log the input
when parsing fails.

`sanitizeModuleDiagnosticEvent` must be a side-effect-free transformation of a
Sentry-shaped plain object. Return the exact input object unchanged unless
`event.tags?.module_script_failure === 'true'`. For a targeted event, return
structural copies that preserve every unrelated event/context/request field
while applying `sanitizeTelemetryUrl` to exactly these final outbound fields:

- `contexts.module_script_debug.href`;
- every `contexts.module_script_debug.scriptResources[*].name`;
- every `contexts.module_script_debug.scriptTags[*].src`;
- `request.url`.

If a targeted `request.url` sanitizes to `null`, omit only that property from
the copied request object; preserve method, headers, and any other request
fields. Preserve `null` for rejected diagnostic href/resource/script values so
raw input is never retained. Do not mutate the input object or arrays.

**Verify**: `node -e "import('./src/lib/observability/sanitizeTelemetryUrl.js').then(({ sanitizeTelemetryUrl }) => { if (sanitizeTelemetryUrl('https://example.test/a.js?x=1#part') !== 'https://example.test/a.js') process.exit(1) })"` → exit 0.

### Step 2: Add dependency-free sanitizer tests

Create `tests/unit/sanitizeTelemetryUrl.test.js` using `node:test` and
`node:assert/strict`. Use obvious example domains and generic placeholder
parameters—never copy a real visitor URL or credential.

Cover at least these cases:

- an HTTPS page URL loses both query and fragment;
- an HTTP script URL retains origin and pathname;
- an absolute URL containing username/password does not return credentials;
- malformed and relative URLs return `null`;
- `data:`, `blob:`, and `javascript:` URLs return `null`;
- empty, `null`, and `undefined` inputs return `null`.

Also cover the complete event transformation, not just the scalar helper:

- one tagged module event contains credential/query/hash-bearing values in all
  four outbound locations; assert every output is origin plus pathname, no
  removed token survives anywhere in the serialized output, unrelated context
  and request fields are preserved, and the input fixture was not mutated;
- a malformed targeted `request.url` is absent from the result while its
  method and headers remain;
- a non-target event is returned by identity and remains deeply unchanged;
- a targeted event with missing optional context/request collections does not
  throw or invent fields.

**Verify**: `node --test tests/unit/sanitizeTelemetryUrl.test.js` → all cases pass with no input URL printed.

### Step 3: Route the final module event through the pure transformation

Import `sanitizeModuleDiagnosticEvent` in `sentry.client.config.ts`. Keep the
existing target detection, bounded snapshot collection, tag assignment, and
context construction. Make the final return from `beforeSend` pass the complete
event through `sanitizeModuleDiagnosticEvent`; non-module events must also take
that return path so the helper's unchanged-event behavior is exercised by the
same integration. Do not leave another target return path that can bypass the
transformation, and do not ignore its returned copy.

The transformation—not scattered call sites in the snapshot collectors—owns
sanitization of `entry.name`, `script.src`, `window.location.href`, and
`event.request.url`. This makes the unit fixture match the final event shape
sent by `beforeSend` and prevents a future collector refactor from bypassing
one field.

Do not sanitize by regular-expression replacement, because encoded or unusual
fragments are easy to miss. Do not add the removed query/hash data to tags,
breadcrumbs, exception messages, or logs.

**Verify**: `test "$(rg -c "return sanitizeModuleDiagnosticEvent\(event\)" sentry.client.config.ts)" -eq 1 && rg -n "sanitizeModuleDiagnosticEvent|module_script_failure" sentry.client.config.ts src/lib/observability/sanitizeTelemetryUrl.js` → `beforeSend` has one final transformation return and the helper targets the existing module-failure tag.

### Step 4: Run type, lint, unit, and regression gates

The helper is plain JavaScript but is included under `src`, so `yarn lint` and
Astro's strict check must accept its JSDoc contract. Run the browser suite to
ensure Sentry setup still bundles with the page.

**Verify**: `yarn prettier --write sentry.client.config.ts src/lib/observability/sanitizeTelemetryUrl.js tests/unit/sanitizeTelemetryUrl.test.js && node --test tests/unit/sanitizeTelemetryUrl.test.js && yarn lint && yarn build && yarn test:e2e && git diff --check` → every command exits 0.

## Test plan

- Add `tests/unit/sanitizeTelemetryUrl.test.js` with scalar protocol,
  credential, query/fragment, malformed, relative, and empty-value cases plus
  complete tagged-event transformation cases.
- Test both pure exports rather than importing `sentry.client.config.ts`, which
  would initialize the SDK as a side effect.
- Assert all four final outbound fields together, invalid request-URL deletion,
  preservation of other request fields, input immutability, and unchanged
  non-target events.
- Rely on `yarn build` for strict import/type integration and the existing
  Playwright suite for application bundling regression coverage.
- Verification: `node --test tests/unit/sanitizeTelemetryUrl.test.js` → all
  sanitizer cases pass; `yarn build` and `yarn test:e2e` → integration remains
  green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] The sanitizer returns only origin plus pathname for HTTP(S) URLs.
- [ ] Query strings, fragments, credentials, relative URLs, malformed values,
      and non-HTTP(S) protocols never appear in sanitizer output.
- [ ] One behavior-level unit fixture proves page href, resource timing names,
      script tag sources, and Sentry request URL are all sanitized in the final
      tagged event object.
- [ ] Invalid targeted request URLs are omitted without dropping other request
      fields; non-target events are returned unchanged.
- [ ] `sendDefaultPii`, DSN handling, sampling, event targeting, and diagnostic
      size limits remain unchanged.
- [ ] `node --test tests/unit/sanitizeTelemetryUrl.test.js` exits 0.
- [ ] Targeted Prettier formatting exits 0 and touches only in-scope files.
- [ ] `yarn lint`, `yarn build`, and `yarn test:e2e` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The custom module-error context no longer matches the current-state excerpt
  or has moved to server-side code.
- The Sentry event type does not permit sanitizing or deleting
  `event.request.url` without unsafe casts or mutation of unrelated events.
- Astro's strict check cannot consume the JSDoc helper without disabling type
  checking, adding `any`, or changing repository-wide TypeScript settings.
- A useful diagnostic unexpectedly requires query, fragment, credential, or
  non-HTTP(S) data; report the concrete case instead of weakening sanitation.
- Implementation or testing would require a real DSN, credential, visitor URL,
  or outbound Sentry event.
- A verification command fails twice after one reasonable correction attempt.

## Maintenance notes

- Apply `sanitizeTelemetryUrl` to any future custom Sentry field that records a
  browser or resource URL. Do not assume SDK defaults cover custom contexts.
- A reviewer should inspect the final Sentry event object and confirm no
  unsanitized URL is copied under another field.
- Node unit tests are intentionally dependency-free. Plan 012 wires
  `tests/unit/*.test.js` into the final CI gate; do not add a separate framework
  for this helper alone.
- If path segments themselves later carry sensitive identifiers, revisit the
  policy to retain only origin plus a normalized asset class.
