# Feature Specification: GuestFlow Sprint 2 Data Fixes

**Feature Branch**: `cursor/sprint2-data-fixes-27a6`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: GuestFlow Sprint 2 items C, M, and N (Q dropped). Coding brief at the end of `GuestFlow-gap-point1-UMI-crosscheck.md`, plus Grant voice locks in `GuestFlow-Sprint-2.md` and the consolidated brief `03-gap-point1-fixes.md`. Keep both optional sub-items: check-in status `unknown` when there are no events, and UMI read-side BLOCK filter.

## Clarifications

### Session 2026-09-25

Locked by Grant voice (24 Sep 2026) and the assigned Cloud Agent brief. No guest PII, rates, or access codes were invented.

- Q: Is Rate Card Upload in this package? → A: No. Item Q retired it. Do not fix, move, or migrate `/api/rate-cards` or any rate-card surface.
- Q: Must both optional gap-point-1 sub-items ship? → A: Yes. Check-in with no events returns `unknown` (do not guess late-check-in). UMI read filters exclude owner BLOCKs.
- Q: How is Cottage vs Main House chosen when codes are included? → A: Only from the `property` field on that suite’s access-codes lockbox row. Never from suite-name substrings.
- Q: When may a conversation thread be created? → A: Only when a real inbound or outbound message exists. Opening the Inbox must not create threads.
- Q: What makes needs-attention true? → A: Only a thread with an unanswered inbound message. An empty thread is never flagged. A fail-closed codes miss also raises the reason `codes: property unresolved` on that draft/thread.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily brief and check-in show only real guests (Priority: P1)

Staff open the Daily Ops Brief (copy-only) and see today’s arrivals, in-house, and departures for **active guest stays only**. Cancelled bookings and owner-block placeholders do not appear as guests. Check-in status uses the Africa/Johannesburg date and does not treat cancelled or block rows as arrivals. When nobody has recorded a check-in event, the system does not guess that a guest is late.

**Why this priority**: Production currently counts cancelled stays and BLOCK placeholders as guests, so the staff copy-paste brief is wrong. That is the daily ritual this package removes.

**Independent Test**: Fixture the same date with one active guest, cancelled variants, a no-show, and an owner-block row. Confirm brief and enqueue list only the active guest. Confirm check-in status excludes the others, defaults to the Johannesburg date, and returns `unknown` (not late-check-in) when there are no events.

**Acceptance Scenarios**:

1. **Given** active, `cancelled`, `Cancelled`, no-show, and owner-block rows for the same date, **When** staff load the daily brief or enqueue a copy-only draft, **Then** arrivals, in-house, departures, missing-data, and empty-suite flags count and list only the active guest rows
2. **Given** those same rows, **When** staff request check-in status with no date, **Then** cancelled and owner-block rows are excluded and the default date is the Africa/Johannesburg calendar date
3. **Given** an active arrival with no check-in events, **When** check-in status is inferred, **Then** the status is `unknown` and late-check-in instructions are not claimed

---

### User Story 2 - Property is honest, never demo or guessed (Priority: P1)

When staff look at a booking’s property on the brief or related ops surfaces, they see Cottage (278 Blue Crane) or Main House (279 Blue Crane) only when the suite matches exactly one lockbox record. Otherwise they see an honest unknown. Cold starts no longer invent demo lodges. Future Nightsbridge upserts store a property name only when the lockbox resolver is certain.

**Why this priority**: Demo names and “Property TBD” train staff to ignore the field and risk sending the wrong gate.

**Independent Test**: Resolve a suite with one lockbox match, a prefixed Nightsbridge name, an ambiguous match, and a missing row. Confirm display names and the unknown string. Confirm demo lodge names are absent from default seed.

**Acceptance Scenarios**:

1. **Given** a suite that matches exactly one lockbox row, **When** property is resolved, **Then** the result is that row’s `property` field (`cottage` or `main-house`)
2. **Given** no lockbox row or more than one property match, **When** property is resolved, **Then** the result is unknown and the brief shows “Property unknown – check suite”
3. **Given** a Nightsbridge upsert, **When** the resolver is certain, **Then** the booking’s property name is stored; when it is not, the field stays empty
4. **Given** an empty properties table on startup, **When** default seed runs, **Then** Riverside Lodge, Mountain View Suites, and Coastal Retreat are not inserted

---

### User Story 3 - Owner blocks are never treated as guests (Priority: P1)

Owner-block placeholders stay in the booking book (Nightsbridge remains source of record) but never appear as guests in the brief, check-in status, welcome/late auto-drafts, arriving inbox threads, or “link to booking” candidates.

**Why this priority**: Treating a BLOCK as a booker creates empty guest threads and amber “missing phone” noise.

**Independent Test**: Confirm the BLOCK marker with a read-only count (counts only). Fixture a BLOCK row and an active guest. Confirm guest surfaces exclude the block and that the row can still exist in bookings.

**Acceptance Scenarios**:

1. **Given** the confirmed owner-block marker, **When** the brief, check-in status, Nightsbridge welcome/late auto-drafts, arriving-thread ensure, or link-candidate list runs, **Then** the block is excluded
2. **Given** an owner-block row in bookings, **When** Nightsbridge remains source of record, **Then** the row is still stored
3. **Given** owner blocks on the target date, **When** the brief summarises occupancy, **Then** it may show “Owner blocks: N” as a count line and never as a guest name

---

### User Story 4 - Exceptions load; the orphaned Today endpoint is gone (Priority: P1)

Staff open Exceptions under More Tools and see tickets. The old Today-board stats endpoint is removed and is not brought back.

**Why this priority**: Exceptions is a kept More Tools page that currently fails. The Today board was replaced by the inbox.

**Independent Test**: Query exceptions against the live ticket columns and update a ticket when the audit table is missing. Confirm nothing in the staff app still calls the Today stats endpoint.

**Acceptance Scenarios**:

1. **Given** the live ticket columns, **When** staff load Exceptions, **Then** the list returns successfully in the shape the page already expects
2. **Given** no audit table, **When** staff update an exception status, **Then** the status change still succeeds
3. **Given** a classification timeout or missing rate card on inbound, **When** a ticket is written, **Then** only live ticket columns are used
4. **Given** the inbox as staff home, **When** anyone requests the old Today stats endpoint, **Then** it is gone (not found). The Today board is not restored

---

### User Story 5 - Gate and lockbox codes follow the lockbox property only (Priority: P1)

Whenever a guest-facing or staff draft includes a gate or lockbox code (portal, staff brief, welcome / late check-in, tickets, templates, any send path), Cottage 278 vs Main House 279 is taken **only** from that suite’s lockbox `property` field. A suite whose name contains “cottage” but whose lockbox property is Main House gets Main House codes. If there is no row, no property, or more than one property, no codes are included and staff see `codes: property unresolved`.

**Why this priority**: Grant locked this as a hard precondition for later arrival drafts. Substring matching can send the wrong gate.

**Independent Test**: A fixture that mirrors the current lockbox SoR suites (three Cottage lockboxes, five Main House lockboxes, names already used in GuestFlow tests) resolves every suite. A suite named with “cottage” whose lockbox property is Main House returns Main House codes. A missing row returns no codes.

**Acceptance Scenarios**:

1. **Given** every suite in the lockbox SoR fixture, **When** codes are resolved, **Then** each suite gets that row’s property codes and no other property’s codes
2. **Given** a suite name containing “cottage” whose lockbox `property` is Main House, **When** codes are resolved, **Then** Main House codes are used
3. **Given** no lockbox row, **When** a draft or portal would include codes, **Then** the message is drafted without codes and the needs-attention reason is `codes: property unresolved`
4. **Given** any previous “does this name include cottage?” property pick, **When** this change lands, **Then** that pick is gone and the shared lockbox resolver is used instead

---

### User Story 6 - Opening the Inbox writes nothing (Priority: P1)

Staff open the Inbox (and any thread the Inbox opens) as a read-only view. Threads appear only when a real inbound or outbound message exists. Needs-attention is true only for an unanswered inbound. Empty auto-created threads are listed by a one-time cleanup script for human review; the script is not run on deploy.

**Why this priority**: Grant locked this as a precondition for alerts and scheduled drafts. Opening the Inbox must not invent work.

**Independent Test**: Open the Inbox against a fixture and assert zero database writes. An empty thread is not flagged. A real unanswered inbound is flagged. The cleanup script in dry-run lists empty threads and would clear false flags without deleting rows.

**Acceptance Scenarios**:

1. **Given** staff open the Inbox or a thread from it, **When** those reads complete, **Then** the database has no inserts, updates, or deletes from that open
2. **Given** a thread with zero messages, **When** needs-attention is computed, **Then** it is not flagged
3. **Given** a thread with an inbound and no later outbound, **When** needs-attention is computed, **Then** it is flagged
4. **Given** the one-time cleanup script, **When** it is run in dry-run, **Then** it reports false needs-attention on zero-message threads and lists empty auto-created threads without deleting them

---

### Edge Cases

- Cancelled spellings `cancelled`, `canceled`, `Cancelled`, and `no show` / `No Show` are all inactive.
- Owner-block marker is confirmed with a read-only count before coding; tests use the synthetic name `BLOCK` only.
- A suite string with a Nightsbridge prefix (for example “Cottage Suites - Falcon”) still matches the lockbox suite by the existing suite normaliser, but property still comes from the lockbox row, not the prefix.
- Two lockbox rows for the same suite on different properties is ambiguous → no codes, unknown property.
- Inbox hygiene (nudge / expire) and “ensure arriving threads” must not run on Inbox GET.
- Inbound webhook ticket inserts must not use columns that do not exist.
- Rate-card pages and `/api/rate-cards` are out of scope (retired).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Daily brief and daily-brief enqueue MUST count and list only active guest stays (not cancelled, not owner blocks) using Africa/Johannesburg dates.
- **FR-002**: Check-in status MUST use the same active-guest rule, default its date to Africa/Johannesburg today, and return `unknown` with no late-check-in claim when a booking has no check-in events.
- **FR-003**: A shared active-guest predicate MUST be the single rule for brief, enqueue, check-in, Nightsbridge welcome/late auto-drafts, and UMI booking read filters.
- **FR-004**: Property for display and for codes MUST come from the lockbox `property` field for that suite. Unknown if there is no single match. The string “Property TBD” MUST NOT appear.
- **FR-005**: Default seed MUST NOT insert demo properties (Riverside Lodge, Mountain View Suites, Coastal Retreat).
- **FR-006**: Nightsbridge upsert MAY store a property name only when the lockbox resolver returns a single property.
- **FR-007**: Owner blocks MUST remain stored as bookings and MUST NOT be treated as guests on comms or brief surfaces.
- **FR-008**: Exceptions list and update MUST use live ticket columns. Audit-log writes MUST be guarded. Inbound webhook ticket inserts MUST use live columns only. No schema migration in this package.
- **FR-009**: The orphaned Today stats endpoint MUST be removed. The old Today board MUST NOT be restored.
- **FR-010**: Whenever a gate or lockbox code is included, property MUST be resolved only from that suite’s lockbox record. Suite-name substring matching for property MUST NOT remain anywhere.
- **FR-011**: If lockbox property cannot be resolved uniquely, the system MUST include no codes and MUST set needs-attention reason `codes: property unresolved`.
- **FR-012**: GET Inbox and thread-open reads MUST be read-only. A thread MUST be created only when a real inbound or outbound message exists.
- **FR-013**: `needs_attention` / `needsAttention` MUST be true only for a thread that has an unanswered inbound message. Empty threads MUST NOT be flagged.
- **FR-014**: A one-time cleanup script MUST exist, default to dry-run, MUST NOT run on deploy, MUST clear false needs-attention on zero-message threads when applied, and MUST list empty auto-created threads without deleting them.
- **FR-015**: Dry-run scripts (property backfill, BLOCK count, inbox cleanup) MUST print counts only, never guest names, phones, or access codes.
- **FR-016**: Rate-card upload, `/api/rate-cards`, and rate-card migrations MUST NOT be changed.
- **FR-017**: Guest send, Approve&Send, confirm-token, outbound redirect, and WhatsApp From `+27600200825` MUST remain unchanged. No auto-send.
- **FR-018**: Tests MUST use synthetic fixtures only. Never invent or commit live codes or guest PII.

### Key Entities

- **Active guest booking**: A Nightsbridge stay that is not cancelled / no-show and is not an owner block.
- **Owner block**: A booking placeholder whose guest name matches the confirmed BLOCK marker. Occupancy only; not a booker.
- **Lockbox suite record**: The access-codes source of record for suite → property (`cottage` | `main-house`).
- **Resolved property**: The unique lockbox property for a suite, or unknown.
- **Conversation thread**: One comms thread per booking (booker). Created only when a real message exists.
- **Needs-attention**: Staff flag for an unanswered inbound, plus the fail-closed codes reason when property cannot be resolved.
- **Exception ticket**: A staff ticket stored in the live ticket columns.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a mixed fixture of active, cancelled, and owner-block stays, staff see 100% of listed “guests” as active guests and 0% of cancelled or block rows as guests.
- **SC-002**: Staff never see demo lodge names or “Property TBD” on the daily brief after this change.
- **SC-003**: Every suite in the lockbox SoR fixture resolves to exactly one property; a missing row yields no codes 100% of the time.
- **SC-004**: A suite whose name contains “cottage” but whose lockbox property is Main House receives Main House codes, not Cottage codes.
- **SC-005**: Opening the Inbox performs zero database writes.
- **SC-006**: Empty threads are never flagged needs-attention; a real unanswered inbound is flagged.
- **SC-007**: Exceptions load for staff without a failure; the old Today stats URL is gone.
- **SC-008**: Staff can use a correct copy-only daily brief the same week without re-counting cancelled or BLOCK rows by hand.

## Assumptions

- Nightsbridge remains the booking source of record. This package filters and labels; it does not invent stays.
- The owner-block marker is `BLOCK` as the guest name (case-insensitive, trimmed), confirmed with a read-only count. Tests use that synthetic marker only.
- Production lockbox shape used for the SoR fixture is the already-documented count: Cottage 1 gate + 3 lockboxes, Main House 1 gate + 5 lockboxes. Fixture suite strings are names already used in GuestFlow tests and Cottage Falcon notes (Falcon, Eagle, Crane, Trout, Robin, and three Main House suite labels already present in access-codes tests). They are not a live Production dump and contain no codes.
- Display names default to “Cottage (278 Blue Crane)” and “Main House (279 Blue Crane)” unless `PROPERTY_NAME_COTTAGE` / `PROPERTY_NAME_MAIN` are set.
- Parallel Sprint 2 packages (user management, contacts, WhatsApp) own their files. This package stays inside GuestFlow data-correctness, lockbox resolve, inbox read-only, Spec Kit docs, and the required STATUS / labour-ledger notes.
- Rate Card Upload stays retired. Missing-rate-card inbound tickets may still be written with live ticket columns; that is not a rate-card feature change.
- No Production Turso apply, no merge, no deploy, no guest send in this package.

## Ritual removed

Staff no longer re-count the daily brief by hand to strip cancelled stays and BLOCK placeholders, and they no longer open the Inbox just to watch empty threads appear.

## Artefact Grant can use this week

Preview Daily Ops Brief (copy-only) plus a correct Exceptions list, with lockbox-only code resolve on portal and welcome drafts. PR stays unmerged for GuestFlow Manager review.
