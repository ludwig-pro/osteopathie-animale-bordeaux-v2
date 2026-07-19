# Plan 005: Load the interactive Mapbox map only on user request

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
> `git diff --stat 46038cb..HEAD -- src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/hooks/useHasMounted.ts tests/e2e/map-on-demand.spec.ts`
> `git diff --stat HEAD -- src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/hooks/useHasMounted.ts tests/e2e/map-on-demand.spec.ts`
> `git ls-files --others --exclude-standard -- src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/hooks/useHasMounted.ts tests/e2e/map-on-demand.spec.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Changes made by completed Plan 004 in
> `MapSection.tsx` are expected; preserve its itinerary behavior and stop only
> if it makes the loading design below incompatible. Plan 001 was rejected and
> is not a dependency. `MapBox.tsx` is now an implementation file because the
> first execution proved that its side-effect CSS import is hoisted into the
> initial Astro HTML even behind `React.lazy`.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/004-directions-geolocation-fallback.md`
- **Category**: perf
- **Planned at**: commit `46038cb`, 2026-07-16

## Why this matters

The map island currently imports Mapbox eagerly as soon as the section enters
the viewport. The production Mapbox JavaScript asset measured 1,787,442 bytes
uncompressed on 2026-07-15, so ordinary visitors download and parse a large
third-party map runtime even when they only read the address. This plan keeps
the address and itinerary action immediately usable while deferring Mapbox,
its CSS, and the Mapbox network preconnection until the visitor explicitly
asks to display the interactive map.

## Current state

- `src/pages/index.astro:80` hydrates `MapSection` with `client:visible`; do not
  change that directive in this plan because the new explicit map-load button
  needs client-side behavior after Plan 004 makes directions a native link.
- `src/components/landing-page/map/MapSection.tsx` renders the address,
  itinerary action, and map. At the current post-Plan-004 HEAD it statically
  imports the map:

  ```tsx
  // src/components/landing-page/map/MapSection.tsx:1-6
  import { BUSINESS_CONFIG } from '../../../lib/constants/site';
  import { CABINET_DIRECTIONS_URL } from '../../../lib/directions';
  import { useHasMounted } from '../../../lib/hooks/useHasMounted';
  import { Map } from '../../common/icons';
  import MapBox from './MapBox';
  ```

  Plan 004 replaced the permission-dependent itinerary button with the native
  `CABINET_DIRECTIONS_URL` link and canonical `BUSINESS_CONFIG.geo`
  coordinates. That link and coordinate behavior are not part of this plan and
  must be preserved.

- The current map branch appears immediately after hydration:

  ```tsx
  // src/components/landing-page/map/MapSection.tsx:74-94
  {
    !hasMounted && (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        ...
      </div>
    );
  }
  {
    hasMounted && (
      <MapBox
        lng={BUSINESS_CONFIG.geo.longitude}
        lat={BUSINESS_CONFIG.geo.latitude}
        label="Cabinet de Bègles"
      />
    );
  }
  ```

- `src/components/landing-page/map/MapBox.tsx:1-2` statically imports both the
  `mapbox-gl` runtime and its CSS. The first Plan 005 execution proved that
  `React.lazy` defers the JavaScript but Astro still injects the generated
  `MapBox.*.css` stylesheet into `dist/index.html`.
- A follow-up experiment verified the supported Vite `?url` import:
  `mapbox-gl/dist/mapbox-gl.css?url` emits one real hashed CSS asset without
  linking it from the initial HTML. A runtime `<link>` can load it after the
  explicit click and before `new mapboxgl.Map(...)`.
- `src/lib/hooks/useHasMounted.ts` is referenced only by `MapSection.tsx` at
  this commit (`rg -n "useHasMounted" src`). Once the map is click-gated it has
  no caller and should be deleted instead of retained as dead code.
- `src/layouts/BaseLayout.astro:59-61` currently opens a Mapbox connection on
  every page before the visitor requests the map:

  ```astro
  <!-- Preconnect to third-party domains for faster loading -->
  <link rel="preconnect" href="https://api.mapbox.com" />
  <link rel="preconnect" href="https://www.google.com" />
  ```

  Remove only the Mapbox preconnect. Preserve the current Google preconnect and
  all analytics code exactly as they exist; Plan 001 was rejected.

- Playwright tests live in `tests/e2e`; use the locator and polling style in
  `tests/e2e/module-script-recovery.spec.ts`. The Playwright web server runs a
  clean `yarn build` followed by `yarn preview`, so a test may inspect the
  generated `dist/_astro` directory before navigating.
- The local environment may provide a public Mapbox token. The regression test
  must intercept and abort every `https://*.mapbox.com/**` request so it stays
  deterministic and never contacts the third party.
- The local `.env` enables analytics. Focused and full Playwright runs must set
  `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY=` so Playwright starts a fresh server
  with both public keys empty, then keep defensive provider routes in the test.
- Public Mapbox configuration remains in `src/lib/constants/api`; this plan
  must not add, copy, log, or hard-code a token.

## Commands you will need

| Purpose      | Command                                                                                                                                                                        | Expected on success                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Install      | `yarn install --frozen-lockfile`                                                                                                                                               | exit 0 without changing `yarn.lock`                                  |
| Format       | `yarn prettier --write src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx tests/e2e/map-on-demand.spec.ts` | exit 0; only in-scope files are formatted                            |
| Lint         | `yarn lint`                                                                                                                                                                    | exit 0, no errors                                                    |
| Build        | `yarn build`                                                                                                                                                                   | exit 0; Astro check and static build succeed                         |
| Focused test | `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/map-on-demand.spec.ts`                                                                                        | a fresh isolated server runs and the new Mapbox deferral test passes |
| Full tests   | `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`                                                                                                                        | a fresh isolated server runs and all Playwright tests pass           |
| Diff check   | `git diff --check`                                                                                                                                                             | exit 0, no whitespace errors                                         |

## Scope

**In scope** (the only files you should modify):

- `src/layouts/BaseLayout.astro`
- `src/components/landing-page/map/MapSection.tsx`
- `src/components/landing-page/map/MapBox.tsx`
- `src/lib/hooks/useHasMounted.ts` (delete after removing its only import)
- `tests/e2e/map-on-demand.spec.ts` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- The itinerary/geolocation behavior delivered by Plan 004.
- Map coordinates, address copy, zoom, style, marker, popup, or error fallback.
- `src/pages/index.astro` hydration directives.
- Mapbox package versions or any dependency/lockfile change.
- Replacing Mapbox with another map provider.
- Analytics loading behavior or ReCAPTCHA behavior.

## Git workflow

- Branch: `improve`
- Make one logical commit with the short imperative message
  `perf: defer Mapbox until requested`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add an explicit interactive-map request state

In `MapSection.tsx`, import `lazy`, `Suspense`, and `useState` from React and
replace the static `MapBox` import with this dynamic boundary:

```tsx
const MapBox = lazy(() => import('./MapBox'));
```

Add a boolean state whose initial value is `false`. Before the user requests
the map, render a non-animated placeholder inside the existing 400px-high map
frame. It must contain a real `<button>` with:

- visible French copy `Afficher la carte interactive`;
- `type="button"`;
- `data-testid="map-load-trigger"`;
- the project's existing gold button and keyboard-focus styles;
- an `onClick` that changes the request state to `true`.

Do not render `MapBox` at all while the state is false. After the click, render
it inside `Suspense`, reusing the existing "Chargement de la carte..." spinner
as the Suspense fallback. Keep the outer dimensions stable so the click does
not cause layout shift. Once requested, keep the map mounted; do not add a
toggle that repeatedly creates and destroys it.

Remove the `useHasMounted` import, call, and conditional branches. The new
initial `false` state produces the same request placeholder during SSR and the
first client render, so hydration is stable without a separate mounted flag;
`MapBox` can only render in response to a post-hydration click.

Run `rg -n "useHasMounted" src` after editing. If it has no remaining caller,
delete `src/lib/hooks/useHasMounted.ts`; do not leave a now-unused hook. If an
unexpected caller exists, treat that as drift and STOP rather than deleting a
shared utility.

**Verify**: `for pattern in "lazy(() => import('./MapBox'))" 'map-load-trigger' 'Afficher la carte interactive' '<Suspense'; do rg -Fq "$pattern" src/components/landing-page/map/MapSection.tsx || exit 1; done && ! rg -n "useHasMounted|^import MapBox from './MapBox'" src && test ! -e src/lib/hooks/useHasMounted.ts` → exit 0; each of the four target patterns exists independently, the old import/hook is absent, and the orphan file is deleted.

### Step 2: Load the Mapbox stylesheet explicitly after demand

In `MapBox.tsx`, keep the static `mapbox-gl` JavaScript import because the whole
component is already behind the dynamic boundary. Replace the side-effect CSS
import with:

```tsx
import mapboxStylesheetUrl from 'mapbox-gl/dist/mapbox-gl.css?url';
```

Add a module-level `Promise<void> | undefined` and a
`loadMapboxStylesheet()` helper. It must:

- reuse an existing `link[data-mapbox-styles="true"]` or create exactly one;
- set `rel="stylesheet"`, `href={mapboxStylesheetUrl}`, and the data marker
  before appending it to `<head>`;
- resolve immediately when an existing link already has a `sheet`;
- otherwise resolve on `load`, reject on `error`, and remove both event
  listeners when either event settles;
- on `error`, remove the failed link, reset the singleton promise, and reject so
  a later mount can retry;
- keep a successfully loaded link for the rest of the page rather than removing
  and re-downloading it on every mount.

Refactor the existing map effect into an async initializer that awaits
`loadMapboxStylesheet()` before reading the token or constructing
`new mapboxgl.Map(...)`. Preserve the current token, support, map, marker,
popup, and error-fallback behavior.

Make the lifecycle race-safe:

- keep an `isCancelled` flag and a `map` variable in the effect;
- after awaiting CSS, return if cancelled or `mapContainerRef.current` is null;
- guard every asynchronous `setMapError(true)` and the map `error` handler with
  `!isCancelled`;
- retain the map error handler reference, remove it during cleanup, then call
  `map.remove()`;
- use `[lat, lng, label]` as the effect dependencies so props cannot become
  stale.

Do not construct the map before the stylesheet's `load` event. Do not use an
inline `<style>` fallback or change global Astro/Vite configuration.

**Verify**: `for pattern in "mapbox-gl/dist/mapbox-gl.css?url" 'data-mapbox-styles="true"' 'loadMapboxStylesheet' 'await loadMapboxStylesheet()' '[lat, lng, label]'; do rg -Fq "$pattern" src/components/landing-page/map/MapBox.tsx || exit 1; done && ! rg -n "^import ['\"]mapbox-gl/dist/mapbox-gl\\.css['\"]" src/components/landing-page/map/MapBox.tsx` → the explicit CSS URL loader, singleton marker, load-before-map ordering, lifecycle dependencies, and removal of the eager side-effect import are all present.

### Step 3: Remove the unconditional Mapbox preconnect

Delete only `<link rel="preconnect" href="https://api.mapbox.com" />` from
`BaseLayout.astro`. Leave the Google preconnect and all analytics code exactly
as they exist.

**Verify**: `! rg -n 'rel="preconnect" href="https://api\.mapbox\.com"' src/layouts/BaseLayout.astro` → exit 0; Mapbox has no unconditional preconnect. Compare the surrounding diff to confirm no Google/analytics line changed in this plan.

### Step 4: Add a network-level regression test

Before the first focused Playwright command, require
`git diff --quiet HEAD -- .astro` and record the hashes of every tracked
`.astro` file against `HEAD`. The Playwright web server runs `yarn build`, so
this baseline must exist before Step 4, not only before the later repository
gates.

Create `tests/e2e/map-on-demand.spec.ts`. Before navigation, inspect
`dist/_astro/*.js` with `node:fs/promises` and find the generated JavaScript
asset containing the stable literal `mapbox://styles/mapbox/standard`. Also
inspect `dist/_astro/*.css` and find the stylesheet containing the stable
`.mapboxgl-map` selector. Require exactly one JavaScript match and one CSS
match; fail with a clear message if either set has zero or multiple matches.
This identifies both dynamically generated Mapbox resources without depending
on content hashes. Read `dist/index.html` too and fail if it already references
the discovered CSS pathname; a generated asset is not deferred if Astro links
it in the initial document.

In the test:

1. Install `page.addInitScript` before navigation with `dataLayer: []`,
   `__gtm_loaded__: true`, and `__posthog_initialized__: true`. This isolates
   the current analytics loader because Plan 001 was rejected; it is not a
   consent assertion.
2. Route known GTM, Google Analytics/Ads, and PostHog hosts to `route.abort()`
   without logging their URLs. Count these interceptions and require zero, so
   the empty build-time keys remain the primary isolation mechanism.
3. Route every URL matching
   `/^https:\/\/(?:[^/]+\.)?mapbox\.com\//` to `route.abort()`. Count
   interceptions, but never print a token-bearing URL.
4. Record same-origin requested URL pathnames with `page.on('request', ...)`.
5. Navigate to `/` and scroll `page.getByTestId('map-load-trigger')` into view.
6. Wait for that button to be visible, locate its ancestor `astro-island`, and
   wait until the island no longer has the `ssr` attribute. Astro removes this
   attribute when `client:visible` hydration completes; visibility alone is
   insufficient because the request button is now server-rendered.
7. Assert neither the generated Mapbox JavaScript nor CSS asset has been
   requested, no `link[data-mapbox-styles="true"]` exists, the Mapbox-host
   interception count is still zero, and the analytics interception count is
   zero.
8. Click the button.
9. Use `expect.poll` to assert that both identified asset pathnames are
   requested.
10. Use `expect.poll` to require exactly one
    `link[rel="stylesheet"][data-mapbox-styles="true"]`, with an `href` pathname
    equal to the discovered CSS asset and a non-null `sheet`. This proves the
    stylesheet loaded before the next assertion.
11. Assert the button is no longer present and that
    `.mapboxgl-map` or the existing "La carte est temporairement
    indisponible." fallback becomes visible. Use `.or(...).first()` or an
    explicit branch so two matching elements cannot create a strict-locator
    failure. If the map is visible, assert computed `position: relative` and
    `overflow: hidden` to prove the loaded stylesheet applies.
12. After a short stabilization window, require one dynamic stylesheet link,
    reassert that the analytics interception count is zero, and confirm every
    observed Mapbox-host request was intercepted.

The test must not inspect or print the token, and all Mapbox-host requests must
be intercepted before they can reach the network.

After the focused run, inspect tracked `.astro` differences immediately. If
only `.astro/settings.json:lastUpdateCheck` changed, restore that value with
`apply_patch`; STOP on any other difference.

**Verify**: run
`CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/map-on-demand.spec.ts`,
inspect and restore the allowed timestamp if needed, then run
`git diff --quiet HEAD -- .astro` → one test passes on a fresh server and proves
both Mapbox JS and CSS are absent from the initial HTML/network before the click
and requested after it, the runtime stylesheet is loaded exactly once, all
Mapbox provider requests are aborted, no analytics request occurs, and no
tracked `.astro` drift remains.

### Step 5: Run repository gates and inspect the diff

Run the standard checks after the focused test. Confirm the completed Plan 004
itinerary test still passes as part of the full Playwright run.

Reuse the clean `.astro` baseline captured before Step 4. After each generating
command, inspect the diff. `yarn build` may change only
`.astro/settings.json`'s `lastUpdateCheck`; restore that one value with
`apply_patch`. STOP if another key or any other tracked `.astro` file changes.

**Verify**: run targeted Prettier on `BaseLayout.astro`, `MapSection.tsx`,
`MapBox.tsx`, and the new test, then `yarn lint` and `yarn build`; inspect and
restore the allowed timestamp. Run
`npx react-doctor@latest --verbose --scope changed` and fix only regressions
introduced by the Plan 005 React files; report unrelated/pre-existing
diagnostics without expanding scope. Then run
`CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`; inspect and restore
again. Finish with `git diff --check && git diff --quiet HEAD -- .astro` →
every command exits 0 on a fresh analytics-isolated Playwright server, and
tracked `.astro` files match `HEAD` after restoring only the allowed timestamp.

## Test plan

- Create `tests/e2e/map-on-demand.spec.ts` with one deterministic network-level
  test covering both states: viewport hydration without Mapbox JS/CSS, then
  explicit request for both resources.
- Prove the discovered CSS pathname is absent from `dist/index.html`, then
  require exactly one runtime-created stylesheet link with that pathname after
  the click.
- Model request recording and `expect.poll` on
  `tests/e2e/module-script-recovery.spec.ts`; model user-facing locators on
  `tests/e2e/booking.smoke.spec.ts`.
- The test must accept the existing no-token/no-WebGL fallback after the
  dynamic assets are requested; it must abort provider-host requests rather
  than turn Mapbox availability into a test dependency.
- Verification:
  `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/map-on-demand.spec.ts`
  → one new test passes;
  `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e` → the entire suite
  passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `yarn lint` exits 0.
- [ ] `yarn build` exits 0.
- [ ] Targeted Prettier formatting exits 0 and touches only in-scope files.
- [ ] `yarn test:e2e` exits 0, including the new on-demand request test.
- [ ] `MapSection.tsx` contains `lazy(() => import('./MapBox'))`, no static
      `MapBox` import, and no `useHasMounted` dependency.
- [ ] `MapBox.tsx` imports Mapbox CSS with `?url`, creates at most one marked
      stylesheet link, waits for it to load before constructing the map, and
      handles load failure/unmount without stale state or map creation.
- [ ] `src/lib/hooks/useHasMounted.ts` is deleted after confirming it has no
      remaining caller.
- [ ] The Mapbox JavaScript and CSS build assets are not requested before
      `data-testid="map-load-trigger"` is clicked and are both requested after it.
- [ ] The initial HTML does not reference the Mapbox CSS asset; after the click,
      exactly one loaded `link[data-mapbox-styles="true"]` references it.
- [ ] The focused test aborts every Mapbox-host request and never prints a
      token-bearing URL.
- [ ] Focused and full E2E runs use a fresh server with empty GTM/PostHog keys;
      defensive analytics routes observe zero requests.
- [ ] The unconditional `api.mapbox.com` preconnect is absent.
- [ ] Plan 004's itinerary fallback behavior and tests still pass.
- [ ] Tracked `.astro` artifacts match their pre-build state after restoring
      only `.astro/settings.json`'s known `lastUpdateCheck` update.
- [ ] React Doctor reports no regression introduced by the Plan 005 React
      changes.
- [ ] `git diff --check` exits 0.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 004 is not complete, or its itinerary behavior cannot be preserved
  without redesigning this plan.
- `MapSection.tsx`, `MapBox.tsx`, or the Mapbox preconnect no longer match the
  relevant current-state behavior after accounting for completed prior plans.
- Vite emits the MapBox marker into an eagerly requested asset even though the
  component uses `React.lazy`; report the generated asset graph rather than
  weakening the test.
- Vite merges the Mapbox CSS marker into an eagerly requested global
  stylesheet; report the generated asset graph rather than claiming CSS is
  demand-loaded.
- The `?url` stylesheet is still referenced by `dist/index.html`, or a
  stylesheet request occurs before the explicit click.
- More than one generated JavaScript asset contains the stable Mapbox style
  marker and there is no deterministic way to identify the dynamic entry.
- Zero or multiple generated CSS assets contain `.mapboxgl-map`.
- The map can be constructed before the stylesheet load event, more than one
  marked stylesheet link can be created, or an unmounted effect can still
  construct a map or call `setMapError`.
- The implementation requires exposing, changing, logging, or hard-coding a
  Mapbox token.
- A Mapbox-host request escapes the Playwright route interception.
- A tracked `.astro` file changes beyond the known
  `.astro/settings.json:lastUpdateCheck` build artifact.
- The fix appears to require changing the island hydration directive, provider,
  coordinates, itinerary behavior, or global Astro/Vite configuration.
- A verification command fails twice after one reasonable correction attempt.

## Maintenance notes

- Keep the Mapbox runtime and CSS behind the same dynamic component boundary;
  moving either import back into `MapSection.tsx` silently defeats the win.
- Keep `mapbox-gl.css?url` and the singleton marked `<link>` loader together.
  A future CSP can allow the same-origin stylesheet without requiring
  `style-src 'unsafe-inline'`.
- A reviewer should inspect the built network waterfall, keyboard focus on the
  request button, and preservation of the 400px layout height.
- If the map provider, style URL, or bundler output changes, update the stable
  marker used by the regression test without replacing it with a content hash.
- Revisit whether a static map image is preferable only as a separate product
  and privacy decision.
