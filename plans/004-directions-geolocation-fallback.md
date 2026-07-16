# Plan 004: Make directions work without browser geolocation

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
> `git diff --stat 9aece8f..HEAD -- src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/directions.ts tests/e2e/directions.spec.ts`
> `git diff --stat HEAD -- src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/directions.ts tests/e2e/directions.spec.ts`
> `git ls-files --others --exclude-standard -- src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/directions.ts tests/e2e/directions.spec.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

The main directions button does nothing when geolocation is unavailable,
denied, times out, or errors, and its asynchronous `window.open()` can also be
blocked as a popup. Google Maps already supports a destination-only directions
URL and can determine the origin in its own trusted UI. Replacing the fragile
permission flow with a normal link gives every visitor a usable route and
retains keyboard, no-JavaScript, and new-tab behavior.

## Current state

- `src/components/landing-page/map/MapSection.tsx:63-74` renders a button whose
  click handler calls `navigator.geolocation.getCurrentPosition()` with only a
  success callback. There is no unsupported/error/denied/timeout path.
- That success callback calls `window.open()` only after the asynchronous
  geolocation result (`:68-72`), which browsers may treat as a blocked popup.
- `src/components/landing-page/map/MapSection.tsx:6-7` duplicates cabinet
  coordinates already stored in `BUSINESS_CONFIG.geo` at
  `src/lib/constants/site.ts:25-28`.
- `src/components/landing-page/map/MapBox.tsx:11-12` contains a second,
  destination-only Google Maps URL with the same hard-coded coordinates. Its
  map-error overlay already exposes that link.
- There is no route-link E2E coverage.

Use one shared destination-only URL with query parameters `api=1`, the
coordinates from `BUSINESS_CONFIG.geo`, and `travelmode=driving`. Do not read
browser location in this plan.

## Commands you will need

| Purpose         | Command                                                                                                                                                              | Expected on success                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Install         | `yarn install --frozen-lockfile`                                                                                                                                     | exit 0 and no `yarn.lock` change                                  |
| Format check    | `yarn prettier --check src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/directions.ts tests/e2e/directions.spec.ts` | exit 0, all files formatted                                       |
| Lint            | `yarn lint`                                                                                                                                                          | exit 0, no errors                                                 |
| Build/typecheck | `yarn build`                                                                                                                                                         | exit 0; `astro check` reports no errors and Astro build completes |
| Focused E2E     | `yarn test:e2e tests/e2e/directions.spec.ts`                                                                                                                         | exit 0, all direction-link tests pass                             |
| Full tests      | `yarn test:e2e`                                                                                                                                                      | exit 0, all existing and new E2E tests pass                       |

## Scope

**In scope** (the only files you should modify):

- `src/components/landing-page/map/MapSection.tsx`
- `src/components/landing-page/map/MapBox.tsx`
- `src/lib/directions.ts` (create)
- `tests/e2e/directions.spec.ts` (create)
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- Mapbox dynamic import, bundle splitting, click-to-load behavior, styles, or
  token configuration; a separate performance plan owns that.
- Changing the cabinet address or coordinates in `BUSINESS_CONFIG`.
- Requesting geolocation through another API or preserving a custom-origin
  query; destination-only navigation is the chosen reliable behavior.
- Changing parking links, map zoom/style, analytics, or contact information.
- Opening Google Maps during automated tests or asserting third-party content.

## Git workflow

- Branch: `codex/004-directions-fallback`
- Make one logical commit after all gates pass: `Make directions always available`.
- Keep the title imperative and under 72 characters, matching this repo's
  short commit style.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create one canonical directions URL

Create `src/lib/directions.ts`. Import `BUSINESS_CONFIG` from
`./constants/site`, construct a `URL` for the existing Google Maps directions
endpoint, and set these search parameters:

- `api=1`
- `destination=<latitude>,<longitude>` from `BUSINESS_CONFIG.geo`
- `travelmode=driving`

Export the serialized URL as `CABINET_DIRECTIONS_URL`. The module must be pure
and safe during Astro's server build: do not access `window`, `navigator`, or
location state.

**Verify**: `for pattern in BUSINESS_CONFIG "searchParams.set('api'" "searchParams.set('destination'" "searchParams.set('travelmode'" CABINET_DIRECTIONS_URL; do rg -Fq "$pattern" src/lib/directions.ts || exit 1; done && ! rg -n "window|navigator" src/lib/directions.ts` → every canonical input/parameter/export exists and browser globals are absent.

### Step 2: Replace the permission-dependent button with a link

In `MapSection.tsx`, import `BUSINESS_CONFIG` and
`CABINET_DIRECTIONS_URL`. Remove local `LNG`/`LAT` constants. Pass
`BUSINESS_CONFIG.geo.longitude` and `.latitude` to `MapBox`.

Replace the `Obtenir l'itinéraire` button and its geolocation callback with an
anchor using:

- `href={CABINET_DIRECTIONS_URL}`
- `target="_blank"`
- `rel="noopener noreferrer"`
- the same visible label and visual Tailwind classes

Retain a visible focus ring. Do not add an `onClick`, prevent default, or call
`window.open`; native link behavior is the fallback and the primary path.

**Verify**: `for pattern in CABINET_DIRECTIONS_URL BUSINESS_CONFIG.geo 'target="_blank"' 'rel="noopener noreferrer"'; do rg -Fq "$pattern" src/components/landing-page/map/MapSection.tsx || exit 1; done && ! rg -n "navigator\.geolocation|getCurrentPosition|window\.open|const (LNG|LAT)" src/components/landing-page/map/MapSection.tsx` → every canonical/safe-link marker exists and the old permission/popup path is absent.

### Step 3: Reuse the same URL in Mapbox's error overlay

In `MapBox.tsx`, import `CABINET_DIRECTIONS_URL`, delete its local
`directionsUrl`, and point the existing `Ouvrir l'itinéraire` error-overlay
anchor to the shared constant. Do not otherwise change map initialization,
error handling, or props.

**Verify**: `rg -n "CABINET_DIRECTIONS_URL" src/components/landing-page/map/MapBox.tsx && ! rg -n "const directionsUrl|google\.fr/maps/dir" src/components/landing-page/map/MapBox.tsx` → the shared URL is used and the duplicate literal is gone.

### Step 4: Test semantics without contacting Google

Create `tests/e2e/directions.spec.ts`. Navigate locally to `/`, scroll the
`Obtenir l'itinéraire` link into view so the `client:visible` map section
hydrates, and import `BUSINESS_CONFIG` directly from
`src/lib/constants/site.ts` as the expected destination source. Before any
interaction, locate the link's ancestor `astro-island` and wait until its
`ssr` attribute is absent; visibility alone only proves server rendering.
Assert:

1. it is an anchor with `target="_blank"` and a `rel` containing both
   `noopener` and `noreferrer`;
2. parsing `href` yields the expected Google Maps path and the three required
   query parameters;
3. `destination` equals
   `${BUSINESS_CONFIG.geo.latitude},${BUSINESS_CONFIG.geo.longitude}` rather
   than a second coordinate literal in the test;
4. clicking with a test-installed capture listener that prevents navigation
   does not read `navigator.geolocation` and does not call `window.open`.

Install spies before page code with `page.addInitScript`, verify they are active
after the hydration wait, but never follow the external link. The test should
prove link semantics, not Google availability.

**Verify**: `yarn test:e2e tests/e2e/directions.spec.ts` → all four assertions pass and the test makes no Google Maps navigation/request.

### Step 5: Run repository gates and inspect scope

Format only the four in-scope files, then run lint, build, focused E2E, and the
full suite. Confirm no geolocation code remains in the map section and no
lockfile change occurred.

**Verify**: `yarn prettier --write src/components/landing-page/map/MapSection.tsx src/components/landing-page/map/MapBox.tsx src/lib/directions.ts tests/e2e/directions.spec.ts && yarn lint && yarn build && yarn test:e2e tests/e2e/directions.spec.ts && yarn test:e2e && ! rg -n "navigator\.geolocation|getCurrentPosition|window\.open" src/components/landing-page/map/MapSection.tsx` → every command exits 0; `git status --short --untracked-files=all` lists only the scoped implementation files plus the plan index status row.

## Test plan

- Add `tests/e2e/directions.spec.ts` with the anchor, URL, destination, and
  no-geolocation/no-popup assertions from Step 4.
- Reuse Playwright navigation patterns from `tests/e2e/booking.smoke.spec.ts`.
- Never load the external destination; parse and assert the URL locally.
- Verification: `yarn test:e2e tests/e2e/directions.spec.ts` and
  `yarn test:e2e` both exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] The primary directions action is a normal destination-only anchor.
- [ ] Browser geolocation and asynchronous `window.open()` are absent from
      `MapSection.tsx`.
- [ ] Map section coordinates and both route links derive from canonical shared
      business data.
- [ ] Primary and map-error links share `CABINET_DIRECTIONS_URL`.
- [ ] Playwright proves URL/anchor semantics without contacting Google.
- [ ] `yarn lint`, `yarn build`, the focused suite, and `yarn test:e2e` exit 0.
- [ ] `yarn.lock` is unchanged.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated by the plan owner.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" no longer matches the excerpts.
- Product requires a precomputed origin in the outgoing URL rather than letting
  Google Maps obtain it; that reintroduces permission and popup design work.
- The cabinet coordinates in `BUSINESS_CONFIG` differ from the location the
  current map marker/directions literal represents.
- A corporate policy forbids Google Maps links or requires a different maps
  provider.
- The shared helper creates a server-build error or requires browser globals.
- A verification command fails twice after a reasonable fix attempt.
- The fix requires touching an out-of-scope file.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- Address/coordinate changes belong in `BUSINESS_CONFIG`; route links and the
  map section should continue deriving from it.
- Reviewers should scrutinize the exact destination query, external-link
  security attributes, and absence of click handlers.
- Mapbox demand loading is intentionally deferred; this plan fixes route
  reliability without changing the map bundle or runtime.
