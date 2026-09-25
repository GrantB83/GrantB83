# Feature Specification: Sprint 2 Scheduled Arrival Drafts

**Feature Branch**: `cursor/sprint2-arrival-drafts-e256`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: GuestFlow Sprint 2 item G (Grant voice, 24 Sep 2026). Brief `04-scheduled-arrival-drafts.md`. Template names from `GuestFlow-WA-template-approvals.md`. Base: `cursor/sprint2-data-fixes-27a6` (lockbox property resolver M + read-only Inbox N + active-guest/BLOCK filters). Parallel: #218 WhatsApp window/templates, #219 contact presence.

## Clarifications

### Session 2026-09-25

Locked by Grant voice and the assigned Cloud Agent brief. No guest PII, rates, or access codes were invented.

- Q: May the hourly job send? → A: No. Cron creates editable drafts only. Guest send is manual Approve&Send plus a one-time confirm token. Cron must not send.
- Q: Where do gate/lockbox codes come from? → A: Only `resolveAccessCodesForSuite` from the lockbox property field (#221). Re-read at draft time and again at Approve&Send. Never typed or invented. Missing or unresolved → placeholder plus Needs attention.
- Q: What if there is no phone or email? → A: Do not create a guest-facing draft. Raise a Needs-attention “no contact” item instead.
- Q: What if a booking is already closer than T-3? → A: Create only stages still ahead. Do not backfill a stage whose due date has passed.
- Q: May this package submit WhatsApp templates? → A: No. No Meta/Twilio submissions. If the matching template is not yet WhatsApp-approved, mark the draft `template pending approval`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrival drafts appear on time in Johannesburg (Priority: P1)

An hourly Africa/Johannesburg job looks at active guest bookings and, when a stay is three days out, one day out, or arriving today, places an editable draft in that booking’s conversation with a stage label (T-3 / T-1 / Day-of) and marks Needs attention. Staff no longer write the same three pre-arrival messages by hand.

**Why this priority**: This is the ritual the package removes — Grant and Liana composing welcome, check-in, and day-of messages from memory every morning.

**Independent Test**: Freeze a Johannesburg calendar date and hour. Fixture active bookings due at T-3, T-1, and day-of. Run the job twice. Confirm three labelled drafts, Needs attention set, and the second run adds nothing.

**Acceptance Scenarios**:

1. **Given** an active guest booking whose check-in is exactly three Johannesburg calendar days after today and the run hour has been reached, **When** the job runs, **Then** a T-3 welcome draft exists on that booking’s conversation, labelled T-3, with stay dates, suite, portal link, and an ETA ask, and Needs attention is true
2. **Given** an active guest booking whose check-in is tomorrow in Johannesburg, **When** the job runs after the run hour, **Then** a T-1 draft exists that includes check-in instructions and access codes resolved from the lockbox property, or the fail-closed placeholder plus Needs attention when codes cannot be resolved
3. **Given** an active guest booking whose check-in is today in Johannesburg, **When** the job runs after the run hour, **Then** a Day-of reminder draft exists with check-in time, directions or portal link, and a reply-if-delayed line
4. **Given** the same bookings and a second job run the same day, **When** the job finishes, **Then** no duplicate booking+stage drafts exist

---

### User Story 2 - Staff Approve&Send with live codes (Priority: P1)

Staff open the conversation, edit the draft if they wish, then Approve&Send with a one-time confirm token. Access codes are re-read from the lockbox source of record at send time so a stale or invented code never goes to a guest. The job itself never sends.

**Why this priority**: Human-gated send is non-negotiable. Codes are the highest-risk fact in the T-1 message.

**Independent Test**: Create a T-1 draft with a known code snapshot. Change the lockbox code (or remove the property). Approve&Send. Confirm the outbound body uses the live resolve result or the fail-closed placeholder, never the stale snapshot.

**Acceptance Scenarios**:

1. **Given** a pending arrival draft, **When** staff Approve&Send with a valid confirm token, **Then** the existing send path runs and the job is not involved
2. **Given** a T-1 draft created when the lockbox held code A, **When** staff Approve&Send after the lockbox now holds code B, **Then** the sent body contains B and not A
3. **Given** a T-1 draft whose suite no longer resolves to a unique lockbox property, **When** staff Approve&Send, **Then** the codes section uses “code missing, ask staff” / “codes: property unresolved”, Needs attention stays true, and no invented code is sent
4. **Given** the hourly job, **When** it creates or updates drafts, **Then** no guest WhatsApp, email, or SMS is sent

---

### User Story 3 - Skip the wrong rows; recover from changes (Priority: P1)

Cancelled stays and owner BLOCK rows never get drafts. Bookings that appear after a stage’s due date only get later stages. A stay-date or suite change regenerates unsent drafts. A cancel discards unsent drafts. A booking with no usable phone or email gets a Needs-attention “no contact” item and no guest draft.

**Why this priority**: Wrong-row drafts recreate the Inbox noise Sprint 2 item N just removed.

**Independent Test**: Fixture cancelled, BLOCK, late-created, date-changed, cancelled-after-draft, and no-contact bookings. Run the job. Confirm skips, unique stages, regeneration, discard, and the no-contact item.

**Acceptance Scenarios**:

1. **Given** a cancelled booking and an owner BLOCK row, **When** the job runs, **Then** neither receives an arrival draft
2. **Given** a booking first seen two days before check-in, **When** the job runs, **Then** T-3 is not created and T-1 / Day-of still are when those due dates arrive
3. **Given** an unsent T-3 draft, **When** check-in or suite changes, **Then** the unsent draft is regenerated from the new fields and the old body is not left as current
4. **Given** an unsent arrival draft, **When** the booking becomes cancelled, **Then** that draft is discarded and is no longer the open draft
5. **Given** an active booking with no usable phone and no usable email, **When** the job would otherwise create a stage, **Then** a Needs-attention “no contact” item exists and no guest-facing draft body is stored

---

### User Story 4 - Channel and WhatsApp window (Priority: P2)

The draft’s channel is WhatsApp when a phone exists, otherwise email. If the WhatsApp 24-hour customer-care window is closed, the body is filled from the matching approved template. If that template is not yet WhatsApp-approved, the draft is marked `template pending approval` and still Needs attention. Staff can still edit.

**Why this priority**: First contact is usually outside the 24-hour window. Sending freeform WhatsApp then would fail; pretending a template is approved would also fail.

**Independent Test**: Fixture phone+open window, phone+closed window+approved template, phone+closed window+pending template, and email-only. Confirm channel, fill source, and pending mark.

**Acceptance Scenarios**:

1. **Given** a usable phone, **When** a stage draft is created, **Then** the channel is WhatsApp
2. **Given** no phone and a usable email, **When** a stage draft is created, **Then** the channel is email
3. **Given** WhatsApp and a closed 24-hour window and a matching approved template, **When** the draft is created, **Then** the body is a deterministic fill of that template
4. **Given** WhatsApp and a closed 24-hour window and no WhatsApp-approved matching template, **When** the job runs, **Then** the draft is marked `template pending approval` and Needs attention is true
5. **Given** any created draft, **When** staff open the conversation, **Then** they can edit the text before Approve&Send

---

### Edge Cases

- Johannesburg midnight: a clock instant that is still yesterday in UTC but today in Africa/Johannesburg must use the Johannesburg calendar date for due stages
- Johannesburg hour before the configured run hour: the job is a no-op for new drafts that day
- Late booking on the check-in date: only Day-of is created
- Booking whose check-in is already in the past: no stages are created
- Suite name containing “cottage” whose lockbox property is Main House: codes come from Main House, never from the name
- Missing lockbox row or ambiguous property: T-1 draft uses “code missing, ask staff” / “codes: property unresolved” and Needs attention
- Date change after send: sent drafts are left alone; only unsent drafts regenerate
- Unique booking+stage: a second job, or a second trigger (Vercel plus GitHub Actions), must not create a second open draft for the same pair
- Empty Inbox open: still must not create threads; this job may create a booking thread only because a real outbound draft or a no-contact attention item is being written
- Redirect (Decision L / OUTBOUND): this package keeps the current redirect behaviour on this base; the header toggle lands when that PR merges

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST run an idempotent arrival-draft job on an hourly Africa/Johannesburg cadence (or a documented daily Vercel plus hourly GitHub Actions fallback when the host plan rejects hourly)
- **FR-002**: Stage offsets and the Johannesburg run hour MUST live in one configuration file
- **FR-003**: The job MUST create at most one open draft per booking+stage for T-3 (welcome), T-1 (check-in + access codes), and Day-of (reminder)
- **FR-004**: T-3 text MUST include stay dates, suite, portal link, and an ETA ask, filled from booking fields with no language-model call (`browns_pre_arrival_welcome`)
- **FR-005**: T-1 text MUST include check-in instructions and access codes (`browns_checkin_instructions` + `browns_access_codes`)
- **FR-006**: Day-of text MUST include check-in time, directions or portal link, and a reply-if-delayed line
- **FR-007**: Access codes MUST come only from the lockbox property resolver (`resolveAccessCodesForSuite`). The job MUST NOT invent or accept typed codes as source of record
- **FR-008**: Codes MUST be resolved at draft time and re-read at Approve&Send. Unresolved or missing codes MUST use “code missing, ask staff” / “codes: property unresolved” and keep Needs attention
- **FR-009**: Each created guest draft MUST sit on the booking’s conversation, show the stage label, and set Needs attention
- **FR-010**: Guest send MUST remain Approve&Send plus a one-time confirm token. The job MUST NOT send
- **FR-011**: Channel MUST be WhatsApp when a usable phone exists, otherwise email
- **FR-012**: When the WhatsApp 24-hour window is closed, the system MUST fill the matching approved template; when that template is not WhatsApp-approved, the draft MUST be marked `template pending approval`
- **FR-013**: The job MUST skip cancelled bookings and owner BLOCK rows using the shared active-guest predicates
- **FR-014**: Late bookings MUST receive only stages whose due date is today or still ahead — never a backfilled past stage
- **FR-015**: A check-in, check-out, or suite change MUST regenerate unsent drafts for that booking
- **FR-016**: A cancel MUST discard unsent arrival drafts for that booking
- **FR-017**: No usable phone and no usable email MUST produce a Needs-attention “no contact” item and MUST NOT produce a guest-facing draft
- **FR-018**: Draft text MUST be a deterministic fill from booking fields; staff MAY edit before send
- **FR-019**: Johannesburg calendar date and hour MUST decide due stages, including midnight edges versus UTC
- **FR-020**: This package MUST NOT merge, deploy, write Production Turso, send to guests, or submit Meta/Twilio templates

### Key Entities

- **Arrival stage**: One of T-3, T-1, Day-of, with a configured day offset from check-in and a Johannesburg run hour
- **Arrival draft**: An unsent, staff-editable guest message for one booking+stage, with channel, stage label, fill source, and attention reason
- **No-contact attention item**: A staff-only Needs-attention record for a booking that has a due stage but no usable phone or email
- **Booking (source of record)**: Nightsbridge-mirrored stay with check-in, check-out, suite, status, and booker identity
- **Lockbox property resolution**: Cottage versus Main House taken only from the suite’s lockbox property field
- **WhatsApp window**: Open when the guest’s last inbound is inside 24 hours; otherwise closed
- **Approved WhatsApp template**: Named utility/marketing template that may or may not yet be WhatsApp-approved

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff find a labelled T-3, T-1, or Day-of draft waiting in the booking conversation on the Johannesburg morning that stage is due, without writing the first version themselves
- **SC-002**: Running the job twice on the same day does not create a second open draft for the same booking and stage
- **SC-003**: Cancelled stays and owner blocks produce zero guest-facing arrival drafts
- **SC-004**: A booking that appears after T-3’s due date never receives a T-3 draft and still receives later stages when those dates arrive
- **SC-005**: A T-1 Approve&Send after a lockbox change never sends the old code
- **SC-006**: A booking with no phone and no email never receives a guest-facing arrival draft and always shows a “no contact” Needs-attention item when a stage is due
- **SC-007**: A Johannesburg midnight crossing (UTC still yesterday) assigns stages using the Johannesburg date, not the UTC date
- **SC-008**: No guest message is sent by the job in any test or dry run

## Assumptions

- Base branch `cursor/sprint2-data-fixes-27a6` already has `isActiveGuestBooking` / `isOwnerBlock` and `resolveAccessCodesForSuite`
- #218 (WhatsApp window + templates table) and #219 (contact presence) may not be merged; this package implements matching resolver interfaces and documents “wire after #218/#219 merge” when their files cannot be imported cleanly
- Grant-approved template *names* are used; Meta/Twilio submission remains HOLD
- There is no Grant-approved WhatsApp template named for Day-of; a closed window on Day-of is marked `template pending approval` unless a later approved name is wired
- Hobby-tier hosts reject hourly Vercel cron; a daily Vercel cron at the configured run hour plus an hourly GitHub Actions fallback keeps Preview deployable
- Current outbound redirect behaviour on this base stays as-is until Decision L merges
- Portal links reuse the existing guest-token helper; no new magic-link product
- One conversation per booking remains the UMI rule; the job may write a real outbound draft or a no-contact attention item, and must not create empty threads on Inbox GET
- Check-in time in guest text is the existing published “from 14:00” line already used on welcome drafts — not an invented per-suite time
