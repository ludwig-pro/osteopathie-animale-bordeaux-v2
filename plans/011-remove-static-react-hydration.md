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
> `git diff --stat 5c28763..HEAD -- src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts`
> `git diff --stat HEAD -- src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts`
> `git ls-files --others --exclude-standard -- src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts`
> `git diff --quiet 5c28763..HEAD -- src/components/landing-page/when-to-consult/WhenToConsult.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/components/landing-page/osteopathy/Osteopathy.tsx src/components/landing-page/about/About.tsx src/components/common/icons/index.ts src/components/common/icons/Bilan.tsx src/components/common/icons/BreakBone.tsx src/components/common/icons/Articulation.tsx src/components/common/icons/Grow.tsx src/components/common/icons/Thunder.tsx src/components/common/icons/Gate.tsx src/components/common/icons/Lungs.tsx src/lib/responsiveImage.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition. The fourth command must exit 0;
> otherwise the reviewed SSR-safety evidence is stale and execution must STOP
> for a new transitive component audit.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/010-responsive-content-images.md`
- **Category**: perf
- **Planned at**: commit `5c28763`, 2026-07-16

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
- `src/layouts/wrappers/DeroulementConsultationWrapper.astro:17-22` renders
  `ConsultationProcess` with `client:visible`.
- `src/layouts/wrappers/OsteopathieAnimaleWrapper.astro:13` renders
  `Osteopathy` with `client:visible`.
- `src/layouts/wrappers/QuiSuisJeWrapper.astro:13` renders `About` with
  `client:visible`.
- The corresponding components
  `WhenToConsult.tsx`, `ConsultationProcess.tsx`, `Osteopathy.tsx`, and
  `About.tsx` are pure render functions. They contain no React hook, event
  handler, `window`, `document`, or `navigator` access.
- Interactive islands that must remain include `MapSection`, `PrixWrapper`,
  `ContactWrapper`, `Footer`, `AnimalSection`, and `Hero`. Do not use a broad
  search-and-replace on `client:visible`.
- The current production build emits ten named `component-url` entries. Four
  point at dedicated browser chunks for `WhenToConsult`,
  `ConsultationProcess`, `Osteopathy`, and `About`; the other six are the
  interactive islands that must remain.
- Independent read-only builds at `5c28763` measured those four dedicated
  chunks at roughly `34.5–34.8 kB` raw in total. Treat this as review evidence,
  not a hash or exact-size acceptance gate: build metadata can alter hashes and
  a small number of bytes.
- An Astro framework component without a `client:*` directive is still
  server-rendered into HTML; only browser hydration is omitted. This matches
  Astro's official client-directive and islands documentation.

## Commands you will need

| Purpose     | Command                                                                                                                                                                                                                                    | Expected on success           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Install     | `yarn install --frozen-lockfile`                                                                                                                                                                                                           | exit 0; lockfile unchanged    |
| Format      | `yarn prettier --check src/pages/index.astro src/layouts/wrappers/DeroulementConsultationWrapper.astro src/layouts/wrappers/OsteopathieAnimaleWrapper.astro src/layouts/wrappers/QuiSuisJeWrapper.astro tests/e2e/static-sections.spec.ts` | exit 0                        |
| Lint        | `yarn lint`                                                                                                                                                                                                                                | exit 0, no errors             |
| Build       | `PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build`                                                                                                                                                                         | exit 0; static HTML generated |
| Focused E2E | `CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/static-sections.spec.ts`                                                                                                                               | focused tests pass            |
| Full E2E    | `CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`                                                                                                                                                                 | all tests pass                |
| Drift       | `git diff --quiet HEAD -- .astro && git diff --check`                                                                                                                                                                                      | no generated or spacing drift |

## Suggested executor toolkit

- Use Playwright DOM evaluation to prove the headings render outside an
  `astro-island`; do not infer success only from bundle filenames.
- Use `dist/index.html` plus `dist/_astro` to prove the four named client
  entries disappear while the six interactive entries remain.
- Reference Astro's official
  `https://docs.astro.build/en/reference/directives-reference/` and
  `https://docs.astro.build/en/concepts/islands/` contracts if behavior is
  unclear.

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

- Branch: `improve`
- Make one logical commit: `perf: stop hydrating static sections`.
- Keep the title imperative and under 72 characters.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Capture the current browser-island baseline

After installing locked dependencies, require
`git diff --quiet HEAD -- .astro` and record hashes for every tracked `.astro`
file. After every build or Playwright run in this plan, restore only
`.astro/settings.json:_variables.lastUpdateCheck` with `apply_patch` if it is
the sole difference; STOP on any other tracked `.astro` drift.

Require `/tmp/plan-011-static-hydration-before.tsv` to be absent, then run a
production build with `PUBLIC_SENTRY_DSN`, `PUBLIC_GTM_ID`, and
`PUBLIC_POSTHOG_KEY` empty. Parse the four matching `component-url` values from
`dist/index.html`, resolve each URL to its file under `dist/`, and write exactly
four tab-separated rows containing component name, URL, and raw byte size:

- `WhenToConsult`
- `ConsultationProcess`
- `Osteopathy`
- `About`

Create `/tmp/plan-011-client-graph.mjs` with `apply_patch` and this exact
content; do not commit it:

```js
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

const mode = process.argv[2];
const inventoryPath = '/tmp/plan-011-static-hydration-before.tsv';
const staticNames = [
  'WhenToConsult',
  'ConsultationProcess',
  'Osteopathy',
  'About',
];
const interactiveNames = [
  'Hero',
  'AnimalSection',
  'MapSection',
  'Pricing',
  'ContactWrapper',
  'Footer',
];
const htmlMarkers = [
  '>Quand consulter un ostéopathe ?</h2>',
  '<h3>Agathe Lescout</h3>',
  '>Qu&#x27;est ce que l&#x27;ostéopathie pour les animaux ?</h2>',
  'alt="Ostéopathe pratiquant une manipulation vertébrale sur un cheval"',
];

if (!['capture', 'after'].includes(mode)) {
  throw new Error('Usage: node client-graph.mjs <capture|after>');
}

const html = readFileSync('dist/index.html', 'utf8');
const componentUrls = [...html.matchAll(/component-url="([^"]+)"/g)].map(
  ([, url]) => url
);
const outputPath = (url) => {
  const pathname = new URL(url, 'https://local.invalid').pathname;
  if (!pathname.startsWith('/_astro/')) {
    throw new Error(`Unexpected component URL: ${url}`);
  }
  return join('dist', decodeURIComponent(pathname).replace(/^\/+/, ''));
};
const namedUrls = (name) =>
  componentUrls.filter((url) =>
    basename(new URL(url, 'https://local.invalid').pathname).startsWith(
      `${name}.`
    )
  );
const requireCount = (name, expected) => {
  const matches = namedUrls(name);
  if (matches.length !== expected) {
    throw new Error(
      `${name}: expected ${expected} URL(s), got ${matches.length}`
    );
  }
  return matches;
};

for (const marker of htmlMarkers) {
  if (!html.includes(marker)) {
    throw new Error(`Missing static HTML marker: ${marker}`);
  }
}

for (const name of interactiveNames) {
  requireCount(name, 1);
}

if (mode === 'capture') {
  const rows = staticNames.map((name) => {
    const [url] = requireCount(name, 1);
    const filePath = outputPath(url);
    const bytes = statSync(filePath).size;
    if (!filePath.endsWith('.js') || bytes <= 0) {
      throw new Error(`${name}: invalid client file ${filePath}`);
    }
    return `${name}\t${url}\t${bytes}`;
  });

  if (new Set(rows.map((row) => row.split('\t')[1])).size !== rows.length) {
    throw new Error('Static component URLs must be unique');
  }

  writeFileSync(inventoryPath, `${rows.join('\n')}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
} else {
  for (const name of staticNames) {
    requireCount(name, 0);
  }

  const rows = readFileSync(inventoryPath, 'utf8')
    .trim()
    .split('\n')
    .map((row) => row.split('\t'));
  if (
    rows.length !== staticNames.length ||
    new Set(rows.map(([name]) => name)).size !== staticNames.length ||
    new Set(rows.map(([, url]) => url)).size !== staticNames.length
  ) {
    throw new Error('Invalid pre-edit inventory');
  }

  for (const [name, url, bytes] of rows) {
    if (
      !staticNames.includes(name) ||
      !Number.isInteger(Number(bytes)) ||
      Number(bytes) <= 0
    ) {
      throw new Error(`Invalid inventory row for ${name}`);
    }
    if (existsSync(outputPath(url))) {
      throw new Error(`${name}: old client output still exists`);
    }
  }

  const clientFiles = readdirSync('dist/_astro');
  for (const name of staticNames) {
    if (clientFiles.some((file) => file.startsWith(`${name}.`))) {
      throw new Error(`${name}: named client chunk still exists`);
    }
  }
}
```

Run `node /tmp/plan-011-client-graph.mjs capture`. The script fails if a named
URL is absent, duplicated, outside `/_astro/`, or does not resolve to a
non-empty JavaScript file. It also asserts that `Hero`, `AnimalSection`,
`MapSection`, `Pricing`, `ContactWrapper`, and `Footer` each have exactly one
named `component-url` entry and that four exact structural HTML markers exist.

**Verify**: the baseline TSV has exactly four unique component names and four
unique URLs with positive byte sizes; all ten expected named island entries are
present in `dist/index.html`; `node /tmp/plan-011-client-graph.mjs capture`
exits 0; and `.astro` is restored to its initial hashes.

### Step 2: Remove exactly four hydration directives

In `src/pages/index.astro`, render:

```astro
<WhenToConsult id="quand-consulter" />
```

In each of the three wrapper files, delete only the `client:visible` attribute
from `ConsultationProcess`, `Osteopathy`, or `About`. Preserve all props and
formatting. Do not alter any other `client:*` directive.

**Verify**:
`rg -n 'client:(load|visible)' src/pages/index.astro src/layouts/wrappers/*.astro`
→ matches remain for interactive `Hero`, `AnimalSection`, `MapSection`,
`Pricing`, `ContactWrapper`, and `Footer`, but not for `WhenToConsult`,
`ConsultationProcess`, `Osteopathy`, or `About`. Inspect the diff: it contains
only the four directive removals, with every prop—including the Plan 010
responsive image DTOs—unchanged.

### Step 3: Verify static HTML and the reduced client graph

Build the production output and require these exact structural markers:

- `>Quand consulter un ostéopathe ?</h2>`
- `>Qu&#x27;est ce que l&#x27;ostéopathie pour les animaux ?</h2>`
- `<h3>Agathe Lescout</h3>`
- `alt="Ostéopathe pratiquant une manipulation vertébrale sur un cheval"`

Assert that none of the four removed names appears in a `component-url`
attribute or a correspondingly named client file in `dist/_astro`. Read every
URL from the Step 1 TSV and assert its previous output path no longer exists.
Conversely, require exactly one named `component-url` for each of the six
interactive components `Hero`, `AnimalSection`, `MapSection`, `Pricing`,
`ContactWrapper`, and `Footer`.

**Verify**:
`PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build` exits 0;
`node /tmp/plan-011-client-graph.mjs after` exits 0, proving the four exact
structural markers, four negative client-graph assertions, six positive
assertions, and absence of all four old baseline paths; then `.astro` is
restored to the Step 1 hashes.

### Step 4: Add a no-hydration regression test

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

In the same test, positively lock the six interactive boundaries without
depending on their global count. Use these representative locators:

- hero: `[data-testid="cta-booking-online"]`;
- animal selector: heading `L'ostéopathie pour qui ?`;
- map: `[data-testid="map-load-trigger"]`;
- pricing: heading `Tarifs`;
- contact: `#contactForm`;
- footer: the `footer` element.

For each representative locator, scroll it into view, assert it has exactly one
`astro-island` ancestor, and wait for that island's `ssr` marker to disappear.
This proves the named interactive boundaries still hydrate while the four
content sections do not. Do not add new production test IDs.

**Verify**:
`CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/static-sections.spec.ts`
→ the four static and six interactive boundary assertions pass in Chromium,
then `.astro` is restored to the Step 1 hashes.

### Step 5: Run full gates and inspect the final diff

Format only the in-scope files, then run lint, the isolated production build,
and the full CI-mode E2E suite. Repeat the Step 3 positive and negative
client-graph checks after the final build. Confirm the four React
implementations, `package.json`, `yarn.lock`, content, classes, image props, and
all six interactive directives are unchanged.

**Verify**: targeted Prettier, `yarn lint`,
`PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn build`,
`node /tmp/plan-011-client-graph.mjs after`,
`CI=1 PUBLIC_SENTRY_DSN= PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e`,
the four negative and six positive named client-graph assertions,
`git diff --check`, and `git diff --quiet HEAD -- .astro` exit 0.

## Test plan

- Add `tests/e2e/static-sections.spec.ts` with one test covering all four
  content sections and six named interactive boundaries.
- Assert both user-visible rendering and absence of an ancestor
  `astro-island`; this detects accidental re-hydration without relying on
  generated file hashes.
- Assert the six representative interactive locators remain inside a hydrated
  `astro-island`; do not rely on a global island count.
- Compare the generated graph with the four-row pre-edit inventory: the old
  static paths disappear, while the six named interactive component URLs
  remain.
- Run the full E2E suite to protect the surrounding interactive islands.
- Verification: focused and full Playwright commands both pass.

## Done criteria

- [ ] `yarn lint`, the isolated production build, and the CI-mode full E2E
      suite exit 0.
- [ ] The pre-edit inventory contains exactly four unique, non-empty client
      chunks with positive byte sizes.
- [ ] The four sections are present and visible in the built page.
- [ ] None of their rendered nodes has an `astro-island` ancestor.
- [ ] `dist/index.html`, `dist/_astro`, and the four recorded old paths contain
      no hydrated client entry for the four static component names.
- [ ] Exactly one named URL remains for each of the six interactive components;
      their URL hashes may change, but their source directives remain
      unchanged and their representative locators hydrate in Playwright.
- [ ] No React implementation, dependency, content, CSS, or image behavior is
      changed.
- [ ] Tracked `.astro` files match `HEAD` after restoring only the known
      `lastUpdateCheck` artifact.
- [ ] `git diff --check` exits 0 and `git status --short --untracked-files=all`
      lists only files in Scope plus the allowed plan-index status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Any of the four components has gained state, effects, event handlers, refs,
  browser globals, or another client-only dependency since commit `5c28763`.
- Plan 010 changed an overlapping wrapper in a way that does not match this
  plan's current state.
- Removing a directive prevents a section or its image from appearing in
  `dist/index.html`.
- An interactive island would need its directive removed or changed to pass a
  test.
- The fix requires converting components, changing their props, or touching a
  file outside Scope.
- A named interactive `component-url` disappears, fails to hydrate, or needs
  its directive changed.
- A tracked `.astro` file changes beyond
  `.astro/settings.json:_variables.lastUpdateCheck`.
- A verification fails twice after one reasonable fix attempt.

## Maintenance notes

- If one of these components later gains an event handler, state, an effect, a
  ref, or direct browser API access, explicitly restore the narrowest suitable
  `client:*` directive and extend the test.
- Reviewers should inspect `dist/index.html`, the four-row byte inventory, and
  the focused Playwright boundary checks. Compare desktop/mobile screenshots
  only if loaded geometry or content differs unexpectedly.
- A future conversion of static React components to `.astro` may reduce server
  dependencies further, but is not needed to remove their browser JavaScript.
