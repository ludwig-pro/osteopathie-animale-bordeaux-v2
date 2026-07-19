# Plan 001: Gate analytics with verified Axeptio choices

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
> `git diff --stat 9aece8f..HEAD -- src/layouts/BaseLayout.astro src/components/layout/Footer.tsx src/lib/analytics.ts src/types/window.d.ts src/env.d.ts env.example tests/e2e/analytics-consent.spec.ts README.md`
> `git diff --stat HEAD -- src/layouts/BaseLayout.astro src/components/layout/Footer.tsx src/lib/analytics.ts src/types/window.d.ts src/env.d.ts env.example tests/e2e/analytics-consent.spec.ts README.md`
> `git ls-files --others --exclude-standard -- src/layouts/BaseLayout.astro src/components/layout/Footer.tsx src/lib/analytics.ts src/types/window.d.ts src/env.d.ts env.example tests/e2e/analytics-consent.spec.ts README.md`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

The page currently loads Google Tag Manager and PostHog after interaction, a
timer, or page hiding even when Axeptio has not reported the visitor's choices.
The live GTM container also owns an Axeptio loader and mixes audience
measurement with advertising conversions, so merely putting one "GTM" boolean
in front of it would both double-load the CMP and collapse distinct consent
purposes. The fix requires a coordinated container cutover plus independent
Google Analytics, Google Ads, and PostHog choices at event time.

## Current state

- `src/layouts/BaseLayout.astro:346-385` — interaction, delayed timers,
  `visibilitychange`, and `pagehide` call `loadGtm()` / `loadPosthog()` without
  any consent check.
- `src/layouts/BaseLayout.astro:391-401` — the GTM `<noscript>` iframe bypasses
  any runtime consent decision.
- `src/layouts/BaseLayout.astro:59-62` — Google is preconnected before consent.
- `src/components/layout/Footer.tsx:32-40` — the preferences button calls both
  `window.openAxeptioCookie?.()` and `window.openAxeptioCookies?.()`, while this
  repo contains no Axeptio SDK loader. Axeptio's documented global is the
  plural `openAxeptioCookies`.
- `src/lib/analytics.ts:10-22` — `pushDataLayerEvent()` always buffers browser
  events, so pre-consent actions can later be sent after a provider starts.
- `src/types/window.d.ts:23-24` — declares the two optional Axeptio opener
  globals but not `_axcb`, the SDK, settings, or provider authorization state.
- `src/env.d.ts` and `env.example` contain analytics variables but no Axeptio
  project/version or vendor-key variables.
- Read-only inspection of the public `GTM-KCM49LQ` payload on 2026-07-15 found
  an Axeptio custom-HTML SDK loader, GA4, a conversion linker, and advertising
  conversion configuration. An authorized GTM export is still required to
  inventory every tag, trigger, consent check, and current published version;
  the public minified payload is not an editable source of truth.
- The repository uses inline Astro scripts for early boot, React for the
  footer, Tailwind for UI, and Playwright for E2E tests. Match the test style in
  `tests/e2e/booking.smoke.spec.ts`.

The implementation must use these official Axeptio behaviors:

- `window.axeptioSettings` is declared before loading
  `https://static.axept.io/sdk.js`.
- asynchronous SDK access uses `window._axcb.push((sdk) => ...)`.
- `sdk.on('cookies:complete', handler)` receives the accepted/refused vendor
  map. The event replays stored choices and is emitted even when the banner is
  not displayed.
- vendor property names are project-specific technical keys configured in
  Axeptio. They must be read from the actual published project, never inferred
  from examples such as `google_analytics`.

## Commands you will need

| Purpose            | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Expected on success                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install            | `yarn install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                                                                                | exit 0 and no `yarn.lock` change                                                                                                                                            |
| Format check       | `yarn prettier --check src/layouts/BaseLayout.astro src/components/layout/Footer.tsx src/lib/analytics.ts src/types/window.d.ts src/env.d.ts tests/e2e/analytics-consent.spec.ts README.md && git diff --check -- env.example`                                                                                                                                                                                                                                  | exit 0; supported files are formatted and the parserless env example has no whitespace error                                                                                |
| Lint               | `yarn lint`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | exit 0, no errors                                                                                                                                                           |
| Build/typecheck    | `yarn build`                                                                                                                                                                                                                                                                                                                                                                                                                                                    | exit 0; `astro check` reports no errors and Astro build completes                                                                                                           |
| E2E port preflight | `node -e "const net = require('node:net'); const server = net.createServer(); server.once('error', () => process.exit(1)); server.listen(4321, '127.0.0.1', () => server.close())"`                                                                                                                                                                                                                                                                             | exit 0 proves port 4321 is free; otherwise STOP without killing an unknown process                                                                                          |
| Focused E2E        | `CI=1 PUBLIC_AXEPTIO_CLIENT_ID=test-client PUBLIC_AXEPTIO_COOKIES_VERSION=test-version PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY=test-ga PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY=test-ads PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY=test-posthog PUBLIC_GTM_ID=GTM-TEST PUBLIC_POSTHOG_KEY=test-project-key PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com yarn test:e2e tests/e2e/analytics-consent.spec.ts --grep-invert 'missing configuration' --retries=0 --workers=1` | exit 0, only the independent-consent matrix runs against a fresh dummy-config build using intercepted SDK/provider requests                                                 |
| Missing-config E2E | `CI=1 PUBLIC_AXEPTIO_CLIENT_ID= PUBLIC_AXEPTIO_COOKIES_VERSION= PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY= PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY= PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY= yarn test:e2e tests/e2e/analytics-consent.spec.ts --grep 'missing configuration' --retries=0 --workers=1`                                                                                                                                                                  | exit 0; a fresh build sees explicit empty values overriding local dotenv values and all providers remain disabled                                                           |
| Full tests         | `CI=1 PUBLIC_AXEPTIO_CLIENT_ID= PUBLIC_AXEPTIO_COOKIES_VERSION= PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY= PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY= PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY= yarn test:e2e --retries=0 --workers=1`                                                                                                                                                                                                                                     | exit 0; a fresh fail-closed build passes the existing suite and missing-config case, explicitly skips the sixteen dummy-only cases, and contacts no live analytics provider |

## Suggested executor toolkit

- Read Axeptio's official [SDK event documentation](https://support.axeptio.eu/en/articles/274035-listen-to-sdk-events) before editing the listener.
- Read Axeptio's official [custom loading guide](https://support.axeptio.eu/en/articles/273994-add-the-loading-logic-of-your-services-to-your-code) for the SDK boot order.
- Read Axeptio's official [`axeptioSettings` reference](https://support.axeptio.eu/en/articles/274040-options-and-advanced-mode-axeptiosettings) before assigning project/version settings.
- Read Google's official [website consent mode guide](https://developers.google.com/tag-platform/security/guides/consent), especially the Tag Manager requirement to use a consent template/API rather than Custom HTML `gtag('consent', ...)` calls.
- Read PostHog's official [data collection controls](https://posthog.com/docs/privacy/data-collection) before implementing withdrawal; use its opt-out/opt-in API rather than relying on reload alone.
- Use authorized read access to both the published Axeptio project and the GTM
  container export. Record only durable version/reference IDs in operational
  evidence, never credentials, private consent records, or container exports in
  the repository.

## Scope

**In scope** (the only files you should modify):

- `src/layouts/BaseLayout.astro`
- `src/components/layout/Footer.tsx`
- `src/lib/analytics.ts`
- `src/types/window.d.ts`
- `src/env.d.ts`
- `env.example`
- `tests/e2e/analytics-consent.spec.ts` (create)
- `README.md`
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

Also in scope as an operator-owned external prerequisite: inventorying the
published GTM container, adding the narrow compatibility/consent controls in
Step 1, publishing that reviewed container version, and recording its version
reference; setting the five named public Axeptio variables in the authorized
Netlify preview/production contexts; and recording that configuration gate.
Those external changes are not repository files and require explicit
authorized access.

**Out of scope** (do NOT touch, even though they look related):

- Axeptio consent copy or inventing/merging vendor definitions. If the published
  project lacks separate Google Analytics, Google Ads, and PostHog booleans,
  stop for an owner/privacy decision.
- GTM marketing changes beyond the existing tag inventory, bootstrap ownership,
  and per-tag consent controls defined below; PostHog project settings and all
  credentials remain out of scope. Only the named public Netlify values are in
  scope, never unrelated variables or secrets.
- Adding a different CMP, a privacy-policy page, or making a legal compliance
  claim.
- Sentry data collection; it is handled by a separate plan.
- Mapbox loading and its preconnect; a separate performance plan owns that.
- Renaming existing analytics events or changing their payload schemas.

## Git workflow

- Branch: `codex/001-consent-gated-analytics`
- After the pre-release GTM prerequisite is published, finish the implementation
  and README changes, then run every local gate in Step 5. Only then make one
  final implementation commit: `Gate analytics on consent`.
- Step 6 must create and validate a Deploy Preview for that exact final
  implementation SHA. Make no later source or root-README change; any such
  change requires a new final commit and a complete repeat of Step 6. The
  coordinator's later `plans/README.md` status-row bookkeeping is not part of
  the tested implementation SHA.
- Record the reviewed GTM container version in the PR/operations evidence, not
  in source code. Do not deploy the repository commit until that compatible
  container version is live; do not remove the legacy container fallback until
  rollback safety has been explicitly resolved.
- Keep the title imperative and under 72 characters, matching this repo's
  short commit style.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Establish and publish the external consent contract first

With authorized read access, export the current published GTM container and
inventory every tag, trigger, built-in consent check, and destination. At
minimum reconcile the observed Axeptio custom-HTML loader, GA4, conversion
linker, and all Google Ads conversion tags. Separately inspect the published
Axeptio cookies version and confirm three distinct boolean technical keys for:

1. Google Analytics measurement;
2. Google Ads/conversion processing;
3. PostHog.

Do not model GTM itself as a vendor: it is a container for tags with different
purposes. If Analytics and Ads do not have independently approved Axeptio
choices, or any existing GTM tag cannot be mapped, STOP for an owner/privacy
decision.

In a reviewed GTM workspace, create these compatibility controls before the
repository code is deployed:

- a data-layer variable for `axeptioBootstrappedBySite` and a blocking exception
  on the legacy Axeptio custom-HTML tag when it is exactly `true`; without the
  flag, the old production site must continue loading Axeptio during rollback;
- data-layer variables for `axeptioGoogleAnalyticsGranted` and
  `axeptioGoogleAdsGranted`;
- explicit tag-level triggers/exceptions and built-in consent checks so GA4 can
  make no request when Analytics is false, and the conversion linker/Ads tags
  can make no request when Ads is false. Do not rely on one umbrella GTM
  trigger or on advanced-consent cookieless pings for a refused purpose;
- an `axeptio_consent_update` custom event path for any later site-owned current
  choice, including denial,
  without replaying earlier business events; after applying the state through a
  consent template/API, it must synchronously push an
  `axeptio_consent_applied` acknowledgement containing the same two Google
  booleans so withdrawal can be ordered before navigation.

Every new variable, trigger, exception, consent-initialization rule, and
acknowledgement path must be dual-mode. When
`axeptioBootstrappedBySite !== true` (the current site and rollback mode), all
legacy Axeptio, Analytics, Ads, conversion-linker, and conversion-tag behavior
must remain exactly as in the exported baseline. When the flag is exactly
`true`, a Consent Initialization template/API must set both Google purposes to
denied before any tag can fire, then only the independent site-owned update
events may grant them. Never let an undefined new variable become an implicit
legacy denial or grant.

Before publishing, obtain explicit operator authorization to republish the
recorded rollback version immediately if the post-publication legacy matrix
regresses. Preview the container, have an authorized reviewer approve it,
publish this compatibility version, and record its version/reference outside the repo. The
old site must still have one Axeptio loader after this publish. The future site
flag must suppress that legacy tag, ensuring the source-owned SDK is the only
loader after deployment. Before publishing, record the currently published
container version as the rollback target. After publishing—but before any site
deploy—repeat the legacy site's existing refused/accepted Analytics and Ads
matrix and prove its loader/tag/request behavior is unchanged. Record the
before/after matrix and rollback version in restricted operational evidence. If
any old-site row differs, immediately republish the authorized rollback version,
verify that it is the active version and the prior behavior is restored, then
STOP and report the failed cutover. If rollback cannot be completed or does not
restore the baseline, invoke the operator's incident/escalation path and report
that failure; do not continue to repository implementation.

Add only placeholder variables to `env.example`, and their optional string
types to `src/env.d.ts`:

- `PUBLIC_AXEPTIO_CLIENT_ID`
- `PUBLIC_AXEPTIO_COOKIES_VERSION`
- `PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY`
- `PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY`
- `PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY`

Remove `PUBLIC_ANALYTICS_GTM_DELAY_MS` and
`PUBLIC_ANALYTICS_POSTHOG_DELAY_MS` from `env.example` and `src/env.d.ts`.
Those timers are deleted in Step 2 and retaining configuration for them would
mislead operators.

Do not add any live Axeptio client/version/vendor identifier to `env.example`,
a plan, a test, a commit message, or test output. Preserve unrelated existing
public examples; this step is not a credential-cleanup pass.

**Verify**: `rg -n "PUBLIC_AXEPTIO_(CLIENT_ID|COOKIES_VERSION|GOOGLE_ANALYTICS_VENDOR_KEY|GOOGLE_ADS_VENDOR_KEY|POSTHOG_VENDOR_KEY)" src/env.d.ts env.example && ! rg -n "PUBLIC_ANALYTICS_(GTM|POSTHOG)_DELAY_MS" src/env.d.ts env.example` → each Axeptio variable appears once in each file and obsolete delay variables are absent; the authorized reviewer separately confirms the published dual-mode container, three exact Axeptio keys, complete tag mapping, recorded rollback version, and unchanged old-site Axeptio/Analytics/Ads matrix.

### Step 2: Load Axeptio independently and fail closed

In `src/layouts/BaseLayout.astro` frontmatter, read the five Axeptio variables.
Pass them to the inline analytics boot script with `define:vars`; never inline
hard-coded live identifiers.

Before any analytics trigger is registered:

1. initialize the three purpose/provider authorization flags to `false` and
   push only `{ axeptioBootstrappedBySite: true }` into `dataLayer` for the
   compatible GTM exception; do not push a business event;
2. assign `window.axeptioSettings` with the configured client/version only
   when both are present;
3. initialize `window._axcb` and push a callback that subscribes to
   `sdk.on('cookies:complete', handler)` with replay left enabled;
4. inject `https://static.axept.io/sdk.js` asynchronously and independently of
   GTM/PostHog.

If client ID, cookies version, any vendor key, or the SDK is unavailable, all
analytics must remain disabled. Do not fall back to timers or interactions.
Log at most a generic development warning without any live identifier.

Inside `cookies:complete`, read only the three confirmed key variables from the
payload. Set separate `window.__googleAnalyticsConsentGranted`,
`window.__googleAdsConsentGranted`, and
`window.__posthogConsentGranted` booleans; do not derive one umbrella consent.
Give each external asset an explicit `not-requested` / `loading` / `ready`
lifecycle, plus a terminal `failed` state that never retries automatically.
Expose the minimum cross-module state as
`window.__gtmLifecycleState`, `window.__posthogLifecycleState`,
`window.__googleConsentApplied`, and `window.__posthogInitialized`, initialized
respectively to `not-requested`, `not-requested`, `false`, and `false`; asset
readiness alone never authorizes business-event delivery.
Declare one `GTM_CONSENT_ACK_TIMEOUT_MS = 2000` constant in the boot script and
use it for every acknowledgement wait; do not duplicate or vary the timeout.
Replace the legacy `__gtm_loaded__` and `__posthog_initialized__` flags rather
than retaining two competing lifecycle models. Each script `error` handler must
move only its asset to `failed`, keep its delivery/init state false, and issue at
most a generic development warning; a later choice event must not auto-retry it.

Call `loadGtm()` only when Analytics or Ads is accepted. An acceptance while
GTM is `not-requested` may start the script and move it to `loading`, but it
must **not** queue a granted `axeptio_consent_update` before that script is
ready. In the script's load handler, re-read the latest two Google flags, move
the asset to `ready`, set `window.__googleConsentApplied` false, and only then push the
current `axeptio_consent_update` state object containing
`axeptioGoogleAnalyticsGranted` and `axeptioGoogleAdsGranted`. Enable Google
business-event dispatch only after the matching
`axeptio_consent_applied` acknowledgement, which sets that boolean true only
when the acknowledgement matches the latest two flags. Thus a choice withdrawn while the
asset is loading can produce only the latest denied state when the asset
finishes; it can never leave an earlier grant queued. That state object is the
input to the already-published GTM consent template/tag controls from Step 1;
do not call `gtag('consent', ...)` from Custom HTML or duplicate the container's
consent API integration.

Call `loadPosthog()` only when PostHog is accepted. Do not create a business
capture/init/opt-out stub: the script request may move from `not-requested` to
`loading`, but its load handler must re-read the latest PostHog flag and call
the real `posthog.init()` only when that flag is still true. Immediately after
every authorized real initialization, call the real
`posthog.opt_in_capturing()` to reconcile any opt-out persisted by a previous
withdrawal; only after both calls succeed may
`window.__posthogInitialized` become true. If consent was withdrawn while the
asset was loading, the in-flight asset may finish but it must remain
uninitialized and make no ingestion request. A later acceptance may initialize
an already-ready asset. Because `cookies:complete` replays saved choices, no
local storage consent implementation is needed.

Remove the two delay reads from frontmatter and every interaction, timeout,
`visibilitychange`, and `pagehide` path that can start a provider independently
of `cookies:complete`. Remove the Google preconnect and GTM `<noscript>` iframe;
both can otherwise connect before runtime consent. Keep Mapbox preconnect
unchanged.

For a later choice change, snapshot the previous provider states and update all
three authorization flags before doing anything else. If either Google flag
changed, synchronously set `window.__googleConsentApplied` false; a PostHog-only change
must not disable an unchanged, already-acknowledged Google state. The now-false
PostHog authorization flag disables its dispatcher immediately; preserve
`window.__posthogInitialized` so the revocation barrier still knows whether the real
provider needs an opt-out. A PostHog
true-to-false transition calls the real `posthog.opt_out_capturing()` only when
PostHog was initialized; a withdrawal during asset loading does not call a stub
and the later load handler must observe false and skip initialization. On a
later false-to-true transition, call the real `opt_in_capturing()` only for an
already-initialized provider; initialize a ready-but-never-initialized asset
instead. An identical replayed choice is an idempotent no-op after reconciling
initial asset state.

For any changed Google choice when GTM is `ready`, push the current
`axeptio_consent_update` and wait for the matching
`axeptio_consent_applied` acknowledgement before re-enabling delivery; this
includes later false-to-true grants and true-to-false denials. When GTM is still
`loading`, do not queue either the old grant or a reload barrier; its load
handler will apply only the latest state. Coordinate a combined withdrawal as
one transaction:
after updating all flags, await the Google acknowledgement for a ready GTM and
the real PostHog opt-out for an initialized PostHog, then reload at most once
after every applicable barrier succeeds. If an acknowledgement/opt-out fails or
times out, keep only the affected delivery gate disabled and do **not** reload:
`window.__googleConsentApplied` stays false when the Google tuple changed, while
a withdrawn PostHog choice already blocks its dispatcher even if the stable
initialized fact remains true. Preserve the latest Axeptio authorization flags,
lifecycle facts, and delivery state of every unchanged provider; never turn an
unaffected accepted transport off. Report the provider contract failure rather
than risking collection by the withdrawn purpose/provider.
If every affected provider is only loading or uninitialized, no reload is
needed. The replayed denied choice on any later page must leave that provider
unloaded. Do not invent a provider-cookie deletion list in this plan.

**Verify**: `rg -n "cookies:complete|static\.axept\.io/sdk\.js|_axcb|GOOGLE_ANALYTICS_VENDOR_KEY|GOOGLE_ADS_VENDOR_KEY|POSTHOG_VENDOR_KEY|axeptioBootstrappedBySite|axeptio_consent_update" src/layouts/BaseLayout.astro` → finds the source-owned SDK, three-choice adapter, and GTM compatibility state; `rg -n "googletagmanager.com/ns.html|preconnect.*google.com|loadAnalyticsOnInteraction|scheduleDeferredAnalytics|flushBeforeHidden|PUBLIC_ANALYTICS_.*_DELAY_MS|gtag\(['\"]consent" src/layouts/BaseLayout.astro` → no matches.

### Step 3: Dispatch events only to providers accepted at event time

The current PostHog loader mirrors the complete existing `dataLayer` and then
monkey-patches `dataLayer.push`. Remove `mirrorDataLayerItem`, the
`w.dataLayer.forEach(...)` replay, and that push override from
`BaseLayout.astro`. A shared historical queue cannot enforce independent
choices: an event collected for GTM while PostHog is refused would otherwise
be replayed if PostHog is accepted later.

Update `src/lib/analytics.ts` so `pushDataLayerEvent()` makes two independent,
event-time decisions:

1. when at least one Google purpose flag is true **and** GTM is `ready` with the
   matching state acknowledged (`window.__googleConsentApplied === true`), initialize
   `dataLayer` if needed and push `{ event, ...payload }`; the reviewed container
   must route it only to tags whose independent choice is true;
2. when `window.__posthogConsentGranted === true`, the asset is `ready`,
   `window.__posthogInitialized === true`, and the real `capture` function exists, call
   `posthog.capture(event, payload)` directly;
3. when neither provider is accepted, return without creating a queue.

If at least one Google purpose and PostHog are accepted, send once to each
transport; the container remains responsible for separating its accepted
Google tags. Never queue an event while both Google purposes are false, call
PostHog while it is false, or replay historical business events during a later
false-to-true transition. Drop events while either selected provider is still
loading or waiting for its current consent acknowledgement/init; do not add a
provider queue to recover them later.

In `src/types/window.d.ts`, declare minimal, accurate types for:

- `axeptioSettings` with `clientId` and `cookiesVersion`;
- `_axcb`, whose callbacks receive an SDK exposing `on()` and `openCookies()`;
- `openAxeptioCookies`, the documented plural opener;
- the two lifecycle-state globals, Google acknowledgement boolean, PostHog
  initialization boolean, all three independent consent booleans, and the
  minimal PostHog `init`, `capture`, `opt_out_capturing`, and
  `opt_in_capturing` shape used by the dispatcher/revocation path.

Remove the singular `openAxeptioCookie` declaration. Change the footer button
to call only `window.openAxeptioCookies?.()`, add `type="button"`, and preserve
a visible keyboard focus style. If Axeptio is not loaded, the optional call may
remain a no-op because Step 2's missing-configuration condition blocks release.

**Verify**: `rg -n "openAxeptioCookie\?" src` → no singular-global match; `rg -n "openAxeptioCookies|__gtmLifecycleState|__posthogLifecycleState|__googleConsentApplied|__posthogInitialized|__googleAnalyticsConsentGranted|__googleAdsConsentGranted|__posthogConsentGranted|_axcb|posthog\.capture" src/layouts/BaseLayout.astro src/components/layout/Footer.tsx src/lib/analytics.ts src/types/window.d.ts` → finds the documented opener, provider lifecycles, acknowledgement/init barriers, and three independent dispatch guards; `rg -n "__gtm_loaded__|__posthog_initialized__|mirrorDataLayerItem|dataLayer\.forEach|dataLayer\.push =" src/layouts/BaseLayout.astro src/types/window.d.ts` → no matches.

### Step 4: Test the actual Axeptio event boundary

Create `tests/e2e/analytics-consent.spec.ts`. Intercept the Axeptio SDK request
and fulfill it with a tiny deterministic test script. That script must execute
queued `_axcb` callbacks with a fake SDK whose `on('cookies:complete', handler)`
stores the handler in a test-only window hook. Tests can then emit payloads
using the dummy vendor keys from the focused command. Intercept all GTM,
Google measurement/Ads, PostHog asset, and PostHog ingestion requests; never
depend on third-party responses. Preserve separate request counts for loader
assets and ingestion/beacon endpoints.

Make the sixteen configured matrix cases run only when all eight analytics
inputs equal the exact dummy values from the focused command; otherwise skip
them with an explicit reason. Add one separately collected case named with the
exact phrase `missing configuration`. It runs only when all five Axeptio inputs
are empty and otherwise skips with an explicit reason. The focused command must
use `--grep-invert 'missing configuration'`, while the dedicated empty-variable
command uses `--grep 'missing configuration'`; these are two separate
Playwright invocations and therefore two separate build/preview server
lifecycles. Explicit empty process values override local dotenv values in the
second build. The required full-suite command also overrides all five Axeptio
values to empty, so non-analytics specs cannot load the live SDK; configured
matrix cases skip and the missing-config case runs.

Immediately before **each** E2E invocation, run the port preflight from Commands
you will need. Prefix every invocation with `CI=1` so the current
`playwright.config.ts` sets `reuseExistingServer: false`; also pass
`--retries=0 --workers=1` for deterministic request counts. If port 4321 is
occupied, STOP and report the listener rather than reusing or killing it. These
rules ensure the process environment on each command actually owns that
invocation's build.

Cover these cases in fresh browser contexts:

1. before `cookies:complete`, no GTM/PostHog request occurs and a business
   interaction is not buffered;
2. all three keys false: neither provider loads;
3. Analytics true only: exactly one GTM request, an update state with Analytics
   true/Ads false, and no PostHog request;
4. Ads true only: exactly one GTM request, an update state with Ads
   true/Analytics false, and no PostHog request;
5. PostHog true only: exactly one PostHog asset request, no GTM request, and one
   future business event captured directly by PostHog without appearing in
   `dataLayer`;
6. all three true: GTM and PostHog each attempt one load and one future
   business event is delivered once per accepted transport;
7. stored-choice replay: the fake SDK invokes the handler immediately on
   registration and the accepted provider starts without banner interaction;
8. Google transition isolation while PostHog remains accepted: first cover both
   Google purposes refused followed by one accepted purpose (the first GTM
   load), then table-drive Ads-only → both and Analytics-only → both while GTM is
   already `ready`. For each ready transition, prove
   `window.__googleConsentApplied` becomes false until the matching complete
   two-bit acknowledgement, no second GTM script is added, delivery resumes only
   afterward, and PostHog is never disabled/reinitialized;
9. PostHog refused while Analytics remains accepted, then PostHog accepted
   later: the prior event reaches Google only, the later event reaches both
   accepted transports, and changing PostHog never clears or reapplies the
   unchanged Google acknowledgement;
10. repeated identical choice payloads do not duplicate provider scripts or
    delivery hooks;
11. preferences: the footer button invokes the Axeptio opener;
12. ready-provider withdrawal: separate and combined withdrawals call the real
    PostHog opt-out, wait for the matching Google acknowledgement, coordinate
    one reload only after every applicable barrier, and make no later ingestion,
    tag, or page-leave request for the withdrawn provider/purpose; an unchanged
    accepted provider remains enabled and may deliver a later control event. The
    replayed denied page leaves the withdrawn provider unloaded. Also cover a
    missing acknowledgement and prove it keeps only the affected delivery gate
    disabled without reloading;
13. GTM-loading withdrawal: deliberately hold the GTM asset response, accept a
    Google purpose, withdraw it before fulfillment, then fulfill the asset;
    prove no granted consent update was ever queued, only the latest denied
    state is applied, and no GA/Ads ingestion or tag request occurs;
14. PostHog-loading withdrawal: deliberately hold the PostHog asset response,
    accept PostHog, withdraw before fulfillment, then fulfill it; prove the real
    provider is never initialized and no capture/ingestion request occurs;
15. combined-loading withdrawal: hold both assets, accept all three choices,
    withdraw all choices before either fulfillment, then fulfill both in both
    response orders; prove no provider grant/init/business delivery occurs and
    no reload is attempted;
16. persistent PostHog opt-out reconciliation: initialize PostHog, withdraw and
    persist the fake provider's opt-out across the resulting reload, then accept
    PostHog again; prove the real initialization path calls
    `opt_in_capturing()` before delivery readiness and one later event is
    captured exactly once.

Use request counts, DOM script elements, `dataLayer`, and window flags as
deterministic assertions. Do not assert on live provider or Axeptio responses.

In the missing-ack branch of case 12, wait at least `2250ms` (the exact
`2000ms` constant plus scheduling margin) before asserting that no reload
occurred and delivery remains disabled.

**Verify**: run, in order, the exact `E2E port preflight`, `Focused E2E`, `E2E
port preflight`, and `Missing-config E2E` commands from Commands you will need.
All four exit 0: the first isolated build runs and passes all sixteen configured
cases; the second isolated build runs and passes the fail-closed case; every
external request is intercepted.

### Step 5: Document configuration, run local gates, and commit the tested candidate

Update the analytics section in `README.md` to state that Axeptio loads first,
each provider waits for its exact accepted vendor key, refusal/withdrawal is
fail-closed, and the footer reopens Axeptio. Document only variable names and
where an authorized operator finds the vendor technical keys. Remove the old
description of unconditional interaction/timer/page-hide loading and the two
obsolete delay variables. Do not claim legal certification.

Format only the in-scope files, run lint, build, the focused suite, and the
complete E2E suite. Confirm the lockfile did not change. After every command
passes, create the single final implementation commit from Git workflow and
record its full 40-character SHA. Do not amend or change a source/root-README
file after this point; any such change invalidates the candidate and requires a
new commit plus a complete repeat of Step 6.

Run this exact gate from a shell with no server already bound to port 4321:

```sh
check_e2e_port() {
  node -e "const net = require('node:net'); const server = net.createServer(); server.once('error', () => process.exit(1)); server.listen(4321, '127.0.0.1', () => server.close())"
}

yarn prettier --write src/layouts/BaseLayout.astro src/components/layout/Footer.tsx src/lib/analytics.ts src/types/window.d.ts src/env.d.ts tests/e2e/analytics-consent.spec.ts README.md &&
  git diff --check -- env.example &&
  yarn lint &&
  yarn build &&
  check_e2e_port &&
  CI=1 PUBLIC_AXEPTIO_CLIENT_ID=test-client PUBLIC_AXEPTIO_COOKIES_VERSION=test-version PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY=test-ga PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY=test-ads PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY=test-posthog PUBLIC_GTM_ID=GTM-TEST PUBLIC_POSTHOG_KEY=test-project-key PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com yarn test:e2e tests/e2e/analytics-consent.spec.ts --grep-invert 'missing configuration' --retries=0 --workers=1 &&
  check_e2e_port &&
  CI=1 PUBLIC_AXEPTIO_CLIENT_ID= PUBLIC_AXEPTIO_COOKIES_VERSION= PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY= PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY= PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY= yarn test:e2e tests/e2e/analytics-consent.spec.ts --grep 'missing configuration' --retries=0 --workers=1 &&
  check_e2e_port &&
  CI=1 PUBLIC_AXEPTIO_CLIENT_ID= PUBLIC_AXEPTIO_COOKIES_VERSION= PUBLIC_AXEPTIO_GOOGLE_ANALYTICS_VENDOR_KEY= PUBLIC_AXEPTIO_GOOGLE_ADS_VENDOR_KEY= PUBLIC_AXEPTIO_POSTHOG_VENDOR_KEY= yarn test:e2e --retries=0 --workers=1 &&
  git diff --check &&
  git diff --exit-code -- yarn.lock
```

**Verify**: every command exits 0; immediately before the implementation
commit, `git status --short --untracked-files=all` lists only the scoped
implementation files plus any coordinator-owned plan-index status row.

### Step 6: Configure deploy contexts and validate the exact final SHA

Before creating the validation deploy, an authorized operator must set all five
`PUBLIC_AXEPTIO_*` values from Step 1 in both the Netlify Deploy Preview and
Production Builds contexts. Verify actual presence and scope in the dashboard
without printing their values; preparation outside Netlify is not sufficient.
If the executor lacks authorization or any production value cannot be present,
leave this plan `BLOCKED` and do not mark it done. A preview built without all
five preview-scoped values is not a consent acceptance target.

After an authorized operator creates a Deploy Preview for the exact full
implementation SHA recorded in Step 5, verify the Netlify deploy record itself
reports that same full SHA before testing. Test the real, already-published GTM
compatibility version in fresh browser contexts. Use GTM Preview/Tag Assistant
plus the browser network panel; do not infer tag behavior from source flags
alone. Verify this exact matrix:

| Choice                   | May load/fire                                                | Must not request/fire                    |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------- |
| undecided or all refused | one Axeptio SDK only                                         | GTM, GA4, Ads/conversion linker, PostHog |
| Analytics only           | GTM and mapped GA4 tags                                      | Ads/conversion linker, PostHog           |
| Ads only                 | GTM and mapped Ads/conversion tags                           | GA4, PostHog                             |
| PostHog only             | PostHog                                                      | GTM and every Google tag                 |
| all accepted             | one Axeptio SDK, one GTM loader, mapped Google tags, PostHog | duplicate SDK/provider loaders           |

For each row, confirm the Tag Assistant consent state precedes tag firing and
matches the three Axeptio booleans. Reopen preferences, withdraw one accepted
choice, and confirm the affected PostHog provider opts out or Google purpose
acknowledges its updated state before navigation, the fail-closed reload returns
to the correct row, and no page-leave/ingestion request for the withdrawn
provider/purpose follows. Send one later control event to prove any unchanged
accepted provider remains enabled. Record only the preview URL,
repository commit, GTM container version, Netlify variable names/scopes, date,
and pass/fail matrix in operational/PR evidence; do not commit variable values,
tag exports, account data, cookies, or visitor identifiers.

**Verify**: an authorized operator attests all five names are actually present in
both the Deploy Preview and Production Builds scopes; the deploy record's full
SHA equals the Step 5 implementation SHA; all five matrix rows pass; exactly one
`static.axept.io/sdk.js` request occurs per context; and no request/tag occurs
for a refused or withdrawn provider/purpose. The evidence must bind that SHA to the GTM
container version. Any mismatch is a STOP condition, not a documentation
caveat. Make no repository implementation change after this verification.

## Test plan

- Add `tests/e2e/analytics-consent.spec.ts` with the sixteen cases specified in
  Step 4 plus one separately selected missing-configuration case.
- Model navigation/assertions after `tests/e2e/booking.smoke.spec.ts`; fulfill
  the SDK script and abort providers through Playwright routing.
- Exercise independent Analytics/Ads/PostHog choices, false-to-true transitions
  without historical replay, duplicate prevention, preference opening, and
  ready-state and in-flight-loading withdrawal.
- Treat the real GTM Preview/Tag Assistant matrix in Step 6 as a release gate;
  mocked E2E tests cannot prove an external container's tag configuration.
- Run the focused command with dummy public identifiers, the dedicated command
  with all five Axeptio values explicitly empty, then the full-suite command
  with the same five empty overrides;
  configured cases must skip explicitly unless every dummy value matches, and
  the missing case must skip unless every Axeptio value is empty; neither may
  attempt live requests.
- Verification: all three E2E invocations exit 0; no test contacts a live
  Axeptio, GTM, or PostHog endpoint.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] An authorized export maps every live GTM tag, and the published
      compatibility container version is recorded.
- [ ] The exact published Axeptio keys for Google Analytics, Google Ads, and
      PostHog were confirmed independently before implementation.
- [ ] Undecided/refused choices make zero GTM/PostHog requests and do not buffer
      business analytics events.
- [ ] Each provider loads independently only when its exact payload property is
      `true`.
- [ ] Business events are dispatched only to providers accepted at event time;
      neither provider receives events retroactively after later acceptance.
- [ ] PostHog no longer mirrors or monkey-patches the GTM `dataLayer`.
- [ ] The legacy GTM Axeptio tag is suppressed by the new site's bootstrap flag
      and each tested context makes exactly one Axeptio SDK request.
- [ ] The published compatibility version preserves the old site's complete
      legacy Axeptio/Analytics/Ads behavior when the bootstrap flag is absent;
      its before/after matrix, authorized rollback, and rollback container
      version are recorded.
- [ ] The real five-row provider matrix passes in GTM Preview/Tag Assistant with
      zero refused-purpose requests or tag fires.
- [ ] PostHog opt-out and the Google consent acknowledgement happen before any
      withdrawal reload, with zero later ingestion/page-leave requests by the
      withdrawn provider/purpose and unchanged accepted providers still enabled.
- [ ] GTM- and PostHog-loading withdrawals, including the combined race, are
      tested with delayed asset fulfillment and cannot queue a grant, initialize
      PostHog, deliver a business event, or trigger a reload.
- [ ] Provider-isolation transitions prove a Google-only change cannot disable
      PostHog and a PostHog-only change cannot clear the unchanged Google state.
- [ ] A persisted PostHog opt-out is reconciled by a real authorized init plus
      `opt_in_capturing()` before the next accepted business event is delivered.
- [ ] All five named public variables are actually present in both the tested
      Deploy Preview and Production Builds contexts without values entering git
      or logs; otherwise the plan is `BLOCKED`, never `DONE`.
- [ ] The tested Deploy Preview record identifies the exact final implementation
      SHA created after the local gates, with no later implementation change.
- [ ] Stored-choice replay, preference reopening, and withdrawal are covered by
      deterministic Playwright tests.
- [ ] The dedicated explicit-empty-variable test proves missing configuration
      cannot load or ingest through any provider even when dotenv files exist.
- [ ] `rg -n "googletagmanager.com/ns.html|loadAnalyticsOnInteraction|scheduleDeferredAnalytics|flushBeforeHidden|PUBLIC_ANALYTICS_.*_DELAY_MS" src/layouts/BaseLayout.astro src/env.d.ts env.example README.md` returns no matches.
- [ ] `yarn lint`, `yarn build`, the focused suite, and `yarn test:e2e` exit 0.
- [ ] `yarn.lock` is unchanged.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated by the plan owner.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" no longer matches the excerpts.
- The published Axeptio project, cookies version, any of the three exact vendor
  keys, or an authorized GTM export cannot be inspected and confirmed.
- An existing tag is unmapped, Analytics and Ads cannot be separated, the
  compatibility container cannot be reviewed/published first, or the owner will
  not approve moving SDK ownership into the site.
- Rollback authorization cannot be obtained before publishing the compatibility
  container, or its rollback version cannot be recorded.
- The dual-mode container changes any old-site Axeptio, Analytics, Ads,
  conversion-linker, or conversion-tag behavior while the bootstrap flag is
  absent. Execute the pre-authorized rollback and verify restoration before
  stopping/reporting; escalate as an incident if rollback fails.
- The live project uses TCF, a nonstandard data-layer/consent template, or a
  choice model more complex than the three verified booleans; revise the
  contract rather than guessing.
- GTM Preview/Tag Assistant or the network panel shows a duplicate Axeptio
  loader, a refused-purpose request/tag fire, late consent initialization, or
  historical-event replay.
- PostHog cannot opt out synchronously, the GTM acknowledgement is absent or
  mismatched, or the withdrawn provider/purpose makes an ingestion/page-leave
  request after withdrawal.
- Any of the five named variables cannot be verified as actually present in
  both required Netlify contexts, or the Deploy Preview record does not match
  the final implementation SHA.
- Tests would need a real identifier, consent record, or third-party response.
- Withdrawal cannot be made fail-closed without deleting undocumented cookies;
  report observed behavior and stop rather than guessing.
- A verification command fails twice after a reasonable fix attempt.
- The fix requires touching an out-of-scope file.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- Vendor technical keys are configuration contracts. If a service is renamed
  in Axeptio, update its environment variable and rerun the independent-choice
  tests before deploying.
- Any new analytics transport must be tied to a verified
  `cookies:complete` choice and receive a refusal/replay/withdrawal test.
- Reviewers should scrutinize boot order, fail-closed missing configuration,
  provider independence, replay behavior, and removal of the noscript bypass.
- Consent copy, provider-specific cookie deletion, and eventual retirement of
  the rollback-compatible legacy Axeptio tag remain external policy/operations
  follow-ups; tag-level consent controls are a required gate in this plan.
