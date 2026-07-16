# Plan 006: Prevent repeated module-recovery reloads when storage is blocked

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
> `git diff --stat 20bc0f7..HEAD -- src/layouts/BaseLayout.astro tests/e2e/module-script-recovery.spec.ts`
> `git diff --stat HEAD -- src/layouts/BaseLayout.astro tests/e2e/module-script-recovery.spec.ts`
> `git ls-files --others --exclude-standard -- src/layouts/BaseLayout.astro tests/e2e/module-script-recovery.spec.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Earlier plans may have changed
> unrelated sections of `BaseLayout.astro`; that alone is not a mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/005-mapbox-on-demand.md`
- **Category**: bug
- **Planned at**: commit `20bc0f7`, 2026-07-16

## Why this matters

The stale-Astro-chunk recovery script is intended to reload at most once. Its
cross-reload guard is stored only in `sessionStorage`; when that API throws,
the fallback guard exists only in memory and resets on every navigation. A
persistent module failure can therefore trap privacy-restricted browsers in an
unbounded reload loop. This plan adds a one-shot `history.state` fallback that
survives reloads regardless of which chunk fails next, and fails closed—without
reloading—if no cross-reload marker can be written.

## Current state

- `src/layouts/BaseLayout.astro:63-182` contains a deliberately plain inline
  script in `<head>` so it can listen before Astro module scripts fail. Keep it
  dependency-free and compatible with direct browser execution.
- The current guard is initialized for each document:

  ```js
  // src/layouts/BaseLayout.astro:65,72
  var RECOVERY_KEY_PREFIX = 'module-script-recovery:';
  var hasRecoveryAttempted = false;
  ```

- `reloadOnce` currently treats a `sessionStorage` exception as permission to
  reload with only the per-document boolean protecting it:

  ```js
  // src/layouts/BaseLayout.astro:132-150
  var reloadOnce = function (event) {
    if (hasRecoveryAttempted) {
      return;
    }

    var storageKey = getRecoveryKey(event);

    try {
      if (w.sessionStorage.getItem(storageKey) === '1') {
        return;
      }

      w.sessionStorage.setItem(storageKey, '1');
    } catch (_error) {
      // Ignore sessionStorage errors and fall back to an in-memory guard.
    }

    hasRecoveryAttempted = true;
    w.location.reload();
  };
  ```

- `tests/e2e/module-script-recovery.spec.ts` has one positive regression test.
  It makes the first `/_astro/*.js` request fail and then allows later module
  requests, expecting at least two main-frame navigations. Preserve this test.
- `history.state` belongs to the current browser history entry and survives a
  normal reload. When updating it, preserve every pre-existing state property;
  this site or Astro may use the same object later.

## Commands you will need

| Purpose       | Command                                                                                          | Expected on success                                           |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Install       | `yarn install --frozen-lockfile`                                                                 | exit 0 without changing `yarn.lock`                           |
| Format        | `yarn prettier --write src/layouts/BaseLayout.astro tests/e2e/module-script-recovery.spec.ts`    | exit 0; both in-scope files are formatted                     |
| Lint          | `yarn lint`                                                                                      | exit 0, no errors                                             |
| Build         | `yarn build`                                                                                     | exit 0; Astro check and static build succeed                  |
| Focused tests | `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/module-script-recovery.spec.ts` | a fresh isolated server runs and all four recovery tests pass |
| Full tests    | `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`                                          | a fresh isolated server runs and all Playwright tests pass    |
| Diff check    | `git diff --check`                                                                               | exit 0, no whitespace errors                                  |

## Scope

**In scope** (the only files you should modify):

- `src/layouts/BaseLayout.astro`, only the inline module-recovery script
- `tests/e2e/module-script-recovery.spec.ts`
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- Analytics, consent, structured data, preconnects, or other layout markup.
- Service-worker cleanup behavior.
- Sentry reporting or module-error diagnostics.
- Changing which module errors trigger recovery.
- Adding a query parameter, fragment, cookie, local-storage key, or third-party
  storage dependency as the fallback marker.
- Retrying more than once or adding timers/backoff.

## Git workflow

- Branch: `improve`
- Make one logical commit with the short imperative message
  `fix: prevent repeated module recovery reloads`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a namespaced one-shot history-state fallback

Inside the existing inline recovery IIFE in `BaseLayout.astro`, add a private
constant such as `HISTORY_STATE_KEY = '__moduleScriptRecoveryAttempted'`. Add
two plain functions:

1. A reader that returns whether `w.history.state[HISTORY_STATE_KEY] === true`.
   It must catch History API access failures and return `false`.
2. A writer that shallow-copies an object-valued `w.history.state` with
   `Object.assign`, stores `true` under `HISTORY_STATE_KEY`, and
   calls `w.history.replaceState(nextState, '', w.location.href)`. It must
   return `true` only after the call succeeds and `false` if it throws.

Do not replace the whole state object in place, do not mutate a pre-existing
object, and do not put a resource URL, current page URL, or error message into
the fallback marker. This History API fallback is deliberately one-shot for
the current history entry; `sessionStorage` keeps its existing resource keys
when available.

**Verify**: `rg -n "HISTORY_STATE_KEY|history\.state|Object\.assign|history\.replaceState" src/layouts/BaseLayout.astro` → the constant, reader, preserving copy, and writer are all present.

### Step 2: Fail closed when no persistent guard is available

Refactor only `reloadOnce` so the control flow is explicit:

1. Keep the existing per-document `hasRecoveryAttempted` early return.
2. Compute `storageKey` exactly as today.
3. Try the current `sessionStorage` read and write. If both succeed, keep the
   existing behavior.
4. If either storage operation throws, read the one-shot history marker. If it
   is already `true`, return without reloading regardless of which resource
   failed this time.
5. If no marker exists, attempt to write it. If that write fails, set
   `hasRecoveryAttempted = true` and return **without calling reload**. A stale
   page is preferable to an unbounded reload loop.
6. Only after either `sessionStorage` or `history.state` has durably recorded
   the attempt, set `hasRecoveryAttempted = true` and call
   `w.location.reload()` once.

Keep the successful `sessionStorage` path resource-specific. The conservative
one-shot fallback applies only when session storage is unavailable and resets
naturally on a new browser history entry.

**Verify**: `sed -n '120,190p' src/layouts/BaseLayout.astro` → manual inspection shows every `location.reload()` path is preceded by a successful persistent marker, and a failed History API write returns without reloading.

### Step 3: Reproduce both fallback and fail-closed paths

First replace the existing `framenavigated` counter with a test-local helper
that counts only real main-frame document requests:

- listen to `page.on('request', ...)`;
- increment only when `request.isNavigationRequest()` is true,
  `request.resourceType() === 'document'`, and
  `request.frame() === page.mainFrame()`.

Use this helper in the existing positive test and all three new tests.
`history.replaceState(...)` also emits Playwright's `framenavigated` event even
though no document reload occurred, so `framenavigated` would make these
assertions false-positive.

In the existing transient-failure test, wait for two document requests, then
use the same 1,500 ms stabilization window and require the count to remain
exactly two. This preserves the positive recovery proof while also ruling out
an unnoticed extra reload.

Add three Playwright tests to the existing describe block. In all three, before
navigation use `page.addInitScript` to override `getItem` and `setItem` on that
page's `sessionStorage` instance so they throw a synthetic `SecurityError`; do
not alter `Storage.prototype` or `localStorage`. Assert the overrides are active
after navigation. For the persistent-failure and fail-closed tests, route
**every** `**/_astro/*.js` request to the same 404 response shape used by the
existing test so the module failure persists.

For the history-fallback test, the init script must also seed a sentinel
property in `history.state` only when the state is initially absent. Do not
overwrite state on the reloaded document, because it must already contain the
sentinel plus the recovery marker. Navigate to `/`, wait until the main-frame
document request count reaches 2, then wait a short, bounded stabilization
period of 1,500 ms and assert the count is still exactly 2. Assert the sentinel
property is preserved, the recovery marker is `true`, and the server-rendered
online-booking CTA remains visible. Give this test a descriptive name
containing `does not loop when sessionStorage is blocked`.

For the alternating-resource test, fail one generated Astro module on the
first document, then allow that module and fail a different generated Astro
module on the reloaded document; all non-selected module requests must continue
normally. Select the first failed URL while the document request count is 1,
then the first distinct URL while the count is 2. Record both and explicitly
assert that two distinct module URLs were actually failed; otherwise the
fixture has not proved the alternating-resource case and must fail. After the
same 1,500 ms stabilization period, assert the document request count remains
exactly 2. This is the regression that a scalar resource-key history marker
would miss: the second failed chunk must not trigger a second recovery reload.

For the fail-closed test, additionally make `history.replaceState` throw a
synthetic `SecurityError`. After navigation and the same stabilization period,
assert the main-frame document request count is exactly 1: recovery did not
reload because it could not write any persistent marker. Assert the
server-rendered CTA remains visible. Restore nothing manually; each test gets a
fresh page.

Before this first focused Playwright run, require
`git diff --quiet HEAD -- .astro` and record the hashes of all tracked `.astro`
files. After the run, restore only
`.astro/settings.json:_variables.lastUpdateCheck` with `apply_patch` if it is
the sole generated difference; STOP on any other `.astro` drift.

**Verify**: run
`CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/module-script-recovery.spec.ts`,
inspect/restore the allowed timestamp, then run
`git diff --quiet HEAD -- .astro` → the existing transient recovery plus the
blocked-storage, alternating-resource, and no-persistent-marker tests all pass
(four tests total) on a fresh analytics-isolated server, with no remaining
tracked `.astro` drift.

### Step 4: Run repository gates and inspect the diff

Run the complete suite after the focused tests. Confirm no unrelated part of
`BaseLayout.astro` changed. Reuse the clean `.astro` baseline captured before
Step 3. Inspect tracked `.astro` files after `yarn build` and after the full
Playwright run; restore only the known `lastUpdateCheck` value and STOP on any
other generated drift.

**Verify**: run targeted Prettier, `yarn lint`, and `yarn build`; inspect and
restore the allowed timestamp. Then run
`CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`; inspect and restore
again. Finish with `git diff --check && git diff --quiet HEAD -- .astro` →
every command exits 0 on a fresh analytics-isolated server and no tracked
`.astro` drift remains.

## Test plan

- Keep the existing test that fails one module request and proves one recovery
  reload succeeds.
- Add one regression test that blocks `sessionStorage`, persistently fails all
  Astro module requests, proves there is exactly one recovery reload, and
  proves the static page remains visible.
- Add one fail-closed test that also blocks `history.replaceState`, proves there
  is no recovery reload, and proves the static page remains visible.
- Add one alternating-resource test that fails different chunk URLs before and
  after the first reload and proves the one-shot fallback still stops at two
  navigations.
- Model the 404 response and main-frame document-request counter directly on
  the existing test; a small test-local helper is acceptable to keep the three
  blocked-storage fixtures consistent, but do not add a production helper.
- Verification:
  `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/module-script-recovery.spec.ts`
  → four tests pass;
  `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e` → the full suite
  passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `yarn lint` exits 0.
- [ ] `yarn build` exits 0.
- [ ] Targeted Prettier formatting exits 0 and touches only in-scope files.
- [ ] `yarn test:e2e` exits 0, including all four module-recovery cases.
- [ ] Tests count only real main-frame document requests; `history.replaceState`
      cannot inflate the reload count.
- [ ] A one-shot `history.state` marker survives the first recovery reload when
      `sessionStorage` throws and blocks a second reload even if another chunk
      fails first.
- [ ] If both storage and History APIs throw, recovery performs zero reloads.
- [ ] Existing `history.state` properties are preserved.
- [ ] The alternating-resource fixture proves that two distinct module URLs
      actually failed across the two documents.
- [ ] Focused and full Playwright runs use a fresh server with empty GTM and
      PostHog keys.
- [ ] Tracked `.astro` files match `HEAD` after restoring only the known
      `lastUpdateCheck` artifact.
- [ ] No URL query, fragment, cookie, or local-storage marker is added.
- [ ] `git diff --check` exits 0.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The recovery trigger list or `reloadOnce` no longer matches the current-state
  excerpts after accounting for unrelated earlier-plan changes.
- Plan 005 is not complete or its `BaseLayout.astro` changes cannot be
  preserved while editing only the recovery IIFE.
- Testing proves `history.state` does not survive `location.reload()` in the
  configured Chromium project.
- A test cannot override only the page's `sessionStorage` instance without also
  changing `localStorage` or global `Storage.prototype`.
- Preserving an existing non-object history state requires changing unrelated
  router/navigation behavior.
- The only apparent fix requires a visible URL marker, cookie, server change,
  service worker, or additional dependency.
- The existing transient-failure test stops recovering after this change.
- A tracked `.astro` file changes beyond
  `.astro/settings.json:_variables.lastUpdateCheck`.
- A verification command fails twice after one reasonable correction attempt.

## Maintenance notes

- Treat inability to write a persistent marker as a reason not to reload. Any
  future retry strategy must retain that fail-closed property.
- Keep the History API fallback one-shot per history entry. It is intentionally
  more conservative than the resource-specific `sessionStorage` path because
  it must prevent alternating chunk failures from causing a loop.
- A reviewer should scrutinize the exact count of navigations and confirm that
  the test blocks only `sessionStorage`, not all browser storage.
- Sentry URL sanitization is handled by Plan 009 and must not be folded into
  this change.
