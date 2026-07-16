# Plan 011: Stop hydrating static React sections

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
> `git diff --stat 9aece8f..HEAD -- src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts`
> `git diff --stat HEAD -- src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts`
> `git ls-files --others --exclude-standard -- src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/010-responsive-content-images.md`
- **Category**: perf
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

Four content-only React sections are shipped as browser islands even though
they contain no state, events, effects, or browser APIs. Astro can render these
components to the same static HTML at build time without sending their component
modules for hydration. Removing only those four directives reduces JavaScript
and hydration work while leaving genuinely interactive pricing, map, form,
footer preferences, animal selector, and hero islands untouched.

## Current state

- `src/pages/index.astro:81` renders
  `<WhenToConsult id="quand-consulter" client:visible />`.
- `src/layouts/wrappers/DeroulementConsultationWrapper.astro:22-26` renders
  `ConsultationProcess` with `client:visible`.
- `src/layouts/wrappers/OsteopathieAnimaleWrapper.astro:14` renders
  `Osteopathy` with `client:visible`.
- `src/layouts/wrappers/QuiSuisJeWrapper.astro:14` renders `About` with
  `client:visible`.
- The corresponding components
  `WhenToConsult.tsx`, `ConsultationProcess.tsx`, `Osteopathy.tsx`, and
  `About.tsx` are pure render functions. They contain no React hook, event
  handler, `window`, `document`, or `navigator` access.
- Interactive islands that must remain include `MapSection`, `PrixWrapper`,
  `ContactWrapper`, `Footer`, `AnimalSection`, and `Hero`. Do not use a broad
  search-and-replace on `client:visible`.
- An Astro framework component without a `client:*` directive is still
  server-rendered into HTML; only browser hydration is omitted.

## Commands you will need

| Purpose     | Command                                                                                                                                                                                                                                    | Expected on success           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Install     | `yarn install --frozen-lockfile`                                                                                                                                                                                                           | exit 0; lockfile unchanged    |
| Format      | `yarn prettier --check src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts` | exit 0                        |
| Lint        | `yarn lint`                                                                                                                                                                                                                                | exit 0, no errors             |
| Build       | `yarn build`                                                                                                                                                                                                                               | exit 0; static HTML generated |
| Focused E2E | `yarn test:e2e tests/e2e/static-sections.spec.ts`                                                                                                                                                                                          | focused tests pass            |
| Full E2E    | `yarn test:e2e`                                                                                                                                                                                                                            | all tests pass                |

## Suggested executor toolkit

- Use Playwright DOM evaluation to prove the headings render outside an
  `astro-island`; do not infer success only from bundle filenames.

## Scope

**In scope** (the only files you should modify):

- `src/pages/index.astro`
- `src/layouts/wrappers/DeroulementConsultationWrapper.astro`
- `src/layouts/wrappers/OsteopathieAnimaleWrapper.astro`
- `src/layouts/wrappers/QuiSuisJeWrapper.astro`
- `tests/e2e/static-sections.spec.ts` (create)
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- The four React component implementations; they already support SSR-only use.
- `Hero`, `AnimalSection`, `MapSection`, `Pricing`, `ContactWrapper`, and
  `Footer`, all of which have interactions or browser-side behavior.
- Converting React components to `.astro`, changing content/styles, or removing
  React dependencies.
- Responsive image generation; execute Plan 010 first because three wrappers
  overlap.

## Git workflow

- Branch: `codex/011-remove-static-react-hydration`
- Make one logical commit: `Remove static section hydration`.
- Keep the title imperative and under 72 characters.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove exactly four hydration directives

In `src/pages/index.astro`, render:

```astro
<WhenToConsult id="quand-consulter" />
```

In each of the three wrapper files, delete only the `client:visible` attribute
from `ConsultationProcess`, `Osteopathy`, or `About`. Preserve all props and
formatting. Do not alter any other `client:*` directive.

**Verify**: `rg -n 'client:visible' src/pages/index.astro src/layouts/wrappers/*.astro` →
matches remain for interactive `MapSection`, `PrixWrapper`, `ContactWrapper`,
and `Footer`, but not for `WhenToConsult`, `ConsultationProcess`, `Osteopathy`,
or `About`.

### Step 2: Verify all four sections remain in static HTML

Build the production output and search for these unique headings/text fragments:

- `Quand consulter un ostéopathe ?`
- `Qu'est ce que l'ostéopathie pour les animaux ?`
- `Agathe Lescout`
- `Ostéopathe pratiquant` (the consultation image alt text)

The text is HTML-escaped in places, so use separate plain fragments rather than
one exact serialized block.

**Verify**: `yarn build && rg -n 'Quand consulter|ostéopathie pour les animaux|Agathe Lescout|Ostéopathe pratiquant' dist/index.html` →
the build exits 0 and every listed section has at least one match.

### Step 3: Add a no-hydration regression test

Create `tests/e2e/static-sections.spec.ts` using the structure of
`tests/e2e/booking.smoke.spec.ts`. Load `/`, locate each section by its unique
heading or image alt text, assert it is visible, then evaluate
`element.closest('astro-island')` and assert the result is `null`.

Use these four locators:

- heading `Quand consulter un ostéopathe ?`;
- heading `Qu'est ce que l'ostéopathie pour les animaux ?`;
- heading `Agathe Lescout` at level 3 (avoid the hero's level-1 duplicate);
- image alt `Ostéopathe pratiquant une manipulation vertébrale sur un cheval`.

Do not count all `astro-island` nodes; other interactive islands are expected
and their count can change independently.

**Verify**: `yarn test:e2e tests/e2e/static-sections.spec.ts` → all four
assertions pass in Chromium.

### Step 4: Run full gates and inspect the generated client graph

Run formatting, lint, build, and the full E2E suite. After the build, ensure the
four component names are not emitted as hydrated island component URLs in
`dist/index.html`. This HTML assertion is stable even if content hashes change.

**Verify**: `yarn prettier --write src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts && yarn lint && yarn build && yarn test:e2e && ! rg -n 'component-url="[^"]*(WhenToConsult|ConsultationProcess|Osteopathy|About)' dist/index.html && git diff --check` → every command exits 0.

## Test plan

- Add `tests/e2e/static-sections.spec.ts` with one test covering all four
  content sections.
- Assert both user-visible rendering and absence of an ancestor
  `astro-island`; this detects accidental re-hydration without relying on
  generated file hashes.
- Run the full E2E suite to protect the surrounding interactive islands.
- Verification: focused and full Playwright commands both pass.

## Done criteria

- [ ] `yarn lint`, `yarn build`, and `yarn test:e2e` exit 0.
- [ ] The four sections are present and visible in the built page.
- [ ] None of their rendered nodes has an `astro-island` ancestor.
- [ ] `dist/index.html` has no hydrated component URL for the four component
      names.
- [ ] Existing interactive island directives remain unchanged.
- [ ] No React implementation, dependency, content, CSS, or image behavior is
      changed.
- [ ] `git diff --check` exits 0 and `git status --short --untracked-files=all`
      lists only files in Scope plus the allowed plan-index status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Any of the four components has gained state, effects, event handlers, refs,
  browser globals, or another client-only dependency since commit `9aece8f`.
- Plan 010 changed an overlapping wrapper in a way that does not match this
  plan's current state.
- Removing a directive prevents a section or its image from appearing in
  `dist/index.html`.
- An interactive island would need its directive removed or changed to pass a
  test.
- The fix requires converting components, changing their props, or touching a
  file outside Scope.
- A verification fails twice after one reasonable fix attempt.

## Maintenance notes

- If one of these components later gains an event handler, state, an effect, a
  ref, or direct browser API access, explicitly restore the narrowest suitable
  `client:*` directive and extend the test.
- Reviewers should inspect `dist/index.html`, compare desktop/mobile screenshots,
  and confirm the map, pricing controls, contact form, animal selector, hero
  menu, and preference control remain interactive.
- A future conversion of static React components to `.astro` may reduce server
  dependencies further, but is not needed to remove their browser JavaScript.
