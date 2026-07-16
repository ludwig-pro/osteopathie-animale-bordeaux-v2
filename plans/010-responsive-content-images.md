# Plan 010: Generate real responsive content images

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
> `git diff --stat d4e1c70..HEAD -- src/lib/responsiveImage.ts src/layouts/wrappers/AnimalSectionWrapper.astro src/layouts/wrappers/PrixWrapper.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro src/components/landing-page/animals/AnimalSection.tsx src/components/landing-page/animals/Section.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx tests/e2e/content-images.spec.ts`
> `git diff --stat HEAD -- src/lib/responsiveImage.ts src/layouts/wrappers/AnimalSectionWrapper.astro src/layouts/wrappers/PrixWrapper.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro src/components/landing-page/animals/AnimalSection.tsx src/components/landing-page/animals/Section.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx tests/e2e/content-images.spec.ts`
> `git ls-files --others --exclude-standard -- src/lib/responsiveImage.ts src/layouts/wrappers/AnimalSectionWrapper.astro src/layouts/wrappers/PrixWrapper.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro src/components/landing-page/animals/AnimalSection.tsx src/components/landing-page/animals/Section.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx tests/e2e/content-images.spec.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `d4e1c70`, 2026-07-16

## Why this matters

Most below-the-fold images are generated at one fixed width and rendered
without a `sizes` hint. A small phone can therefore select the same 800 px or
1280 px WebP as a desktop layout, while several elements also declare hard-coded
dimensions that do not match the source aspect ratio. Generating three
width-based candidates per image lets the browser choose a smaller transfer and
preserves the real intrinsic ratio to avoid layout shifts.

## Current state

- `src/layouts/wrappers/HeroWrapper.astro:6-27` proves the repository already
  serves width-based candidates, but constructs them manually. For content
  images, use Astro's native `getImage({ widths, sizes })` support and return a
  minimal serializable DTO instead of forwarding the full `GetImageResult`.
- `src/layouts/wrappers/AnimalSectionWrapper.astro:11-44` generates five WebP
  images at only 1280 px. `src/components/landing-page/animals/Section.tsx:28-36`
  consumes `srcSet.attribute`, has no `sizes`, and declares every animal image
  as 1200 by 800.
- `src/layouts/wrappers/PrixWrapper.astro:9-28` generates three card images at
  only 800 px. `src/components/landing-page/pricing/Pricing.tsx:187-195`
  declares all of them as 800 by 400.
- `src/layouts/wrappers/DeroulementConsultationWrapper.astro:7-19`,
  `src/layouts/wrappers/OsteopathieAnimaleWrapper.astro:6-11`, and
  `src/layouts/wrappers/QuiSuisJeWrapper.astro:6-11` likewise generate one
  800 px result. Their React consumers read `srcSet.attribute` without a
  `sizes` attribute.
- The source assets have different ratios. For example,
  `src/images/yougncat.jpeg` is 1234 by 1851 and
  `src/images/correction.jpg` is 1924 by 1112, but both are declared 1200 by
  800 in `ConsultationProcess.tsx:147-156` and `:274-283`.
- Source pixel widths measured at planning time are: animal images 2100 (dog),
  2100 (cat), 1866 (horse), 1934 (rabbit), and 1839 (cow); pricing images 2896,
  2704, and 1350; consultation images 1234 and 1924; bulldog 1234; portrait 960.
  The width ceilings in Step 3 are all at or below these values.
- Astro image processing is already configured with `responsiveStyles: true`
  in `astro.config.mjs:24-26`; do not add a dependency or another image
  service.
- Applicable conventions from `AGENTS.md`: Prettier defaults, two-space
  indentation, single quotes, React files in PascalCase, and `yarn build` plus
  browser checks before review.

## Commands you will need

| Purpose     | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Expected on success                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Install     | `yarn install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | exit 0; `yarn.lock` unchanged                   |
| Format      | `yarn prettier --check src/lib/responsiveImage.ts src/layouts/wrappers/AnimalSectionWrapper.astro src/layouts/wrappers/PrixWrapper.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro src/components/landing-page/animals/AnimalSection.tsx src/components/landing-page/animals/Section.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx tests/e2e/content-images.spec.ts` | exit 0; all named files use Prettier formatting |
| Lint        | `yarn lint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | exit 0, no errors                               |
| Build       | `PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | exit 0; Astro check and static build complete   |
| Focused E2E | `CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/content-images.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | one Chromium test file passes                   |
| Full E2E    | `CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | all tests pass                                  |
| Drift       | `git diff --quiet HEAD -- .astro && git diff --check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | no generated or whitespace drift                |

## Suggested executor toolkit

- Use Astro's installed `astro:assets` API and copy the established candidate
  construction pattern from `src/layouts/wrappers/HeroWrapper.astro`; do not
  introduce an external image library.
- Confirm the native `getImage({ widths, sizes })` contract in Astro's official
  module reference before coding:
  `https://docs.astro.build/en/reference/modules/astro-assets/`.
- Use Playwright's existing project in `playwright.config.ts` for the rendered
  attribute regression test.

## Scope

**In scope** (the only files you should modify):

- `src/lib/responsiveImage.ts` (create)
- `src/layouts/wrappers/AnimalSectionWrapper.astro`
- `src/layouts/wrappers/PrixWrapper.astro`
- `src/layouts/wrappers/DeroulementConsultationWrapper.astro`
- `src/layouts/wrappers/OsteopathieAnimaleWrapper.astro`
- `src/layouts/wrappers/QuiSuisJeWrapper.astro`
- `src/components/landing-page/animals/AnimalSection.tsx`
- `src/components/landing-page/animals/Section.tsx`
- `src/components/landing-page/pricing/Pricing.tsx`
- `src/components/landing-page/consultation/ConsultationProcess.tsx`
- `src/components/landing-page/osteopathy/Osteopathy.tsx`
- `src/components/landing-page/about/About.tsx`
- `tests/e2e/content-images.spec.ts` (create)
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- `src/layouts/wrappers/HeroWrapper.astro` and `Hero.tsx`; the hero already has
  multiple candidates and changing LCP behavior needs separate measurement.
- Any `client:*` directive. Plan 011 removes only the proven static islands.
- Source files, alt text, copy, Tailwind layout, post-load geometry, or
  `object-cover` crop behavior. Correcting the HTML intrinsic placeholder ratio
  before an image finishes loading is explicitly in scope because it is the CLS
  defect; any post-load crop or geometry change is a STOP condition.
- AVIF rollout, CDN changes, dependencies, Astro upgrades, or Netlify settings.

## Git workflow

- Branch: `improve`
- Make one logical commit after all gates pass:
  `perf: optimize responsive content images`.
- Keep the title imperative and under 72 characters, matching `AGENTS.md`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Capture the loaded-layout baseline before editing

After installing locked dependencies, require
`git diff --quiet HEAD -- .astro` and record hashes for every tracked `.astro`
file. This baseline applies to every generator in this plan: after each build
or Playwright run, restore only
`.astro/settings.json:_variables.lastUpdateCheck` with `apply_patch` if it is
the sole difference and STOP on any other drift.

Require port `4321` to be free. With the three public observability variables
empty, run a production build, restore the allowed `.astro` timestamp artifact,
then start `yarn preview --host 127.0.0.1 --port 4321` only for this capture.
Use a DPR-1 Chromium session at `375x812`, `768x1024`, `1024x768`,
`1280x900`, and `1440x900`. At **every** viewport, scroll every lazy image into
view, wait for `complete` plus nonzero natural dimensions, and wait for the
`AnimalSection` island to hydrate (its `astro-island[ssr]` marker must
disappear) before using its controls. Exercise the animals in the order `chat`,
`cheval`, `vache`, `nac`, `chien` so every selection changes the default dog
image. At `375px`, open the Headless UI listbox through the current selected
label—the button sequence is `Le chien`, `Le chat`, `Le cheval`, `La vache`,
then `Les nouveaux animaux de compagnie`—before choosing the next option
labelled `Le chat`, `Le cheval`, `La vache`, `Les nouveaux animaux de
compagnie`, then `Le chien`. At widths of `640px` or more, use the React Aria
`menuitem` labels `Le chat`, `Le cheval`, `La vache`, `N.A.C.`, and `Le chien`.
After every selection, wait for both the animal image's `src` and alt text to
change before recording it.

Run the baseline with `PUBLIC_SENTRY_DSN`, `PUBLIC_GTM_ID`, and
`PUBLIC_POSTHOG_KEY` empty. Require
`/tmp/plan-010-content-images-before/` to be absent or empty, then recreate
exactly that path so a retry cannot inherit stale JSON or PNG files. Store one
element screenshot and one JSON record for every pair there. Produce exactly
60 uniquely keyed image records and exactly 60 correspondingly named PNG
files: each of the 12 logical source-backed images (five animal choices, three
price cards, two consultation images, bulldog, portrait) at each of the five
viewports. For every record, store the logical-image key, viewport, alt text,
rendered bounding-box width and height after load, and current source URL
without query data. Never commit these artifacts. This is the visual/crop
baseline and the evidence used to calibrate the `sizes` hints below. Stop the
manual preview in a `finally` path after capture, wait until port `4321` is
free, and only then continue; the CI-mode Playwright gates must own their
configured server lifecycle.

**Verify**: the temporary inventory has five distinct viewport keys, exactly 12
distinct logical-image keys under every viewport, exactly 60 unique
viewport/image pairs, and exactly 60 matching PNG names; every record is
complete with nonzero dimensions, and
`git status --short --untracked-files=all` remains unchanged. STOP if the
current page already has a broken image, any pair is missing/duplicated, or a
variant cannot be selected deterministically.

### Step 2: Add one server-side responsive image builder

Create `src/lib/responsiveImage.ts`. Import the runtime helper and metadata type
from their actual Astro 6 modules:

```ts
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
```

Accept an `ImageMetadata` source plus an ordered, non-empty
`readonly number[]` of widths and a non-empty `sizes` string, and return this
minimal serializable shape:

```ts
export type ResponsiveImageData = {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
};
```

Validate that `sizes.trim()` is non-empty and that widths are finite positive
integers in strictly increasing order, with every value at or below
`src.width`. Clone the array before passing it to Astro because the installed
local image service sorts `widths` in place. Treat the last value as
`largestWidth`. Call Astro once with
`getImage({ src, width: largestWidth, widths: [...widths], sizes, format:
'webp', quality: 80 })`. Supplying the explicit base `width` keeps `result.src`
and its intrinsic dimensions bounded to the largest planned candidate instead
of silently generating an original-width fallback in addition to the
`srcset`.

Require `result.srcSet.values` to contain exactly the requested descriptors in
order (`480w`, etc.), require a non-empty `srcSet.attribute`, and require
positive finite numeric `attributes.width`/`attributes.height` with the width
equal to `largestWidth`. Copy only `result.src`, `result.srcSet.attribute`, the
trimmed input `sizes`, and those numeric dimensions into the DTO. Reject any
contract mismatch with a clear error. Keep the helper server-only: no browser
APIs and no React import. Do not reproduce the manual multi-call
implementation in `HeroWrapper`.

**Verify**:
`PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build` → exit 0;
no Astro or TypeScript errors, then `.astro` is restored to the Step 1 hashes.

### Step 3: Generate bounded variants with CSS-aligned selection hints

Replace the one-off `getImage` calls with the helper. Use these width sets and
`sizes` hints; do not upscale beyond the listed maximum:

| Wrapper                                | Images                       | Widths           | `sizes`                                                                                                                                                        |
| -------------------------------------- | ---------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AnimalSectionWrapper.astro`           | dog, cat, horse, rabbit, cow | `480, 768, 1280` | `(min-width: 1280px) 592px, (min-width: 1024px) calc(50vw - 3rem), (min-width: 768px) 452px, (min-width: 640px) calc(50vw + 8.25rem), calc(100vw + 10rem)`     |
| `PrixWrapper.astro`                    | dog/cat, ferret, package     | `320, 640, 800`  | `(min-width: 1280px) 390px, (min-width: 1024px) 436px, (min-width: 640px) calc(50vw - 2.25rem), calc(100vw - 2rem)`                                            |
| `DeroulementConsultationWrapper.astro` | kitten, correction           | `480, 768, 1200` | `(min-width: 1280px) 624px, (min-width: 1024px) calc(50vw - 1rem), (min-width: 640px) 560px, (min-width: 576px) 576px, 100vw`                                  |
| `OsteopathieAnimaleWrapper.astro`      | bulldog                      | `480, 640, 1200` | `(min-width: 1280px) 478px, (min-width: 1024px) 571px, (min-width: 768px) calc(100vw + 2.5rem), (min-width: 640px) calc(100vw + 10.5rem), calc(100vw + 11rem)` |
| `QuiSuisJeWrapper.astro`               | Agathe portrait              | `320, 640, 960`  | `(min-width: 1280px) 390px, (min-width: 1024px) calc(33.333vw - 2.334rem), (min-width: 640px) calc(33.333vw - 2rem), calc(100vw - 2rem)`                       |

These hints are calibrated against a read-only DPR-1 run of the current
`d4e1c70` page. The rendered widths in CSS pixels were:

| Viewport | Animals | Pricing  | Consultation | Bulldog  | Portrait |
| -------- | ------- | -------- | ------------ | -------- | -------- |
| `375`    | `535`   | `343`    | `375`        | `551`    | `343`    |
| `768`    | `388`   | `348`    | `560`        | `808`    | `224`    |
| `1024`   | `464`   | `436`    | `496`        | `570.66` | `304`    |
| `1280`   | `592`   | `389.33` | `624`        | `477.33` | `389.33` |
| `1440`   | `592`   | `389.33` | `624`        | `477.33` | `389.33` |

Pricing changes to two columns at `sm`, receives a fixed `lg:max-w-4xl`
two-column width, and changes to three columns at `xl`; consultation splits at
`lg`; the portrait becomes one-third width at `sm`. The animals and bulldog
intentionally extend beyond their grid cells before their desktop layouts. The
extra clauses model the real `sm`, `md`, `lg`, max-width, padding, gap, and
negative-margin transitions; using only the five acceptance viewports hides
under-sized selections immediately before several breakpoints.

For the bulldog, `lg:h-full lg:w-auto` makes its width depend on the text
column's resulting height, so the measured integer ceilings at `lg` and `xl`
are more accurate than a synthetic `50vw` term. Its middle candidate is `640`
rather than `768`: that still covers the measured `551px` and `570.66px`
slots, while the `1200px` candidate remains available for the `808px` tablet
slot and higher-DPR displays. Conservatively keep the `571px` hint until the
stable `1280px` max-width layout even though Chromium's current text wrapping
makes the visual width fall below `480px` around `1246px`; a small temporary
over-selection is safer than a font-dependent under-sized selection.

At every measured viewport, and throughout a read-only breakpoint sweep, the
hints above select the smallest listed candidate that is not narrower than the
rendered image, except for that documented conservative bulldog band. Re-confirm
the five exact acceptance outcomes with the Step 5 fresh-context test. STOP
rather than adjusting CSS or accepting any under-sized candidate or any other
skipped adequate candidate.

Preserve each existing prop name and image-to-content mapping. Remove direct
`getImage` imports only after each wrapper uses the helper. Do not change its
hydration directive in this plan.

**Verify**:
`PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build && rg -o 'srcset="[^"]+"' dist/index.html | head`
→ the build exits 0, the output shows comma-separated width candidates, and
`.astro` is restored to the Step 1 hashes.

### Step 4: Pass browser selection hints and real dimensions

Replace the duplicated local `ImageData` types with `import type` declarations
for `ResponsiveImageData`. Change each React `<img>` from
`srcSet={image.srcSet.attribute}` to `srcSet={image.srcSet}`, set
`sizes={image.sizes}`, and set its `width`/`height` from the returned data. The
layout-specific hints are defined once in the wrapper calls from Step 3; do not
duplicate them as string literals in the React consumers.

Add `data-testid="responsive-content-image"` to these content `<img>` elements
so one stable regression test can cover them. Preserve existing `loading`,
`decoding`, alt text, classes, and component behavior.

Every content image must receive the largest generated variant's real intrinsic
ratio; several current hard-coded ratios are inaccurate. The correction is
most visible for portrait `yougncat.jpeg` and `bulldog.jpeg`, but animal,
pricing, correction, and portrait attributes may also change. These are
pre-load placeholder corrections only. Do not add an aspect-ratio class or
alter `object-cover`; after each image has loaded, its bounding box and crop
must still match the Step 1 baseline.

**Verify**:
`PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build && rg -o 'data-testid="responsive-content-image"' dist/index.html | wc -l`
→ exit 0, exactly `8` server-rendered content images are present (one selected
animal, three pricing cards, two consultation images, one osteopathy image, and
one portrait), and `.astro` is restored to the Step 1 hashes.

### Step 5: Lock variants, candidate choice, and geometry with Playwright

Create `tests/e2e/content-images.spec.ts`, following the imports and structure
of `tests/e2e/booking.smoke.spec.ts`. Use one aggregate test—not five parallel
tests—that loops sequentially over the same five viewport widths captured in
Step 1 and keeps its 60-pair key set inside that test. Set an explicit
`180_000ms` timeout for this aggregate test.

Receive Playwright's configured `browser` and `baseURL` fixtures and fail if
`baseURL` is absent. For each loop entry, create a fresh context with
`browser.newContext({ baseURL, viewport, deviceScaleFactor: 1, serviceWorkers:
'block' })`, create the page, navigate with `page.goto('/')`, and close the
context in `finally` before the next width. Do not reuse a page or context. This
preserves the configured server origin while isolating HTTP cache and browser
storage; blocking service workers removes another candidate-cache source. Treat
the exact `currentSrc` rule as a fixed regression assertion for the repository's
installed Chromium build under these controlled conditions, not as a claim
about every user agent. Select all `[data-testid="responsive-content-image"]`
elements and assert:

1. exactly eight are server-rendered;
2. every `srcset` contains exactly three comma-separated candidates, each with
   a `w` descriptor;
3. every `sizes` attribute is non-empty;
4. scroll each lazy image into view in document order, wait for its `complete`
   property, and then assert `naturalWidth > 0` and `naturalHeight > 0`;
5. parse each `srcset` into absolute URL/width pairs, match `currentSrc`, and at
   DPR 1 assert the chosen descriptor equals the smallest candidate whose width
   is at least the rendered CSS width, or the largest candidate when the image
   renders wider than every candidate. This detects both under-sized and
   over-stated `sizes` hints.

At every one of the five widths, first wait for the `AnimalSection` island to
hydrate by requiring its `astro-island[ssr]` marker to disappear. Exercise the
animals in the order `chat`, `cheval`, `vache`, `nac`, `chien`, which guarantees
that each selection changes the default dog image. At `375px`, open the
Headless UI listbox through the current selected label—the button sequence is
`Le chien`, `Le chat`, `Le cheval`, `La vache`, then `Les nouveaux animaux de
compagnie`—before choosing the next option labelled `Le chat`, `Le cheval`, `La
vache`, `Les nouveaux animaux de compagnie`, then `Le chien`. At widths of
`640px` or more, use the React Aria `menuitem` labels `Le chat`, `Le cheval`,
`La vache`, `N.A.C.`, and `Le chien`. After each activation, wait for both the
animal image's `src` and alt text to change. Re-run the same `srcset`, `sizes`,
candidate, completion, and dimension assertions for all five variants. Track a
local logical-image key set and assert exactly 12 unique keys before closing
each context. Add those keys to the aggregate test's single in-memory set and
assert exactly 60 unique viewport/image pairs after the loop. Do not use
module-level state: `fullyParallel` workers do not share it. The initial eight
DOM nodes alone are not coverage of the four non-default animal images.

Assert `window.devicePixelRatio === 1` before the candidate checks. Do not
hard-code a generated asset hash or URL; resolve the runtime `currentSrc`
against the parsed candidates because their names are build-dependent.

**Verify**:
`CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/content-images.spec.ts`
→ the focused test passes in Chromium and `.astro` is restored to the Step 1
hashes.

### Step 6: Compare the visual baseline and run complete quality gates

Format only the in-scope files, then run lint and build. Repeat the exact
60-record Step 1 matrix into
`/tmp/plan-010-content-images-after/`, including exactly 60 correspondingly
named element screenshots. Assert the before/after JSON and PNG key sets are
identical. For every viewport/image pair, compare the rendered bounding box
with the baseline (maximum one CSS pixel difference per dimension) and inspect
paired screenshots for crop or layout changes. Only the pre-load intrinsic
placeholder ratio may differ.
Inspect the diff to ensure image mappings, copy, CSS, and hydration are
unchanged.

For the after capture, require
`/tmp/plan-010-content-images-after/` to be absent or empty, recreate only that
exact path, run a production build with the three public observability
variables empty, and restore the allowed `.astro` timestamp artifact. Require
port `4321` to be free, start
`yarn preview --host 127.0.0.1 --port 4321` only for the capture, and stop it in
a `finally` path. Wait until the port is free before launching the
configuration-managed full E2E suite. Do not capture from `yarn dev`: its
`/_image?...` URLs make the query-stripped source identity ambiguous, and do
not let a manual preview satisfy Playwright's `webServer` readiness check.
After the visual and geometry comparisons pass, run the full E2E suite.

Before running generators, require `git diff --quiet HEAD -- .astro` and record
hashes for every tracked `.astro` file. After each build or Playwright run,
restore only `.astro/settings.json:_variables.lastUpdateCheck` with
`apply_patch` if it is the sole generated difference; STOP on any other
tracked `.astro` drift.

**Verify**: targeted Prettier, `yarn lint`,
`PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build`,
`CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`,
`git diff --check`, and `git diff --quiet HEAD -- .astro` all exit 0.

## Test plan

- Add `tests/e2e/content-images.spec.ts` with table-driven cases over all eight
  simultaneously rendered images at five viewport widths.
- Cover exactly three real width candidates, a CSS-aligned `sizes` hint,
  smallest-adequate candidate selection at DPR 1, and nonzero natural
  dimensions.
- Exercise all five animal selector values at all five widths; count exactly 12
  logical source images per viewport and 60 unique viewport/image pairs rather
  than treating the initial dog as all animal coverage.
- Compare after-load geometry and paired screenshots with the pre-edit baseline;
  allow only the corrected pre-load intrinsic placeholder ratio to change.
- Model imports, navigation, and locators after
  `tests/e2e/booking.smoke.spec.ts`.
- Verification: `yarn test:e2e tests/e2e/content-images.spec.ts` and then
  `yarn test:e2e` → all tests pass.

## Done criteria

- [ ] `yarn lint`, `yarn build`, and `yarn test:e2e` exit 0.
- [ ] Every in-scope image has exactly three generated width candidates and a
      non-empty `sizes` attribute.
- [ ] DPR-1 tests at all five target widths prove Chromium selects the smallest
      candidate adequate for each rendered CSS width.
- [ ] All five animal choices pass the responsive contract at all five widths;
      the test and both visual inventories contain the same exact 60 unique
      viewport/image pairs.
- [ ] No in-scope `<img>` declares a hard-coded intrinsic ratio; it uses the
      generated largest variant's width and height.
- [ ] After-load bounding boxes differ from the Step 1 baseline by at most one
      CSS pixel per dimension, and paired screenshots show no crop/layout
      change; only pre-load intrinsic placeholders use corrected ratios.
- [ ] `rg -n 'srcSet\.attribute' src/components/landing-page/{animals,pricing,consultation,osteopathy,about}` returns no matches.
- [ ] `rg -o 'data-testid="responsive-content-image"' dist/index.html | wc -l` prints `8`.
- [ ] No image source, copy, CSS class, `client:*` directive, dependency, or
      generated output is committed.
- [ ] Tracked `.astro` files match `HEAD` after restoring only the known
      `lastUpdateCheck` artifact.
- [ ] `git diff --check` exits 0 and `git status --short --untracked-files=all`
      lists only files in Scope plus the allowed plan-index status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Any current-state path, prop name, or image mapping differs from the excerpts
  above after the drift check.
- `getImage({ widths, sizes })` in the installed Astro version does not return
  `srcSet.attribute` plus numeric intrinsic dimensions as documented.
- A requested width exceeds the corresponding source asset width.
- The fix requires changing layout CSS, cropping, content, hydration, an image
  source, or a file outside Scope.
- The built page renders a content image without three candidates, or the test
  count is not eight for the initial state.
- Any animal selector value lacks responsive data, fails to load, or cannot be
  exercised through its accessible control.
- A final `sizes` hint selects an under-sized candidate or skips past the
  smallest adequate candidate at a measured DPR-1 viewport.
- Loaded bounding-box geometry moves by more than one CSS pixel, or screenshot
  review finds a crop/layout change relative to the pre-edit baseline.
- A tracked `.astro` file changes beyond
  `.astro/settings.json:_variables.lastUpdateCheck`.
- A verification fails twice after one reasonable fix attempt.

## Maintenance notes

- Keep the width arrays ordered and bounded by their original asset width. Add
  a candidate only when a real layout breakpoint needs it; more variants also
  increase build time and generated storage.
- Reviewers should compare mobile and desktop screenshots, inspect one browser
  network trace, and confirm that mobile selects a smaller candidate without
  changing the loaded crop or geometry.
- Hero LCP format changes and AVIF are deliberately deferred because they need
  separate real-device and Lighthouse measurement.
