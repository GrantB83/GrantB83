# Sprint 2 — Contact details (item E)

**Ritual removed:** hunting Nightsbridge, the A&D spreadsheet, and stay@ by hand to find a usable phone or email, then losing the Cove room on a multi-room booking.

**Use this week:** `/ops/bookings` Contact button, Inbox thread “Save contact”, guest portal “Confirm your contact details”. A&D ingest now keeps email (including Booking.com relays, flagged as relay).

## Precedence (per field)

| Rank | Source | When it writes |
| --- | --- | --- |
| 100 | Arrivals & Departures | Source of record. May refresh its own fields. |
| 80 | Staff entry | Booking or thread form. Never sent. |
| 60 | Guest self-fill | Portal form. Never sent. |
| 40 | Client report | Gap-fill only. |
| 20 | stay@ inbound | Unique name/ref/dates match. May replace an A&D *relay* with a direct sender. Never overwrites a direct A&D email. |

## Unchanged

- Outbound redirect stays ON until a separate CLEAR
- Approve&Send + confirmToken remain human
- No auto-send
- No Production Turso writes from this package

## Scripts (do not run against Production)

```bash
node apps/guestflow/scripts/migrate-sprint2-contacts.js --dry-run
node apps/guestflow/scripts/backfill-booking-contacts.js --dry-run
```
