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
> `git diff --stat 9aece8f..HEAD -- src/lib/responsiveImage.ts src/layouts/wrappers/AnimalSectionWrapper.astro src/layouts/wrappers/PrixWrapper.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro src/components/landing-page/animals/AnimalSection.tsx src/components/landing-page/animals/Section.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx tests/e2e/content-images.spec.ts`
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
- **Planned at**: commit `9aece8f`, 2026-07-15

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
| Build       | `yarn build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | exit 0; Astro check and static build complete   |
| Focused E2E | `yarn test:e2e tests/e2e/content-images.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | one Chromium test file passes                   |
| Full E2E    | `yarn test:e2e`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | all tests pass                                  |

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

- Branch: `codex/010-responsive-content-images`
- Make one logical commit after all gates pass: `Optimize responsive content images`.
- Keep the title imperative and under 72 characters, matching `AGENTS.md`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Capture the loaded-layout baseline before editing

After installing locked dependencies, run the current site locally and use a
DPR-1 Chromium session at `375x812`, `768x1024`, `1024x768`, `1280x900`, and
`1440x900`. At **every** viewport, scroll every lazy image into view, wait for
`complete` plus nonzero natural dimensions, and activate all five animal menu
items (`chien`, `chat`, `cheval`, `vache`, `nac`) one by one.

Store, outside the repository, screenshots and a JSON inventory under
`/tmp/plan-010-content-images-before/`. Produce exactly 60 uniquely keyed image
records: each of the 12 logical source-backed images (five animal choices, three
price cards, two consultation images, bulldog, portrait) at each of the five
viewports. For every record, store the logical-image key, viewport, alt text,
rendered bounding-box width and height after load, and current source URL
without query data. Never commit these artifacts. This is the visual/crop
baseline and the evidence used to calibrate the `sizes` hints below.

**Verify**: the temporary inventory has five distinct viewport keys, exactly 12
distinct logical-image keys under every viewport, and exactly 60 unique
viewport/image pairs; every record is complete with nonzero dimensions, and
`git status --short --untracked-files=all` remains unchanged. STOP if the current
page already has a broken image, any pair is missing/duplicated, or a variant
cannot be selected deterministically.

### Step 2: Add one server-side responsive image builder

Create `src/lib/responsiveImage.ts`. Import the runtime helper and metadata type
from their actual Astro 6 modules:

```ts
import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";
```

Accept an `ImageMetadata` source plus an ordered, non-empty array of widths and
a non-empty `sizes` string, and return this
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

Validate that the widths are finite positive integers in strictly increasing
order, then treat the last value as `largestWidth`. Call Astro once with
`getImage({ src, width: largestWidth, widths, sizes, format: 'webp', quality:
80 })`. Supplying the explicit base `width` keeps `result.src` and its intrinsic
dimensions bounded to the largest planned candidate instead of silently
generating an original-width fallback in addition to the `srcset`. Copy only
`result.src`, `result.srcSet.attribute`, the input `sizes`, and the result's
numeric `attributes.width`/`attributes.height` into the DTO. Reject an empty or
unordered width list, invalid width, empty `sizes`, or missing numeric result
dimensions with a clear error. Keep the helper server-only: no browser APIs and
no React import. Do not reproduce the manual multi-call implementation in
`HeroWrapper`.

**Verify**: `yarn build` → exit 0; no Astro or TypeScript errors.

### Step 3: Generate bounded variants with CSS-aligned selection hints

Replace the one-off `getImage` calls with the helper. Use these width sets and
`sizes` hints; do not upscale beyond the listed maximum:

| Wrapper                                | Images                       | Widths           | `sizes`                                                                                   |
| -------------------------------------- | ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `AnimalSectionWrapper.astro`           | dog, cat, horse, rabbit, cow | `480, 768, 1280` | `(min-width: 1280px) 608px, (min-width: 640px) calc(50vw - 2rem), calc(100vw - 2rem)`     |
| `PrixWrapper.astro`                    | dog/cat, ferret, package     | `320, 640, 800`  | `(min-width: 1280px) 400px, (min-width: 640px) calc(50vw - 3rem), calc(100vw - 2rem)`     |
| `DeroulementConsultationWrapper.astro` | kitten, correction           | `480, 768, 1200` | `(min-width: 1280px) 600px, (min-width: 1024px) calc(50vw - 2rem), calc(100vw - 2rem)`    |
| `OsteopathieAnimaleWrapper.astro`      | bulldog                      | `480, 768, 1200` | `(min-width: 1280px) 600px, (min-width: 1024px) calc(50vw - 2rem), calc(100vw - 2rem)`    |
| `QuiSuisJeWrapper.astro`               | Agathe portrait              | `320, 640, 960`  | `(min-width: 1280px) 400px, (min-width: 640px) calc(33.333vw - 2rem), calc(100vw - 2rem)` |

These starting hints mirror the real Tailwind transitions: pricing changes to
two columns at `sm` and three at `xl`; consultation and osteopathy split only at
`lg`; the portrait becomes one-third width at `sm`. Compare them with the Step
1 widths. A numeric/calc term may be adjusted only to the smallest conservative
value supported by those measurements, without editing CSS: at every measured
viewport it must not cause a DPR-1 browser to choose a candidate smaller than
the rendered width or to skip past the smallest adequate candidate. Record any
measured adjustment in review evidence. STOP if no single CSS-aligned hint can
satisfy that rule.

Preserve each existing prop name and image-to-content mapping. Remove direct
`getImage` imports only after each wrapper uses the helper. Do not change its
hydration directive in this plan.

**Verify**: `yarn build && rg -o 'srcset="[^"]+"' dist/index.html | head` →
the build exits 0 and the output shows comma-separated width candidates.

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

For `yougncat.jpeg` and `bulldog.jpeg`, the intrinsic attributes intentionally
change from the incorrect landscape placeholder to the source's portrait ratio.
That pre-load correction is in scope. Do not add an aspect-ratio class or alter
`object-cover`; after each image has loaded, its bounding box and crop must still
match the Step 1 baseline.

**Verify**: `yarn build && rg -o 'data-testid="responsive-content-image"' dist/index.html | wc -l` →
exit 0 and exactly `8` server-rendered content images are present (one selected
animal, three pricing cards, two consultation images, one osteopathy image, and
one portrait).

### Step 5: Lock variants, candidate choice, and geometry with Playwright

Create `tests/e2e/content-images.spec.ts`, following the imports and structure
of `tests/e2e/booking.smoke.spec.ts`. Use one aggregate test—not five parallel
tests—that loops sequentially over the same five viewport widths captured in
Step 1 and keeps its 60-pair key set inside that test. Set an explicit
`120_000ms` timeout for this aggregate test.

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

At every one of the five widths, activate each animal item by its accessible
label and wait for the image `src`/alt text to change. Re-run the same `srcset`,
`sizes`, candidate, completion, and dimension assertions for all five variants.
Track a local logical-image key set and assert exactly 12 unique keys before
closing each context. Add those keys to the aggregate test's single in-memory
set and assert exactly 60 unique viewport/image pairs after the loop. Do not use
module-level state: `fullyParallel` workers do not share it. The initial eight
DOM nodes alone are not coverage of the four non-default animal images.

Assert `window.devicePixelRatio === 1` before the candidate checks. Do not
hard-code a generated asset hash or URL; resolve the runtime `currentSrc`
against the parsed candidates because their names are build-dependent.

**Verify**: `yarn test:e2e tests/e2e/content-images.spec.ts` → all focused tests
pass in Chromium.

### Step 6: Compare the visual baseline and run complete quality gates

Format only the in-scope files, then run lint, build, and the full E2E suite.
Repeat the exact 60-record Step 1 matrix into
`/tmp/plan-010-content-images-after/`. Assert the before/after key sets are
identical. For every viewport/image pair, compare the rendered bounding box with
the baseline (maximum one CSS pixel difference per dimension) and inspect paired
screenshots for crop or layout changes. Only the pre-load intrinsic placeholder
ratio may differ.
Inspect the diff to ensure image mappings, copy, CSS, and hydration are
unchanged.

**Verify**: `yarn prettier --write src/lib/responsiveImage.ts src/layouts/wrappers/AnimalSectionWrapper.astro src/layouts/wrappers/PrixWrapper.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro src/components/landing-page/animals/AnimalSection.tsx src/components/landing-page/animals/Section.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx tests/e2e/content-images.spec.ts && yarn lint && yarn build && yarn test:e2e && git diff --check` → every command exits 0.

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
