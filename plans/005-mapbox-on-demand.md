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
> `git diff --stat 9aece8f..HEAD -- src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/hooks/useHasMounted.ts tests/e2e/map-on-demand.spec.ts`
> `git diff --stat HEAD -- src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/hooks/useHasMounted.ts tests/e2e/map-on-demand.spec.ts`
> `git ls-files --others --exclude-standard -- src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/hooks/useHasMounted.ts tests/e2e/map-on-demand.spec.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Changes made by completed Plan 001
> in `BaseLayout.astro` and Plan 004 in `MapSection.tsx` are expected; preserve
> their consent and itinerary behavior and stop only if they make the loading
> design below incompatible. `MapBox.tsx` is included as a read-only drift
> dependency because the asset test relies on its literals; do not edit it.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-consent-gated-analytics.md`, `plans/004-directions-geolocation-fallback.md`
- **Category**: perf
- **Planned at**: commit `9aece8f`, 2026-07-15

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
  itinerary action, and map. At commit `9aece8f` it statically imports the map:

  ```tsx
  // src/components/landing-page/map/MapSection.tsx:1-4
  import { useHasMounted } from "../../../lib/hooks/useHasMounted";
  import { Map } from "../../common/icons";
  import MapBox from "./MapBox";
  ```

  After Plan 004, the itinerary handler will differ from this snapshot. That
  handler and its no-geolocation fallback are not part of this plan and must be
  preserved.

- The current map branch appears immediately after hydration:

  ```tsx
  // src/components/landing-page/map/MapSection.tsx:83-96
  {
    !hasMounted && (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        ...
      </div>
    );
  }
  {
    hasMounted && <MapBox lng={LNG} lat={LAT} label="Cabinet de Bègles" />;
  }
  ```

- `src/components/landing-page/map/MapBox.tsx:1-2` statically imports both the
  `mapbox-gl` runtime and its CSS. Keep those imports in this file; making this
  component a dynamic boundary is what defers both resources.
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

  Remove only the Mapbox preconnect. Plan 001 may already have removed the
  Google preconnect for consent reasons; preserve whichever post-Plan-001
  Google state exists and do not re-add or remove it here.

- Playwright tests live in `tests/e2e`; use the locator and polling style in
  `tests/e2e/module-script-recovery.spec.ts`. The Playwright web server runs a
  clean `yarn build` followed by `yarn preview`, so a test may inspect the
  generated `dist/_astro` directory before navigating.
- The local environment may provide a public Mapbox token. The regression test
  must intercept and abort every `https://*.mapbox.com/**` request so it stays
  deterministic and never contacts the third party.
- Public Mapbox configuration remains in `src/lib/constants/api`; this plan
  must not add, copy, log, or hard-code a token.

## Commands you will need

| Purpose      | Command                                                                                                                             | Expected on success                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Install      | `yarn install --frozen-lockfile`                                                                                                    | exit 0 without changing `yarn.lock`          |
| Format       | `yarn prettier --write src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx tests/e2e/map-on-demand.spec.ts` | exit 0; only in-scope files are formatted    |
| Lint         | `yarn lint`                                                                                                                         | exit 0, no errors                            |
| Build        | `yarn build`                                                                                                                        | exit 0; Astro check and static build succeed |
| Focused test | `yarn test:e2e tests/e2e/map-on-demand.spec.ts`                                                                                     | the new Mapbox deferral test passes          |
| Full tests   | `yarn test:e2e`                                                                                                                     | all Playwright tests pass                    |
| Diff check   | `git diff --check`                                                                                                                  | exit 0, no whitespace errors                 |

## Scope

**In scope** (the only files you should modify):

- `src/layouts/BaseLayout.astro`
- `src/components/landing-page/map/MapSection.tsx`
- `src/lib/hooks/useHasMounted.ts` (delete after removing its only import)
- `tests/e2e/map-on-demand.spec.ts` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- The itinerary/geolocation behavior delivered by Plan 004.
- Map coordinates, address copy, zoom, style, marker, popup, or error fallback.
- `src/components/landing-page/map/MapBox.tsx`; its existing style literal is
  only a read-only marker for the generated-asset test.
- `src/pages/index.astro` hydration directives.
- Mapbox package versions or any dependency/lockfile change.
- Replacing Mapbox with another map provider.
- Analytics consent or ReCAPTCHA behavior.

## Git workflow

- Branch: `codex/005-mapbox-on-demand`
- Make one logical commit with the short imperative message
  `perf: defer Mapbox until requested`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add an explicit interactive-map request state

In `MapSection.tsx`, import `lazy`, `Suspense`, and `useState` from React and
replace the static `MapBox` import with this dynamic boundary:

```tsx
const MapBox = lazy(() => import("./MapBox"));
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

**Verify**: `rg -n "lazy\(\(\) => import\('./MapBox'\)\)|map-load-trigger|Afficher la carte interactive|<Suspense" src/components/landing-page/map/MapSection.tsx && ! rg -n "useHasMounted|^import MapBox from './MapBox'" src && test ! -e src/lib/hooks/useHasMounted.ts` → exit 0; all four target patterns exist, the old import/hook is absent, and the orphan file is deleted.

### Step 2: Remove the unconditional Mapbox preconnect

Delete only `<link rel="preconnect" href="https://api.mapbox.com" />` from
`BaseLayout.astro`. Leave all Google and analytics/consent code exactly as it
exists after earlier plans.

**Verify**: `! rg -n 'rel="preconnect" href="https://api\.mapbox\.com"' src/layouts/BaseLayout.astro` → exit 0; Mapbox has no unconditional preconnect. Compare the surrounding diff to confirm no Google/analytics line changed in this plan.

### Step 3: Add a network-level regression test

Create `tests/e2e/map-on-demand.spec.ts`. Before navigation, inspect
`dist/_astro/*.js` with `node:fs/promises` and find the generated JavaScript
asset containing the stable literal `mapbox://styles/mapbox/standard`. Also
inspect `dist/_astro/*.css` and find the stylesheet containing the stable
`.mapboxgl-map` selector. Require exactly one JavaScript match and one CSS
match; fail with a clear message if either set has zero or multiple matches.
This identifies both dynamically generated Mapbox resources without depending
on content hashes.

In the test:

1. Route every URL matching
   `/^https:\/\/(?:[^/]+\.)?mapbox\.com\//` to `route.abort()`. Count
   interceptions, but never print a token-bearing URL.
2. Record same-origin requested URL pathnames with `page.on('request', ...)`.
3. Navigate to `/` and scroll `page.getByTestId('map-load-trigger')` into view.
4. Wait for that button to be visible, locate its ancestor `astro-island`, and
   wait until the island no longer has the `ssr` attribute. Astro removes this
   attribute when `client:visible` hydration completes; visibility alone is
   insufficient because the request button is now server-rendered.
5. Assert neither the generated Mapbox JavaScript nor CSS asset has been
   requested and the Mapbox-host interception count is still zero.
6. Click the button.
7. Use `expect.poll` to assert that both identified asset pathnames are
   requested.
8. Assert the button is no longer present and that either `.mapboxgl-map` or
   the existing "La carte est temporairement indisponible." fallback becomes
   visible. Aborted Mapbox API calls may intentionally select the fallback.

The test must not inspect or print the token, and all Mapbox-host requests must
be intercepted before they can reach the network.

**Verify**: `yarn test:e2e tests/e2e/map-on-demand.spec.ts` → one test passes and proves both Mapbox JS and CSS are absent before the click and requested after it, with all provider-host requests aborted.

### Step 4: Run repository gates and inspect the diff

Run the standard checks after the focused test. Confirm the completed Plan 004
itinerary test still passes as part of the full Playwright run.

**Verify**: `yarn prettier --write src/layouts/BaseLayout.astro src/components/landing-page/map/MapSection.tsx tests/e2e/map-on-demand.spec.ts && yarn lint && yarn build && yarn test:e2e && git diff --check` → every command exits 0.

## Test plan

- Create `tests/e2e/map-on-demand.spec.ts` with one deterministic network-level
  test covering both states: viewport hydration without Mapbox JS/CSS, then
  explicit request for both resources.
- Model request recording and `expect.poll` on
  `tests/e2e/module-script-recovery.spec.ts`; model user-facing locators on
  `tests/e2e/booking.smoke.spec.ts`.
- The test must accept the existing no-token/no-WebGL fallback after the
  dynamic assets are requested; it must abort provider-host requests rather
  than turn Mapbox availability into a test dependency.
- Verification: `yarn test:e2e tests/e2e/map-on-demand.spec.ts` → one new test
  passes; `yarn test:e2e` → the entire suite passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `yarn lint` exits 0.
- [ ] `yarn build` exits 0.
- [ ] Targeted Prettier formatting exits 0 and touches only in-scope files.
- [ ] `yarn test:e2e` exits 0, including the new on-demand request test.
- [ ] `MapSection.tsx` contains `lazy(() => import('./MapBox'))`, no static
      `MapBox` import, and no `useHasMounted` dependency.
- [ ] `src/lib/hooks/useHasMounted.ts` is deleted after confirming it has no
      remaining caller.
- [ ] The Mapbox JavaScript and CSS build assets are not requested before
      `data-testid="map-load-trigger"` is clicked and are both requested after it.
- [ ] The focused test aborts every Mapbox-host request and never prints a
      token-bearing URL.
- [ ] The unconditional `api.mapbox.com` preconnect is absent.
- [ ] Plan 004's itinerary fallback behavior and tests still pass.
- [ ] `git diff --check` exits 0.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 or Plan 004 is not complete, or their consent/itinerary behavior
  cannot be preserved without redesigning this plan.
- `MapSection.tsx`, `MapBox.tsx`, or the Mapbox preconnect no longer match the
  relevant current-state behavior after accounting for completed prior plans.
- Vite emits the MapBox marker into an eagerly requested asset even though the
  component uses `React.lazy`; report the generated asset graph rather than
  weakening the test.
- Vite merges the Mapbox CSS marker into an eagerly requested global
  stylesheet; report the generated asset graph rather than claiming CSS is
  demand-loaded.
- More than one generated JavaScript asset contains the stable Mapbox style
  marker and there is no deterministic way to identify the dynamic entry.
- The implementation requires exposing, changing, logging, or hard-coding a
  Mapbox token.
- A Mapbox-host request escapes the Playwright route interception.
- The fix appears to require changing the island hydration directive, provider,
  coordinates, or itinerary behavior.
- A verification command fails twice after one reasonable correction attempt.

## Maintenance notes

- Keep the Mapbox runtime and CSS behind the same dynamic component boundary;
  moving either import back into `MapSection.tsx` silently defeats the win.
- A reviewer should inspect the built network waterfall, keyboard focus on the
  request button, and preservation of the 400px layout height.
- If the map provider, style URL, or bundler output changes, update the stable
  marker used by the regression test without replacing it with a content hash.
- Revisit whether a static map image is preferable only as a separate product
  and privacy decision.
