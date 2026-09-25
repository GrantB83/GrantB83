# Data Model: Sprint 2 Contact Details

## Booking (existing, additive columns)

| Field | Type | Constraint | Notes |
| --- | --- | --- | --- |
| id | INTEGER PK | | |
| tenant_id | INTEGER | NOT NULL | |
| guest_name | TEXT | NOT NULL | Booker |
| nightsbridge_booking_id | TEXT | unique per tenant when present | Merge key for multi-room |
| suite_or_unit | TEXT | | Primary + merged extra rooms |
| extra_rooms | TEXT | | JSON string array of additional room names |
| check_in / check_out | DATE | NOT NULL | |
| guest_phone | TEXT | nullable | Current phone (E.164 when parseable) |
| guest_email | TEXT | nullable | Current email (lowercased) |
| guest_phone_source | TEXT | enum below | Per-field provenance |
| guest_email_source | TEXT | enum below | |
| guest_email_kind | TEXT | `direct` \| `relay` \| NULL | Relay domains from research SoR |
| status | TEXT | | BLOCK / cancelled excluded from gap checks |

## booking_contacts (new)

One row per booking. Mirrors current fields plus source refs for audit.

| Field | Type | Constraint |
| --- | --- | --- |
| booking_id | INTEGER PK/unique | FK bookings.id |
| tenant_id | INTEGER NOT NULL | |
| phone | TEXT | E.164 or NULL |
| phone_source | TEXT | provenance enum |
| phone_source_ref | TEXT | ingest batch / report / message id |
| email | TEXT | normalised or NULL |
| email_source | TEXT | provenance enum |
| email_kind | TEXT | `direct` \| `relay` \| NULL |
| email_source_ref | TEXT | |
| updated_at | DATETIME | |

## Provenance enum

`arrivals_departures` | `staff` | `guest` | `client_report` | `stay_at`

Rank: 100 / 80 / 60 / 40 / 20.

## guest_contacts (existing)

Unchanged CHECK: `nb` | `inbound` | `manual`. Mapped from provenance. Email-only rows allowed (no phone required). Retention 5 years after last stay.

## inbound_threads (existing)

Unique booking thread: `idx_umi_threads_booking` on `booking_id` where `thread_kind = 'booking'`. Multi-room MUST NOT create a second booking id, so it cannot create a second booking thread.

## Validation

- Phone: `normalizeZaE164`; reject if null after normalise
- Email: `normalizeEmail` plus RFC-lite (`local@domain.tld`); reject placeholders `noemail@`, `none@`, `test@`, `example.`
- Relay: domain list in `contact-provenance.ts` (see research)
- BLOCK guest names (exact `BLOCK` or prefix `BLOCK `) skip contact apply
- Never invent values

## State transitions (per field)

```
empty → any valid source
stay_at → client_report | guest | staff | arrivals_departures
client_report → guest | staff | arrivals_departures
guest → staff | arrivals_departures
staff → arrivals_departures
arrivals_departures → arrivals_departures (refresh only)
```

stay@ special: may replace `arrivals_departures` + `relay` with a *direct* sender; may not replace `arrivals_departures` + `direct`.
