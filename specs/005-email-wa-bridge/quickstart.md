# Quickstart: Email control center + WA Web bridge

## Prerequisites

- `apps/guestflow` dependencies installed
- Local SQLite (`data/guestflow.db`) or Turso env
- For live email only: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (do not print)
- For webhooks: `INBOUND_WEBHOOK_SECRET` and/or `RESEND_WEBHOOK_SECRET`
- For clicker: `BRIDGE_JOB_SECRET` (or reuse `CRON_SECRET` / `INBOUND_WEBHOOK_SECRET`)

## Validate (automated)

```bash
cd apps/guestflow
npm test
npm run build
```

Expected: new email send, inbound email, send-jobs, and bridge tests green; existing staff_ops copy-only tests still green.

## Local migrate (optional)

```bash
cd apps/guestflow
node scripts/migrate-add-send-jobs.js
```

Expected: `send_jobs` table + indexes. Idempotent.

## Email Send (staff)

1. Open `/ops/inbound-queue` or `/needs-approval` (inbound item, not staff_ops).
2. Choose Email. Edit To / Subject / Body.
3. Click Send → confirm dialog → only then POST `/api/inbound/send` `{ channel: "email", … }`.
4. Morning E2E (Grant): send a test to `grant830318@gmail.com`. Coding cannot click Resend dashboard.

## Inbound email

Production webhook URL to paste in Resend (NeedsGrant/CoS):

`https://guestflow.thebrowns.co.za/api/inbound/email`

Header: `Authorization: Bearer $RESEND_WEBHOOK_SECRET` (or `INBOUND_WEBHOOK_SECRET`).

## WhatsApp Web

1. Channel **Interim · WhatsApp Web** → Send → confirm → job `queued`.
2. UI polls `/api/inbound/send-jobs/:id`. Queued/claimed ≠ success.
3. CoS clicker: see `apps/guestflow/docs/WA-WEB-BRIDGE-CONTRACT.md`.
