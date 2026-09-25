# Quickstart: Sprint 2 Scheduled Arrival Drafts

Validation only. Do not send, merge, deploy, apply Production Turso, or submit WhatsApp templates.

## Prerequisites

- Repo at `apps/guestflow/`
- `npm ci` if `node_modules` is missing
- No Production `DATABASE_URL` writes

## Automated

```bash
cd apps/guestflow
npm run lint
npx tsc --noEmit
npm test
```

Expect green. Do not add `typescript.ignoreBuildErrors`.

## How scheduling works (short)

1. Johannesburg date + configured run hour decide whether a stage is due (`check_in + offset === today`).
2. Hourly GHA (Hobby fallback) and/or the daily Vercel cron hit `GET /api/cron/arrival-drafts` with `CRON_SECRET`.
3. The job upserts at most one unsent row per booking+stage, writes an editable UMI draft, sets Needs attention.
4. Staff Approve&Send + confirmToken. T-1 codes are re-read from the lockbox property resolver at send time.
5. Cron never sends.

See `apps/guestflow/docs/ARRIVAL-DRAFTS.md`.

## Script (do not run against Production)

```bash
# Local sqlite only; refuse Production Turso unless APPROVE APPLY MIGRATION
node apps/guestflow/scripts/migrate-arrival-drafts.js
```

## Preview smoke (after Preview is READY)

- `GET /api/cron/arrival-drafts` without secret → 401/500, never send
- Inbox GET still write-free
- Open a fixture booking thread on Preview only; confirm stage label + Needs attention; do not Approve&Send against live guests
