# Plan 007: Isolate pull-request write permission in one CI comment job

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
> `git diff --stat 65219b9..HEAD -- .github/workflows/ci-quality.yml`
> `git diff --stat HEAD -- .github/workflows/ci-quality.yml`
> `git ls-files --others --exclude-standard -- .github/workflows/ci-quality.yml`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `65219b9`, 2026-07-16

## Why this matters

`pull-requests: write` is currently granted to every job and every step in the
CI workflow, including dependency installation, build, browser tests, and
remote content parsing. A compromised dependency or action in any of those
steps would inherit permission to modify pull-request comments. GitHub Actions
permissions are scoped at workflow or job level—not individual step level—so
this plan moves the write operation into a small, dedicated job and leaves all
other jobs read-only.

## Current state

- `.github/workflows/ci-quality.yml:9-11` grants write permission at workflow
  level:

  ```yaml
  permissions:
    contents: read
    pull-requests: write
  ```

- The workflow has three jobs: `lint_build`, `smoke_e2e`, and
  `lighthouse_remote`. All currently inherit the workflow-level permission.
- `.github/workflows/ci-quality.yml:263-302` uses
  `actions/github-script@v7` inside `lighthouse_remote` to find a prior comment
  containing `<!-- lighthouse-remote-report -->`, then update it or create a
  new pull-request comment. This is the only operation in the workflow that
  needs `pull-requests: write`.
- The report body is currently written to
  `/tmp/lighthouse-remote-report.md`. The existing debug artifact mixes
  workspace-relative and absolute `/tmp` inputs, so its archive layout is not
  a stable job-to-job contract. Create a separate one-file artifact from a
  workspace-relative path for comment publication.
- The remote job intentionally marks the Lighthouse gate
  `continue-on-error: true`, creates the report, comments it, and only then
  fails at `.github/workflows/ci-quality.yml:304-306`. Preserve the result and
  reporting semantics when separating the comment job.

## Commands you will need

| Purpose          | Command                                                                                                              | Expected on success                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Install          | `yarn install --frozen-lockfile`                                                                                     | exit 0 without changing `yarn.lock`        |
| Format           | `yarn prettier --write .github/workflows/ci-quality.yml`                                                             | exit 0; workflow is formatted              |
| YAML parse       | `ruby -e 'require "yaml"; YAML.safe_load(File.read(ARGV.fetch(0)), aliases: true)' .github/workflows/ci-quality.yml` | exit 0, no YAML parse error                |
| Job structure    | Run the exact Ruby structural check in Step 4                                                                        | exit 0; permission and writer shapes match |
| Permission count | `test "$(rg -c 'pull-requests: write' .github/workflows/ci-quality.yml)" -eq 1`                                      | exit 0; exactly one write grant remains    |
| Lint             | `yarn lint`                                                                                                          | exit 0, no errors                          |
| Build            | `yarn build`                                                                                                         | exit 0; Astro check and build succeed      |
| Diff check       | `git diff --check`                                                                                                   | exit 0, no whitespace errors               |

## Scope

**In scope** (the only files you should modify):

- `.github/workflows/ci-quality.yml`
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- Lighthouse score parsing, thresholds, baselines, or current-commit
  correlation; Plan 008 handles correlation after this job split.
- Application source, tests, package versions, lockfiles, or Netlify config.
- Repository/organization Actions settings or secrets.
- Changing triggers, runner versions, Node versions, or action versions.
- Pushing a test branch solely to exercise the workflow.

## Git workflow

- Branch: `improve`
- Make one logical commit with the short imperative message
  `ci: isolate pull request write permission`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make the workflow read-only by default

At the top-level `permissions` block, retain `contents: read` and remove
`pull-requests: write`. Do not replace it with `write-all`, `issues: write`, or
an implicit default. On the `lighthouse_remote` job itself, grant exactly
`contents: read` and `pull-requests: read`; its existing
`issues.listComments` call needs read access, but nothing in that analysis job
may write. The build and smoke jobs should continue to inherit only
`contents: read`.

**Verify**: `sed -n '1,20p' .github/workflows/ci-quality.yml && sed -n '70,90p' .github/workflows/ci-quality.yml` → the workflow-level block contains only `contents: read`, while `lighthouse_remote` has explicit `contents: read` plus `pull-requests: read` and no write permission.

### Step 2: Stage a stable report artifact in the read-only job

In `lighthouse_remote`, after the regression-gate step and before the explicit
failure step, add a step with
`if: ${{ !cancelled() && github.event_name == 'pull_request' }}` that copies
`/tmp/lighthouse-remote-report.md` to the workspace-relative file
`lighthouse-comment.md`. If the source report is absent, create the same
existing failure fallback with the marker
`<!-- lighthouse-remote-report -->`; do not silently create an empty file.

Immediately upload that single file with a dedicated
`actions/upload-artifact@v4` step named `lighthouse-comment-body`, using
`if: ${{ !cancelled() && github.event_name == 'pull_request' }}` and
`if-no-files-found: error`. Do not add it to the existing mixed-path debug
artifact; leave `lighthouse-remote-artifacts` unchanged. Do not grant this job
any write permission. `!cancelled()` deliberately runs after ordinary failures
while avoiding artifact work during workflow cancellation.

**Verify**: `rg -n -C 4 "Stage Lighthouse PR report|name: lighthouse-comment-body|path: lighthouse-comment\.md|name: lighthouse-remote-artifacts" .github/workflows/ci-quality.yml` → the dedicated one-file artifact is uploaded before the explicit gate failure and the existing debug artifact remains separate.

### Step 3: Move comment mutation into a dedicated job

Remove `Update PR comment with Lighthouse report` from `lighthouse_remote`.
Add a new top-level job named `lighthouse_comment` with all of these
properties:

- `needs: lighthouse_remote`;
- job-level condition that requires `!cancelled()`, a `pull_request` event, and
  `(needs.lighthouse_remote.result == 'success' ||
needs.lighthouse_remote.result == 'failure')`. This
  reports a failed Lighthouse gate but skips the commenter when the analysis
  job was itself skipped or cancelled and could not upload an artifact;
- job-level permissions containing only `actions: read` and
  `pull-requests: write`; all unspecified permissions remain `none`;
- `runs-on: ubuntu-latest`;
- `actions/download-artifact@v4` downloading the exact artifact
  `lighthouse-comment-body` into `lighthouse-comment-artifact`;
- `actions/github-script@v7` reading
  `lighthouse-comment-artifact/lighthouse-comment.md` and retaining the
  existing marker-based update-or-create behavior.

Before any API call, require the artifact body to begin with the exact report
marker and reject a body larger than 60,000 UTF-8 bytes. Fail the comment job
without posting if either check fails. Measure bytes with
`Buffer.byteLength(body, 'utf8')`, not JavaScript character count. This bounds
the only untrusted input crossing from the read-only analysis job into the
write-enabled job.

Do not add checkout, dependency installation, or execution of repository code
to the write-enabled job. Its only inputs must be the same-run artifact and
GitHub's event context. Keep the explicit `Fail job if regression gate failed`
behavior in `lighthouse_remote`; separating the commenter must not turn a
failed gate green.

**Verify**: `rg -n -C 8 "lighthouse_comment:|needs\.lighthouse_remote\.result|pull-requests: write|download-artifact@v4|lighthouse-comment-artifact/lighthouse-comment.md" .github/workflows/ci-quality.yml` → the single write grant is inside `lighthouse_comment`, which runs only after a completed analysis result and contains only artifact download and comment update/create steps.

### Step 4: Validate permission placement and workflow syntax

Parse the YAML and use both structural and text checks to catch accidental
permission spread. Run this exact structural check:

```sh
ruby -e 'require "yaml"; workflow = YAML.safe_load(File.read(ARGV.fetch(0)), aliases: true); jobs = workflow.fetch("jobs"); raise "top-level permissions" unless workflow.fetch("permissions") == {"contents" => "read"}; raise "lighthouse_remote permissions" unless jobs.fetch("lighthouse_remote").fetch("permissions") == {"contents" => "read", "pull-requests" => "read"}; writer = jobs.fetch("lighthouse_comment"); raise "writer permissions" unless writer.fetch("permissions") == {"actions" => "read", "pull-requests" => "write"}; uses = writer.fetch("steps").map { |step| step["uses"] }; raise "writer steps" unless uses == ["actions/download-artifact@v4", "actions/github-script@v7"]; raise "writer executes shell or checkout" if writer.fetch("steps").any? { |step| step.key?("run") || step["uses"] == "actions/checkout@v4" }' .github/workflows/ci-quality.yml
```

Inspect the job manually after those machine checks; Ruby's YAML parser checks
syntax and the intended security shape but does not validate the complete
GitHub Actions schema.

**Verify**: `ruby -e 'require "yaml"; YAML.safe_load(File.read(ARGV.fetch(0)), aliases: true)' .github/workflows/ci-quality.yml && test "$(rg -c 'pull-requests: write' .github/workflows/ci-quality.yml)" -eq 1 && ! sed -n '1,20p' .github/workflows/ci-quality.yml | rg 'pull-requests: write' && git diff --check` → exit 0.

### Step 5: Run unaffected repository gates

The workflow-only refactor must not change application behavior. Run the local
lint and build commands available in this repository after installing the
locked dependencies if they are absent.

**Verify**: `yarn prettier --write .github/workflows/ci-quality.yml && yarn lint && yarn build` → every command exits 0.

## Test plan

- No application test is added because the behavior is a GitHub Actions
  privilege boundary.
- Machine-check YAML syntax and assert that exactly one
  `pull-requests: write` grant exists and that it is absent from the top-level
  permissions block.
- Review the `lighthouse_comment` job shape: it must contain no checkout,
  install, shell execution, or repository-code execution.
- When the branch is later pushed by an authorized operator, the PR workflow
  is the integration test: a passing and a failing Lighthouse report must each
  update/create the marker comment while `lighthouse_remote` retains its gate
  conclusion; a skipped/cancelled `lighthouse_remote` must skip the commenter
  instead of attempting a missing-artifact download. That remote verification
  is not authorization to push now.

## Done criteria

ALL must hold. The structural checks cover the permission and step boundaries;
the implementation reviewer must also verify conditions, artifact paths, and
validation order against the workflow diff.

- [ ] `.github/workflows/ci-quality.yml` parses as YAML.
- [ ] The top-level permission is only `contents: read`; `lighthouse_remote`
      has only `contents: read` and `pull-requests: read`.
- [ ] Exactly one `pull-requests: write` grant exists, under
      `lighthouse_comment`.
- [ ] The write-enabled job contains only artifact download and GitHub comment
      update/create behavior; it does not checkout or execute repository code.
- [ ] The writer rejects an absent marker or report body larger than 60,000
      bytes before calling the GitHub API.
- [ ] The writer job uses `!cancelled()`, runs for `lighthouse_remote`
      success/failure, and is skipped when that dependency is skipped/cancelled,
      avoiding a guaranteed missing artifact download.
- [ ] `lighthouse-comment-body` contains only workspace-relative
      `lighthouse-comment.md`; the existing mixed-path debug artifact is not used
      as the job-to-job contract.
- [ ] `lighthouse_remote` still fails when `lighthouse_gate.outcome` is
      `failure`, uploads the dedicated comment artifact first, and still uploads
      debug artifacts with `if: always()`.
- [ ] `yarn lint` and `yarn build` exit 0.
- [ ] Targeted Prettier formatting exits 0.
- [ ] `git diff --check` exits 0.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- More than one workflow operation actually mutates pull requests or issues.
- The report cannot be passed through a same-run artifact without exposing a
  secret, adding a third-party action, or executing untrusted repository code
  inside the write-enabled job.
- `actions/download-artifact@v4` cannot retrieve the artifact from a failed
  `needs` job under the `!cancelled()` dependent job.
- GitHub requires a broader write permission than `pull-requests: write` for
  the existing PR comment API calls; report the exact API error instead of
  adding broad permissions.
- The refactor changes Lighthouse pass/fail semantics, triggers, thresholds,
  or score selection.
- A verification command fails twice after one reasonable correction attempt.

## Maintenance notes

- Keep untrusted build, browser, and parsing work out of the write-enabled job.
  If future comment content must be generated, generate it in a read-only job
  and pass a bounded artifact.
- A reviewer should verify the job-level `if: !cancelled()` behavior and the
  exact dedicated one-file artifact path, because mixed upload roots and
  skipped failure reports are the two common ways this handoff breaks.
- Plan 008 intentionally follows this plan and may edit the read-only
  `lighthouse_remote` job; it must not move parsing into `lighthouse_comment`.
