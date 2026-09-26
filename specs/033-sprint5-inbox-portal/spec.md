# Feature Specification: Sprint 5 Inbox, Journey, and Guest Portal

**Feature Branch**: `cursor/guestflow-sprint5-inbox-3f33`

**Created**: 2026-09-26

**Status**: Draft

**Input**: GuestFlow Sprint 5 items 1–5 (Grant CLEAR 26 Sep ~11:37 CT via GFM). Design SoR for #2+#3 is mandatory build-support.

## Operator Job *(mandatory)*

Staff can triage a lean inbox and reply in a WhatsApp-style thread without clipped CTAs or Staff-mislabelled guest contacts; guests get a gated preferred-channel journey and a room-specific Guest Portal (security timed open/rescind) that replaces legacy thebrowns.co.za/checkin + /info URLs.

Ritual this phase removes: scanning a chip-rainbow inbox, fighting a split Template&Care composer that hides Approve&Send under the Windows taskbar, and pointing guests at legacy /checkin and /info pages for codes that never lived in those PDFs.

Artefact Grant can use this week: Preview inbox at `/?fixture=1` plus a live thread, and a Guest Portal link that shows rooms/local info now and security only inside the timed window.

## Saleable DoD S1–S10 *(mandatory)*

| ID | Requirement |
|----|-------------|
| S1 | Operator job named (this spec). |
| S2 | Happy path: (1) Booking & Contact labels = Guest phone/email, not Staff; Save works. (2) Thread = one scroll history + bottom overlay composer (expands on focus; LLM/heuristic draft prefilled); icons channel/templates/attach; pending blue bubble tap → composer → Approve&Send; Template&Care accordion cut. (3) List cards have no chip row; status lives in one standardized thread header (Day-of / Window closed / Details). (4) Journey 4a–4g exist as named templates + Africa/Johannesburg windows + portal deep links; guest-facing sends remain draft → human Approve&Send. (5) Portal shows booked room(s) + thebrowns.co.za room links + local info; security (gate/lockbox/Wi‑Fi password) only check-in day from 14:00 until departure 12:00; Wolery displays as Heritage Cottage; SSID “The Browns Guests”. |
| S3 | Unmatched / window-closed still have a usable composer; portal pre-security copy says codes appear on check-in day; missing room mapping is a staff-visible gap, never invented codes. |
| S4 | Desktop list\|thread; history is the primary surface; composer CTAs fully above the OS taskbar / browser chrome. |
| S5 | Phone ~390: list OR thread; composer usable; portal readable. |
| S6 | Redirect ON; Approve&Send human; no auto-send; WhatsApp From +27600200825; no invented PII/rates/codes; no convert of personal +2783… |
| S7 | Staff copy = state + next action; no Redirect/Approve&Send sermons in list or transcript. |
| S8 | Focus expands the composer; chip/header labels are announced; portal uses headings. |
| S9 | Design Y for #2+#3 (SoR attached); QA job-script Y after Preview tip. |
| S10 | Evidence: desktop + phone paths; portal pre / during / post security window. |

## Design SoR (items #2 and #3) — fail-closed

Source: `SPRINT5-SOR-thread-composer-chips.md` (26 Sep 2026). GFM fail-closes on dual chip systems or clipped composer CTAs.

### #2 Thread + composer

- Zone A (header, no vertical scroll): identity, room·dates, last channel, status chips, Details.
- Zone B (only overflow-y scroll): one message history. Pending outbound bubbles live here.
- Zone C (bottom overlay, not a split pane): icon toolbar + compact field + Cancel / Approve&Send.
- Collapsed field ~40–48px; expanded on focus, pending-bubble tap, or non-empty draft to ≥3–4 usable lines (~96–128px). Zone B shrinks; CTAs never leave the viewport.
- Pending bubble tap loads that draft into Zone C (expanded), channel preselected; no second modal; human Approve&Send only.
- Template & Care accordion is removed. Templates open from the templates icon. Care/window tips are header chips only — no second Window-closed band above the composer, no orange heuristic sermon under the composer.
- Toolbar icons (hit ≥40px): one channel control (not four pills), templates, attach (existing capability only).
- Shell height uses dynamic viewport units; Zone C padding-bottom is at least 12px and honors safe-area. At ~1280×800 with a visible Windows taskbar, Approve&Send + Cancel stay fully clickable with ≥12px clear above the taskbar.
- Primary Approve&Send is navy; Cancel is a ghost control on the left.
- Pending bubble chrome: one quiet channel label + PENDING — not a loud dual-pill slab that fights the header.

### #3 One chip language

- List rows keep: name; journey state `ARRIVING` / `IN HOUSE` / `DEPARTING` (muted caps, not a colored chip); room · dates; one-line preview. Optional unread dot or `Draft ·` preview prefix. No chip row.
- Header uses one chip language: soft pills + ghost Details. At most three visible status chips + Details; overflow for the rest.
- Priority: P0 Window open/closed; P1 one timing chip (Day-of / T−1 / T−7); P2 channel readiness; P3 attention. Copy is short state nouns only.
- Closed-window spelling is `Window closed` in the header only. Do not mix `WA closed` on the list.
- Attention chips stay in the header, never as a list rainbow.

### Kill list

Template & Care accordion; split history/draft panes; clipped CTAs; four channel pills; orange sermons; second Window-closed band; Playfair in composer/chips; list chip rows; dual chip languages; more than three visible header status chips.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest contact labels (Priority: P1)

Staff open Booking & Contact Details to correct the guest’s phone or email. The fields must say Guest, not Staff, so they do not edit the wrong identity. Save and validation stay the same.

**Why this priority**: Mislabelled Staff phone/email is a daily identity error on the stay-morning inbox.

**Independent Test**: Open Details on a booking thread, confirm Guest phone/email labels, change a value, Save, reopen and see the saved guest contact.

**Acceptance Scenarios**:

1. **Given** a booking thread with Details available, **When** staff open Booking & Contact Details, **Then** the fields are labelled Guest phone and Guest email (not Staff) and the dialog title remains Booking & Contact Details
2. **Given** a valid guest email and/or phone change, **When** staff press Save, **Then** the values persist on the booking/thread and nothing is sent to the guest
3. **Given** an invalid email, **When** staff try to Save, **Then** Save stays disabled or shows the existing validation message

---

### User Story 2 - WhatsApp-style thread composer (Priority: P1)

Staff open a thread, scroll one history, tap a pending draft bubble (or focus the compact field), edit the prefilled draft, and Approve&Send. Approve&Send and Cancel stay fully on screen above the Windows taskbar and phone chrome.

**Why this priority**: Split Template&Care + clipped CTAs block the reply job (evidence 02, 05, 06).

**Independent Test**: Fixture or live thread on ~1280×800 and ~390. History is the only scroll. Composer is a bottom overlay. Pending tap fills the composer. Template&Care is gone. Approve&Send is clickable above the taskbar.

**Acceptance Scenarios**:

1. **Given** a thread with history and an open draft, **When** staff view the thread, **Then** they see one scrollable history and a bottom overlay composer with the draft prefilled (empty state placeholder “Write a reply…”)
2. **Given** a pending outbound bubble, **When** staff tap it, **Then** that body loads into the expanded composer with that bubble’s channel selected and no second editor modal
3. **Given** the composer is idle, **When** staff focus the field or a draft is non-empty, **Then** the field expands to at least three usable lines and history shrinks without pushing CTAs off-screen
4. **Given** window-closed or unmatched, **When** staff open the thread, **Then** the composer remains usable (template picker via the templates icon when WhatsApp window is closed)
5. **Given** ~1280×800 with OS taskbar visible, **When** the composer is expanded, **Then** Approve&Send, Cancel, and the composer scrollbar sit fully in the viewport with at least 12px clearance above the taskbar
6. **Given** the previous Template & Care accordion, **When** staff look for it, **Then** it is absent; templates open from the toolbar templates icon

---

### User Story 3 - Lean list and one header chip language (Priority: P1)

Staff scan the left list without a chip rainbow. After selecting a thread, status appears once in the header as soft pills plus Details.

**Why this priority**: Dual chip systems and list overload hide the next action (evidence 03, 04).

**Independent Test**: Inbox list shows name / ARRIVING|IN HOUSE|DEPARTING / room·dates / preview only. Open a thread: ≤3 status chips + Details; `Window closed` spelling is consistent; no list chip row.

**Acceptance Scenarios**:

1. **Given** the inbox list, **When** staff scan rows, **Then** there is no chip row (no WhatsApp Web / Draft / T-1 / Needs attention / code missing / WA closed pills on the card)
2. **Given** a selected thread, **When** staff view the header, **Then** they see at most three status chips plus a ghost Details control using one pill language
3. **Given** a closed messaging window, **When** staff view the header, **Then** the chip reads `Window closed` and the list does not also say `WA closed`
4. **Given** extra status (attention, code missing, extra timing), **When** more than three chips would show, **Then** overflow lives behind ··· or Details — not a rebuilt rainbow

---

### User Story 4 - Journey 4a–4g (Priority: P1)

Guests receive a preferred-channel journey as named drafts on Africa/Johannesburg clocks. Staff still Approve&Send. Portal deep links are included. No auto-send. Existing approved WhatsApp templates are reused; no new Meta submission.

**Why this priority**: Replaces the T-3 / T-1 / Day-of-only ritual with the saleable stay journey.

**Independent Test**: Scheduler/config lists 4a–4g with SAST windows and template names; a dry job creates drafts only; 4f is system rescind (no guest send).

**Acceptance Scenarios**:

1. **Given** a new booking with phone and email, **When** 4a runs, **Then** staff see an email draft and a WhatsApp draft (From +27600200825) that thank the guest, introduce the official number, ask preferred channel, and confirm contacts before portal access — unsent
2. **Given** T−7 at the preferred morning window, **When** 4b is due, **Then** a reminder draft includes the portal deep link
3. **Given** arrival day 08:00 SAST, **When** 4c is due, **Then** a reminder draft includes the portal link and states check-in from 14:00 (codes appear on the portal from 14:00)
4. **Given** a stay longer than one night, **When** 08:00 SAST the morning after the first night arrives, **Then** a comfort-check draft exists; one-night stays skip 4d
5. **Given** departure day 08:00 SAST, **When** 4e is due, **Then** a checkout-by-10:00 thanks / safe-travels draft exists
6. **Given** departure day 12:00 SAST, **When** 4f runs, **Then** portal security is rescinded (system) and no guest message is auto-sent
7. **Given** departure day 17:00 SAST, **When** 4g is due, **Then** a thanks + Google review draft uses the in-repo review URL (or a NeedsGrant stub if missing) — unsent
8. **Given** any 4a–4e/4g draft, **When** the job finishes, **Then** nothing has been sent; staff must Approve&Send

---

### User Story 5 - Room-specific Guest Portal (Priority: P1)

Guests open a portal link instead of thebrowns.co.za/checkin or /info. They see their booked room(s), official room links, and local info. Gate, lockbox, and Wi‑Fi password appear only from check-in day 14:00 SAST until departure 12:00 SAST. Missing codes are a staff gap, never invented.

**Why this priority**: Legacy PDFs only wrapped those URLs; codes were never in the PDF.

**Independent Test**: Portal fixture or token for pre-window, in-window, and post-12:00. Confirm rooms/links/local info; confirm security hidden/shown/rescinded; Wolery labelled Heritage Cottage; SSID The Browns Guests.

**Acceptance Scenarios**:

1. **Given** a guest after the contact gate but before check-in day 14:00 SAST, **When** they open the portal, **Then** they see booked room name(s), thebrowns.co.za room links, and local info, plus clear copy that access codes appear on check-in day — no gate, lockbox, or Wi‑Fi password
2. **Given** check-in day 14:00 SAST through departure 12:00 SAST, **When** they open the portal, **Then** the security block shows property+room values from the access-code source of record (SSID The Browns Guests; password only if stored — never invented)
3. **Given** departure day after 12:00 SAST, **When** they open the portal, **Then** security is gone (4f)
4. **Given** a suite stored as Wolery, **When** the portal or staff surfaces render the room, **Then** the guest-facing name is Heritage Cottage
5. **Given** no lockbox/property mapping for the booked room, **When** staff view inbox/portal ops state, **Then** they see an explicit gap (code missing, ask staff) and the guest does not receive invented codes

---

### Edge Cases

- Unmatched (temp) threads still show a usable overlay composer and Link-to-booking; no invented booking facts.
- Window closed: composer stays up; templates icon is the path for WhatsApp Cloud; free-text Approve&Send still refused by existing send rules.
- Missing Google review URL: 4g draft uses a NeedsGrant stub, not an invented review link. (In-repo `GRANT_REVIEW_URL` is the approved URL when present.)
- Missing access-code row: staff-visible gap; guest security block does not invent digits.
- One-night stay: skip 4d.
- Keyboard inset on phone: composer stays usable; CTAs remain in the visual viewport.
- Attach has no live upload source of record: icon is present and disabled or NeedsGrant — do not invent a new file store.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Booking & Contact Details MUST label Guest phone and Guest email; twin copy elsewhere MUST match; Save MUST keep existing validation and persist guest contacts without sending.
- **FR-002**: Thread column MUST implement Zone A header, Zone B sole history scroll, Zone C bottom overlay composer.
- **FR-003**: Composer MUST expand on focus, pending-bubble tap, or non-empty draft, and MUST keep Approve&Send + Cancel fully in viewport (dynamic viewport + safe-area; ≥12px above taskbar at ~1280×800).
- **FR-004**: Pending outbound draft bubbles MUST load into the composer on tap without a second modal; send remains human Approve&Send.
- **FR-005**: Template & Care accordion MUST be removed; templates MUST open from a toolbar icon; channel MUST be one control; attach MUST expose existing capability only.
- **FR-006**: Inbox list cards MUST NOT render a chip row; journey state MUST be muted `ARRIVING` / `IN HOUSE` / `DEPARTING`; draft pending MAY prefix preview with `Draft ·`.
- **FR-007**: Thread header MUST use one chip language, ≤3 visible status chips + Details, overflow for the rest, and the closed-window string `Window closed`.
- **FR-008**: Journey stages 4a–4g MUST exist with Africa/Johannesburg windows and named templates as specified; 4f is system rescind; guest-facing stages create drafts only.
- **FR-009**: Journey MUST prefer existing Meta-approved WhatsApp template names/SIDs; MUST NOT submit new Meta templates.
- **FR-010**: Guest Portal MUST show booked room(s), verified thebrowns.co.za links, and local info migrated from legacy welcome/info structure without inventing restaurant/spa lists or codes.
- **FR-011**: Portal security (gate, lockbox, Wi‑Fi password) MUST be visible only from check-in 14:00 SAST through departure 12:00 SAST; SSID shown in-window is “The Browns Guests”.
- **FR-012**: Wolery MUST display as Heritage Cottage on guest-facing and staff room labels that use the display helper.
- **FR-013**: Missing room/code mapping MUST surface as a staff-visible gap, never as invented codes.
- **FR-014**: Redirect stays ON; WhatsApp Cloud From stays +27600200825; personal +2783… stays observe-only; staff list/transcript copy is state + next action only.
- **FR-015**: Composer, chips, and portal MUST meet the accessibility bar in S8 (focus expands composer; labelled chips/header; portal headings).

### Key Entities

- **Inbox thread**: One conversation per booking (or temp unmatched). Has messages, optional open draft, care window, journey stage, attention reason.
- **Composer overlay**: Zone C tools — channel, templates, attach, draft body, Cancel, Approve&Send.
- **Header chip**: Short status noun with priority P0–P3 and one visual language.
- **Journey stage (4a–4g)**: Named draft or system action with SAST due date/hour, template name(s), portal deep-link flag.
- **Guest Portal stay packet**: Rooms, links, local info, timed security block, mapping-gap flag.
- **Room display record**: Booked suite string, guest-facing name (Wolery→Heritage Cottage), verified public URL or homepage fallback, mapping-gap flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff complete list → thread → pending tap → visible Approve&Send on first attempt on both ~1280×800 and ~390 without scrolling CTAs out of view.
- **SC-002**: 100% of list cards in the stay-morning inbox show zero status chip pills.
- **SC-003**: 100% of Booking & Contact fields shown to staff use Guest (not Staff) wording.
- **SC-004**: Guests opening the portal before 14:00 on check-in day never see a gate, lockbox, or Wi‑Fi password.
- **SC-005**: After 12:00 on departure day, the same portal no longer shows those secrets.
- **SC-006**: Every 4a–4e/4g guest message remains unsent until a human Approve&Send.
- **SC-007**: Design ACCEPT checklist in the VERIFY PACK can be scored pass/fail on Preview without a second chip system or clipped CTAs.

## Assumptions

- Existing Approve&Send + confirmToken + Redirect sinks remain the only send path.
- Existing WhatsApp template catalogue (`official_channel_notice`, `browns_pre_arrival_welcome`, `browns_day_of_reminder`, `browns_mid_stay_checkin`, `browns_checkout_reminder`, `browns_review_request`, plus already-approved check-in/access templates) is reused; no new Meta submit.
- In-repo Google review URL is used for 4g when present; otherwise NeedsGrant stub.
- Access codes remain DB-first fail-closed; legacy PDF password is a live secret and must not be hardcoded in the repo.
- Verified public site is https://www.thebrowns.co.za/ (and gallery). Per-room path URLs are not invented if they are not already in-repo.
- Attach upload backend is out of scope if none exists; the icon remains and is disabled/NeedsGrant.
- Old T-3 / T-1 / Day-of scheduler stages are superseded by 4a–4g for new drafts; historical rows remain readable.
- Design peer re-scores Preview; QA runs the job-script after tip READY. This CA does not merge.

## Out of Scope

- Redirect go-live flip
- Inventing access codes or a property×room code matrix
- Multi-tenant / retail expansion
- Auto-send
- Converting personal WhatsApp +2783… to Cloud API
- New Meta template submissions
- New file-storage product for attachments
