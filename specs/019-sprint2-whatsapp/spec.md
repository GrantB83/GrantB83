# Feature Specification: Sprint 2 WhatsApp Window, Templates, and Property Knowledge

**Feature Branch**: `cursor/sprint2-whatsapp-12b6`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: GuestFlow Sprint 2 items F (F1–F4) and P. Brief `02-wa-templates-24h-window.md` plus UPDATE. Tracker `GuestFlow-WA-template-approvals.md` (all 7 templates Grant-APPROVED 24 Sep 2026; submission HOLD). Base `main@a224cf5`. Parallel Sprint 2 PRs (user-mgmt, data fixes including a shared lockbox-property resolver, contacts) are in flight — this package stays focused.

## Clarifications

### Session 2026-09-25

Recorded from the Coding brief and Grant voice locks. No guest PII, rates, or live codes were invented.

- Q: What opens the 24h customer-care window? → A: The guest’s last **inbound** on official WABA `+27600200825` (Twilio Cloud). WhatsApp Web observe messages on the personal number do **not** open it.
- Q: When does the composer force template mode? → A: When the window is closed **or** will close within about 5 minutes. The confirm dialog also warns in those cases.
- Q: When does the server refuse a send? → A: WhatsApp Cloud free-text outside the open window returns 409 and must not call Twilio. Email and SMS are unaffected. Closing-soon (still open) is a UI warning only.
- Q: Which templates may the picker show? → A: Only templates WhatsApp has **APPROVED**. Grant-approved but unsubmitted copy is stored and **must not** appear in the picker. UI must say so.
- Q: May this package submit templates? → A: **No.** No Meta / WhatsApp Business / Twilio Content API create or approval calls. Read-only fetch only. A submit script may exist behind `--i-have-grant-go-ahead` and **must not be run**.
- Q: How are access codes filled? → A: From the existing access-codes source of record. Property comes from the lockbox record’s `property` field. If that field cannot be resolved, include **no codes**. Never infer property from suite-name substrings. A shared resolver belongs to the data-fixes PR — do not duplicate that rewrite here.
- Q: What may the knowledge base seed? → A: Only facts already in the repo (existing guest-facing copy, `.env.example` defaults used by live GuestFlow, portal house rules). Do not invent restaurants, amenities, or distances. Unknowns stay empty or “ask staff”.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff see the WhatsApp 24h window on each thread (Priority: P1)

A staff member opens Inbox and selects a booking thread. The thread header and the composer show whether the official WhatsApp Cloud customer-care window is open or closed. If open, they see how long remains (`Window open, closes in Xh Ym`). If closed, they see `Window closed`. The inbox list shows a small closed or closing-soon mark so they can scan without opening every thread. WhatsApp Web observe traffic never makes a closed window look open.

**Why this priority**: Staff currently cannot tell when free-text WhatsApp will fail. That is the daily labour of guessing and rewriting.

**Independent Test**: Fixture a thread whose last Cloud inbound is 23h 50m ago, one whose last Cloud inbound is 24h 1m ago, one with only WhatsApp Web inbound, and one with no WhatsApp inbound. Confirm badges and list indicators match. Confirm a Web-only thread stays closed.

**Acceptance Scenarios**:

1. **Given** a thread whose last guest inbound on WABA `+27600200825` (Twilio Cloud) is 10 hours ago, **When** staff open the thread, **Then** header and composer show `Window open, closes in 14h 0m` (remaining time within one minute of truth)
2. **Given** a thread whose last Cloud inbound is 24 hours 1 minute ago, **When** staff view header and composer, **Then** both show `Window closed`
3. **Given** a thread whose only inbound is a WhatsApp Web observe message, **When** staff view the thread or inbox row, **Then** the window is closed and no open badge appears
4. **Given** several threads, **When** staff scan the inbox list, **Then** closed threads show a closed indicator and threads closing within about 5 minutes show a closing-soon indicator
5. **Given** a Cloud inbound timestamp stored in UTC while staff work in Africa/Johannesburg, **When** remaining time is calculated, **Then** the 24h edge is measured in absolute elapsed time (not calendar-day local midnight)

---

### User Story 2 - Free-text WhatsApp is blocked when the window is closed (Priority: P1)

When the window is closed, or will close within about 5 minutes, the composer switches to template mode and the Approve&Send confirm dialog warns staff. If they still try to send WhatsApp Cloud free-text after the window is closed, the server refuses with 409 and does not call Twilio. Email and SMS Approve&Send keep working. The old comment that Twilio has no 24h restriction is corrected. Approve&Send, confirmToken, and outbound redirect stay unchanged.

**Why this priority**: A silent Twilio failure after Approve&Send wastes Grant’s time and can look like a send to the guest.

**Independent Test**: Approve&Send WhatsApp free-text on a closed-window thread and confirm 409 with no Twilio call. Repeat for email and SMS on the same thread and confirm they send (or queue) as today. Repeat WhatsApp free-text with the window still open and confirm the existing send path runs.

**Acceptance Scenarios**:

1. **Given** a WhatsApp Cloud thread with a closed window, **When** staff Approve&Send free-text, **Then** the confirm dialog warns that the window is closed and the composer is in template mode
2. **Given** a WhatsApp Cloud thread that will close within about 5 minutes, **When** staff prepare to send, **Then** the confirm dialog warns and the composer is in template mode, and a free-text send is still allowed by the server until the window is actually closed
3. **Given** a closed window and a WhatsApp Cloud free-text send request, **When** `/api/inbound/send` runs, **Then** it returns 409, does not call Twilio, and does not consume a send as a successful Twilio delivery
4. **Given** the same closed window, **When** staff Approve&Send email or SMS, **Then** those channels are unaffected by the WhatsApp window guard
5. **Given** staff read the WhatsApp send notes, **When** they look for the old “Twilio does not have this restriction” claim, **Then** it is gone and the notes state that Twilio WhatsApp still requires an approved template outside the 24h window

---

### User Story 3 - Staff send Grant-approved templates only after WhatsApp approval (Priority: P1)

GuestFlow stores the seven Grant-approved template bodies (final text from the 24 Sep tracker, with `browns_review_request` review link already static). Status is Grant-approved but unsubmitted, with no Content SIDs. The composer picker shows **only** templates WhatsApp has approved, so the picker is empty until Grant’s later submission. The empty state says that clearly. When a WhatsApp-approved template exists, variables are pre-filled from the booking and the access-codes source of record; staff may edit them; send uses Content SID plus variables; redirect still applies; Approve&Send and confirmToken stay the same. A read-only sync can refresh approval status from Twilio Content (fetch only). A separate submit script exists behind an explicit flag and is not run.

**Why this priority**: Outside the window, templates are the only legal guest WhatsApp path. Showing unsubmitted copy in the picker would invite a failed send.

**Independent Test**: Seed the seven templates as unsubmitted. Open the picker and confirm it is empty with an explanation. Mark one fixture as WhatsApp-approved and confirm only that one appears. Fill variables from a booking whose lockbox row has `property=main-house` even if the suite name contains “cottage”; confirm Main House codes. Fill a booking with no lockbox property; confirm no codes. Confirm send payload is ContentSid + ContentVariables when a template is chosen.

**Acceptance Scenarios**:

1. **Given** the seven Grant-approved templates seeded with final text and status `approved_by_grant_unsubmitted` (no SIDs), **When** staff open the template picker, **Then** none appear and the UI states they are waiting for WhatsApp approval / Grant’s submit go-ahead
2. **Given** a template whose WhatsApp approval status is `approved`, **When** staff open the picker, **Then** only that approved template is listed
3. **Given** a booking with a lockbox row whose `property` field is set, **When** staff pick a template that needs codes, **Then** variables pre-fill from that property’s access-codes SoR and staff can edit them before Approve&Send
4. **Given** a suite whose lockbox row has no usable `property` field, **When** codes are filled, **Then** code variables are empty / ask-staff and no suite-name substring matching is used to pick Cottage vs Main House
5. **Given** staff Approve&Send a WhatsApp-approved template, **When** the send runs, **Then** Twilio is called with ContentSid and ContentVariables (not free-text Body), confirmToken is still required, and outbound redirect still applies
6. **Given** a read-only approval sync, **When** it runs, **Then** it only fetches Twilio Content / approval status and never creates or submits templates
7. **Given** the submit script, **When** it is invoked without `--i-have-grant-go-ahead`, **Then** it exits without calling create/approval endpoints; the script is not executed in this package

---

### User Story 4 - Draft replies use a staff-editable property knowledge base (Priority: P2)

Staff can edit a property knowledge section in GuestFlow, in the same spirit as the access-codes source of record. It covers local recommendations, per-suite/property amenities, house rules, check-in/out times, and contact escalation. The LLM draft-reply context includes this knowledge and an instruction that drafts must not state facts that are not in the knowledge base and must say “ask staff” for gaps. Seed values come only from real in-repo sources. Unknown fields stay empty or “ask staff”. A 10-question eval fixture exists for GuestFlow Manager spot-check. Approve&Send remains human.

**Why this priority**: Mid-stay guests will ask for the help the mid-stay template offers. Invented restaurants or amenities become guest-facing errors.

**Independent Test**: Open the knowledge page, edit one empty field, confirm it persists. Generate a draft prompt for a question about an unknown restaurant; confirm the assembled prompt includes the knowledge block and the no-invent instruction, and does not add facts that are not in the knowledge base. Walk the 10-question fixture as a GFM checklist.

**Acceptance Scenarios**:

1. **Given** signed-in staff, **When** they open the property knowledge section, **Then** they can view and edit the same categories listed above, grouped per property where relevant
2. **Given** an inbound that will receive an LLM draft, **When** the draft prompt is assembled, **Then** it includes the current knowledge text plus an instruction not to state facts outside that text and to say “ask staff” for gaps
3. **Given** a guest question about a fact that is not in the knowledge base, **When** the prompt-level guard is checked, **Then** the assembled prompt does not introduce that fact and tells the model to ask staff
4. **Given** seed load, **When** values are inspected, **Then** every non-empty seed value traces to an in-repo source and unknown amenities/recommendations remain empty or “ask staff”
5. **Given** any draft, **When** staff send, **Then** Approve&Send is still a human click (no auto-send)

---

### Edge Cases

- Last Cloud inbound exactly 24h 0m 0s ago: window is **closed** (not still open).
- Clock / timezone: remaining time uses elapsed UTC milliseconds; display is `Xh Ym` with minutes floored.
- Thread with Cloud inbound then a later Web inbound: window still follows the Cloud inbound only.
- Thread with Cloud inbound then email/SMS inbound: window still follows the last Cloud inbound.
- Closing-soon threshold: remaining ≤ 5 minutes and > 0 → warn + template mode; server still allows free-text.
- No booking on a temp thread: template variables that need booking/SoR stay empty or “ask staff”.
- Ambiguous lockbox rows (two properties for one suite): include no codes.
- Template send while redirect is ON: still sinks to the test WhatsApp number.
- WhatsApp Web channel send: not subject to the Cloud 24h 409 (it is queued, not a Cloud free-text send).
- Knowledge field cleared by staff: subsequent drafts treat it as unknown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute a per-UMI-thread WhatsApp customer-care window that expires 24 hours after the guest’s last inbound on official WABA `+27600200825` (Twilio Cloud / `whatsapp_cloud`).
- **FR-002**: WhatsApp Web observe messages MUST NOT open or extend the window.
- **FR-003**: Thread header and composer MUST show `Window open, closes in Xh Ym` or `Window closed`.
- **FR-004**: Inbox list MUST show a small closed or closing-soon indicator for WhatsApp Cloud threads.
- **FR-005**: When the window is closed or remaining time is about 5 minutes or less, the composer MUST switch to template mode and the Approve&Send confirm dialog MUST warn staff.
- **FR-006**: `POST /api/inbound/send` MUST return 409 for WhatsApp Cloud free-text when the window is closed, and MUST NOT call Twilio in that case.
- **FR-007**: Email and SMS sends MUST ignore the WhatsApp window guard.
- **FR-008**: WhatsApp send documentation MUST state that Twilio WhatsApp still requires an approved template outside the 24h window (the opposite claim MUST be removed).
- **FR-009**: System MUST persist a templates catalogue with name, category, language, body (`{{n}}`), variable mapping, Content SID, approval status, and last synced time.
- **FR-010**: System MUST seed the seven Grant-approved templates with final tracker text; `browns_review_request` review URL is the static `https://g.page/r/CZafj2WHDxDjEBM/review`; status is `approved_by_grant_unsubmitted` (or equivalent); Content SIDs are empty.
- **FR-011**: Template picker MUST list only templates WhatsApp has approved, and MUST explain why the list is empty before submission.
- **FR-012**: Template variables MUST pre-fill from booking fields and the access-codes SoR; staff MUST be able to edit them before send.
- **FR-013**: Access-code variables MUST use the lockbox record’s `property` field; if property cannot be resolved, code variables MUST be omitted (no suite-name substring matching).
- **FR-014**: Template send MUST use ContentSid + ContentVariables; Approve&Send and confirmToken remain required; outbound redirect still applies.
- **FR-015**: Approval-status sync MUST be read-only fetch from the Twilio Content API (no create/submit).
- **FR-016**: A submit script MUST exist, MUST require `--i-have-grant-go-ahead`, and MUST NOT be executed in this package.
- **FR-017**: System MUST provide a staff-editable property knowledge section covering local recommendations, amenities, house rules, check-in/out, and contact escalation.
- **FR-018**: LLM draft-reply context MUST include the knowledge base and MUST instruct the model not to state facts that are not in it and to say “ask staff” for gaps.
- **FR-019**: Knowledge seed MUST quote only existing in-repo sources; unknown fields stay empty or “ask staff”; every seeded value’s source MUST be listed for the PR.
- **FR-020**: System MUST include a 10-question eval fixture for GFM spot-check. Approve&Send stays human.
- **FR-021**: Automated tests MUST cover window math (24h edge and timezone), the 409 guard, SoR variable fill, picker approved-only filter, knowledge injection, and the prompt-level no-fact-outside-KB guard.
- **FR-022**: This package MUST NOT merge, deploy, write Production Turso, send guest messages, or submit templates to Meta / WhatsApp Business / Twilio Content create or approval endpoints.

### Key Entities

- **Care window**: Derived per UMI thread from last Twilio Cloud inbound timestamp; `expiresAt`, open/closed/closing-soon, remaining `Xh Ym`.
- **WhatsApp template**: Named catalogue row (the seven `browns_*` templates), category (Utility or Marketing), language, body with `{{n}}`, variable map, optional Content SID, Grant vs WhatsApp approval status, last synced.
- **Template fill**: Booking- and SoR-derived values for each `{{n}}`, editable by staff, fail-closed for codes.
- **Property knowledge entry**: Staff-editable fact (recommendations, amenities, rules, times, escalation) scoped to cottage, main house, or shared; source attribution for seeds.
- **Eval question**: One of ten sample guest questions used to spot-check drafts against the knowledge base.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can tell in under 5 seconds whether a thread’s WhatsApp Cloud window is open, closing soon, or closed without leaving Inbox.
- **SC-002**: 100% of WhatsApp Cloud free-text sends attempted after the 24h edge are refused before a Twilio call (409).
- **SC-003**: 0 unsubmitted templates appear in the staff picker; the empty state is readable without training.
- **SC-004**: For a suite whose lockbox `property` is Main House and whose name contains “cottage”, template code fill includes no Cottage codes.
- **SC-005**: For a suite with no lockbox `property`, template code fill includes no codes.
- **SC-006**: 100% of seeded knowledge values that are not “ask staff” / empty have a listed in-repo source.
- **SC-007**: The 10-question eval fixture is present so GFM can spot-check drafts in one sitting before go-live.
- **SC-008**: Approve&Send remains a human confirmation for every guest send in this package.

## Assumptions

- Official Cloud From remains `+27600200825`; personal `+27836458313` stays observe-only.
- Outbound redirect stays ON unless Grant flips it elsewhere; this package does not change that control.
- Parallel data-fixes PR owns a shared lockbox-property resolver; this package only fails closed when reading the existing SoR for template fill.
- The attached approvals tracker listed names, categories, and the review URL; full bodies were not in the upload. Seed bodies are taken from Grant-approved in-repo guest-facing copy (Cottage Falcon / welcome-drafts / portal) plus the tracker’s static review URL, not invented marketing.
- Demo fixtures under `tools/browns-guest-facts-pack/fixtures/` (Tedder Street, demo phones, invented restaurant hours) are **not** trusted seed sources.
- Preview must typecheck without `typescript.ignoreBuildErrors`. No production deploy or Production Turso migration is run.
- Ritual removed this week: staff guessing whether a WhatsApp reply will go through, and drafting mid-stay answers from memory.
