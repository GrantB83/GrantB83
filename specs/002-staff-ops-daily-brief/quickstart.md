# Quickstart: Staff Ops Daily Brief

**Feature**: 002-staff-ops-daily-brief

## Prerequisites

```bash
cd apps/guestflow
npm install
npm run db:init
npm run seed:browns   # optional: Browns tenant + rate cards
# Or hit POST /api/demo/seed for demo bookings spanning today/tomorrow
```

## Run locally

```bash
npm run dev
# Opens http://localhost:3100
```

## Staff login

1. Visit `http://localhost:3100/staff-login` (skipped in dev if `STAFF_PASSWORD` unset)
2. Navigate to **Ops Hub** → **Daily Ops Brief** (`/ops/daily-brief`)

## Verify brief data

```bash
# Structured brief API
curl -s "http://localhost:3100/api/daily-brief?tenant_id=1" | jq '.success, .today.arrivals | length'

# With explicit date
curl -s "http://localhost:3100/api/daily-brief?tenant_id=1&date=2026-12-15" | jq .
```

## Verify export

```bash
curl -s -X POST http://localhost:3100/api/daily-brief/export \
  -H 'Content-Type: application/json' \
  -d '{"tenantName":"Browns","targetDate":"2026-12-15","bookings":[],"format":"text"}' \
  | head -20
```

## Unit tests

```bash
npm test -- src/lib/__tests__/daily-brief.test.ts
```

## Smoke tests

```bash
npm run smoke:ops
```

## Expected UX checks

- Page shows **Draft only — no auto-send** banner
- Today and tomorrow sections visible
- **Copy for WhatsApp** puts plain text on clipboard
- No "Send WhatsApp" or auto-send buttons
- Empty DB → empty state, not fake guests

## Production note

See `apps/guestflow/DEPLOY.md` — Daily Ops Brief section. Staff open `/ops/daily-brief` each morning; copy brief to internal WhatsApp group after human review. H11 approval required before any staff group post.
