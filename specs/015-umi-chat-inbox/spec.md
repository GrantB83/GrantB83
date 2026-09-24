# Feature Specification: GuestFlow Unified Messaging Interface (UMI v2.1)

**Feature Branch**: `cursor/umi-v21-d18e`

**Created**: 2026-09-24

**Status**: Ready for planning

**Input**: Grant CLEAR 24 Sep 2026. Build source of record: UMI Product Spec v2.1 (24 Sep 2026) §§1–9. SoR wins on any conflict with launch-prompt summaries.

## Clarifications

### Session 2026-09-24

Recorded from SoR §6 TO VERIFY using locked proposals. No guest PII, rates, or inbox addresses were invented.

- Q: What is the “arriving first” window for inbox sort bucket 1? → A: Check-in today or tomorrow in Africa/Johannesburg (SAST).
- Q: When are unmatched temp threads nudged and expired? → A: Nudge after 48 hours with no booking link; expire (close, keep history) after 14 days still unlinked. Staff can still reopen/link.
- Q: What is spam/marketing fail-closed behavior? → A: Persist the inbound on the thread (or temp). Do not generate an LLM/heuristic auto-draft. Message remains visible to staff. Obvious junk is tagged spam/marketing.
- Q: Which Resend inboxes are in scope for inbound lift? → A: Only already-documented hospitality inboxes: `stay@thebrowns.co.za` (PROPERTY_EMAIL / guest ops), `stay@hospitality.partners` (Stay Bot login), and `grant@hospitality.partners` (hospitality login). Do not add new addresses. `stay@thebrowns.co.za` outbound From flip remains pending domain verify.
- Q: Which Twilio SMS sender is used on day one? → A: Same Twilio account / number family as the dedicated WhatsApp sender (`TWILIO_WHATSAPP_FROM` / Messaging Service). Use `TWILIO_SMS_FROM` only if already configured; do not buy a new number.
- Q: What is the retention rule in this Coding brief? → A: **5 years after last stay then delete** (already CLEARED PROPOSAL-v3 / Phase 0).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chat-first staff home with slim nav (Priority: P1)

Staff open GuestFlow and land on a WhatsApp-style chat inbox. Primary tools (inbox, arrivals/departures, bookings, ops) stay one click away. Secondary tools live under More Tools. The dedicated Needs Approval page is no longer in the top nav or ops primary list. Drafts and needs-attention live inside chat.

**Why this priority**: Voice lock on 24 Sep 2026 folded Phase-2 home/nav slim into this project. Staff cannot work a stay end-to-end if they still start on a crowded Today board and a separate approval page.

**Independent Test**: Sign in as staff on Preview. Confirm the first screen is the chat inbox. Confirm Needs Approval is absent from nav and ops primary. Confirm Arrivals & Departures, Bookings, and Ops remain reachable. Confirm More Tools still holds secondary packs.

**Acceptance Scenarios**:

1. **Given** a signed-in staff member, **When** they open the staff home URL, **Then** they see the chat inbox (thread list), not the old Today dashboard as the primary work surface
2. **Given** the slim nav, **When** they look at top nav and ops primary tools, **Then** Needs Approval is not listed
3. **Given** they need arrivals, bookings, or other ops, **When** they use primary links or More Tools, **Then** those existing tools still open and work
4. **Given** a guest draft exists, **When** they want to review it, **Then** they open the booking thread (or needs-attention filter), not a separate approvals page

---

### User Story 2 - One thread per booking, contact = booker (Priority: P1)

Each Nightsbridge booking has exactly one conversation thread. The contact is the booker. If one person books multiple rooms, staff communicate only with that booker about that stay/room. The thread header shows booker, suite/stay dates, booking id, and last channel.

**Why this priority**: This is the comms source of record. Today threads are keyed by sender + channel, which splits one stay across WhatsApp, email, and SMS.

**Independent Test**: Seed two bookings for the same booker phone and one unmatched number. Ingest a WhatsApp and an email from the booker of booking A. Confirm both land on booking A’s thread. Confirm booking B has its own empty-or-separate thread. Confirm the unmatched number is not attached to A or B.

**Acceptance Scenarios**:

1. **Given** a booking with a booker phone and/or email, **When** inbound arrives from that booker on any in-scope channel, **Then** it is appended to that booking’s single thread
2. **Given** one booker with two booking lines, **When** staff open comms, **Then** they see one thread per booking line, each about that stay
3. **Given** a thread, **When** staff view the header, **Then** they see booker name, suite/stay dates, booking id, and last channel — using only stored booking/contact facts
4. **Given** a co-guest who is not the booker, **When** inbound arrives from them, **Then** it does not auto-attach to the booker’s thread unless staff later links it

---

### User Story 3 - Inbox sort: arriving → pending replies → most recent (Priority: P1)

The inbox list is sorted in three buckets: (1) arriving guests (check-in today or tomorrow SAST), (2) pending replies (inbound newer than last outbound, or an open draft awaiting send), (3) everyone else by most recent activity.

**Why this priority**: Voice lock. Staff must see who is arriving and who is waiting before the rest of the chatter.

**Independent Test**: Fixture three threads — arriving tomorrow with no pending reply, a later stay with an unanswered inbound, and a past stay with recent outbound. Confirm list order is arriving, then pending, then recent.

**Acceptance Scenarios**:

1. **Given** threads in all three buckets, **When** staff open the inbox, **Then** arriving (today/tomorrow SAST) appear first, then pending replies, then the rest by most recent activity
2. **Given** a thread with an inbound newer than last outbound, **When** the list renders, **Then** it is in the pending-replies bucket (unless it also qualifies as arriving, in which case arriving wins)
3. **Given** an open unsent draft, **When** the list renders, **Then** that thread counts as pending reply

---

### User Story 4 - Auto-draft every inbound, hold for Approve&Send (Priority: P1)

Every inbound that is not filtered as spam/marketing gets an auto-draft. Staff review, edit, and Approve&Send in-thread. Nothing is sent automatically. Redirect sinks remain until a separate go-live CLEAR. Outbound default channel is the last inbound on that thread; staff may override. Every message shows a channel badge.

**Why this priority**: This is the labour cut: stop rewriting the same reply in three apps. Safety is unchanged from Phase 0.

**Independent Test**: Ingest a genuine guest inbound. Confirm a draft appears in-thread and no send occurred. Attempt send without approve+confirmToken and observe refusal. Confirm redirect mode still rewrites the recipient to the test sink when configured.

**Acceptance Scenarios**:

1. **Given** a non-spam inbound on a booking or temp thread, **When** ingest completes, **Then** an editable unsent draft exists on that thread and no WhatsApp, email, or SMS left the property
2. **Given** a spam/marketing inbound, **When** ingest completes, **Then** the message is stored and tagged, no auto-draft is generated, and staff can still see it
3. **Given** a draft, **When** staff Approve&Send with a valid confirmToken, **Then** the existing gated send path runs and respects `OUTBOUND_MODE=redirect`
4. **Given** last inbound was SMS, **When** staff compose, **Then** default outbound is SMS; they may override to WhatsApp Cloud or email
5. **Given** any message in the timeline, **When** staff view it, **Then** they see a channel badge (WhatsApp Cloud, WhatsApp Web observe, email, or SMS) and direction

---

### User Story 5 - Unmatched inbound becomes a linkable temp thread (Priority: P1)

Unknown phone or email creates a temporary thread. Staff use “Link to booking” once the booking exists. History merges; the temp closes. Auto-draft still runs after the spam filter. Stale temps are nudged at 48 hours and expired at 14 days.

**Why this priority**: Pre-booking WhatsApp and marketing-adjacent unknowns must not vanish, and they must not invent a booking.

**Independent Test**: Ingest from an unknown number. Confirm a temp thread and Link control. Create/import a booking with that phone. Link. Confirm messages now sit on the booking thread and the temp is closed. Confirm a 15-day-old unlinked temp is expired/closed with a hygiene flag.

**Acceptance Scenarios**:

1. **Given** inbound from a phone/email that matches no booking booker, **When** ingest completes, **Then** a temp thread keyed by that contact is created (or reused)
2. **Given** a temp thread and a later booking for that booker, **When** staff choose Link to booking, **Then** history merges onto the booking thread and the temp is closed
3. **Given** two possible bookings, **When** staff link, **Then** they must pick one; the system does not guess
4. **Given** a temp with no link for 48 hours, **When** hygiene runs, **Then** staff see a nudge in needs-attention
5. **Given** a temp still unlinked after 14 days, **When** hygiene runs, **Then** the temp is expired/closed; history is kept; staff may still link later

---

### User Story 6 - All four channels land in the same thread (Priority: P1)

WhatsApp Cloud (From +27600200825), WhatsApp Web observe (personal +27836458313, full bodies + one-time two-week backfill), inbound email (immediate, tagged source + sender), and SMS (Twilio, same account/family as dedicated WA) all appear on the correct booking thread or a temp. The same guest message seen on WA Web and Cloud API is stored once.

**Why this priority**: Split channels are the current ritual. Dedup prevents double drafts and double replies.

**Independent Test**: Post Cloud, Web (full body), email, and SMS fixtures for one booker. Confirm four channel badges on one thread. Post the same body via Web and Cloud with matching ids/fingerprint. Confirm one stored inbound. Run two-week Web backfill twice. Confirm idempotent counts.

**Acceptance Scenarios**:

1. **Given** a Cloud API inbound from the booker, **When** ingest completes, **Then** the full body appears on the booking thread with a WhatsApp Cloud badge
2. **Given** a WA Web observe inbound with a real body, **When** ingest completes, **Then** the full body is stored (not a metadata-only placeholder) with a WhatsApp Web badge
3. **Given** the one-time two-week WA Web backfill, **When** it is run once and again, **Then** pre-existing conversations in that window appear once
4. **Given** the same guest message observed on WA Web and Cloud API, **When** both paths ingest, **Then** only one inbound row is visible
5. **Given** an inbound email from a booker address, **When** the webhook fires, **Then** the email is on the booking thread immediately, with the first lines of the bubble showing source=email and the sender address
6. **Given** an inbound SMS from a booker mobile, **When** Twilio delivers it, **Then** it appears on that booking thread with an SMS badge
7. **Given** personal +27836458313, **When** any outbound is composed, **Then** From/observe identity is not converted to Cloud API; outbound From stays +27600200825

---

### User Story 7 - Needs-attention filter replaces the approvals page (Priority: P2)

A lightweight in-inbox filter shows threads that need staff action: open draft, unmatched temp, pending reply, stale-temp nudge, and former welcome / late-check-in / inbound draft types. Drafts exist only inside the thread. Welcome and late-check-in drafts are surfaced as in-thread drafts so they are not stranded when Needs Approval leaves the nav.

**Why this priority**: Voice lock. The separate page is the old ritual.

**Independent Test**: Seed an open draft, a temp, a pending reply, and a welcome draft. Enable needs-attention. Confirm all four appear. Confirm turning the filter off returns the full sorted inbox. Confirm `/needs-approval` is not required to finish guest work.

**Acceptance Scenarios**:

1. **Given** threads that need action, **When** staff enable the needs-attention filter, **Then** only those threads are listed
2. **Given** a welcome or late-check-in draft, **When** staff open that booking thread, **Then** the draft is editable in-thread with Approve&Send
3. **Given** staff_ops daily brief (copy-only), **When** they need to copy it, **Then** they still have a copy-only path that cannot Send to guests
4. **Given** no open action, **When** they enable the filter, **Then** they see an empty state, not an error

---

### Edge Cases

- Booker phone missing, email present: match on email only; do not invent a phone.
- Booker phone and email on different bookings: do not merge threads; staff link explicitly.
- Multi-room under one booker: one thread per booking line; do not fan out to co-guests.
- Unparseable phone: leave empty; treat as unmatched if no email match.
- Duplicate Cloud + Web with different external ids but same sender + normalized body + close timestamps: treat as one message.
- Backfill older than 14 days: ignore unless staff later expands scope.
- Redirect sinks missing while `OUTBOUND_MODE=redirect`: block send (fail-closed).
- Live mode without `OUTBOUND_LIVE_CLEAR=true`: block send.
- Spam that is actually a guest: staff can still reply from the stored message; no auto-draft does not hide the inbound.
- Temp link when target booking already has a thread: merge messages into the booking thread; do not create a second booking thread.
- Expired temp later matches a new booking: staff can still link; hygiene close is not a hard delete.
- SMS sender env unset: do not buy a number; inbound SMS still accepted; outbound SMS stays blocked with a clear staff message.
- `stay@thebrowns.co.za` outbound From not verified: keep existing `RESEND_FROM_EMAIL`; do not invent a From.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff home MUST be the chat inbox. Phase-2 nav slim MUST ship in the same change: primary tools reachable; secondary tucked under More Tools.
- **FR-002**: The dedicated Needs Approval item MUST be removed from top nav and ops primary tools. Guest drafts MUST be reviewed in-thread.
- **FR-003**: The system MUST maintain one conversation thread per booking. Contact MUST be the booker.
- **FR-004**: Thread header MUST show booker, suite/stay dates, booking id, and last channel, quoting only stored facts.
- **FR-005**: Inbox sort MUST be arriving (check-in today or tomorrow SAST) → pending replies → remaining threads by most recent activity.
- **FR-006**: Pending reply MUST include inbound newer than last outbound and any open unsent draft.
- **FR-007**: Every non-spam inbound MUST receive an auto-draft and MUST hold for human Approve&Send. The system MUST NOT auto-send WhatsApp, email, or SMS.
- **FR-008**: Spam/marketing MUST be filtered before auto-draft. Filtered messages MUST still be stored and visible. Fail-closed: when unsure, store without a draft rather than invent a reply.
- **FR-009**: Unmatched inbound MUST create or reuse a temp thread keyed by phone or email, with staff “Link to booking”.
- **FR-010**: Linking MUST merge history onto the chosen booking thread and close the temp. The system MUST NOT pick a booking when more than one candidate exists.
- **FR-011**: Temp hygiene MUST nudge at 48 hours unlinked and expire/close at 14 days unlinked, keeping history.
- **FR-012**: WhatsApp Web observe MUST store full message bodies and support a one-time two-week backfill that is idempotent.
- **FR-013**: WhatsApp Web and Cloud API MUST deduplicate the same guest message so it is not double-posted.
- **FR-014**: Inbound email MUST enter the booking (or temp) thread immediately, tagged at the top with source=email and sender address. In-scope inboxes are only those listed in Clarifications. Coding MUST NOT invent addresses. Dashboard webhook paste remains a CoS/Grant step; the product HOLD on ingest is lifted.
- **FR-015**: SMS MUST be available on day one via the existing Twilio account/family. Every message MUST show a channel badge. Outbound default MUST be last inbound channel, staff-overridable.
- **FR-016**: Official outbound/inbound WhatsApp From MUST remain +27600200825. Personal +27836458313 MUST remain observe-only.
- **FR-017**: `OUTBOUND_MODE=redirect` sinks MUST remain until a separate go-live CLEAR. Send MUST stay fail-closed.
- **FR-018**: Needs-attention in-chat filter MUST cover open draft, unmatched temp, pending reply, stale-temp nudge, and former welcome / late-check-in / inbound draft cases.
- **FR-019**: Welcome and late-check-in drafts MUST migrate into the booking thread so they are not stranded when the approvals page leaves the nav.
- **FR-020**: Guest comms and contacts MUST follow retention **5 years after last stay then delete**.
- **FR-021**: The system MUST NOT invent guest PII, rates, ETAs, or access codes. Missing data MUST be flagged for staff.
- **FR-022**: Nightsbridge remains booking SoR. UMI MUST NOT create or alter booking stay facts.
- **FR-023**: Multi-tenant / retail expansion and buying new Twilio numbers are out of scope.
- **FR-024**: Approve&Send MUST continue to require the existing human confirmToken gate on guest channels.

### Key Entities

- **Booking thread**: One comms record per booking line; contact is the booker; last channel and activity timestamps drive sort.
- **Temp thread**: Unmatched inbound keyed by phone or email; linkable; subject to nudge/expiry hygiene.
- **Message**: One inbound or outbound item on a thread, with channel badge, direction, body, optional sender address/source tag, and optional draft.
- **Draft**: Unsent suggested reply living only on its thread; origin heuristic, language-model, or human; never auto-sent.
- **Channel**: WhatsApp Cloud, WhatsApp Web observe, email, or SMS.
- **Booker contact**: Phone and/or email from Nightsbridge or prior inbound; retention 5 years after last stay.
- **Dedup key**: Identity used to treat Cloud + Web copies of one guest message as a single stored inbound.
- **Needs-attention state**: Derived flags (open draft, pending reply, unmatched, stale temp, welcome/late-check-in draft).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A staff member can open GuestFlow and complete review → edit → Approve&Send for a booking without visiting a Needs Approval page.
- **SC-002**: Given a mixed inbox fixture, 100% of threads appear in the arriving → pending → recent order defined in FR-005.
- **SC-003**: Inbound on WhatsApp Cloud, WhatsApp Web (full body), email (tagged), and SMS each appear on the correct booking or temp thread with the correct badge in a single staff pass.
- **SC-004**: A duplicate Cloud+Web inbound pair results in one visible guest message, not two.
- **SC-005**: Two-week WA Web backfill run twice yields the same thread/message counts (idempotent).
- **SC-006**: 100% of non-spam fixture inbounds receive a draft; 100% of those drafts remain unsent until Approve&Send; redirect mode still prevents guest-address delivery.
- **SC-007**: An unmatched inbound is linkable; after link, staff see one history on the booking thread.
- **SC-008**: Needs-attention filter surfaces every former Needs Approval guest-draft case used in fixtures (inbound, welcome, late-check-in).
- **SC-009**: Phase-2 slim nav is visible on first load: primary tools reachable, secondary tucked, Needs Approval absent from nav.

## Assumptions

- Staff already authenticate with the existing GuestFlow staff session.
- Nightsbridge arrivals & departures ingest continues at 05:00 and 19:00 SAST and remains the booking SoR.
- Phase 0 confirmToken + approve gate stays the send path; this feature does not weaken it.
- Phase 1 Ultra batch draft may still be unmetered; auto-draft MAY use the existing heuristic writer when the language-model worker is unavailable. Volume LLM re-PASS is a separate ops check, not a reason to skip heuristic drafts.
- `OUTBOUND_MODE` stays `redirect` in Production until a separate CLEAR. Preview verifies redirect, not live guest send.
- In-scope email inboxes are only those already documented (Clarifications). Resend dashboard webhook wiring is still a human paste; this feature lifts the product HOLD so any delivered webhook is ingested immediately.
- SMS uses the existing Twilio account. If no SMS sender is configured, inbound is stored and outbound SMS is refused with a staff-visible reason.
- Arrival window, temp hygiene, spam fail-closed, and retention language are the Clarifications above.
- Co-guest extra contacts are out of v2.1 unless staff later adds a contact (out of launch unless expanded).
- Autonomous send, multi-tenant, replacing Nightsbridge, and buying Twilio numbers are out of scope.

## Out of Scope

- Autonomous send without human Approve&Send.
- Multi-tenant / retail expansion.
- Replacing Nightsbridge as booking SoR.
- Buying new Twilio numbers.
- Converting personal +27836458313 to Cloud API.
- Flipping Production to live outbound without a separate go-live CLEAR.
- Inventing or verifying new From addresses (`stay@` domain verify remains pending).
