# Quickstart: Sprint 2 Contact Details

## Prerequisites

- Repo root on `cursor/sprint2-contacts-1336`
- `apps/guestflow` dependencies installed (`npm install` in that app)
- No Production `DATABASE_URL` required for tests

## Validate

```bash
cd apps/guestflow
npx vitest run src/lib/__tests__/contact-provenance.test.ts \
  src/lib/__tests__/contact-apply.test.ts \
  src/lib/__tests__/client-report-parse.test.ts \
  src/lib/__tests__/stay-at-match.test.ts \
  src/lib/__tests__/arrivals-departures-parse.test.ts \
  src/lib/__tests__/multi-room-5667.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all listed tests pass; `tsc` reports no errors; `next.config.mjs` does not set `typescript.ignoreBuildErrors`.

## Scripts (do not run against Production)

```bash
# Preview only — default dry-run
node apps/guestflow/scripts/migrate-sprint2-contacts.js --dry-run
node apps/guestflow/scripts/backfill-booking-contacts.js --dry-run
```

Expected: printed SQL / row counts; zero writes. Scripts exit non-zero if `DATABASE_URL` looks like Turso and `ALLOW_TURSO_WRITE` is not set (it must stay unset).

## Manual staff path (Preview)

1. Import a synthetic A&D file on `/ops/nightsbridge-import`
2. Open `/ops/bookings` and confirm phone, email, and relay badge
3. Open Inbox thread for that booking and use the contact form (no Approve&Send)
4. Open the guest portal link and submit the self-fill form

No message should leave the redirect sinks.
