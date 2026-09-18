# Quickstart: Daily Brief Enqueue (Blocker)

**Feature**: 003-daily-brief-staff-enqueue

## Staff workflow (current — PR #187 + this PR)

1. Log in → `/ops/daily-brief`
2. Select date → review brief
3. **Copy for WhatsApp** or download export
4. Human post to internal staff group (H11) — **no auto-send**

## Enqueue status

**Not available.** UI shows blocker reason. API returns `enqueueSupported: false`.

## Verify gate (CLI)

```bash
cd apps/guestflow
npm test -- src/lib/__tests__/daily-brief-enqueue.test.ts
```

## Verify API

```bash
curl -s "http://localhost:3000/api/daily-brief?tenant_id=1" | jq '.enqueueSupported, .enqueueBlocker'
```

Expected: `false` and a non-null blocker string.

## Unblock (future)

Grant approval required for new `staff_ops_drafts` table or approvals `type='staff_ops'` with copy-only approve (no guest Send).
