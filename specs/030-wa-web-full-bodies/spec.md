# Feature Specification: WA Web Full Bodies + Source Display Names (Ship B)

**Feature Branch**: `cursor/wa-web-full-bodies-dbab`

**Created**: 2026-09-26

**Status**: Draft

**Input**: GuestFlow Sprint 4 #4 — staff must read actual WhatsApp Web guest text and a real contact/display name on unmatched threads. No `[metadata-only]` / `[body unavailable]` sentinels. Grant CLEAR 25 Sep. GFM confirmed kick 26 Sep (evidence wording only). Separate draft PR from Ship A composer crush (`#245` / `31c0e8f`). **MERGE HOLD until GFM ACCEPT after QA job-script.**

## Operator Job *(mandatory)*

Staff open any WhatsApp Web soft-inbox thread (for example Production `?thread=28`) and read the **actual guest message text** plus a real contact/display name on unmatched threads — no `[metadata-only]` / `[body unavailable]` sentinels.

**Operator-job AC**: After going-forward ingest and the one-shot backfill, staff can read real guest wording on previously metadata-only WhatsApp Web threads. Unmatched thread titles show the WhatsApp Web contact, push, or chat name when the source has one. Phone number is the title only when the source has no name. Staff copy is state + next action only. No policy sermon. No invented bodies or names.

## Saleable DoD S1–S10 *(mandatory — READY refuse if missing)*

| ID | Required | This feature |
| --- | --- | --- |
| **S1** | Operator job named | **Y** — staff read real guest text + source display name on WhatsApp Web threads; no sentinels |
| **S2** | Happy path AC | Open `?thread=28` (or a peer WhatsApp Web temp) → transcript shows real guest body; thread title / bookerName shows WhatsApp Web display name when the source has one |
| **S3** | Empty / error AC | If WhatsApp Web truly has no scrollable history for a message, document the residual; never invent a body; prefer no fake row over a sentinel |
| **S4** | Desktop layout AC | **N/A** — storage / ingest focus; no information-architecture chrome change (reuse Ship A composer) |
| **S5** | Mobile layout AC | **N/A** for new chrome — same transcript body must be readable on the phone thread view |
| **S6** | Standing locks | Redirect ON; Approve&Send human; no auto-send; WhatsApp From `+27600200825` |
| **S7** | Copy bar | Staff list / transcript = state + next action only; **no sermon**; **no invent** of guest body or names — persist only text and names present in the WhatsApp Web source |
| **S8** | A11y smoke | **N/A** unless this change adds unlabeled primary controls (none expected) |
| **S9** | Peers named | Design **N** (no IA / chrome change) · QA **Y** (job-script: open thread 28 + peers; read real text + names) |
| **S10** | Job evidence | **Must include** Prod `?thread=28` **before/after** (or Preview equivalent of the **same** data) **plus** an inbox scan **metadata-only count** for `whatsapp_web`. Unmatched title from WhatsApp name when present. READY refuse if either capture is missing. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff read real WhatsApp Web guest text going forward (Priority: P1)

A new guest line appears on the personal WhatsApp Web observe path. Staff open the matching soft-inbox thread and read the actual words the guest typed. The system does not store a placeholder instead of the body.

**Why this priority**: Production thread 28 is unusable because every line is a sentinel. Stopping new sentinel writes is the minimum that makes the inbox honest.

**Independent Test**: Post a WhatsApp Web observe payload with a real body. The stored inbound line and the thread transcript show that body. Post an empty or sentinel payload. No new fake inbound row is created.

**Acceptance Scenarios**:

1. **Given** an allowlisted WhatsApp Web observe event with a real guest body, **When** the inbound path accepts it, **Then** the stored message text is that body and the staff transcript shows it (not a sentinel)
2. **Given** an observe event whose body is missing or exactly `[metadata-only]`, `[body unavailable]`, or `[observe-probe]`, **When** the inbound path handles it, **Then** it does not create a fake inbound row and does not invent a body
3. **Given** the same real observe event is delivered twice with the same durable key, **When** the second delivery arrives, **Then** staff still see one line (no duplicate storm)

---

### User Story 2 - Staff recover existing metadata-only threads (Priority: P1)

Staff already have WhatsApp Web threads whose stored bodies are exactly `[metadata-only]` or `[body unavailable]`. After the one-shot backfill, those rows show the real WhatsApp Web text when the source still has it.

**Why this priority**: Going-forward ingest alone leaves thread 28 unreadable. The operator job is to read existing threads this week.

**Independent Test**: Seed a WhatsApp Web inbound row whose body is `[metadata-only]`. Run the backfill once with the real source text and the same durable key. The same row now holds the real text. Run the backfill again. Row count does not increase.

**Acceptance Scenarios**:

1. **Given** a WhatsApp Web inbound row whose body is exactly `[metadata-only]` or `[body unavailable]`, **When** backfill supplies the real source text for that message, **Then** that row is updated in place and the transcript shows the real text
2. **Given** a backfill replay of the same messages, **When** it runs a second time, **Then** it does not insert duplicate inbound rows
3. **Given** WhatsApp Web truly has no remaining history for a line, **When** backfill cannot recover a body, **Then** the system does not invent text and the residual is documented

---

### User Story 3 - Staff see a real name on unmatched WhatsApp Web threads (Priority: P2)

An unmatched / temp WhatsApp Web thread has no booking. Staff still see the contact name, push name, or chat title from WhatsApp Web when the source has one. The raw number is the title only when the source has no name.

**Why this priority**: Grant add on 25 Sep. Unmatched temps currently look like anonymous numbers even when WhatsApp Web shows a name.

**Independent Test**: Ingest or backfill a WhatsApp Web message with a source display name and no booking. Thread title / bookerName is that name. A payload whose only “name” is the raw number keeps the phone fallback.

**Acceptance Scenarios**:

1. **Given** a WhatsApp Web observe or backfill event with a contact, push, or chat name that is not just the raw number, **When** the unmatched / temp thread is stored or refreshed, **Then** bookerName / thread title is that source name even with no booking linked
2. **Given** the source has no name (only the number), **When** the unmatched thread is shown, **Then** the title falls back to the phone number and no name is invented
3. **Given** a metadata-only row is replaced with real text, **When** the current WhatsApp Web chat header has a visible name, **Then** the thread title is refreshed from that name

---

### User Story 4 - Same guest line is not stored twice across Cloud and Web (Priority: P2)

The same guest message may arrive on WhatsApp Cloud and on WhatsApp Web observe. Staff must not see two copies of the same line.

**Why this priority**: Duplicate storms make the transcript untrustworthy and undo the operator job.

**Independent Test**: Store a Cloud inbound with a real body. Ingest the same guest wording from WhatsApp Web (same sender, same wording, same time window). Message count stays one.

**Acceptance Scenarios**:

1. **Given** a Cloud inbound already holds the real guest body, **When** WhatsApp Web observe or backfill presents the same guest message, **Then** a second inbound row is not created
2. **Given** only a WhatsApp Web sentinel exists for that line, **When** the real body arrives from either durable key, **Then** the sentinel is updated in place rather than duplicated

---

### Edge Cases

- Empty, whitespace-only, `[metadata-only]`, `[body unavailable]`, and `[observe-probe]` bodies never become stored guest text
- A name that is only the raw phone (with or without `+`, spaces, or `whatsapp:`) is treated as no name
- Booking-linked threads keep the booking booker name as the primary title; source display name still persists for unmatched / temp use and does not invent a booking
- Messages older than the two-week backfill window are ignored unless they match an already-open metadata-only row being replaced
- If WhatsApp Web history has scrolled off, residual sentinels may remain; they are counted and documented, not filled with guessed text
- Email `[body unavailable]` composition is out of scope and must not be changed
- Composer crush, unmatched Link modal, Cloud API conversion of `+27836458313`, Redirect flip, and `stay@` / `RESEND_FROM` are out of scope

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: WhatsApp Web going-forward ingest MUST persist the real guest body when the source provides one
- **FR-002**: WhatsApp Web ingest MUST NOT write `[metadata-only]`, `[body unavailable]`, or `[observe-probe]` as stored guest text
- **FR-003**: When the source body is missing or is a sentinel, the system MUST skip creating a fake inbound row (prefer capture; never invent)
- **FR-004**: Backfill MUST update in place any WhatsApp Web inbound whose body is exactly `[metadata-only]` or `[body unavailable]` when the source later supplies real text
- **FR-005**: Backfill MUST be idempotent: same durable key does not create a second row
- **FR-006**: Durable keys MUST prefer an external message id, then sender + timestamp (and body when present) so Cloud and Web copies of the same guest line collapse
- **FR-007**: One-shot backfill MUST cover a two-week window or all open metadata-only WhatsApp Web rows, whichever is needed to recover readable threads
- **FR-008**: Source display name (contact name, push name, or chat title that is not just the raw number) MUST persist on temp / unmatched threads as bookerName / thread title even with no booking linked
- **FR-009**: Phone number MAY be the unmatched title only when the source has no name
- **FR-010**: Replacing a metadata-only row MUST refresh the thread title when the source currently has a visible name
- **FR-011**: Staff-facing copy MUST be state + next action only — no policy sermon and no invented guest wording or names
- **FR-012**: Redirect MUST stay ON; Approve&Send MUST stay human; the system MUST NOT auto-send; official WhatsApp From MUST stay `+27600200825`
- **FR-013**: This change MUST NOT alter inbox information architecture or add unlabeled primary controls
- **FR-014**: Automated tests MUST cover sentinel rejection, idempotent backfill / in-place replace, and source-name persistence

### Key Entities

- **WhatsApp Web inbound line**: A guest message observed on the personal WhatsApp Web number, stored only when a real body exists
- **Sentinel body**: Exact stored placeholders `[metadata-only]` or `[body unavailable]` (and inbound `[observe-probe]`) that staff must not treat as guest text
- **Source display name**: Contact name, push name, or chat title from WhatsApp Web that is not merely the raw phone number
- **Unmatched / temp thread**: A conversation with no linked booking; title comes from source display name, else phone
- **Durable message key**: External message id when present; otherwise sender + timestamp (and body when present) used for replace and Cloud↔Web dedup

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff opening thread 28 (or a peer WhatsApp Web temp) can read the actual guest wording for every line WhatsApp Web still has — zero sentinels in that recovered set. Evidence is Prod `?thread=28` before/after (or Preview of the same rows) plus a counted `whatsapp_web` metadata-only inbox scan
- **SC-006**: MERGE HOLD until GFM ACCEPT after the S9 QA job-script (open thread 28 + peers; read real text + names)
- **SC-002**: After one backfill pass, a second pass of the same payload adds zero extra inbound rows
- **SC-003**: Unmatched WhatsApp Web threads whose source has a name show that name as the title on first open, without a booking link
- **SC-004**: Staff do not need to open WhatsApp Web on the phone to learn what the guest said for recovered threads (the ritual this phase removes)
- **SC-005**: Locks remain unchanged: Redirect ON, human Approve&Send, no auto-send, From `+27600200825`

## Assumptions

- CoS Chrome / the observe bridge may still be the live WhatsApp Web reader; GuestFlow owns inbound storage and must accept full bodies and names when the bridge sends them
- Production evidence that thread 28 is all metadata-only is accepted; this package does not invent those bodies
- Existing UMI thread list / transcript already renders `message_text` and `guest_name` — no new chrome is required
- Email sentinel composition and Ship A composer layout stay as they are
- Preview / authenticated API is the evidence surface; Production Turso writes stay behind existing Grant gates. S10 before = kick/Prod scan; S10 after = same thread 28 + inbox count after source-backed backfill (no invent)
- Two-week window is measured in Africa/Johannesburg guest-ops dates; open metadata-only rows may be replaced even if slightly older when they are still open staff work

## Out of Scope

- Composer crush / unmatched Link modal (Ship A `#245`)
- Converting personal `+27836458313` to Cloud API
- Redirect flip or From change
- `stay@` / `RESEND_FROM` changes
- Inventing guest copy, names, rates, or PII
- Auto-send or Approve-only send
