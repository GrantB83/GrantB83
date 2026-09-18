# Quickstart: Staff Ops Copy-Only Daily Brief

## Prerequisites

- GuestFlow running locally (`npm run dev` in `apps/guestflow`)
- Bookings seeded or demo data present
- Migration applied: `node scripts/migrate-add-staff-ops-drafts.js`

## Flow

1. Open `/ops/daily-brief` — verify brief loads
2. Confirm `enqueueSupported: true` in GET `/api/daily-brief` response
3. Click **Enqueue draft** — note draft id in response
4. Open `/needs-approval` — see `Staff Ops Brief` item (type `staff_ops`)
5. Click **Approve** — verify Send button is hidden; use **Copy WhatsApp text**
6. Paste into internal staff WhatsApp manually (H11)

## Verify fail-closed

- No network call to `/api/whatsapp/send` during enqueue or approve
- `staff_ops` rows have empty guest phone

## Tests

```bash
cd apps/guestflow
npm test -- src/lib/__tests__/daily-brief-enqueue.test.ts
npm test -- src/lib/__tests__/staff-ops-drafts.test.ts
```
