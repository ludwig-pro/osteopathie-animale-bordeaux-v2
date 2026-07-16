# Plan 003: Prove Netlify form delivery on a Deploy Preview

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
> `git diff --stat 9aece8f..HEAD -- package.json playwright.netlify.config.ts tests/netlify/contact-form.spec.ts RFC.md`
> `git diff --stat HEAD -- package.json playwright.netlify.config.ts tests/netlify/contact-form.spec.ts RFC.md`
> `git ls-files --others --exclude-standard -- package.json playwright.netlify.config.ts tests/netlify/contact-form.spec.ts RFC.md`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: `plans/002-contact-form-validation.md`
- **Category**: tests
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

Astro preview can prove that the React form renders and fetches `/`, but it
cannot prove Netlify's build-time form detection, dashboard storage, or email
notification. The migration RFC still marks all operational acceptance items
unfinished. This plan adds an opt-in Deploy Preview smoke test, correlates one
synthetic submission through the Netlify dashboard and recipient inbox, and
closes the RFC only after authorized humans verify the provider-side evidence.

## Current state

- `src/components/landing-page/contact/ContactForm.tsx:133-162` renders
  `name="contact"`, `data-netlify="true"`, `bot-field`, and the hidden
  `form-name=contact` marker.
- `src/components/landing-page/contact/ContactForm.tsx:30-127` validates the
  form, sends a URL-encoded AJAX `POST /`, and treats a successful HTTP response
  as success.
- `playwright.config.ts:18-24` always builds and serves Astro preview locally.
  Local preview does not run Netlify's post-processing or form backend.
- `tests/e2e/contact-form-validation.spec.ts` covers the local form contract,
  while `tests/e2e/booking.smoke.spec.ts` covers booking CTAs. There is no test
  against a deployed Netlify URL.
- `RFC.md:299-308` leaves the form marker, honeypot, notification, synthetic
  submission, UX, production migration, and legacy-provider cancellation
  criteria unchecked, even though part of the code has already landed.
- `package.json` has `test:e2e` for local preview but no explicit remote
  Netlify command.

The official Netlify contract to preserve is a statically rendered form that
Netlify detects during deploy and an AJAX body encoded as
`application/x-www-form-urlencoded`. Detection must be proved for the exact
preview deploy: an already-registered site-level form can accept a POST even if
the current deploy failed to scan its HTML. Netlify's post-processing removes
`data-netlify` from served HTML, and the matching deploy log reports the form
and detected fields. The remote smoke must run against one Deploy Preview URL
only. It must never submit synthetic data to the production domain.

## Commands you will need

| Purpose           | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Expected on success                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Install           | `yarn install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | exit 0 and no `yarn.lock` change                                                                           |
| Format check      | `yarn prettier --ignore-path /dev/null --check package.json && yarn prettier --check playwright.netlify.config.ts tests/netlify/contact-form.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | exit 0; the currently ignored package manifest and both code/config files are actually checked             |
| Lint              | `yarn lint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | exit 0, no errors                                                                                          |
| Build/typecheck   | `yarn build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | exit 0 and `dist/index.html` contains the contact markers                                                  |
| Local regression  | `yarn test:e2e`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | exit 0, all local-preview tests pass; no remote submission occurs                                          |
| Preview preflight | `test "$(git rev-parse HEAD)" = "$NETLIFY_FORM_TEST_COMMIT_SHA" && test "$NETLIFY_FORM_TEST_URL" = "https://${NETLIFY_FORM_TEST_DEPLOY_ID}--hopeful-lumiere-46fc2e.netlify.app/" && effective_url="$(curl --fail --silent --show-error --location --output /tmp/netlify-form-preview.html --write-out '%{url_effective}' "$NETLIFY_FORM_TEST_URL")" && test "$effective_url" = "$NETLIFY_FORM_TEST_URL" && rg -q "name=['\"]contact['\"]" /tmp/netlify-form-preview.html && rg -q "name=['\"]bot-field['\"]" /tmp/netlify-form-preview.html && rg -q "name=['\"]form-name['\"]" /tmp/netlify-form-preview.html && ! rg -q 'data-netlify' /tmp/netlify-form-preview.html` | exit 0; local SHA, atomic URL, effective URL, runtime markers, and stripped build-time attribute all match |
| Remote acceptance | `NETLIFY_FORM_TEST_URL="$NETLIFY_FORM_TEST_URL" NETLIFY_FORM_TEST_DEPLOY_ID="$NETLIFY_FORM_TEST_DEPLOY_ID" NETLIFY_FORM_TEST_COMMIT_SHA="$NETLIFY_FORM_TEST_COMMIT_SHA" NETLIFY_FORM_TEST_MARKER="$NETLIFY_FORM_TEST_MARKER" yarn test:e2e:netlify`                                                                                                                                                                                                                                                                                                                                                                                                                      | exit 0, exactly one atomic-preview submission passes                                                       |

## Suggested executor toolkit

- Read Netlify's official [Forms setup documentation](https://docs.netlify.com/manage/forms/setup/) before writing the remote assertions.
- Use Netlify's official [atomic deploy permalink definition](https://docs.netlify.com/manage/domains/domains-fundamentals/domains-glossary/#atomic-deploy-permalink) and its deploy-specific URL; never substitute the mutable Deploy Preview alias for the POST target.
- Use the authenticated Netlify dashboard and notification-recipient inbox only
  with explicit operator authorization. Browser automation is acceptable for
  navigation, but a human must confirm the matching marker in both systems.

## Scope

**In scope** (the only files you should modify):

- `package.json`
- `playwright.netlify.config.ts` (create)
- `tests/netlify/contact-form.spec.ts` (create)
- `RFC.md`
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- Contact field validation, labels, honeypot implementation, form names, or the
  POST body; Plan 002 owns that code.
- Sending any synthetic form submission to the production domain.
- Netlify notification recipients, retention, spam settings, site ownership,
  billing, environment variables, or credentials.
- Adding the destructive remote test to ordinary PR/push CI. It remains an
  explicit one-shot acceptance command.
- Adding Turnstile, changing providers, or revalidating every pricing/uptime
  assertion in the legacy RFC.
- Pushing, opening/merging a PR, deploying, submitting a real form, or
  cancelling a paid service
  without explicit operator authorization.

## Git workflow

- Branch: `improve`
- This acceptance crosses a deploy boundary, so use two reviewable checkpoints:
  1. `Add Netlify preview form acceptance` for `package.json`, the remote
     Playwright config, and its test. This commit must exist on an authorized
     Deploy Preview before the synthetic POST can be proved.
  2. `Record Netlify form acceptance` for `RFC.md`, only after the preview,
     dashboard, inbox, production-read, and legacy-provider gates are all true.
- Never place the final RFC evidence in the first commit or squash it into a
  claim that predates production verification. Keep this plan `IN PROGRESS` or
  `BLOCKED` between the two checkpoints when an external validation window is
  still open.
- Keep titles imperative and under 72 characters, matching this repo's short
  commit style.
- Do NOT push, open/merge a PR, trigger a deploy, or cancel a service unless the
  operator explicitly instructed it. An operator may instead provide an
  existing Deploy Preview URL.

## Steps

### Step 1: Add an opt-in remote-only Playwright boundary

Create `playwright.netlify.config.ts` with `testDir: './tests/netlify'`,
`retries: 0`, `workers: 1`, one Chromium project, no `webServer`, and
`baseURL` from
`NETLIFY_FORM_TEST_URL`. This URL must be the atomic permalink for one Deploy
Preview, not its mutable `deploy-preview-N` alias. Validate the environment
while loading the config:

- it must be a valid HTTPS URL;
- its hostname must match
  `<NETLIFY_FORM_TEST_DEPLOY_ID>--hopeful-lumiere-46fc2e.netlify.app`, where the
  first label is the exact deploy ID from the authorized deploy record;
- `NETLIFY_FORM_TEST_DEPLOY_ID` must be a lowercase 24-character hexadecimal
  value and `NETLIFY_FORM_TEST_COMMIT_SHA` must be the full 40-character tested
  commit SHA;
- the commit SHA must exactly equal `git rev-parse HEAD` in the checkout that
  launches Playwright; use `execFileSync` with an argument array, not a shell
  command, for this local comparison;
- it must have no username, password, explicit port, query, or fragment, and
  its pathname must be `/`;
- it must not equal or redirect to the production host or to a different
  preview origin.

Fail with a clear error before Playwright starts if any rule is false. Add
`test:e2e:netlify` to `package.json`, targeting this config. Keep the remote
test directory outside `tests/e2e` so ordinary `yarn test:e2e` never submits a
form.

Create `tests/netlify/contact-form.spec.ts`. Require a non-empty,
operator-generated `NETLIFY_FORM_TEST_MARKER`. In one serial test:

1. navigate to `/` and assert the final origin exactly equals the configured
   atomic origin (no production, mutable-preview, or cross-deploy redirect);
2. assert the rendered form is named `contact`, has `bot-field` plus the hidden
   `form-name=contact`, and no longer has `data-netlify`; the source build has
   that attribute, so its absence is the expected post-processing signal;
3. scroll the form into view, wait for its `astro-island` ancestor to lose the
   `ssr` attribute, fill the valid contract from Plan 002 with clearly synthetic
   values, and put the unique marker in `message`;
4. submit once;
5. assert the in-page success message and exactly one form `POST /` whose origin
   exactly equals the atomic origin. Route every request globally: abort known
   analytics providers, then abort and fail the test on any remaining POST to
   another origin, including a 307/308 redirect. Assert the form response's
   final origin is still atomic.

This acceptance does not test analytics consent because Plan 001 was rejected.
Block GTM, Google measurement/Ads, and PostHog hosts during the run so their
availability cannot affect the form result. Inspect request bodies and fail if
the unique form marker appears in `request.url()` or `request.postData()` for
any request other than the one allowed atomic `POST /`. If the Axeptio overlay
blocks pointer actions, use Playwright's forced form controls and submit button
only after hydration; Plan 002 already owns visual/user-flow coverage.

Never log form contents, headers, cookies, recipient addresses, or dashboard
responses. Do not implement automatic retry around the POST; a failed test may
still have created a submission.

**Verify**: `yarn prettier --ignore-path /dev/null --check package.json && yarn prettier --check playwright.netlify.config.ts tests/netlify/contact-form.spec.ts && rg -n "test:e2e:netlify|tests/netlify|NETLIFY_FORM_TEST_(URL|DEPLOY_ID|COMMIT_SHA|MARKER)|hopeful-lumiere-46fc2e" package.json playwright.netlify.config.ts tests/netlify/contact-form.spec.ts && ! rg -n "deploy-preview-[0-9]+--" playwright.netlify.config.ts tests/netlify/contact-form.spec.ts` → formatting actually checks the ignored manifest plus both test files, all four inputs and the pinned site are present, and no mutable preview alias is accepted.

### Step 2: Prove local build markers without exercising Netlify

Run install, lint, build, and the normal E2E suite. Inspect `dist/index.html`
for the static contact form, honeypot, and hidden form-name marker. Plan 002
must already be complete, and its local validation suite must pass as part of
the full suite. Also run the remote config with `--list` against a syntactically
valid fake atomic URL bound to the current commit; this may collect the one
remote test but must not navigate or submit.

**Verify**: `yarn lint && yarn build && rg -n 'name="contact"|data-netlify="true"|name="bot-field"|name="form-name"' dist/index.html && yarn test:e2e && NETLIFY_FORM_TEST_DEPLOY_ID=0123456789abcdef01234567 NETLIFY_FORM_TEST_COMMIT_SHA="$(git rev-parse HEAD)" NETLIFY_FORM_TEST_URL=https://0123456789abcdef01234567--hopeful-lumiere-46fc2e.netlify.app/ NETLIFY_FORM_TEST_MARKER=CONFIG_ONLY yarn test:e2e:netlify --list` → every command exits 0, all four markers appear, the local suite does not collect the remote test, and the remote config lists one test without navigating or submitting.

### Step 3: Obtain and preflight an authorized Deploy Preview

Ask the operator for an existing Deploy Preview URL for the branch/PR that
contains Plan 002 plus Step 1, or for explicit authorization to
push/open a PR so Netlify can create one. Do not infer that authorization from
this plan or from the repository being linked to Netlify CLI. A CLI draft
deploy is still a deploy and also requires explicit authorization.

Set local shell variables without committing them:

```sh
export NETLIFY_FORM_TEST_DEPLOY_ID='<24 lowercase hex deploy id>'
export NETLIFY_FORM_TEST_COMMIT_SHA="$(git rev-parse HEAD)"
export NETLIFY_FORM_TEST_URL="https://${NETLIFY_FORM_TEST_DEPLOY_ID}--hopeful-lumiere-46fc2e.netlify.app/"
export NETLIFY_FORM_TEST_MARKER="NETLIFY_FORM_ACCEPTANCE_$(date -u +%Y%m%dT%H%M%SZ)_${NETLIFY_FORM_TEST_COMMIT_SHA}"
```

Copy the deploy ID and full commit SHA from the authorized Netlify deploy
record; do not infer them from a mutable preview alias. Confirm the atomic URL
and the stable `deploy-preview-N--hopeful-lumiere-46fc2e.netlify.app` record
refer to that same deploy and tested commit. Use the atomic URL for every GET
and the single POST. With authorized dashboard access, open that exact deploy's
log and require all of the following in its post-processing section:

- `Processing form - contact`;
- `Detected form fields:` followed by `bot-field`, `name`, `animal`, `email`,
  `phone`, and `message`;
- no `Skipping form detection`, zero-field warning, or form-processing failure.

This deploy-specific log evidence is mandatory because a successful POST to a
pre-existing `contact` form does not prove the current HTML was detected. Also
confirm the delivered preview HTML contains the three runtime markers and has
had the source-only `data-netlify` attribute stripped. A production URL is
never an acceptable substitute.

**Verify**: `printf '%s' "$NETLIFY_FORM_TEST_DEPLOY_ID" | rg -q '^[0-9a-f]{24}$' && printf '%s' "$NETLIFY_FORM_TEST_COMMIT_SHA" | rg -q '^[0-9a-f]{40}$' && test "$(git rev-parse HEAD)" = "$NETLIFY_FORM_TEST_COMMIT_SHA" && test "$NETLIFY_FORM_TEST_URL" = "https://${NETLIFY_FORM_TEST_DEPLOY_ID}--hopeful-lumiere-46fc2e.netlify.app/" && effective_url="$(curl --fail --silent --show-error --location --output /tmp/netlify-form-preview.html --write-out '%{url_effective}' "$NETLIFY_FORM_TEST_URL")" && test "$effective_url" = "$NETLIFY_FORM_TEST_URL" && rg -q "name=['\"]contact['\"]" /tmp/netlify-form-preview.html && rg -q "name=['\"]bot-field['\"]" /tmp/netlify-form-preview.html && rg -q "name=['\"]form-name['\"]" /tmp/netlify-form-preview.html && ! rg -q 'data-netlify' /tmp/netlify-form-preview.html` → exit 0; the checkout, deploy record, exact immutable URL, and effective URL are bound to one deployment, with all runtime markers and stripped build-time attribute. The authorized operator separately confirms the same deploy log contains the form plus all six expected fields and no skip/warning.

### Step 4: Submit once and correlate provider-side evidence

Before posting, ensure an authorized operator can inspect both the Netlify
Forms dashboard for this site and the configured notification inbox. Then run
the remote command exactly once.

If Playwright fails after the submit click, do not retry immediately: first
search the Netlify dashboard for `NETLIFY_FORM_TEST_MARKER`, because the POST
may have succeeded even though the UI assertion failed.

After the passing run, the authorized operator must confirm:

1. the exact preview deploy log contains the detection evidence from Step 3;
2. one `contact` submission exists in the Netlify Forms dashboard;
3. its message contains the exact marker and the honeypot is empty;
4. it is classified as a legitimate submission, not spam;
5. provider metadata identifies the submission context as `deploy-preview` and
   the site as `hopeful-lumiere-46fc2e`, not production or another site;
6. exactly one corresponding notification arrived in the configured inbox;
7. the dashboard and email timestamps correspond to this preview run.

Record only non-sensitive evidence for the RFC: date/time, tested commit,
Deploy Preview URL, marker, and pass/fail for dashboard/email. Do not commit the
submission body, recipient, sender, dashboard screenshots, tokens, site ID, or
headers.

**Verify**: `NETLIFY_FORM_TEST_URL="$NETLIFY_FORM_TEST_URL" NETLIFY_FORM_TEST_DEPLOY_ID="$NETLIFY_FORM_TEST_DEPLOY_ID" NETLIFY_FORM_TEST_COMMIT_SHA="$NETLIFY_FORM_TEST_COMMIT_SHA" NETLIFY_FORM_TEST_MARKER="$NETLIFY_FORM_TEST_MARKER" yarn test:e2e:netlify` → one test passes, reports exactly one form POST to the atomic origin, blocks analytics providers, and proves the marker appears in no other request; an authorized operator separately confirms the same marker once in the pinned site's dashboard and once in the inbox.

### Step 5: Close the RFC only after all external gates are true

Do not send a production synthetic submission. After an authorized operator
merges/deploys the already-tested code, verify production with a read-only GET
for the three runtime form markers plus absence of the source-only
`data-netlify` attribute, and confirm the deployed commit through the operator's
Netlify deploy record.

Update only the status/completion portions of `RFC.md`:

- change the RFC status to implemented/accepted with the actual acceptance
  date;
- check code/UX items supported by repository gates;
- check dashboard and notification items only from Step 4 evidence;
- check production migration from the deploy record plus read-only production
  HTML verification, never a synthetic production POST;
- check legacy Getform cancellation only after the operator confirms the
  account/billing action following the RFC's validation window;
- add a concise acceptance-evidence subsection containing only the
  non-sensitive fields allowed in Step 4.

If production deployment or legacy-provider cancellation is not yet complete,
leave the RFC open and mark this plan `BLOCKED` with the exact pending external
gate. Do not turn unchecked boxes into claims.

**Verify**: `rg -n "Statut.*(Implemented|Accept|Implément|Valid)|Acceptance|Validation|NETLIFY_FORM_ACCEPTANCE" RFC.md && ! awk '/^### MVP/{in_mvp=1; next} /^### / && in_mvp {exit} in_mvp {print}' RFC.md | rg '^- \[ \]'` → the acceptance evidence exists and no MVP item remains unchecked; `curl --fail --silent --show-error --location https://www.osteopathie-animale-bordeaux.fr/ > /tmp/netlify-form-production.html && rg -q "name=['\"]contact['\"]" /tmp/netlify-form-production.html && rg -q "name=['\"]bot-field['\"]" /tmp/netlify-form-production.html && rg -q "name=['\"]form-name['\"]" /tmp/netlify-form-production.html && ! rg -q 'data-netlify' /tmp/netlify-form-production.html` → production GET contains all three runtime markers, has the source-only attribute stripped, and performs no POST.

### Step 6: Run final gates and inspect scope

Format only code/config files; do not mechanically reformat the entire legacy
RFC. Run lint, build, local E2E, and a whitespace check. Do not rerun the remote
submission as a generic final gate.

**Verify**: `yarn prettier --ignore-path /dev/null --write package.json && yarn prettier --write playwright.netlify.config.ts tests/netlify/contact-form.spec.ts && yarn lint && yarn build && yarn test:e2e && git diff --check` → every command exits 0 and `package.json` was not skipped by the current ignore file; `git status --short --untracked-files=all` lists only the scoped implementation files plus the plan index status row.

## Test plan

- Add `tests/netlify/contact-form.spec.ts` as one non-retrying, serial,
  preview-only acceptance test.
- Add a separate Playwright config without `webServer`; validate the atomic
  host, deploy ID, exact local/remote commit SHA, and marker before any browser
  action.
- Keep `tests/netlify` outside local `tests/e2e` and verify the ordinary suite
  does not collect it.
- Prove this exact deploy detected the form through stripped preview markup and
  its post-processing log; the existing site-level `contact` registration is
  not sufficient evidence.
- Run the preview POST once, then correlate its unique marker manually in the
  authorized Netlify dashboard and notification inbox.
- Prove exactly one form POST targets the atomic preview, no foreign-origin
  POST or redirect escapes, analytics providers are blocked, and the unique
  marker is absent from every other request.
- Verify production only with read-only HTML/deploy evidence.

## Done criteria

Machine-checkable or explicitly operator-attested. ALL must hold:

- [ ] Plan 002 is complete and its validation tests pass; Plan 001 is explicitly
      rejected and is not treated as a dependency.
- [ ] `yarn test:e2e` does not collect the remote Netlify test.
- [ ] The remote Playwright config fixes `retries: 0`, `workers: 1`, and a
      single serial test so a runner cannot duplicate a real submission.
- [ ] The remote config rejects missing, malformed, mutable-preview,
      wrong-site, credentialed, ported, queried, fragmented, redirected, and
      production URLs before a POST is possible.
- [ ] The 24-character deploy ID, full tested commit SHA, local `HEAD`, atomic
      hostname, effective URL, and authorized deploy record all identify the
      same immutable deployment.
- [ ] The exact-commit Deploy Preview log reports `Processing form - contact`
      and all six expected fields with no skipped/failed detection.
- [ ] Served preview HTML has the runtime markers and no `data-netlify`
      attribute, proving Netlify post-processing ran for this deploy.
- [ ] One Deploy Preview submission passes, uses a unique marker, makes exactly
      one POST to the atomic origin, and makes zero POSTs to any other origin.
- [ ] GTM, Google measurement/Ads, and PostHog hosts are blocked during the
      acceptance run, and the unique marker is never sent to them or any other
      non-form endpoint.
- [ ] An authorized operator confirms that marker exactly once in the Netlify
      dashboard and notification inbox, under the pinned site and
      `deploy-preview` context.
- [ ] No synthetic submission was sent to production.
- [ ] Production form markers and deployed commit are verified read-only.
- [ ] RFC status/checklist/evidence reflect only gates actually observed,
      including explicit legacy-provider cancellation confirmation.
- [ ] `yarn lint`, `yarn build`, `yarn test:e2e`, and `git diff --check` exit 0.
- [ ] `yarn.lock` is unchanged.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated by the plan owner.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" no longer matches the excerpts.
- Plan 002 is incomplete or its field/form contract differs from this plan.
- The operator cannot provide or authorize creation of a Deploy Preview.
- The atomic URL, deploy ID, stable-preview record, local `HEAD`, or full commit
  SHA cannot all be tied to the same tested deployment.
- The exact deploy log is unavailable, says form detection was skipped, omits
  `contact` or an expected field, or contains a form-processing warning/error.
- The URL is mutable, production, credentialed, ported, queried, fragmented,
  redirects anywhere, or does not match the exact atomic permalink for
  `hopeful-lumiere-46fc2e`.
- Any form POST targets a non-atomic origin, an analytics provider cannot be
  blocked deterministically, or the unique marker appears in another request.
- Authorized Netlify dashboard and notification-inbox access are unavailable.
- A remote test fails after clicking submit; check the dashboard before any
  retry and report whether the marker exists.
- Dashboard/email evidence disagrees, the submission is spam-classified, or
  duplicate markers appear.
- Production deploy or legacy-provider cancellation cannot be confirmed; leave
  the RFC open rather than guessing.
- Any step requires committing credentials, submission content, PII, or a
  dashboard/inbox screenshot.
- A verification command fails twice after a reasonable fix attempt.
- The fix requires touching an out-of-scope file.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- Run the remote suite only for deliberate acceptance checks; every run creates
  a real preview submission and notification.
- Field/form-name changes must update this test and Plan 002 together.
- Reviewers should scrutinize exact-origin guards, deploy-specific detection
  evidence, one-submit behavior, non-sensitive evidence, and refusal to
  auto-retry.
- The RFC contains historical pricing/uptime claims not revalidated here; a
  separate documentation review should update them if they remain important.
