# Quickstart: GuestFlow Phase 0

## Prerequisites

- `apps/guestflow` Node 20+, `npm install`
- Local SQLite (`data/guestflow.db`) or Turso env (do not apply prod migration without Grant)

## Migrate (idempotent)

```bash
cd apps/guestflow
node scripts/migrate-phase0-safety.js
```

Expected: tables `guest_contacts`, `draft_jobs`, `send_confirm_tokens` exist; `draft_source` column present; second run prints skip/already-exists and exits 0.

## Tests

```bash
cd apps/guestflow
npm test
```

Must include:

- send without `confirmToken` → 400, provider not called
- approved + token → 200 once
- same token again → 400
- drafts upsert: missing secret / `CRON_SECRET` rejected; dedicated secret updates `draft_source=llm`
- phone normalize: `0821234567` → `+27821234567`; garbage → null

## confirmToken curl (local, staff cookie)

```bash
# 1) Approve thread (existing PATCH)
curl -s -X PATCH http://localhost:3100/api/inbound/queue \
  -H 'content-type: application/json' \
  -d '{"threadId":1,"status":"approved"}'

# 2) Issue token after UI confirm
curl -s -X POST http://localhost:3100/api/inbound/confirm-token \
  -H 'content-type: application/json' \
  -d '{"threadId":1}'
# → {"success":true,"confirmToken":"..."}

# 3) Send with token
curl -s -X POST http://localhost:3100/api/inbound/send \
  -H 'content-type: application/json' \
  -d '{"threadId":1,"channel":"whatsapp","confirmToken":"<token>"}'

# 4) Reuse must 400
curl -s -X POST http://localhost:3100/api/inbound/send \
  -H 'content-type: application/json' \
  -d '{"threadId":1,"channel":"whatsapp","confirmToken":"<token>"}'
```

## Env

See `apps/guestflow/.env.example`:

- `DRAFT_WORKER_SECRET` — draft upsert only; **not** `CRON_SECRET`
- `CRON_SECRET` — Nightsbridge ingest only

Coding sets Vercel `DRAFT_WORKER_SECRET` after merge.

## HOLD

Resend inbound webhook dashboard remains HOLD. Email code path already uses `ingestInboundMessage`.
