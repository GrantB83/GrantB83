# Research: Email Control Center & WhatsApp Web Bridge

## R1 — Outbound email transport

**Decision**: Reuse Resend HTTP API (`POST https://api.resend.com/emails`) via `lib/email.ts`, same pattern as `src/app/api/public/contact/route.ts`. From = `RESEND_FROM_EMAIL` only.

**Rationale**: Production already has `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (`noreply@guestflow.thebrowns.co.za`). Prompt forbids inventing From addresses. No new vendor.

**Alternatives considered**:
- SMTP fallback from contact route — incomplete and unused in production; skip for guest Send
- Queue email through `send_jobs` — Track A requires direct human-gated Resend Send so 07:00 mail actually leaves

## R2 — Inbound email webhook shape

**Decision**: Accept `POST /api/inbound/email` with (a) Resend `email.received` envelope and (b) a normalized `{ from, text, timestamp, source, subject, externalMessageId }` fixture. Auth via `Authorization: Bearer` or `x-webhook-secret` matching `RESEND_WEBHOOK_SECRET` or `INBOUND_WEBHOOK_SECRET`. When the event is metadata-only, fetch body from `GET https://api.resend.com/emails/receiving/{email_id}`. If body cannot be fetched, persist subject + `[body unavailable]` rather than dropping.

**Rationale**: Resend receiving webhooks omit body/attachments (serverless size). Coding cannot click the Resend dashboard; document the Production URL for CoS/Grant.

**Alternatives considered**:
- Only extend `/api/inbound/webhook` — mixed Twilio form-urlencoded + JSON already; a dedicated email route is clearer for the Resend dashboard
- Require Svix signature only — dashboard secret is `whsec_…`; we document Svix headers as optional follow-up; secret header satisfies the prompt and is testable without Svix SDK

## R3 — Shared inbound ingest

**Decision**: Extract persist + classify + draft from `webhook/route.ts` into `lib/inbound-ingest.ts`. Webhook (including `source: whatsapp_web`) and email route both call it.

**Rationale**: Prompt says reuse classifier/queue. Duplicating 400 lines would drift.

**Alternatives considered**: Internal HTTP from email route to webhook — extra hop and auth confusion.

## R4 — WhatsApp Web job queue

**Decision**: Table `send_jobs` with statuses `pending|queued|claimed|sent|failed|blocked`. Human confirm creates `queued`. Only `POST /api/bridge/jobs/:id/complete` with `{ status: sent|failed|blocked }` may set terminal success. Staff UI polls `GET /api/inbound/send-jobs/:id` (staff cookie). Bridge list/claim/complete use `BRIDGE_JOB_SECRET` or fallback `CRON_SECRET` / `INBOUND_WEBHOOK_SECRET`.

**Rationale**: Fail-closed: queue/pending ≠ success. Matches CoS clicker contract (Shift+Enter newlines, one bubble, QR/Aw Snap → `blocked`).

**Alternatives considered**:
- Mark sent in GuestFlow after Send click — forbidden by prompt
- Live Twilio/Meta — out of scope; do not convert `+27836458313`

## R5 — UI placement

**Decision**: Channel selector on inbound-queue thread detail and on Needs Approval **inbound** items only. Email: To/Subject/Body + confirm. WhatsApp Web: Interim badge + status poll. `staff_ops` UI block unchanged (copy-only, no Send).

**Rationale**: Mirror existing Approve & Send confirm dialogs. staff_ops is a hard gate from PR #189.

## R6 — Turso migration

**Decision**: `scripts/migrate-add-send-jobs.js` + `ensureSendJobsTable()` using `db.exec` (already statement-split). `CREATE TABLE IF NOT EXISTS` + indexes. Same pattern as `staff_ops_drafts`.

**Rationale**: Prompt requires Turso multi-statement-safe migrate like #186. Ensure-on-first-use keeps local/dev unblocked if Grant has not applied the script yet.

## R7 — Middleware

**Decision**: Skip staff cookie for `/api/inbound/email` and `/api/bridge` (secret-authenticated). Staff send + job poll remain behind staff auth.

**Rationale**: Resend and CoS cannot present `staff_auth`.
