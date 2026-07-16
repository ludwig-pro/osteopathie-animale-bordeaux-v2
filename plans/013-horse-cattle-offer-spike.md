# Plan 013: Decide the horse and cattle service position

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
> `git diff --stat 9aece8f..HEAD -- docs/decisions/horse-cattle-offer.md src/components/landing-page/animals/configuration.ts src/components/landing-page/animals/NewAriaSelectMenu.tsx src/components/landing-page/animals/AriaSelectMenuWeb.tsx src/components/landing-page/about/About.tsx src/components/landing-page/hero/Hero.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/lib/constants/site.ts`
> `git diff --stat HEAD -- docs/decisions/horse-cattle-offer.md src/components/landing-page/animals/configuration.ts src/components/landing-page/animals/NewAriaSelectMenu.tsx src/components/landing-page/animals/AriaSelectMenuWeb.tsx src/components/landing-page/about/About.tsx src/components/landing-page/hero/Hero.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/lib/constants/site.ts`
> `git ls-files --others --exclude-standard -- docs/decisions/horse-cattle-offer.md src/components/landing-page/animals/configuration.ts src/components/landing-page/animals/NewAriaSelectMenu.tsx src/components/landing-page/animals/AriaSelectMenuWeb.tsx src/components/landing-page/about/About.tsx src/components/landing-page/hero/Hero.tsx src/components/landing-page/pricing/Pricing.tsx src/components/landing-page/consultation/ConsultationProcess.tsx src/lib/constants/site.ts`
> The second and third commands must print nothing; otherwise STOP and report
> uncommitted in-scope work. If the first command reports committed drift,
> compare the "Current state" inventory against the live site before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **External prerequisite**: the site/business owner is available to answer all
  six question groups, select one token per species, and provide a durable
  approval reference
- **Category**: direction
- **Planned at**: commit `9aece8f`, 2026-07-15

## Why this matters

The site currently claims horse and cattle expertise in its animal selector and
biography, while its hero, named prices, and generic booking path foreground
dogs, cats, and NAC. Code cannot determine whether this is intentional
positioning, a limited travel-only service, or stale copy. The correct next step
is an owner-validated decision record, not speculative production edits.

## Current state

- `src/components/landing-page/animals/configuration.ts:1,54-94` includes
  `cheval` and `vache` as first-class `AnimalKey` values with long service copy
  and dedicated images.
- Both selectors expose those options:
  `NewAriaSelectMenu.tsx:6-14` and `AriaSelectMenuWeb.tsx:100-105`.
- `src/components/landing-page/about/About.tsx:57-60` says personalized care is
  offered for dogs, cats, NAC, horses, or cows, in the practice or at home.
- `src/components/landing-page/hero/Hero.tsx:181-186` says the practitioner is
  an expert for dogs, cats, and NAC only.
- `src/components/landing-page/pricing/Pricing.tsx:37-67` has named cards for
  dog/cat and NAC plus a breeder package, but no explicit horse or cattle price.
- `src/components/landing-page/hero/Hero.tsx:24-25` sends all online booking to
  one generic Calendly consultation URL.
- `src/components/landing-page/consultation/ConsultationProcess.tsx:274-282`
  uses a horse treatment photo. Treat it as supporting imagery, not proof of a
  current commercial offer.
- `src/lib/constants/site.ts:36` says the service area is Bordeaux, Bègles,
  and Gironde, but the code does not specify equine/bovine travel radius,
  availability, pricing, venue, minimum group size, or booking rules.
- There is no `docs/` directory or existing owner decision record. Do not infer
  business truth from the current copy.

## Commands you will need

| Purpose    | Command                                                                                                                                                                               | Expected on success                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----- | ------------- | ------- | -------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| Inventory  | `rg -n -i 'cheval                                                                                                                                                                     | vache                                        | bovin | chiens, chats | N\.A\.C | Éleveurs | calendly' src/components/landing-page src/lib/constants/site.ts` | exits 0 and shows all current positioning references |
| Install    | `yarn install --frozen-lockfile`                                                                                                                                                      | exit 0; lockfile unchanged                   |
| Format     | `yarn prettier --check docs/decisions/horse-cattle-offer.md`                                                                                                                          | exit 0 after the decision record is complete |
| Boundary   | compare the complete `git status --porcelain=v1 --untracked-files=all` path set with `docs/decisions/horse-cattle-offer.md` plus the optional coordinator-owned `plans/README.md` row | no other changed path                        |
| Whitespace | `git diff --check`                                                                                                                                                                    | exit 0                                       |

## Scope

**In scope** (the only file you should modify):

- `docs/decisions/horse-cattle-offer.md` (create after owner validation)
- `plans/README.md` (status row only, or coordinator-owned during parallel execution)

**Out of scope** (do NOT touch, even though they look related):

- Every file under `src/`, including hero, animal selectors/configuration,
  biography, pricing, contact, schema, and images.
- Calendly, Netlify, analytics, SEO metadata, service areas, prices, or booking
  operations.
- Inventing an offer, price, travel radius, availability, credential, customer
  demand, or owner answer.
- Implementing the selected direction. A validated decision produces a future
  backlog; it does not authorize production content changes.

## Git workflow

- Branch: `codex/013-horse-cattle-offer-spike`
- Make one commit after explicit validation: `Document horse and cattle offer decision`.
- Keep the title imperative and under 72 characters.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rebuild the current-site inventory without editing production

Run the inventory command and compare it with Current state. Prepare notes for
the owner under these exact headings, but do not create the final decision file
yet:

1. `Current public claims`
2. `Offer questions`
3. `Decision options`
4. `Implementation consequences`

Apply one of these deliberately limited options independently to horses and to
cattle:

- `PROMOTE` — horse and cattle are active offers to foreground and make
  bookable with complete operational information;
- `KEEP_SECONDARY` — they are real but constrained/referral/travel offers that
  should remain accurately described without being primary acquisition lines;
- `REMOVE` — they are no longer offered and future work should remove the
  conflicting claims and assets.

**Verify**: `rg -n -i 'cheval|vache|bovin|chiens, chats|N\.A\.C|Éleveurs|calendly' src/components/landing-page src/lib/constants/site.ts` →
matches the inventory in Current state; `git status --short` shows no edit from
this step.

### Step 2: Obtain explicit owner answers

Ask the site/business owner all of the following; do not merge questions or
fill gaps by inference:

1. Are horse consultations currently accepted? If yes: where, travel radius,
   availability, price basis, and booking channel?
2. Are cattle consultations currently accepted? If yes: where, travel radius,
   availability, price/minimum/group basis, and booking channel?
3. Are either of these referral-only, existing-client-only, seasonal, or paused?
4. Does the generic Calendly event accept each species, or must clients contact
   the practitioner first?
5. For each species independently, which of `PROMOTE`, `KEEP_SECONDARY`, or
   `REMOVE` reflects the intended next 12 months?
6. Which owner role approves the answer, on what date, and where is the durable
   approval reference (issue/comment/document link or meeting-note identifier)?

Do not put private customer data, credentials, phone numbers, access tokens, or
private message contents in the repository. A role plus a durable internal
reference is sufficient.

**Verify**: before continuing, all six questions have explicit owner answers,
one decision token is selected for horses, one is selected for cattle, and a
validation date/reference exists. If any is missing, this is a STOP condition.

### Step 3: Create the validated decision record

Create `docs/decisions/horse-cattle-offer.md` with this exact structure:

```markdown
# Horse and cattle offer decision

- Status: VALIDATED
- Horse decision: PROMOTE | KEEP_SECONDARY | REMOVE
- Cattle decision: PROMOTE | KEEP_SECONDARY | REMOVE
- Validated by: <owner role>
- Validation date: <YYYY-MM-DD>
- Evidence reference: <durable reference>

## Current public claims

## Owner answers

### Q1 - Horse offer

### Q2 - Cattle offer

### Q3 - Restrictions and availability

### Q4 - Booking path

### Q5 - Twelve-month decisions

### Q6 - Approval

## Decision and rationale

## Operational constraints

## Follow-up backlog

## Explicit non-goals
```

Replace both decision alternatives and every placeholder with the validated
answers. Preserve exactly one `Q1` through `Q6` heading and put the corresponding
explicit owner answer under each; an unanswered or qualified placeholder does
not pass. The two species may legitimately have different tokens. In
`Current public claims`, cite the exact repository path plus the stable exported
component/configuration symbol and a short identifying claim fragment observed
at execution `HEAD` (for example `About.tsx` / `QuiSuisJe`), and record the
audited baseline commit `9aece8f`. Do **not** store line ranges: Plan 010 may
legitimately reformat the same components in parallel and shift lines without
changing a claim. In `Owner answers`, record concise answers to all six questions.
In `Follow-up backlog`, separate horse and cattle consequences when their
decisions differ, and label every item `NOT AUTHORIZED BY THIS SPIKE`.
`Explicit non-goals` must say that this record changes no production copy,
pricing, booking, service area, schema, or analytics.

Run this fail-closed validation:

```sh
record=docs/decisions/horse-cattle-offer.md
for pattern in '^- Status: VALIDATED$' '^- Horse decision: (PROMOTE|KEEP_SECONDARY|REMOVE)$' '^- Cattle decision: (PROMOTE|KEEP_SECONDARY|REMOVE)$' '^- Validated by: [^[:space:]].*$' '^- Validation date: [0-9]{4}-[0-9]{2}-[0-9]{2}$' '^- Evidence reference: [^[:space:]].*$'; do
  test "$(rg -c "$pattern" "$record")" -eq 1 || exit 1
done
for n in 1 2 3 4 5 6; do
  test "$(rg -c "^### Q${n} - " "$record")" -eq 1 || exit 1
  awk -v heading="### Q${n} - " '
    index($0, heading) == 1 { inside = 1; next }
    inside && (/^### Q[1-6] - / || /^## /) { exit }
    inside && $0 ~ /[[:alnum:]]/ { answer = 1 }
    END { exit(answer ? 0 : 1) }
  ' "$record" || exit 1
done
if rg -ni '(^|[^[:alnum:]_])(TBD|TODO|UNKNOWN|PENDING|TO[ _-]?CONFIRM)([^[:alnum:]_]|$)|<[^>]+>|PROMOTE \| KEEP_SECONDARY \| REMOVE' "$record"; then
  exit 1
else
  placeholder_status=$?
  test "$placeholder_status" -eq 1 || exit 1
fi
```

**Verify**: the command exits 0. Each of the six metadata contracts and six
owner-answer headings appears exactly once; every Q section contains at least
one alphanumeric answer character before the next section; neither metadata nor
answer bodies contain a generic/template placeholder, and an `rg` I/O/error
status cannot be mistaken for "no match".

### Step 4: Validate the spike boundary and document only future work

Review the backlog against each selected species decision:

- `PROMOTE` should call out future hero, pricing, Calendly/booking, travel area,
  schema, and conversion-flow alignment;
- `KEEP_SECONDARY` should call out accurate constraints, contact-first routing,
  and consistency between selector/about/pricing without elevating the hero;
- `REMOVE` should call out future selector/configuration/image/about cleanup and
  redirects/SEO checks if new routes are ever involved.

These are backlog notes only. Do not edit or stage a production file. Run
Prettier only on the new decision record.

**Verify**: `yarn prettier --write docs/decisions/horse-cattle-offer.md && yarn prettier --check docs/decisions/horse-cattle-offer.md && changed="$(git status --porcelain=v1 --untracked-files=all | cut -c4- | sort)" && expected_record='docs/decisions/horse-cattle-offer.md' && expected_with_index="$(printf '%s\n%s' 'docs/decisions/horse-cattle-offer.md' 'plans/README.md' | sort)" && { test "$changed" = "$expected_record" || test "$changed" = "$expected_with_index"; } && git diff --check` →
format/check commands exit 0, the complete changed-path set contains only the
decision record plus an optional coordinator-owned status row, and the
whitespace check exits 0.

## Test plan

- This is a decision spike, so no application or E2E test is added.
- Machine-check the six required metadata fields, two valid decision tokens,
  exactly one `Q1` through `Q6` answer heading, and the absence of template
  placeholders.
- Verify the complete changed-path set, not selected production directories.
- Verification: the `rg`, Prettier, boundary, and whitespace commands above all
  meet their expected results.

## Done criteria

- [ ] The owner explicitly answered all six questions and selected exactly one
      of `PROMOTE`, `KEEP_SECONDARY`, or `REMOVE` for each species.
- [ ] `docs/decisions/horse-cattle-offer.md` contains `Status: VALIDATED`, owner
      role, ISO validation date, and a durable evidence reference.
- [ ] The record inventories the conflicting public claims with exact paths and
      stable symbols/claim fragments rather than drift-prone line ranges, and
      captures operational constraints without invented facts.
- [ ] The inventory command is rerun against the final integration candidate
      before `DONE`; every recorded path/symbol/claim still resolves after any
      parallel Plan 010 changes.
- [ ] Every follow-up item is marked `NOT AUTHORIZED BY THIS SPIKE`.
- [ ] Exactly one `Q1` through `Q6` heading exists and each has an explicit
      owner answer rather than a placeholder.
- [ ] The Step 3 fail-closed validation exits 0, including nonblank answer-body
      checks for Q1-Q6 and the case-insensitive generic/template placeholder
      rejection across metadata and answers.
- [ ] The complete porcelain status contains only
      `docs/decisions/horse-cattle-offer.md` plus the optional coordinator-owned
      `plans/README.md` status row.
- [ ] `yarn prettier --check docs/decisions/horse-cattle-offer.md` and
      `git diff --check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The current source inventory differs materially from Current state.
- Any path, symbol, or identifying claim recorded by this decision no longer
  resolves in the final integration candidate; refresh from source or stop for
  owner review if the public claim itself changed.
- The business/site owner is unavailable, declines to choose an option, or
  leaves any species, pricing basis, service radius, availability, or booking
  question unanswered.
- The only validation evidence would require committing private correspondence,
  personal customer data, a credential, or a secret.
- Either species lacks its own explicit decision token or operational answers.
- Anyone asks for production copy, pricing, Calendly, schema, image, or service
  area changes under this spike.
- The work requires touching any file outside Scope.

## Maintenance notes

- Revisit the decision when availability, travel radius, pricing, or booking
  operations change. Update the validation date and evidence reference rather
  than silently editing only public copy.
- A future implementation plan must cite this decision record and separately
  verify all affected acquisition, booking, pricing, schema, and analytics
  surfaces.
- Reviewers should reject the spike if it presents current source text as owner
  evidence or contains a production change disguised as documentation.
