# Data Model: Sprint 2 Data Fixes

No new tables. No Production schema migration. This package only tightens how existing rows are read and when threads are created.

## bookings (NB SoR, unchanged shape)

| Field | Use in this package |
| --- | --- |
| `status` | Inactive when case-insensitive `cancelled` / `canceled` / `no show` |
| `guest_name` | Owner block when `upper(trim(guest_name)) = 'BLOCK'` (confirm with read-only count) |
| `suite_or_unit` / `room_number` | Input to lockbox suite match |
| `property_name` | Written on NB upsert only when resolver returns a property; displayed via resolver at read time |
| `check_in` / `check_out` | SAST date windows for brief and check-in |

**Validation**: `isActiveGuestBooking` = not cancelled and not owner block.

## property_access_codes (access-codes SoR)

| Field | Use |
| --- | --- |
| `code_type` | Property resolve uses `lockbox` rows with non-empty `suite` |
| `suite` | Matched with existing `suiteMatches` (prefix-strip + exact/contains). Not used to *choose* Cottage vs Main House |
| `property` | Sole Cottage vs Main House source: `cottage` \| `main-house` |
| `code_value` | Returned only after unique property resolve |

**Validation**: 0 matches, empty `property`, or >1 distinct `property` → unresolved.

## inbound_threads / inbound_messages (UMI)

| Rule | Behaviour |
| --- | --- |
| Create thread | Only when a real inbound or outbound message is stored |
| Inbox GET | SELECT only. No ensure-arriving, no hygiene writes |
| `needsAttention` | True only if ≥1 inbound message and no outbound at or after that inbound |
| Empty thread | `needsAttention` false. Cleanup script lists; does not delete |
| Codes unresolved | Reason string `codes: property unresolved` on the draft/thread; does not by itself create a thread |

## guest_tickets (live columns only)

Live create in `lib/db.ts`: `subject`, `description`, `guest_draft_reply`, `staff_brief`, `assigned_to`, `category`, `priority`, `status`, `guest_name`, …  
Do **not** read/write `problem_description`, `context_found`, `reason_stopped`, `suggested_next_step`, `metadata` unless they already exist (they do not on Turso).

Exceptions API maps live columns → page shape. `metadata` response is `{}`.

## properties

Demo seed rows (Riverside Lodge, Mountain View Suites, Coastal Retreat) must not be inserted. Dry-run script reports existing demo rows and FK counts (`rate_cards`, `bookings`, `inquiries`).

## State transitions

```text
Booking status: (NB ingest) → active | cancelled | (stored BLOCK placeholder)
Check-in inference: events? → arrived/in_house/late/checked_out ; else unknown (not late)
Property resolve: lockbox unique → cottage|main-house ; else unknown
Codes: resolved property → include SoR codes ; else omit + reason
Thread: message exists → create/update ; Inbox open → no write
Needs-attention: unanswered inbound → true ; empty → false
```
