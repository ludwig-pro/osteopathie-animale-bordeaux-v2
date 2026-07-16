# Plan 002: Reject unusable contact submissions before posting

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
> `git diff --stat 9aece8f..HEAD -- src/components/landing-page/contact/ContactForm.tsx src/components/landing-page/contact/FormField.tsx tests/e2e/contact-form-validation.spec.ts playwright.config.ts`
> `git diff --stat HEAD -- src/components/landing-page/contact/ContactForm.tsx src/components/landing-page/contact/FormField.tsx tests/e2e/contact-form-validation.spec.ts playwright.config.ts`
> `git ls-files --others --exclude-standard -- src/components/landing-page/contact/ContactForm.tsx src/components/landing-page/contact/FormField.tsx tests/e2e/contact-form-validation.spec.ts playwright.config.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

The primary lead form currently accepts and posts an entirely blank payload,
then shows a success message whenever `/` returns a successful response. It can
also accept a name/message with neither email nor telephone, leaving no way to
answer the prospective client. This plan establishes a small explicit contract,
blocks invalid network requests, exposes accessible field errors, and keeps the
Netlify payload shape intact.

## Current state

- `src/components/landing-page/contact/ContactForm.tsx:10-23` starts loading and
  emits `contact_form_submit_started` before validating any field.
- `src/components/landing-page/contact/ContactForm.tsx:33-37` posts every
  `FormData` entry to `/` as `application/x-www-form-urlencoded`.
- `src/components/landing-page/contact/ContactForm.tsx:83-116` renders name,
  animal, email, phone, and message without passing `required` to any field.
- `src/components/landing-page/contact/ContactForm.tsx:77-81` renders
  `bot-field` as `type="hidden"`; a useful honeypot must be a normal empty text
  control hidden from humans, not a hidden-type value that bots commonly skip.
- `src/components/landing-page/contact/FormField.tsx:7-16` supports a
  `required` prop but defaults it to `false`; it has no error, `aria-invalid`,
  or `aria-describedby` contract.
- There is no contact-form E2E coverage. `tests/e2e/booking.smoke.spec.ts` only
  checks booking/contact navigation.
- Keep the existing field names and Netlify form name exactly unchanged:
  `name`, `animal`, `email`, `phone`, `message`, `bot-field`, and `contact`.

Use this validation contract:

- `name`: required after trimming whitespace
- `message`: required after trimming whitespace
- contact channel: at least one of `email` or `phone` must be non-empty after
  trimming
- a non-empty email must satisfy the browser's `type="email"` validity check
- `animal`: optional
- `phone`: no invented country-specific regex in this plan
- invalid input must produce no fetch and no submit-started analytics event

## Commands you will need

| Purpose         | Command                                                                                                                                                                             | Expected on success                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Install         | `yarn install --frozen-lockfile`                                                                                                                                                    | exit 0 and no `yarn.lock` change                                      |
| Format check    | `yarn prettier --check src/components/landing-page/contact/ContactForm.tsx src/components/landing-page/contact/FormField.tsx tests/e2e/contact-form-validation.spec.ts`             | exit 0, all files formatted                                           |
| Lint            | `yarn lint`                                                                                                                                                                         | exit 0, no errors                                                     |
| Build/typecheck | `yarn build`                                                                                                                                                                        | exit 0; `astro check` reports no errors and Astro build completes     |
| E2E port check  | `node -e "const net = require('node:net'); const server = net.createServer(); server.once('error', () => process.exit(1)); server.listen(4321, '127.0.0.1', () => server.close())"` | exit 0 proves port 4321 is free                                       |
| Focused E2E     | `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/contact-form-validation.spec.ts --retries=0 --workers=1`                                                           | exit 0, all validation cases pass on a fresh analytics-disabled build |
| Full tests      | `CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e --retries=0 --workers=1`                                                                                                     | exit 0, all existing and new E2E tests pass without live analytics    |

## Scope

**In scope** (the only files you should modify):

- `src/components/landing-page/contact/ContactForm.tsx`
- `src/components/landing-page/contact/FormField.tsx`
- `tests/e2e/contact-form-validation.spec.ts` (create)
- `playwright.config.ts` (server-timeout adjustment only)
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- Renaming fields, changing the form name, changing the `/` endpoint, or
  replacing URL-encoded Netlify submission.
- Netlify dashboard settings, Deploy Preview verification, email notification,
  and `RFC.md`; Plan 003 owns those operational gates.
- Adding Turnstile/reCAPTCHA, a backend, schema-validation dependency, or a
  phone-number library.
- Changing analytics event names/payloads or consent behavior.
- Rewriting contact copy, adding a privacy-policy route, or deciding retention.

## Git workflow

- Branch: `improve`
- Make one logical commit after all gates pass: `Validate contact submissions`.
- Keep the title imperative and under 72 characters, matching this repo's
  short commit style.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add reusable accessible field errors

Extend `FormFieldProps` in `FormField.tsx` with:

- `error?: string`
- `invalid?: boolean`
- `ariaDescribedBy?: string`

For an own-field error, render a stable paragraph ID `${name}-error` directly
after the input/textarea with `role="alert"` and readable red text. Set
`aria-invalid="true"` when `error` or `invalid` is present. Build
`aria-describedby` from the own error ID and the optional external ID without
emitting an empty attribute. Preserve labels, autocomplete, types, rows,
classes, and the existing `required` prop.

This allows email and phone to reference one group-level contact-method error
without rendering the same message twice.

**Verify**: `rg -n "error\?:|invalid\?:|ariaDescribedBy\?:|aria-invalid|aria-describedby|role=\"alert\"" src/components/landing-page/contact/FormField.tsx` → finds all three new props and the accessible error wiring for both input and textarea branches.

### Step 2: Validate and normalize before loading or analytics

In `ContactForm.tsx`, separate server submission failure state from validation
state (for example `submitError` and a typed `validationErrors` object). Add a
hydration-ready boolean that is `false` for SSR and the first client render,
then becomes `true` in `useEffect`. Bind `noValidate` to that boolean. The
server-rendered/no-JavaScript form must therefore retain native `required` and
email constraint validation, while the hydrated form can display deterministic
accessible French messages instead of browser-specific popovers without a
hydration mismatch.

At the very start of `handleSubmit`, before setting loading or emitting
analytics:

1. create `FormData` and read string values safely;
2. trim name, animal, email, phone, and message;
3. validate the exact contract in "Current state";
4. use the email input element's native `validity.typeMismatch` for a non-empty
   email instead of introducing a regex;
5. if invalid, store errors, focus the first invalid control in DOM order, and
   return without fetching or emitting `contact_form_submit_started`;
6. if valid, clear errors, write normalized strings back to `FormData`, use
   `formData.set('form-name', 'contact')` (never `append`) so the existing
   hidden value remains exactly one entry, and only then set loading and emit the
   existing started event.

Pass `required` and field errors to name/message. Render one
`id="contact-method-error"` alert after phone when both channels are empty;
both email and phone must reference it and be marked invalid. Render a separate
email-format error through `FormField` when appropriate. Clear stale
validation/server messages on a subsequent valid attempt and preserve existing
success, reset, timeout, and failed-request behavior.

Replace `<input type="hidden" name="bot-field" />` with a normal text input in
a human-hidden labelled wrapper. Give it `tabIndex={-1}` and
`autoComplete="off"`; keep its name and empty default. Keep the separate hidden
`form-name` input.

**Verify**: `rg -n "useEffect|noValidate=|required|contact-method-error|validity\.typeMismatch|formData\.set|bot-field" src/components/landing-page/contact/ContactForm.tsx` → finds hydration-safe native/custom validation, the normalized payload, and honeypot; `rg -n "formData\.append\(['\"]form-name|type=\"hidden\" name=\"bot-field\"" src/components/landing-page/contact/ContactForm.tsx` → no matches.

### Step 3: Add deterministic form-boundary tests

Create `tests/e2e/contact-form-validation.spec.ts`. For hydrated cases,
navigate to `/`, scroll the contact form into view, locate its ancestor
`astro-island`, and wait until the island no longer has the `ssr` attribute
before submitting. Intercept `POST /` requests. Do not contact Netlify from this
suite.

Cover these cases:

1. entirely blank: no POST, accessible name/message errors, focus on name;
2. name/message but no contact channel: no POST, one group error referenced by
   both email and phone, focus on email;
3. malformed non-empty email: no POST and an email-format error;
4. valid name/message/email: exactly one URL-encoded POST, normalized body has
   exactly one `form-name=contact`, success message appears, and the form
   resets;
5. valid name/message/phone with empty email: exactly one POST and success;
6. honeypot markup: `bot-field` is a normal text control inside a hidden wrapper,
   is removed from tab order, and remains empty in the valid payload.
7. native fallback: in a fresh context with `javaScriptEnabled: false`, the SSR
   form has no `novalidate`, blank required fields and a malformed non-empty
   email produce zero POSTs, and native-valid input can submit once. Do not
   claim native HTML can enforce the hydrated email-or-phone cross-field rule
   against a deliberately crafted direct request.

Fulfill valid POSTs with status 200. Decode the request body with
`URLSearchParams`; assert `getAll('form-name')` equals exactly `['contact']` and
do not depend on parameter ordering.

Plan 001 was explicitly rejected. Test the current analytics contract instead:
before navigation in every JavaScript-enabled test, install an init script that
sets `window.__gtm_loaded__ = true`, `window.__posthog_initialized__ = true`,
and `window.dataLayer = []`. This prevents the current deferred/interaction
loaders from requesting providers while retaining the public
`pushDataLayerEvent()` behavior. Also abort requests whose URL contains
`googletagmanager`, `google-analytics`, or `posthog` in every context, including
the JavaScript-disabled context; any such request is a test failure, not a
response to fulfill. The mandatory E2E commands additionally build with empty
`PUBLIC_GTM_ID` and `PUBLIC_POSTHOG_KEY`, which also removes the
JavaScript-disabled GTM `<noscript>` path.

Assert an invalid attempt adds no `contact_form_submit_started`, then use a
valid attempt as a positive control and assert exactly one started event in the
clean `dataLayer`.

Before each E2E invocation, run the port check from Commands you will need. If
port 4321 is occupied, STOP rather than reusing or killing the listener.

**Verify**: the exact focused E2E command exits 0; all seven cases pass with
zero live Netlify or analytics-provider requests.

### Step 4: Run repository gates and inspect scope

Format only the three in-scope files, then run lint, build, the focused suite,
and the full E2E suite. Confirm the build still contains a static form named
`contact` for Netlify detection and that the lockfile did not change.

Two fresh-server attempts on 2026-07-16 timed out while the current
`webServer.timeout` was `180000`, while the identical direct build completed
successfully in approximately 251 seconds. Change only
`playwright.config.ts`'s web-server timeout to `360000`; do not change retries,
workers, server commands, reuse behavior, projects, or test timeouts.

**Verify**: `yarn prettier --write src/components/landing-page/contact/ContactForm.tsx src/components/landing-page/contact/FormField.tsx tests/e2e/contact-form-validation.spec.ts playwright.config.ts && rg -q 'timeout: 360000' playwright.config.ts && yarn lint && yarn build && rg -q 'name="contact"' dist/index.html && rg -q 'data-netlify="true"' dist/index.html && rg -q 'name="bot-field"' dist/index.html && rg -q 'name="form-name"' dist/index.html && node -e "const net = require('node:net'); const server = net.createServer(); server.once('error', () => process.exit(1)); server.listen(4321, '127.0.0.1', () => server.close())" && CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e tests/e2e/contact-form-validation.spec.ts --retries=0 --workers=1 && node -e "const net = require('node:net'); const server = net.createServer(); server.once('error', () => process.exit(1)); server.listen(4321, '127.0.0.1', () => server.close())" && CI=1 PUBLIC_GTM_ID= PUBLIC_POSTHOG_KEY= yarn test:e2e --retries=0 --workers=1` → every command exits 0 and the built HTML contains all four form markers; `git status --short --untracked-files=all` lists only the scoped implementation files plus the plan index status row.

## Test plan

- Add `tests/e2e/contact-form-validation.spec.ts` with the seven cases in Step 3.
- Model navigation/interception after the Playwright conventions in
  `tests/e2e/booking.smoke.spec.ts`.
- Assert no-request behavior for all invalid paths, decoded Netlify-compatible
  bodies for both valid contact channels, accessible errors/focus, and the
  honeypot shape.
- Verification: the focused and full fresh-server commands both exit 0 with
  analytics disabled and all third-party analytics routes blocked.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Whitespace-only name/message and missing contact channel cannot fetch.
- [ ] A malformed non-empty email cannot fetch.
- [ ] Valid email-only and phone-only submissions each make one URL-encoded
      POST with the unchanged Netlify field contract.
- [ ] Validation messages are associated with controls and focus moves to the
      first invalid field.
- [ ] Invalid attempts do not emit the submit-started event, and a valid
      positive control emits it exactly once.
- [ ] SSR/no-JavaScript markup omits `novalidate`; native constraints block a
      blank form and malformed email before any POST.
- [ ] The encoded body contains exactly one `form-name=contact` entry.
- [ ] `bot-field` is not `type="hidden"`, is out of the tab order, and remains
      present in built static HTML.
- [ ] `yarn lint`, `yarn build`, the focused suite, and `yarn test:e2e` exit 0.
- [ ] `playwright.config.ts` changes only `webServer.timeout` from `180000` to
      `360000`.
- [ ] `yarn.lock` is unchanged.
- [ ] `git status --short --untracked-files=all` lists only in-scope files and
      the allowed `plans/README.md` status update.
- [ ] `plans/README.md` status row updated by the plan owner.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" no longer matches the excerpts.
- Product requirements say name or message may be omitted, require `animal`,
  require one specific contact channel, or impose a phone format; the contract
  must be approved rather than guessed.
- The deployed Netlify form uses different field names or a different form
  name than the source shows.
- Accessible inline errors require a design-system component or translated
  copy not present in the repository.
- Hydration-safe conditional `noValidate` cannot be implemented without an SSR
  mismatch or weakening native pre-hydration constraints.
- The built static HTML loses any Netlify form marker after the change.
- A verification command fails twice after a reasonable fix attempt.
- The fix requires touching an out-of-scope file.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- Keep client validation and the operational Netlify contract in Plan 003 in
  sync whenever fields change.
- Reviewers should scrutinize trim/normalization, first-invalid focus, the
  email/phone group association, duplicate `form-name`, and no-request paths.
- Phone normalization, server-side validation, Turnstile, and legal copy are
  deliberately deferred; they need product/provider decisions.
- Native HTML cannot express "email or phone" across two controls. Treat every
  direct request as untrusted and do not describe this client-side contract as
  server-side validation.
