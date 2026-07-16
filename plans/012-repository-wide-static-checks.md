# Plan 012: Enforce repository-wide static checks

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
> `git diff --stat 9aece8f..HEAD -- package.json .prettierignore eslint.config.js tsconfig.tests.json sentry.client.config.ts scripts/check-lighthouse-regression.mjs .github/workflows/ci-quality.yml`
> `git diff --stat HEAD -- package.json .prettierignore eslint.config.js tsconfig.tests.json sentry.client.config.ts scripts/check-lighthouse-regression.mjs .github/workflows/ci-quality.yml`
> `git ls-files --others --exclude-standard -- package.json .prettierignore eslint.config.js tsconfig.tests.json sentry.client.config.ts scripts/check-lighthouse-regression.mjs .github/workflows/ci-quality.yml`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work.
> Completed dependency plans may legitimately have changed
> `sentry.client.config.ts`, `scripts/check-lighthouse-regression.mjs`, or the CI
> workflow. Compare those diffs with the dependency plans' done criteria; for
> any unexplained change or other current-state mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-consent-gated-analytics.md`, `plans/002-contact-form-validation.md`, Plan 003's committed remote-test-harness checkpoint from `plans/003-netlify-form-deploy-verification.md`, `plans/004-directions-geolocation-fallback.md`, `plans/005-mapbox-on-demand.md`, `plans/006-module-recovery-reload-guard.md`, `plans/007-ci-least-privilege.md`, `plans/008-lighthouse-current-deploy-correlation.md`, `plans/009-sentry-url-sanitization.md`, `plans/010-responsive-content-images.md`, `plans/011-remove-static-react-hydration.md`
- **Category**: dx
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

The current checks cover application source but omit TypeScript/TSX from the
format script, exclude Playwright tests from TypeScript, and do not lint tests,
root configuration, or Node scripts. As a result, CI can be green while the
code used to test and deploy the site has syntax, typing, or formatting drift.
This plan adds a final, explicit consolidation gate without using a blind
repository-wide rewrite or mixing historical Markdown reformatting into a
technical change.

## Current state

- `package.json:16` formats only `js`, `jsx`, `json`, `md`, and `astro`;
  `package.json:17` lints only `src/**/*`; there is no `format:check`,
  `typecheck`, or aggregate static-check script.
- `tsconfig.json:25-31` excludes `playwright.config.ts` and the entire `tests`
  directory, so `yarn build`/`astro check` cannot typecheck the E2E harness.
- `eslint.config.js:11-21` applies a typed parser with
  `project: './tsconfig.json'` to every JS/TS file. Simply widening the CLI glob
  would therefore make excluded Playwright files fail parser setup rather than
  lint correctly.
- `.github/workflows/ci-quality.yml:33-39` runs `yarn lint` and `yarn build`, but
  no read-only Prettier gate and no test-config TypeScript project.
- `.prettierignore` currently ignores `package.json` as well as generated,
  dependency, public, and local-agent directories. Retain the generated/local
  exclusions and stop excluding the tracked package manifest. At execution,
  the plan-corpus prerequisite means all 14 `plans/*.md` files are tracked and
  must remain byte-stable. Temporarily add the three known-drift legacy Markdown
  files and the root plan directory so the repository's required `yarn format`
  command cannot rewrite either corpus incidentally.
- A read-only Prettier audit on commit `9aece8f` reported existing drift in
  `AGENTS.md`, `CLAUDE.md`, `RFC.md`, `sentry.client.config.ts`, and
  `scripts/check-lighthouse-regression.mjs`. This plan fixes only the two
  executable-code files. The three historical Markdown files are explicitly
  outside the CI check and outside Scope to avoid an unrelated large prose
  rewrite.
- `playwright.config.ts`, the `playwright.netlify.config.ts` created by Plan
  003, and `tests/{e2e,netlify}/*.spec.ts` are TypeScript and import types from
  `@playwright/test`. `scripts/*.mjs`, `astro.config.mjs`, `eslint.config.js`,
  and `tailwind.config.js` are Node-side JavaScript modules and should be
  linted/formatted, not forced into the browser globals used by source files.
- Completed Plans 008 and 009 add dependency-free Node tests at
  `scripts/parse-netlify-lighthouse-comment.test.js` and
  `tests/unit/sanitizeTelemetryUrl.test.js`. The final repository gate must
  discover, format, lint, and run both files; treating only Playwright as
  "tests" would leave those regressions outside CI.
- The repository uses Yarn 1.22.22 and Node 22 or newer (`package.json:8-9,73`).

## Commands you will need

| Purpose          | Command                          | Expected on success                                                   |
| ---------------- | -------------------------------- | --------------------------------------------------------------------- |
| Install          | `yarn install --frozen-lockfile` | exit 0; `yarn.lock` unchanged                                         |
| Format check     | `yarn format:check`              | exit 0; tracked code/config files are formatted                       |
| Lint             | `yarn lint`                      | exit 0 across source, tests, scripts, and root config                 |
| Typecheck        | `yarn typecheck`                 | exit 0 from Astro application checks and Playwright TypeScript checks |
| Static aggregate | `yarn check:static`              | exit 0 after format, lint, and typecheck                              |
| Unit tests       | `yarn test:unit`                 | exit 0; the parser and telemetry sanitizer Node tests pass            |
| Build            | `yarn build`                     | exit 0                                                                |
| Tests            | `yarn test:e2e`                  | all tests pass                                                        |

## Suggested executor toolkit

- Use ESLint flat-config file groups rather than adding inline disables to test
  and tool files.
- Use a separate TypeScript project for Playwright; do not weaken the strict
  application project or include generated test artifacts.

## Scope

**In scope** (the only files you should modify):

- `package.json`
- `.prettierignore`
- `eslint.config.js`
- `tsconfig.tests.json` (create)
- `sentry.client.config.ts` (format-only; no semantic changes)
- `scripts/check-lighthouse-regression.mjs` (format-only; no semantic changes)
- `.github/workflows/ci-quality.yml`
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- `AGENTS.md`, `CLAUDE.md`, and `RFC.md`; their known Markdown drift is not part
  of this technical gate. Only their exact ignore entries may be added to
  `.prettierignore`; their contents must remain byte-for-byte unchanged.
- Existing test logic, application behavior, production copy, dependencies, or
  `yarn.lock`.
- `scripts/log-image-data.mjs`; its obsolete image path/deletion is a separate
  dead-code decision, not required to establish lint/format coverage.
- Generated or local directories: `dist`, `.astro`, `.cache`, `.agents`,
  `.claude`, `.lighthouseci`, `playwright-report`, `test-results`, and
  `node_modules`.
- A repository-wide `prettier --write .` or automatic formatting of Markdown.

## Git workflow

- Branch: `codex/012-repository-wide-static-checks`
- Use up to two short imperative commits so mechanical baseline formatting is
  easy to review:
  1. `Format executable quality files`
  2. `Enforce repository static checks`
- If completed dependency plans already formatted both executable files, omit
  the empty first commit.
- Keep each title under 72 characters.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm and bound the existing formatting baseline

Install dependencies, then run read-only checks before editing. First check the
five known drift files together. At the planned commit, the failure set was the
three Markdown files and two executable-code files listed in Current state.
After dependency plans, the two executable files may already pass; the three
historical Markdown files are still expected to fail. Then run the intended
code/config glob from Step 2 and record its failure list in the PR notes.

Do **not** run `yarn format` or a repository-wide write command. If additional
files fail because Plans 001-011 legitimately changed them, format those files
within their owning plan before executing this consolidation plan.

**Verify**: `yarn prettier --ignore-path /dev/null --check AGENTS.md CLAUDE.md RFC.md sentry.client.config.ts scripts/check-lighthouse-regression.mjs` →
nonzero exit reporting the three Markdown files; it may also report either
executable file if its owning dependency did not format it. No other file is
reported, and `git status --short` is unchanged by the command.

### Step 2: Add a read-only, code-focused Prettier gate

In `.prettierignore`, remove only the `package.json` entry and add root-anchored
entries `/AGENTS.md`, `/CLAUDE.md`, `/RFC.md`, and `/plans/`. Preserve all
generated, dependency, public, local-agent, and artifact exclusions. The three
legacy files are an explicit temporary baseline, while `/plans/` protects the
committed execution corpus from the repository's required write-mode
`yarn format` command. `format:check` remains deliberately code/config-only.

In `package.json`:

- set `format` to
  `prettier --write "**/*.{js,jsx,ts,tsx,json,md,mjs,astro,yml,yaml}"`;
- set `format:check` to
  `prettier --check "src/**/*.{js,jsx,ts,tsx,astro}" "tests/**/*.{js,ts,tsx}" "scripts/**/*.{js,mjs}" "*.{js,mjs,ts,json}" ".github/workflows/*.{yml,yaml}"`;
- deliberately exclude Markdown from `format:check` until its drift is handled
  in a dedicated docs-only change.

The `format:check` command must not scan generated or dependency directories and
must not rely on shell `find` output. Format only these existing executable drift
files plus `package.json` and `.github/workflows/ci-quality.yml` as needed:

```sh
yarn prettier --write package.json sentry.client.config.ts \
  scripts/check-lighthouse-regression.mjs .github/workflows/ci-quality.yml
```

Do not format a historical Markdown file. If either executable file still has a
format-only diff, commit those baseline changes separately with
`Format executable quality files` before changing gate configuration. Do not
create that commit when there is no diff.

**Verify**: `yarn format:check && git diff --numstat -- AGENTS.md CLAUDE.md RFC.md plans/README.md 'plans/[0-9][0-9][0-9]-*.md'` →
the check exits 0 and the diff command prints nothing; only the coordinator may
later change the index status row.

### Step 3: Typecheck Playwright separately without weakening application strictness

Create `tsconfig.tests.json` extending `./tsconfig.json`. It must:

- set `noEmit: true`;
- include only `playwright*.config.ts` and `tests/**/*.ts`;
- exclude `node_modules`, `dist`, `.astro`, `playwright-report`, and
  `test-results`;
- retain the inherited strict flags; do not use `skipLibCheck`, relax
  `noUncheckedIndexedAccess`, or add `any` escapes.

Add `typecheck` to `package.json` as
`astro check && tsc --noEmit -p tsconfig.tests.json`.

If TypeScript reports an existing error in Playwright code, stop rather than
editing tests under this plan; report the exact diagnostic for a narrowly scoped
follow-up.

**Verify**: `yarn typecheck` → exit 0 with no errors or warnings promoted to
errors.

### Step 4: Lint source, Playwright, scripts, and root config with correct environments

Update `eslint.config.js` with explicit flat-config groups:

1. a leading `ignores` object for `node_modules/**`, `dist/**`, `.astro/**`,
   `.cache/**`, `.agents/**`, `.claude/**`, `.lighthouseci/**`,
   `playwright-report/**`, and `test-results/**`;
2. the existing type-aware rules for `src/**/*.{js,jsx,ts,tsx}` and
   `sentry.client.config.ts` using `tsconfig.json`; include the existing browser
   globals plus `performance` and `PerformanceResourceTiming` for the root
   Sentry file;
3. the existing Astro parser/rules for `src/**/*.astro`;
4. a Playwright group for `playwright*.config.ts` and `tests/**/*.ts` using
   `tsconfig.tests.json`. Because these files contain both Node-side test/config
   code and browser callbacks, declare the finalized corpus's exact standard
   globals read-only: `process`, `console`, `window`, `document`, `navigator`,
   `caches`, `sessionStorage`, `history`, `location`, `URL`,
   `URLSearchParams`, `FormData`, `Event`, `CustomEvent`, `performance`,
   `setTimeout`, and `clearTimeout`. Do not import a wholesale browser-global
   preset or extend this list speculatively; any additional `no-undef`
   diagnostic must be traced to an actual dependency-plan use and added by name;
5. a Node ESM unit-test group for `tests/unit/**/*.js`, with the Node globals
   used by `node:test` and no browser globals;
6. a Node ESM group for `scripts/**/*.{js,mjs}`, `astro.config.mjs`,
   `eslint.config.js`, and `tailwind.config.js`, with `process`, `console`, and
   `URL` declared read-only. The URL global is required by Plan 008's pure
   preview-host matcher; do not silence `no-undef` around it.

Do not apply browser globals to Node files. Keep the current typed source rules,
including `no-floating-promises`; do not disable rules merely to make legacy
violations disappear. Set the package scripts exactly as follows:

```json
"lint": "eslint \"src/**/*.{js,jsx,ts,tsx,astro}\" \"tests/**/*.{js,ts,tsx}\" \"scripts/**/*.{js,mjs}\" \"*.{js,mjs,ts}\"",
"lint:fix": "eslint \"src/**/*.{js,jsx,ts,tsx,astro}\" \"tests/**/*.{js,ts,tsx}\" \"scripts/**/*.{js,mjs}\" \"*.{js,mjs,ts}\" --fix",
"test:unit": "node --test scripts/*.test.js tests/unit/*.test.js",
"check:static": "yarn format:check && yarn lint && yarn typecheck"
```

**Verify**: `yarn lint && yarn check:static` → both exit 0 with all file groups
included. Then run
`yarn eslint --print-config tests/e2e/booking.smoke.spec.ts` and
`yarn eslint --print-config tests/unit/sanitizeTelemetryUrl.test.js` and
`yarn eslint --print-config scripts/check-lighthouse-regression.mjs`; each
exits 0 and prints a non-empty config. Run `yarn test:unit`; both dependency-plan
test files must be discovered and pass.

### Step 5: Make the CI quality job enforce the same static contract

In `.github/workflows/ci-quality.yml`, add named steps in `lint_build` after
dependency installation and before the production build:

1. `Check formatting` → `yarn format:check`;
2. existing lint step → `yarn lint`;
3. `Typecheck application and tests` → `yarn typecheck`;
4. `Run unit tests` → `yarn test:unit`;
5. existing build step → `yarn build`.

Do not change job permissions, triggers, Node version, secrets, deployment
polling, Lighthouse behavior, or the Playwright job in this plan. Do not replace
the commands with a write-mode formatter.

**Verify**: `rg -n 'yarn (format:check|lint|typecheck|test:unit|build)' .github/workflows/ci-quality.yml` →
one ordered match for each command in `lint_build`.

### Step 6: Run all gates and audit the final diff

Run the exact local equivalents of CI. Inspect the diff to ensure the only
production-file changes are Prettier-only changes in
`sentry.client.config.ts` and the Lighthouse script. Confirm the lockfile and
historical Markdown are untouched.

**Verify**: `yarn check:static && yarn test:unit && yarn build && yarn test:e2e && git diff --check && git diff --exit-code -- yarn.lock AGENTS.md CLAUDE.md RFC.md 'plans/[0-9][0-9][0-9]-*.md'` → every
command exits 0.

## Test plan

- No new test file is required; this plan changes developer/CI enforcement,
  not product behavior. It must run the Node test files created by Plans 008
  and 009 instead of leaving them as opt-in commands.
- `yarn typecheck` must include every local and remote Playwright spec plus
  both `playwright*.config.ts` files through `tsconfig.tests.json`; it must not
  execute the opt-in Netlify suite.
- `yarn lint` must include application, Astro, Playwright, Node unit tests,
  root config, and scripts; verify representative effective configs with
  `--print-config`.
- `yarn test:unit` must discover and pass both the Lighthouse-comment parser
  test and the telemetry-URL sanitizer test.
- `yarn test:e2e` remains the behavioral regression gate after configuration
  changes.
- Verification: `yarn check:static && yarn test:unit && yarn build && yarn test:e2e` → all pass.

## Done criteria

- [ ] `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`,
      `yarn build`, and `yarn test:e2e` all exit 0.
- [ ] TypeScript checks both `playwright*.config.ts` files and every tracked
      `tests/{e2e,netlify}/*.spec.ts` through `tsconfig.tests.json` with
      inherited strict flags, without executing the remote suite.
- [ ] ESLint prints an effective config for one application file, one Astro
      file, one Playwright test, one Node unit test, and one Node script.
- [ ] `yarn test:unit` discovers the test files created by Plans 008 and 009,
      and both suites pass without a network request.
- [ ] CI runs format check, lint, typecheck, unit tests, and build in that order
      using read-only commands.
- [ ] `git diff --exit-code -- yarn.lock AGENTS.md CLAUDE.md RFC.md 'plans/[0-9][0-9][0-9]-*.md'` exits 0.
- [ ] `.prettierignore` contains the four root-anchored entries `/AGENTS.md`,
      `/CLAUDE.md`, `/RFC.md`, and `/plans/`, so `yarn format` cannot rewrite
      deferred legacy Markdown or the committed plan corpus; `package.json` is
      no longer ignored.
- [ ] There is no broad Markdown, generated-output, dependency, or production
      behavior change.
- [ ] `git diff --check` exits 0 and `git status --short --untracked-files=all`
      lists only files in Scope plus the allowed plan-index status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Any technical repository change in Plans 001-011 is not complete. Plan 003's
  committed remote test/config checkpoint is sufficient here; its later
  production-read, RFC evidence, and legacy-provider cancellation may remain
  externally `BLOCKED` because they do not change files covered by this gate.
- The live Prettier result reports a file other than the three known Markdown
  files and the two known executable files, after accounting for completed
  dependency plans, or formatting either executable file changes semantics.
- A formatter would touch a file outside Scope, more than the two known
  executable drift files plus configuration, any lockfile, or a generated file.
- `yarn format` changes any tracked plan file despite the anchored `/plans/`
  ignore; stop before committing and report the ignore-boundary failure.
- Widened lint/typecheck reveals more than ten pre-existing diagnostics, or any
  diagnostic requires changing test behavior or production logic.
- Either dependency-plan Node test is missing, is not discovered by
  `yarn test:unit`, needs a network service, or cannot pass without changing its
  intended parser/sanitizer contract.
- `tsconfig.tests.json` requires weakening inherited strict flags or adding a
  new dependency to pass.
- CI enforcement requires new secrets, broader permissions, trigger changes, or
  edits to another workflow.
- A verification fails twice after one reasonable configuration correction.

## Maintenance notes

- Keep `format:check` read-only in CI. `yarn format` remains an explicit local
  write command and must never replace the check step.
- When adding a new root config, test location, or script extension, update the
  package globs, unit-test command when applicable, and matching ESLint
  environment group together.
- Historical Markdown formatting is intentionally deferred; handle
  `AGENTS.md`, `CLAUDE.md`, and `RFC.md` in a docs-only change so reviewers can
  distinguish prose edits from mechanical churn.
- Reviewers should scrutinize flat-config precedence and confirm tests are using
  `tsconfig.tests.json`, not accidentally falling back to the browser-oriented
  application environment.
