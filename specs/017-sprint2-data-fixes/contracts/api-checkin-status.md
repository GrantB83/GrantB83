# Contract: Check-in status

## `GET /api/checkin-status?tenant_id=&date=&needs_late_checkin=`

- Default `date`: `johannesburgTodayIso()` (not UTC).
- Bookings: that calendar day’s check-ins, `isActiveGuestBooking` only.
- `checkinStatus` values: `unknown` | `not_arrived` | `arrived` | `in_house` | `late` | `checked_out`.
- No `guest_checkin_events` for a booking → `checkinStatus: 'unknown'`, `needsLateCheckinInstructions: false`.
- Do not invent ETAs or codes.
