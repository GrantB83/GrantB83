# Contract: GET/POST `/api/cron/arrival-drafts`

Idempotent arrival-draft job. Never sends. Never writes Production unless an operator later runs the unused migration with a separate OK.

## Auth

Accept either:

- `Authorization: Bearer $CRON_SECRET`
- `x-cron-secret: $CRON_SECRET`

If `CRON_SECRET` is unset → 500. If provided secret mismatches → 401.

## Query

| Param | Meaning |
| --- | --- |
| `tenant_id` | Default 1 |
| `now` | Optional ISO timestamp for tests / dry clocks. Production cron omits this. |

## Behaviour

1. Ensure `arrival_drafts` schema (additive).
2. If Johannesburg hour < configured `runHourSast` and `now` is not forcing a test past that hour → `{ ok: true, skipped: "before_run_hour" }` with no new drafts.
3. Load candidate bookings with check-in from today through today+max(|offset|) (inclusive). Filter with `isActiveGuestBooking`.
4. For each booking+due stage (due date == today SAST):
   - Cancelled/BLOCK already excluded.
   - No contact → upsert attention row, no `draft_body`.
   - Else fill deterministic body, resolve codes for T-1, choose channel, apply window/template rules, upsert unique booking+stage, write UMI draft on the booking thread, set Needs attention.
5. For existing unsent rows whose booking is now cancelled → `discarded`.
6. For existing unsent rows whose fingerprint changed → regenerate or discard if the stage is no longer due.

## Response 200

```json
{
  "ok": true,
  "timezone": "Africa/Johannesburg",
  "todaySast": "2026-09-27",
  "hourSast": 6,
  "created": 0,
  "updated": 0,
  "discarded": 0,
  "skipped": 0,
  "noContact": 0,
  "unresolvedCodes": 0
}
```

`skipped` may be the string `"before_run_hour"` or a numeric count of booking+stage pairs left unchanged.

## Non-goals

- No guest send
- No Turso Production migrate
- No Meta/Twilio template submit
