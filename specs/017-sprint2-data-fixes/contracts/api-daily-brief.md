# Contract: Daily brief (active guests only)

## `GET /api/daily-brief?tenant_id=&date=`

- Default `date`: Africa/Johannesburg today.
- Query bookings in `[date, date+1]` overlap **and** `ACTIVE_GUEST_BOOKING_SQL`.
- Select `status` and `guest_name`. Filter again in `buildDailyBriefSnapshot`.
- Each booking `propertyName` is `propertyDisplayName(resolvePropertyForSuite(...))` or `Property unknown – check suite`.
- Never emit `Property TBD`.
- Optional occupancy line: `ownerBlocksToday` count (not guest lists).
- Copy-only. No send.

## `POST /api/daily-brief/enqueue`

- Same booking query and snapshot rules as GET.
- Still enqueues `staff_ops_drafts` copy-only. No guest send.
