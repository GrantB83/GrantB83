# Feature Specification: Sprint 2 Staff Alerts and Nightsbridge Layered Sync

**Feature Branch**: `cursor/sprint2-alerts-nb-sync-6f9b`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: GuestFlow Sprint 2 items H (staff email alerts) and B (layered Nightsbridge sync). Alerts are internal staff emails to named users' login addresses, using the existing outbound mail setup, never guest sends. Recipients come from the users table; a fallback address is used only when no users exist. Alert on unanswered inbound (30 minutes during staff hours, overnight digest at 07:00 SAST), missed or failed Nightsbridge import (14 hours / batch error / zero rows / mass-cancel guard), failed Approve&Send (plus a hook later delivery-status work can call), and site-down after two consecutive deep health failures with a recovery note. Shared settings hold every threshold, hour, and cooldown. Layered Nightsbridge sync: email ingest from stay@thebrowns.co.za (fed by the stay@hospitality.partners forward, still being confirmed), gap detection, ordered gap-fill, twice-daily batch reconciliation, duplicate and conflict rules, provenance, and never overwrite a higher-precedence source. Unchanged: guest redirect, confirmToken, Approve&Send remains human, no auto-send, no guest sends, no Production database writes from this package.

**Base**: `cursor/staff-user-management-3989` (PR #215, users table with email login).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared settings and staff-only alert delivery (Priority: P1)

Staff need one place that defines when an issue is late, which hours count as staff hours, how long to wait before repeating an email, and how Nightsbridge freshness is judged. Internal alert mail goes only to login emails (or the fallback when the user list is empty). It never follows the guest outbound redirect. Removed users stop receiving immediately. Each issue is recorded with a dedupe key; the same person is not emailed again about the same open issue inside the cooldown; a resolved note is sent when the issue clears.

**Why this priority**: Every later alert and the 14-hour Nightsbridge rule depend on this shared clock and recipient list. Without it, alerts would drift or land on a hard-coded address.

**Independent Test**: Change a threshold in the shared settings and confirm unanswered, Nightsbridge, and health evaluators all read the new value. Resolve recipients for last-handler, all active users, fallback, and a removed user. Confirm a second send of the same issue to the same person inside the cooldown is suppressed, and a resolved note is recorded after the issue clears.

**Acceptance Scenarios**:

1. **Given** shared settings, **When** any evaluator reads hours, thresholds, or cooldown, **Then** it uses the single settings module (not a local copy)
2. **Given** one or more active users, **When** an alert is sent, **Then** only those users' login emails are recipients (per routing rules)
3. **Given** no users exist, **When** an alert is sent, **Then** only the fallback address receives it
4. **Given** a user was just removed, **When** the next alert is evaluated, **Then** that address is not a recipient
5. **Given** the same open issue and recipient, **When** the evaluator runs again inside the cooldown, **Then** no second email is sent
6. **Given** an open issue that later clears, **When** the evaluator runs, **Then** a resolved note is recorded for that recipient and issue
7. **Given** guest outbound redirect is ON, **When** a staff alert is sent, **Then** it still goes to the staff login (or fallback) address and not the guest test sink
8. **Given** an alert body, **When** it is composed, **Then** it contains no access codes and no payment text — guest first name, booking reference, and a staff link are enough

---

### User Story 2 - Unanswered inbound alerts and overnight digest (Priority: P1)

A guest writes in. If nobody has sent or approved a reply after 30 minutes during 07:00–21:00 SAST, the last person who handled that thread is emailed. If the thread has no last handler, every active user is emailed. Messages that arrive overnight wait for a single 07:00 SAST digest. Spam-filtered threads and staff/test threads are ignored.

**Why this priority**: This is the labour-cut: stop discovering a silent guest thread the next morning by accident.

**Independent Test**: Drive clock edges at 07:00 and 21:00 SAST, a 29-minute vs 30-minute wait, an overnight inbound that appears only in the 07:00 digest, last-handler vs all-users routing, and exclusion of spam and staff/test threads.

**Acceptance Scenarios**:

1. **Given** a real unanswered inbound at 10:00 SAST with no outbound or approved send, **When** 30 minutes have passed, **Then** an unanswered alert is due
2. **Given** the same inbound at 29 minutes, **When** the evaluator runs, **Then** no unanswered alert is due
3. **Given** an inbound at 21:05 SAST, **When** the evaluator runs before 07:00 SAST, **Then** no individual 30-minute alert is sent
4. **Given** overnight unanswered inbounds, **When** the clock is 07:00 SAST, **Then** one digest lists those threads
5. **Given** a thread whose last handler is an active user, **When** the unanswered alert is due, **Then** only that user is a recipient
6. **Given** a thread with no last handler, **When** the unanswered alert is due, **Then** every active user is a recipient
7. **Given** a spam-filtered or staff/test thread, **When** it sits unanswered, **Then** it is excluded

---

### User Story 3 - Nightsbridge missed-import and batch-failure alerts (Priority: P2)

If no successful Nightsbridge batch has finished within 14 hours of the last success (covering a missed 05:00 or 19:00 SAST run), every active user is emailed. The same blast goes out when a batch errors, parses zero rows, or trips the mass-cancel guard (row count drops by more than half). Thresholds come from the shared settings module.

**Why this priority**: A silent missed import is how arrivals disappear from GuestFlow. This is the safety net for item B's batch layer.

**Independent Test**: Last success 13h59 vs 14h00; a failed batch; a zero-row batch; a mass-cancel trip; all active users as recipients.

**Acceptance Scenarios**:

1. **Given** the last successful batch is 13 hours 59 minutes old, **When** the evaluator runs, **Then** no missed-import alert is due
2. **Given** the last successful batch is 14 hours old, **When** the evaluator runs, **Then** a missed-import alert is due to all active users
3. **Given** a batch that errors, returns zero rows, or trips the mass-cancel guard, **When** it finishes, **Then** all active users are alerted
4. **Given** a later successful batch, **When** the missed-import issue clears, **Then** a resolved note is due

---

### User Story 4 - Failed Approve&Send alert and later hook (Priority: P2)

When a staff member presses Approve&Send and the provider (current: Twilio / Resend) fails, that staff member is emailed. The send still requires a human confirm token. Nothing is auto-sent. A named hook is available so a later delivery-status package can raise the same alert for failed / undelivered / bounced without rewriting recipient rules.

**Why this priority**: Failed guest sends are invisible today. The hook keeps this package from colliding with the in-flight delivery-status PR.

**Independent Test**: Fail an Approve&Send as user A; confirm only A is emailed; call the hook directly with a later delivery-status style failure; confirm confirmToken and no-auto-send are unchanged.

**Acceptance Scenarios**:

1. **Given** user A pressed Approve&Send and the provider failed, **When** the failure is recorded, **Then** only A's login email is a recipient
2. **Given** the exported hook, **When** a later package calls it with a failed delivery, **Then** the same recipient and cooldown rules apply
3. **Given** a send attempt, **When** it succeeds, **Then** no failed-send alert is due
4. **Given** this feature, **When** staff send to a guest, **Then** Approve&Send remains a human click with a one-time confirm token and no auto-send

---

### User Story 5 - Site-down and recovery (Priority: P2)

An external scheduled check (every 5–10 minutes) hits a new uncached deep health endpoint that actually talks to the booking database. After two consecutive failures, all active users are emailed. When the check succeeds again, they get a recovery email. Because the app may be down, the checker uses an active-user email list the app publishes whenever a user is added or removed (Actions variable or Edge Config). Required tokens and environment names are documented; no secret values are invented.

**Why this priority**: A cached static health page currently lies. Two failures plus a recovery note is the agreed site-down contract.

**Independent Test**: One failure does not alert; two consecutive failures do; a later success sends recovery; published list updates on add/remove; missing publish token is a documented no-op, not a fabricated secret.

**Acceptance Scenarios**:

1. **Given** one failed deep-health check, **When** the next check has not yet failed, **Then** no site-down alert is due
2. **Given** two consecutive failed deep-health checks, **When** the second failure is recorded, **Then** a site-down alert is due to all active users (or the published list / fallback)
3. **Given** the site was down and a later check succeeds, **When** recovery is recorded, **Then** a recovery email is due
4. **Given** a user add or remove, **When** it succeeds, **Then** the published active-user email list is refreshed
5. **Given** no publish token is configured, **When** a user is added or removed, **Then** the app does not invent a secret and records that publish was skipped

---

### User Story 6 - Nightsbridge email-primary ingest (Priority: P1)

Nightsbridge property mail that lands on stay@thebrowns.co.za (once the hospitality.partners forward is confirmed) is ingested on the existing inbound-email path, classified, and applied to bookings by Nightsbridge reference. It never opens a guest conversation thread. Duplicates and older events are dropped or marked stale. Cancellations always win over an older new-booking. Payment mail is stored as a payment event with card digits stripped. Other-property mail and newsletters are ignored. The forwarder confirmation is a documented dependency, not a blocker for the parser.

**Why this priority**: Email is the minutes-scale source that replaces waiting for the twice-daily file.

**Independent Test**: Parse synthetic new-booking, cancellation, TravelIT, payment, and ignore samples; drop duplicate message ids and content hashes; apply out-of-order and cancellation-wins rules; confirm no guest thread is created.

**Acceptance Scenarios**:

1. **Given** a Browns new-booking notification, **When** it is ingested, **Then** a booking is created or updated by Nightsbridge reference and no guest thread is created
2. **Given** a cancellation for an existing reference, **When** it is ingested, **Then** the booking is marked cancelled from the email source
3. **Given** a repeat of the same message id or the same reference + type + content hash, **When** it arrives, **Then** it is recorded as duplicate and not re-applied
4. **Given** an older event after a newer one was applied, **When** it arrives, **Then** it is stale (except a cancellation, which still wins over an older new-booking)
5. **Given** payment mail, **When** it is stored, **Then** card digits are stripped and no booking field is overwritten from payment text
6. **Given** a sister-property or newsletter message, **When** it is classified, **Then** it is ignored
7. **Given** the hospitality.partners → stay@thebrowns.co.za forward is not yet confirmed, **When** staff read the ops note, **Then** they see that ingest is built on the existing inbound path and waits on that forward

---

### User Story 7 - Gap detection and ordered gap-fill (Priority: P2)

After each successful email upsert, phone, email, room, dates, and status are checked against a precise "missing" definition (empty, placeholder, intermediary, property-own, and relay-only). Gaps are logged. Fill order is: email notes (verbatim), latest report columns, GuestFlow history for the same normalised name, then staff entry. Guest self-fill is optional and not auto-sent. A later valid value never overwrites a staff-verified or guest-verified contact. Provenance is recorded.

**Why this priority**: Outreach stays blocked without a real phone; inventing one is forbidden.

**Independent Test**: Mark missing vs relay-only vs placeholder; fill from notes when the value appears verbatim; refuse an invented extraction; refuse overwrite of a verified contact; exhaust sources → staff needed.

**Acceptance Scenarios**:

1. **Given** a booking with an empty or placeholder phone, **When** gap detection runs, **Then** a missing-phone gap is open
2. **Given** a Booking.com relay email and a real phone, **When** gap detection runs, **Then** email is relay-only (not missing for outreach) and phone is not missing
3. **Given** a phone extracted from notes that appears verbatim and validates, **When** gap-fill runs, **Then** the phone is stored with provenance and the gap is filled
4. **Given** an extracted value that does not appear in the source, **When** gap-fill runs, **Then** it is rejected
5. **Given** a staff-verified or guest-verified contact, **When** a later email or report value differs, **Then** the verified value is kept and the other is recorded as an alternate
6. **Given** sources 1–4 are exhausted, **When** gap-fill finishes, **Then** the gap is marked staff-needed and nothing is auto-sent to the guest

---

### User Story 8 - Batch reconciliation, conflicts, and provenance (Priority: P2)

Twice-daily report reconciliation inserts missed bookings, applies explicit cancellations, refuses a mass disappear (more than 50% row drop) and alerts instead, and applies the field-level conflict matrix. A higher-precedence or verified source is never overwritten. Report wins dates/room/name/pax unless a newer email arrived after the last report. Email wins channel and amounts. Notes from email and report are stored separately. The 14-hour freshness alert uses the shared settings.

**Why this priority**: This is the safety net for missed emails and staff-side modifications that never produce mail.

**Independent Test**: Conflict-matrix cases; duplicate natural-key vs reference; mass-cancel guard; report-insert of a missed booking; provenance on the winning field.

**Acceptance Scenarios**:

1. **Given** a report row for a booking GuestFlow does not have, **When** reconciliation runs, **Then** the booking is inserted with report provenance
2. **Given** a report whose row count drops by more than half versus the prior window, **When** reconciliation considers soft-cancel, **Then** it does not mass-cancel and a guard alert is due
3. **Given** email dates older than the last report, **When** the report differs, **Then** report dates win
4. **Given** an email newer than the last report, **When** dates differ, **Then** the newer email wins until the next report
5. **Given** a staff-verified name or contact, **When** the report differs, **Then** the verified value is kept
6. **Given** two notes sources, **When** both exist, **Then** they are stored separately and not merge-overwritten
7. **Given** the same Nightsbridge reference arriving twice, **When** ingest or reconcile runs, **Then** the existing booking is updated, not duplicated

---

### Edge Cases

- Clock exactly 07:00:00 SAST and 21:00:00 SAST: 07:00 inclusive start of staff hours and digest; 21:00 exclusive end of staff hours
- Unanswered inbound at 20:45 SAST: 30 minutes later is 21:15, after hours → wait for 07:00 digest
- Last handler was removed: treat as no handler → all remaining active users
- Last handler email no longer matches any user: treat as no handler
- Legacy reserved login exists and no other users: fallback address is used (legacy reserved address is not an alert recipient)
- Two evaluators run at the same instant: at most one email per recipient per issue (idempotent)
- Deep health succeeds, then fails once, then succeeds: no site-down alert
- Deep health fails twice, then fails again inside cooldown: no second site-down email
- Forward-verification mail from Google: stored as raw inbound, not applied as a booking
- Sister-property booking id: ignored
- Required parse field missing: parse-failed + alert, no invented booking
- Zero-row batch after a previously healthy run: batch-error alert, not a silent success
- Natural-key collision across two Nightsbridge references: do not merge; keep both and log conflict
- Guest redirect ON must not rewrite staff alert recipients
- Alert body never includes lockbox/gate/wifi codes or card / deposit / payout amounts

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST keep every alert threshold, staff-hour boundary, digest hour, Nightsbridge freshness window, health failure count, mass-cancel ratio, and per-recipient cooldown in one shared settings module used by alerts and Nightsbridge sync
- **FR-002**: System MUST send staff alerts only to active users' login emails, except **FR-003**
- **FR-003**: System MUST send to the configured fallback address only when no users exist (or no eligible active user remains)
- **FR-004**: System MUST stop emailing a person as soon as they are removed
- **FR-005**: Unanswered routing MUST prefer the thread's last handler (last approved, sent, or linked user); if none or that user is gone, all active users
- **FR-006**: Failed Approve&Send MUST email only the user who pressed it
- **FR-007**: Nightsbridge missed-import, batch error, zero-row, mass-cancel, site-down, and recovery MUST email all active users (or fallback)
- **FR-008**: System MUST persist each alert attempt with a dedupe key and MUST apply a per-recipient per-issue cooldown from settings (default 2 hours) plus a resolved note when the issue clears
- **FR-009**: Staff alert mail MUST bypass the guest outbound redirect and MUST NOT be treated as a guest send
- **FR-010**: Alert bodies MUST include at most guest first name, booking reference, and a staff link (and a plain issue label). They MUST NEVER include access codes or payment text
- **FR-011**: An unanswered inbound with no outbound or approved send MUST alert after the unanswered threshold during staff hours in Africa/Johannesburg
- **FR-012**: Inbounds whose 30-minute mark falls outside staff hours, and inbounds that arrive overnight, MUST appear in one digest at the configured morning hour
- **FR-013**: Spam-filtered and staff/test threads MUST be excluded from unanswered alerts
- **FR-014**: A missed Nightsbridge batch MUST alert when the last successful batch is older than the shared freshness window (default 14 hours)
- **FR-015**: A batch that errors, parses zero rows, or trips the mass-cancel guard MUST alert all active users
- **FR-016**: System MUST expose a failed-send hook that later delivery-status work can call with the same recipient and cooldown rules
- **FR-017**: System MUST provide an uncached deep health check that touches the live booking database
- **FR-018**: An external scheduled checker MUST run every 5–10 minutes against that deep check and MUST alert after two consecutive failures, then send recovery on the next success
- **FR-019**: The app MUST publish/refresh the active-user email list on each user add and remove for the external checker; required token and environment names MUST be documented and MUST NOT be invented
- **FR-020**: An idempotent evaluator MUST run on a short schedule and MUST be safe to overlap
- **FR-021**: Nightsbridge property mail MUST be ingested from the existing inbound-email path aimed at stay@thebrowns.co.za and MUST NOT create guest conversation threads
- **FR-022**: Ingest MUST classify new-booking, OTA cancellation, TravelIT confirmation, payment (informational), virtual-card timing (informational), and ignore everything else, restricted to the Browns property
- **FR-023**: Ingest MUST drop seen message ids, mark same reference + type + content hash as duplicate, apply event-time ordering, let cancellation win over an older new-booking, and never delete a booking
- **FR-024**: After a successful email upsert, system MUST detect gaps using the missing/placeholder/intermediary/relay definitions and MUST fill from the ordered source list without overwriting verified or higher-precedence values
- **FR-025**: Twice-daily reconciliation MUST insert missed report rows, apply explicit cancellations, refuse a >50% disappear, apply the conflict matrix, and record provenance
- **FR-026**: Guest outbound redirect, confirm-token gate, human Approve&Send, and no auto-send MUST remain unchanged
- **FR-027**: This package MUST NOT send guest messages, MUST NOT write the Production database, MUST NOT run included migrations or scripts, and MUST NOT deploy
- **FR-028**: Tests MUST cover SAST threshold edges and overnight digest; dedupe/cooldown per recipient; recipient resolution (last handler, all users, fallback, removed user); Nightsbridge 14-hour rule; health failure/recovery; ingest parse; gap detection; reconciliation conflicts; and duplicates

### Key Entities

- **Shared ops settings**: Named numeric and clock values (staff hours, unanswered wait, digest hour, Nightsbridge freshness, cooldown, health streak, mass-cancel ratio, property id)
- **Staff user**: Login email from the users table; active while the row exists
- **Alert record**: Dedupe key, recipient, issue kind, last sent time, resolved time, cooldown identity
- **Thread last handler**: The last staff login email who approved, sent, or linked the thread
- **Nightsbridge email event**: Classified inbound property mail keyed by message id and reference
- **Nightsbridge sync run**: Email, batch, or targeted run with ok/error, row count, and code
- **Gap**: Per booking per field, kind (missing / relay-only / placeholder / intermediary), fill status, provenance
- **Booking provenance**: Per-field source and source reference so a later lower-precedence write is refused
- **Published alert roster**: Active login emails mirrored to the external checker

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: During staff hours, an unanswered real guest inbound produces a staff email no later than the unanswered threshold plus one evaluator interval
- **SC-002**: Overnight unanswered inbounds produce exactly one digest per recipient at the morning hour, not a 30-minute drip
- **SC-003**: The same recipient does not receive a second email for the same open issue inside the cooldown window
- **SC-004**: A removed user receives zero further alerts
- **SC-005**: A missed batch older than the freshness window, or a failed / zero-row / mass-cancel batch, emails every remaining active user
- **SC-006**: Two consecutive deep-health failures produce a site-down email; the next success produces a recovery email
- **SC-007**: Staff can open the booking or thread from the alert using only first name, reference, and link — no codes or payment text appear
- **SC-008**: A Browns new-booking email becomes a GuestFlow booking without opening a guest thread
- **SC-009**: A duplicate email or duplicate report row does not create a second booking for the same Nightsbridge reference
- **SC-010**: A verified contact or higher-precedence field survives a later lower-precedence update
- **SC-011**: Guest redirect, confirm token, and human Approve&Send still behave as they do today

## Assumptions

- Staff login emails come from the users table added in PR #215; this package opens against that branch
- `ALERT_FALLBACK_EMAIL` is the only leftover address env; the earlier comma-list `ALERT_EMAIL_TO` is withdrawn
- The reserved legacy login address is not an alert recipient
- "Active user" means a current row in the users table (no separate active flag in #215)
- Last handler is the last staff login email recorded on approve, successful send, or link-to-booking
- Staff/test exclusion: spam-flagged messages; threads whose peer address is a staff login, the reserved legacy login, or the known guest-redirect test sinks
- stay@hospitality.partners → stay@thebrowns.co.za forward is owned by GFM and may still be pending; ingest is built against the existing inbound-email path
- Modification and staff-cancellation emails remain unconfirmed; the batch layer is the source for those changes until samples exist
- Arrivals & Departures "Booking ID" may differ from the email NB reference; both identifiers are stored and linked on first confident match
- Guest self-fill portal send is out of scope for this package (no guest send)
- Targeted extra Nightsbridge logins (source 3) are specified and scripted but not run
- LLM fallback for a failed deterministic parse is optional and fail-closed: if unavailable, the event is parse-failed plus alert
- Parallel Sprint 2 packages (data fixes, contacts, WhatsApp, delivery status, mobile) own their files; this package exposes the failed-send hook and does not implement delivery badges
- Migrations and scripts ship in the PR and are not executed against Production
- Time zone for all hours in this feature is Africa/Johannesburg

## Ritual removed

Staff no longer discover a silent guest thread or a missed 05:00/19:00 Nightsbridge import by opening the inbox and the import page themselves. Artefact Grant can use this week: the 'what alerts and when' note plus the settings module defaults (30 minutes / 07:00–21:00 SAST / 14 hours / 2-hour cooldown / 2-failure site-down).
