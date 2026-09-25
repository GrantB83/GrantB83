# Research: Sprint 2 Staff Alerts and Nightsbridge Layered Sync

**Date**: 2026-09-25

## 1. Recipient source after user-management

**Decision**: Recipients are `staff_users.email` (normalised lowercase). `ALERT_FALLBACK_EMAIL` only when `COUNT(staff_users) = 0`. The reserved `legacy@guestflow.local` address is never an alert recipient.

**Rationale**: Grant's 18:27 CT change supersedes `ALERT_EMAIL_TO`. PR #215 stores login email on `staff_users` with no separate active flag — presence is membership.

**Alternatives considered**: Keep a comma-list env (withdrawn). Email the legacy reserved address (rejected — not a real inbox).

## 2. Guest redirect bypass

**Decision**: Add `skipRedirect?: boolean` (or `purpose: 'staff_alert'`) on `sendEmail`. Staff alerts set the flag. Guest `/api/inbound/send` does not. Contact-form already calls Resend directly; staff alerts go through the shared helper so From and logging stay consistent.

**Rationale**: Constitution I — staff mail is not a guest send. Redirect ON must not rewrite staff recipients to `grant830318@gmail.com`.

**Alternatives considered**: Call Resend from the evaluator without `sendEmail` (duplicates From/error handling). A second env From (rejected — From identity freeze).

## 3. Shared settings module

**Decision**: Pure module `ops-settings.ts` exporting frozen defaults (minutes, SAST hours, digest hour, 14h, 2h cooldown, 2-failure health, 50% mass-cancel, BBID 24299, timezone `Africa/Johannesburg`). Optional env overrides only for mailbox / URL / token *names*, not for inventing secrets. Evaluators and NB freshness both import this module.

**Rationale**: Spec FR-001. Prevents the 14h rule living in two files.

**Alternatives considered**: Database settings row (overkill; Grant did not ask for a UI). Scattered constants (rejected).

## 4. Dedupe and cooldown

**Decision**: Table `staff_alerts` unique on `(dedupe_key, recipient_email)`. `last_sent_at` gates the 2h cooldown. `resolved_at` set when the issue clears; a single resolved email may send if not already noted. Evaluator is idempotent: SELECT then insert-or-skip.

**Rationale**: Brief: one email per issue per recipient per 2h + resolved note.

**Alternatives considered**: In-memory last-send (lost on cold start). Per-issue only, not per-recipient (rejected — last handler vs all-users would collide).

## 5. Last handler

**Decision**: Additive `inbound_threads.last_handler_email`. Stamp on approve, successful Approve&Send, and link-to-booking using `getStaffSessionFromRequest`. Unanswered routing: if that email exists in `staff_users`, email only them; else all active users. Removed last handler → all remaining users.

**Rationale**: Brief: "user(s) who last handled thread (last approved/sent or linked); if none, all active users."

**Alternatives considered**: Parse `audit_log.actor` (display-name stamps are messy). New handler history table (unnecessary for v1).

## 6. Unanswered and SAST edges

**Decision**: Staff hours `[07:00, 21:00)` Africa/Johannesburg. Threshold 30 minutes from `last_inbound_at` when `pending_reply` and no later outbound/approved send. If the 30-minute instant is outside staff hours, hold for the 07:00 digest. Digest key `unanswered-digest:{yyyy-mm-dd}` lists overnight and after-hours items once.

**Rationale**: Matches the brief and listed edge tests.

**Alternatives considered**: Fire at 21:00 for late-afternoon inbounds (rejected — brief says overnight → 07:00 digest).

## 7. Site-down checker and published roster

**Decision**:
- `GET /api/health/deep` — `dynamic = force-dynamic`, `Cache-Control: no-store`, `SELECT 1` (or `SELECT COUNT(*) FROM tenants`) via `getDbAsync()`.
- Workflow `.github/workflows/guestflow-health-check.yml` every 10 minutes. Hits `GUESTFLOW_HEALTH_URL` (documented; default Preview/prod URL is not hardcoded as a secret).
- Consecutive failures stored in GitHub Actions variable `GUESTFLOW_HEALTH_FAIL_STREAK` (or a workflow cache file). Alert at streak === 2. Recovery email when streak resets after an alerted-down state.
- Because the app may be down, the workflow sends via Resend using existing secret *names* `RESEND_API_KEY` + `RESEND_FROM_EMAIL` and recipients from Actions variable `GUESTFLOW_ALERT_EMAILS` (published by the app) or `ALERT_FALLBACK_EMAIL`.
- App publish on user add/remove: GitHub API `PATCH/POST /repos/{repo}/actions/variables/{name}` using `GITHUB_ALERTS_TOKEN`. Optional Edge Config write if `EDGE_CONFIG` / `VERCEL_API_TOKEN` + `EDGE_CONFIG_ID` exist. If tokens are unset, publish is a logged no-op.

**Rationale**: Brief requires an external checker and a published list. Do not invent secret values.

**Alternatives considered**: Only Vercel cron (fails when the app is down). Store emails in a repo file (PII + stale). Hard-code Grant's inbox (superseded).

## 8. NB inbound path

**Decision**: Build against existing `POST /api/inbound/email`. If sender host is `nightsbridge.co.za` / `nightsbridge.com`, or subject matches a known NB pattern, hand off to L1 and **do not** call `ingestInboundMessage`. Also expose `POST /api/inbound/nb-email` (same shared secret) for a dedicated webhook later. Store `forwarding-noreply@google.com` bodies in `nb_email_raw` for forward-verification.

**Rationale**: User: ingest from stay@thebrowns.co.za on the existing Resend inbound path; GFM is confirming the hospitality.partners forward.

**Alternatives considered**: Only a new webhook (would miss stay@ mail that already hits `/api/inbound/email`). Gmail connector poll (out of scope; cost).

## 9. Parse and LLM fallback

**Decision**: Deterministic subject/body parsers for NEW_BOOKING, OTA_CANCELLATION, TRAVELIT_CONFIRMATION, PAYMENT, VCC_PROCESSING. Property gate: BBID 24299 or Browns name; ignore 18053/24847. LLM fallback is a function that runs only if `OPENAI_API_KEY` is set; otherwise `parse_failed` + alert. Card digits stripped before any optional LLM call.

**Rationale**: Templates are label/value tables. Fail-closed beats an invented booking.

**Alternatives considered**: Always-on LLM (cost + POPIA). Browser scrape (rejected by the NB spec).

## 10. Conflict matrix and mass-cancel

**Decision**: Implement `applyFieldWrite(field, incoming, incomingSource, incomingTime)` using the spec matrix. Soft-cancel disappeared rows only if cancelled count ≤ 50% of the window; otherwise `ROWDROP_GUARD` + alert, no cancels. Record `nb_sync_runs`.

**Rationale**: Spec L4.2 / L4.3. Current `softCancelDisappearedBookings` has no guard.

**Alternatives considered**: Rewrite the entire ingest route (too wide vs parallel PRs). Leave unguarded cancel (rejected).

## 11. Playwright batch job

**Decision**: Ship `scripts/nb-batch-reconcile.ts` + `.github/workflows/guestflow-nb-batch.yml` scheduled 03:00 and 17:00 UTC (05:00 / 19:00 SAST). Job logs in with `NB_USER` / `NB_PASS` (documented names only), downloads xlsx, POSTs existing ingest with `CRON_SECRET`. **Not run** in this agent. Dedicated login is an owner prerequisite.

**Rationale**: Spec L4. Agent must not hit live NB or Production Turso.

## 12. Parallel PR collision

**Decision**: Do not edit Inbox read-only behaviour, WhatsApp templates, delivery-status UI, or mobile CSS. Export `notifyFailedApproveSend` from `staff-alerts.ts` for the delivery-status PR. Last-handler column is additive.

**Rationale**: User: keep the diff focused.

## 13. Vercel Preview TypeScript

**Decision**: Do not set `typescript.ignoreBuildErrors`. Type bcrypt/session usage already fixed on the base branch (`b113d03`). New code must typecheck.

**Rationale**: Explicit Preview gate.
