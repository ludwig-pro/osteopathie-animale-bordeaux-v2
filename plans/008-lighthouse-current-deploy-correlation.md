# Plan 008: Correlate Lighthouse scores with the current pull-request commit

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
> `git diff --stat 9aece8f..HEAD -- .github/workflows/ci-quality.yml scripts/parse-netlify-lighthouse-comment.js scripts/parse-netlify-lighthouse-comment.test.js`
> `git diff --stat HEAD -- .github/workflows/ci-quality.yml scripts/parse-netlify-lighthouse-comment.js scripts/parse-netlify-lighthouse-comment.test.js`
> `git ls-files --others --exclude-standard -- .github/workflows/ci-quality.yml scripts/parse-netlify-lighthouse-comment.js scripts/parse-netlify-lighthouse-comment.test.js`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Plan 007 is expected to restructure
> comment publication; this plan must operate in its read-only
> `lighthouse_remote` job and preserve the isolated writer job.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/007-ci-least-privilege.md`
- **Category**: bug
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

The PR Lighthouse gate currently accepts the newest parseable Netlify comment
for the pull request and even retains a fallback candidate whose preview URL
does not identify that PR. Netlify reuses one comment and one stable
`deploy-preview-N--…` URL across successive commits, so neither recency nor the
preview URL proves the scores came from the current head. A live comment in
this repository exposes a `Latest commit` SHA; this plan requires exact
equality with GitHub's current PR head SHA before scores can reach the gate.

## Current state

- `.github/workflows/ci-quality.yml:118-207` polls pull-request issue comments
  through `github.rest.issues.listComments`. The GitHub API objects used by the
  workflow expose `id`, `body`, `updated_at`, and `user.login`; GitHub's current
  head SHA is separately available as
  `context.payload.pull_request.head.sha`.
- `parseFromBody` currently extracts four scores, an optional Deploy Preview
  URL, and an optional deploy-log URL. It does **not** parse the commit SHA.
- The selection logic at commit `9aece8f` accepts a PR-shaped preview first but
  also stores the first parseable comment as a fallback:

  ```js
  // .github/workflows/ci-quality.yml:173-182
  const hasPreviewForCurrentPr =
    candidate.previewUrl &&
    candidate.previewUrl.includes(`deploy-preview-${issue_number}--`);
  if (hasPreviewForCurrentPr) {
    parsed = candidate;
    break;
  }
  if (!parsed) {
    parsed = candidate;
  }
  ```

- Read-only GitHub API inspection on 2026-07-15 confirmed that PR #18's
  `netlify[bot]` comment body contains these real provider fields:

  ```text
  Latest commit | fd88b0f6ba7ba4767e6392bb11c80c18ebf3c901 |
  Latest deploy log | https://app.netlify.com/projects/.../deploys/...
  Deploy Preview | [https://deploy-preview-18--...netlify.app](...)
  Performance: 95
  Accessibility: 98
  Best Practices: 100
  SEO: 100
  ```

  The ellipses above intentionally omit irrelevant provider identifiers; the
  implementation must parse the live body, not these abbreviated lines.

- `updated_at` alone is insufficient: a comment can be updated for reasons
  other than a deploy, and timestamp comparison cannot prove which commit was
  audited. The stable Deploy Preview URL alone is also insufficient.
- Plan 007 moves comment mutation into `lighthouse_comment`. Keep all provider
  parsing and score selection in read-only `lighthouse_remote`.

## Commands you will need

| Purpose               | Command                                                                                                                                                                                               | Expected on success                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Verify provider field | `gh api repos/ludwig-pro/osteopathie-animale-bordeaux-v2/issues/18/comments --paginate > /tmp/netlify-pr18-comments.json && rg 'Latest commit \| [0-9a-fA-F]{40} \|' /tmp/netlify-pr18-comments.json` | exit 0; a live Netlify body exposes a 40-character commit SHA |
| Install               | `yarn install --frozen-lockfile`                                                                                                                                                                      | exit 0 without changing `yarn.lock`                           |
| Format                | `yarn prettier --write .github/workflows/ci-quality.yml scripts/parse-netlify-lighthouse-comment.js scripts/parse-netlify-lighthouse-comment.test.js`                                                 | exit 0; only in-scope code is formatted                       |
| Parser tests          | `node --test scripts/parse-netlify-lighthouse-comment.test.js`                                                                                                                                        | all parser/matcher cases pass                                 |
| YAML parse            | `ruby -e 'require "yaml"; YAML.safe_load(File.read(ARGV.fetch(0)), aliases: true)' .github/workflows/ci-quality.yml`                                                                                  | exit 0                                                        |
| Lint                  | `yarn lint`                                                                                                                                                                                           | exit 0, no errors                                             |
| Build                 | `yarn build`                                                                                                                                                                                          | exit 0; Astro check and build succeed                         |
| Diff check            | `git diff --check`                                                                                                                                                                                    | exit 0, no whitespace errors                                  |

## Scope

**In scope** (the only files you should modify):

- `.github/workflows/ci-quality.yml`
- `scripts/parse-netlify-lighthouse-comment.js` (create)
- `scripts/parse-netlify-lighthouse-comment.test.js` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- The least-privilege job split completed by Plan 007.
- Lighthouse thresholds, category floors, baseline JSON, or production-push
  collection.
- Netlify settings, provider comment configuration, deploy hooks, or secrets.
- Guessing deploy identity from `updated_at`, preview hostname, comment order,
  deploy-log URL, or PR number when an exact commit SHA is absent.
- Calling the Netlify API or scraping the Netlify dashboard.
- Application source, Playwright tests, dependencies, or lockfiles.

## Git workflow

- Branch: `codex/008-lighthouse-current-deploy-correlation`
- Make one logical commit with the short imperative message
  `ci: correlate Lighthouse with current deploy`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Reconfirm the live provider contract

Before editing, run the provider-field command from the table. Inspect only the
Netlify bot body and confirm it still contains a `Latest commit` row with a
full 40-character hexadecimal SHA. Also confirm the same body contains the
four scores and a Deploy Preview URL.

Do not treat `updated_at`, the stable preview URL, the deploy-log ID, or a short
SHA as equivalent evidence. If the exact full-SHA field is no longer present,
STOP: the workflow cannot prove current-deploy correlation with the fields it
actually has.

**Verify**: `body="$(gh api repos/ludwig-pro/osteopathie-animale-bordeaux-v2/issues/18/comments --paginate --jq '[.[] | select(.user.login == "netlify[bot]")] | sort_by(.updated_at) | last | .body')" && for pattern in 'Latest commit \| [0-9a-fA-F]{40} \|' 'Deploy Preview \|' 'Performance.*[0-9]+' 'Accessibility.*[0-9]+' 'Best Practices.*[0-9]+' 'SEO.*[0-9]+'; do printf '%s\n' "$body" | rg -q "$pattern" || exit 1; done` → exit 0; every required field exists in the same live Netlify comment body.

### Step 2: Extract provider parsing into a tested pure module

Create `scripts/parse-netlify-lighthouse-comment.js` as an ESM module with two
named exports:

- `parseNetlifyLighthouseComment(body)`: return `null` unless `body` is a
  string containing all four integer scores in the inclusive range 0 through
  100, a full 40-character hexadecimal `Latest commit` SHA, and an `https`
  Deploy Preview URL. Reject negative, decimal, signed, padded, or out-of-range
  score tokens rather than partially matching them. Normalize accepted scores
  to numbers from 0 through 1 by dividing the provider's integer percentage by
  100; this preserves `1` as 1%, not 100%. Return
  `{ performance, accessibility, bestPractices, seo, previewUrl,
deployLogUrl, commitSha }`, leaving `deployLogUrl` as an empty string if its
  real row is absent. Normalize `commitSha` to lowercase. Do not extract or
  return any QR-code URL or provider token.

  Extract the complete trimmed token between each score label's colon and its
  Markdown/HTML line ending, then validate it with
  `^(?:0|[1-9][0-9]?|100)$` before conversion. Do not use an unanchored
  `(\d+)` capture that can accept the prefix of `95.5` or `101`.

- `matchesPullRequestHead(candidate, issueNumber, headSha)`: return `true` only
  when `headSha` is a full 40-character SHA exactly equal to
  `candidate.commitSha` (case-insensitive normalization is allowed) **and**
  `new URL(candidate.previewUrl).hostname` begins exactly with
  `deploy-preview-${issueNumber}--` and ends with `.netlify.app`. Catch invalid
  URLs and return `false`.

Keep this module free of GitHub Actions globals so it can run under Node's
built-in test runner.

**Verify**: `node -e "import('./scripts/parse-netlify-lighthouse-comment.js').then((m) => { if (typeof m.parseNetlifyLighthouseComment !== 'function' || typeof m.matchesPullRequestHead !== 'function') process.exit(1) })"` → exit 0.

### Step 3: Add fixtures for exact and stale deploys

Create `scripts/parse-netlify-lighthouse-comment.test.js` using `node:test` and
`node:assert/strict`. Use a compact synthetic body matching the exact row
labels and Markdown structure observed in Step 1; use only public example SHAs
and placeholder host/project names.

Cover at least these seven cases:

1. All real fields parse, including the 40-character SHA.
2. The matching PR number and exact head SHA return `true`.
3. A stale but otherwise valid commit SHA returns `false`.
4. A matching SHA on another PR's preview hostname returns `false`.
5. A body with no full `Latest commit` SHA returns `null` even when scores and
   preview URL exist.
6. Integer boundary scores 0 and 100 are accepted and normalized to 0 and 1.
7. Each of `-1`, `95.5`, `+95`, and `101` makes parsing return `null`; no
   invalid token may be truncated to a valid prefix.

**Verify**: `node --test scripts/parse-netlify-lighthouse-comment.test.js` → at least seven tests pass, including stale-SHA, missing-SHA, score-boundary, and invalid-score rejection.

### Step 4: Require exact head equality in the polling workflow

In the read-only `lighthouse_remote` job's `actions/github-script@v7` step,
dynamically import the local ESM parser with `pathToFileURL` from `node:url` and
`process.env.GITHUB_WORKSPACE`. Read the expected SHA from
`context.payload.pull_request?.head?.sha`; fail immediately if it is not a full
40-character SHA.

For each `netlify[bot]` comment, call the pure parser and matcher. Accept a
candidate only when `matchesPullRequestHead(candidate, issue_number,
expectedHeadSha)` returns true. Delete the current fallback candidate behavior
entirely. A stale comment must be logged by comment ID and ignored, then the
existing polling loop must continue until an exact match appears or the
15-minute limit expires.

Add `commit_sha` as an action output alongside the scores and URLs. Do not
infer it from `updated_at`, the preview URL, or the deploy-log URL.

Add a preceding workflow step that runs
`node --test scripts/parse-netlify-lighthouse-comment.test.js`, ensuring parser
fixtures are exercised in CI before live comments are trusted.

**Verify**: `rg -n "pull_request\?\.head\?\.sha|parseNetlifyLighthouseComment|matchesPullRequestHead|commit_sha|node --test scripts/parse-netlify" .github/workflows/ci-quality.yml && ! rg -U "if \(!parsed\) \{\n\s+parsed = candidate;" .github/workflows/ci-quality.yml` → exit 0; exact-correlation elements exist and the old fallback-assignment block is absent, while the necessary post-poll `if (!parsed)` failure check may remain.

### Step 5: Add defense in depth before score evaluation

Pass the parser's `commit_sha` output and
`${{ github.event.pull_request.head.sha }}` into the pull-request branch of
`Enforce remote Lighthouse regression gate`. Before invoking
`yarn ci:lighthouse:regression`, compare them for exact equality. If either is
missing or they differ, write a failure report to
`/tmp/lighthouse-remote-report.md` using the existing marker and exit 1 without
evaluating scores. The report may include short SHA prefixes for diagnosis but
must not claim the stale scores belong to the current deploy.

Preserve the production-push path and all thresholds unchanged.

**Verify**: `rg -n -C 5 "EXPECTED_HEAD_SHA|LH_COMMIT_SHA|current head|commit" .github/workflows/ci-quality.yml` → the pull-request gate rejects missing/mismatched SHA before the score command; production collection is unchanged.

### Step 6: Run deterministic gates

Run the parser fixtures, YAML parse, application gates, and diff checks. Do not
push merely to test the workflow.

**Verify**: `yarn prettier --write .github/workflows/ci-quality.yml scripts/parse-netlify-lighthouse-comment.js scripts/parse-netlify-lighthouse-comment.test.js && node --test scripts/parse-netlify-lighthouse-comment.test.js && ruby -e 'require "yaml"; YAML.safe_load(File.read(ARGV.fetch(0)), aliases: true)' .github/workflows/ci-quality.yml && yarn lint && yarn build && git diff --check` → every command exits 0.

## Test plan

- Add pure Node tests for the exact observed Netlify body fields and the commit
  plus preview-host matcher.
- Explicitly cover a stale commit on the right PR and the current commit on the
  wrong PR; neither may pass.
- Cover percentage boundaries and reject negative, signed, decimal, and
  out-of-range provider scores before they reach normalization.
- Explicitly cover a body without the full-SHA row; timestamp or comment order
  must not rescue it.
- Run the parser tests locally and inside the read-only Lighthouse job.
- When an authorized operator later pushes the branch, the integration proof
  is a workflow log showing stale comments ignored until the Netlify comment's
  `Latest commit` exactly equals the event head SHA. That is not authorization
  to push now.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Live provider inspection confirms a full `Latest commit` SHA still exists
      in the same Netlify comment body as the scores and preview URL.
- [ ] `node --test scripts/parse-netlify-lighthouse-comment.test.js` passes at
      least seven cases.
- [ ] Parsed scores are exact integer percentages from 0 through 100,
      normalized to 0 through 1; malformed or out-of-range tokens are rejected.
- [ ] The poll accepts only exact head-SHA and current-PR-host matches.
- [ ] No fallback candidate, comment-recency inference, or stable-URL-only
      inference remains.
- [ ] The score gate independently rejects a missing or mismatched commit SHA.
- [ ] Plan 007's isolated write-enabled job remains isolated.
- [ ] Lighthouse thresholds, baselines, and production collection are
      unchanged.
- [ ] `.github/workflows/ci-quality.yml` parses as YAML.
- [ ] Targeted Prettier formatting exits 0 and touches only in-scope files.
- [ ] `yarn lint`, `yarn build`, and `git diff --check` exit 0.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- A live Netlify bot comment no longer exposes a full 40-character `Latest
commit` SHA in the same body as its Lighthouse scores.
- The exposed commit field cannot be shown to represent the audited deploy, or
  its value differs from Netlify's actual deployed commit in a reproducible
  check.
- Exact current-SHA correlation would require a Netlify credential, private
  dashboard scraping, guessed metadata, or a broader GitHub permission.
- Plan 007's isolated comment job is absent or this implementation would move
  untrusted parsing into that write-enabled job.
- The only available approach relies solely on `updated_at`, preview URL,
  deploy-log URL, comment order, or PR number.
- A verification command fails twice after one reasonable correction attempt.

## Maintenance notes

- The `Latest commit` label is a provider-owned textual contract. If Netlify
  changes the comment format, fail closed and update the parser only after
  inspecting a new live comment.
- Keep provider parsing pure and fixture-tested; do not let ad hoc regular
  expressions accumulate again inside the workflow YAML.
- A reviewer should compare the accepted SHA in logs with the Actions event
  head SHA and verify that a stale comment remains ignored throughout polling.
- The stable Deploy Preview URL identifies the PR environment, not a specific
  deployment. Never weaken the exact-SHA requirement to URL matching alone.
