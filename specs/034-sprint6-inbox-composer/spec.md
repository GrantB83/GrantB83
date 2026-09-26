# Feature Specification: Sprint 6 Inbox Bodies, Composer, and Load Time

**Feature Branch**: `cursor/sprint6-inbox-composer-0597`

**Created**: 2026-09-26

**Status**: Draft

**Input**: GuestFlow Sprint 6 items 1–5 (Grant CLEAR 26 Sep ~13:10 CT via GFM). Design SoR for #2–#4 is mandatory build-support. Coding owns #1 and #5.

## Operator Job *(mandatory)*

Staff open Inbox and load threads in seconds, read real WhatsApp Web guest text on stay threads, and expand/edit drafts in a large composer with clear toolbar hints — without leaving GuestFlow or burning continuous WA vision tokens.

Ritual this phase removes: waiting ~30s for all 83 threads; opening WhatsApp Web to read `[body unavailable]` stay traffic (thread 46 Anneri); fighting a cramped compact composer with mystery icons; typing under a search magnifying glass.

Artefact Grant can use this week: Preview inbox first page in seconds; thread 46 readable after one-shot/on-demand body pull; pop-out editor + tooltips; denser list header.

## Saleable DoD S1–S10 *(mandatory)*

| ID | Requirement |
|----|-------------|
| S1 | Operator job named (this spec). |
| S2 | Happy path: Inbox first page ≤3s warm; `limit` honored; WA Web sentinel bodies on open stays (incl. thread 46) readable after one-shot/on-demand pull; composer Pop out large editor preserves draft; tooltips on channel/template/attach/pop-out; denser list header + search text clear of icon. |
| S3 | Empty/loading/error: Inbox loading skeleton then page (not 30s blank); body refresh failure leaves sentinel + staff-visible error/next action (no invent); pop-out Esc/close restores compact composer. |
| S4 | Desktop: compact composer default; pop-out overlay/modal large; list chrome denser; search padding fixed; Approve&Send visible human-only. |
| S5 | Mobile: pop-out = full-screen sheet OK; list denser; tooltips → focus/long-press or title; inbox page usable. |
| S6 | Locks: Redirect ON; Approve&Send human; no auto-send; WA From +27600200825; no invent PII/rates/codes; no Cloud convert +27836458313. |
| S7 | Copy bar: staff = state + next action; no Redirect/Approve&Send sermons in list/transcript bodies. |
| S8 | A11y: tooltip/title on toolbar controls; pop-out focus trap + Esc; search label/placeholder not obscured. |
| S9 | Peers: Design (#2 pop-out, #3 tooltips, #4 list chrome); QA job-script (inbox timing + thread 46 bodies + composer pop-out/tooltips/chrome) before GFM ACCEPT — rows in VERIFY PACK. |
| S10 | Job evidence pack paths for desktop ± phone under sprint6-* (QA fills; CA prepares checklist). |

## Design SoR (items #2, #3, #4) — fail-closed

Source: `SPRINT6-SOR-composer-popout-tooltips-list.md` (26 Sep 2026). GFM fail-closes if pop-out forks draft state; Approve&Send missing in pop-out; Template & Care returns; list chip-row returns; search placeholder still under the glass.

### #2 Pop-out

- Default stays Sprint 5 compact Zone C; pop-out is an escape hatch for long edits.
- Pop-out control is the rightmost toolbar icon after attach; aria/tooltip **Expand editor**.
- Whole edit section in one surface: channel + templates + attach + large textarea (≥12–16 lines / ~min 280px) + Approve&Send footer.
- **One draft store** — no fork/reset on open/close; channel + template + body persist both ways.
- Desktop: overlay max-width 720–840px, max-height min(88vh, 720px); sticky toolbar+footer; focus trap; Esc/✕; backdrop click closes.
- Mobile: full-screen sheet; safe-area footer.
- Kill: second draft store; CTAs left in compact bar while modal open; Template&Care; Playfair/gold primary; auto-send.

### #3 Tooltips (exact copy)

- Channel: **Send channel** · Templates: **Templates** · Attach: **Attach file** · Pop out: **Expand editor**
- Native title + accessible tooltip on hover (~300–400ms) and immediate on focus.

### #4 List chrome

- ≤2 compact rows; title padding 8–10px; search height 36–40px; **padding-left ≥36–40px** so glass never covers type.
- Gaps 8px; Needs attention kept; Sprint 5 lean list cards — **no chip-row return**.
- Refresh tooltip **Refresh inbox**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inbox first page in seconds (Priority: P1)

Staff open Inbox on a stay morning. The first page of threads appears in seconds. Changing page size changes how many threads return. Heavy window details wait until a thread is opened.

**Why this priority**: Measured Prod TTFB is ~27–33s with `limit` ignored (always 83 threads). Staff cannot triage.

**Independent Test**: Call inbox with `limit=10` and `limit=25`; counts differ; first paint does not wait for the full corpus; warm list feels ≤3s.

**Acceptance Scenarios**:

1. **Given** a staff session on Inbox, **When** the list loads with the default page size, **Then** staff see a loading skeleton then the first page (not a 30s blank) and thread count matches `limit`
2. **Given** the same corpus, **When** staff request `limit=10` vs `limit=25`, **Then** the returned thread count changes and a cursor/keyset is available for the next page
3. **Given** a lean list row, **When** the page renders, **Then** heavy care-window fields are slim or deferred until thread open, and `?thread=` still deep-links

---

### User Story 2 - Read real WhatsApp Web stay text (Priority: P1)

Staff open a stay thread whose WhatsApp Web inbound rows are exactly `[body unavailable]` or `[metadata-only]` (Prod thread 46 Anneri · msgs 248/252). They get a cheap target list, then one-shot / on-demand Refresh bodies that updates in place. Recovered booking-linked guest care is not stuck as Filtered. No continuous full vision.

**Why this priority**: Staff cannot read guest wording without leaving GuestFlow; observe must stay cheap.

**Independent Test**: Sentinel list returns thread 46-class rows with last4/bookerName and no invented body. After a Ship B update-in-place pull, staff read real text; Filtered clears when recovered and booking-linked. Refresh failure leaves the sentinel plus a next action.

**Acceptance Scenarios**:

1. **Given** `whatsapp_web` inbound rows whose body is exactly `[body unavailable]` or `[metadata-only]`, **When** staff (or CoS) request the sentinel target list, **Then** they receive thread id + chat identity (last4 / bookerName) and no vision is run
2. **Given** thread 46 (or a fixture peer) with sentinel rows, **When** staff press Refresh bodies and real text is supplied via the existing Ship B update-in-place path, **Then** the same message ids show real guest wording and booking-linked rows are no longer Filtered
3. **Given** a refresh with no real source text, **When** the pull fails or observe is unavailable, **Then** the sentinel remains, staff see a state + next-action error, and no body is invented
4. **Given** idle daytime observe, **When** a chat is already fully captured, **Then** going-forward hooks capture body only on unread or existing sentinel — not a continuous full-vision cycle

---

### User Story 3 - Large composer pop-out with one draft (Priority: P1)

Staff writing a long draft or filling template variables pop out the whole message-edit section into a large overlay (desktop) or full-screen sheet (phone), then Esc/close back to the compact bar with the same draft, channel, and template.

**Why this priority**: Compact Zone C is the right default but too small for check-in instruction templates.

**Independent Test**: Type in compact, pop out, edit, Esc — identical draft/channel/template; Approve&Send visible in the overlay; no Template & Care.

**Acceptance Scenarios**:

1. **Given** the compact composer with a draft, channel, and template selected, **When** staff activate Expand editor, **Then** the whole edit section (channel + templates + attach + large field + Approve&Send) opens in one overlay/sheet
2. **Given** the pop-out open, **When** staff press Esc, ✕, or backdrop, **Then** compact Zone C restores with identical text/channel/template and focus returns to Expand editor
3. **Given** the pop-out open, **When** staff Approve&Send, **Then** the existing human confirm path runs (no auto-send) and CTAs are not left only in the compact bar

---

### User Story 4 - Toolbar hints and denser list chrome (Priority: P2)

Staff hover or focus channel / templates / attach / pop-out and read a short hint. The list header is two compact rows; search text never sits under the glass; Needs attention still works.

**Why this priority**: Mystery icons and a tall header waste stay-morning pixels.

**Independent Test**: Hover and keyboard-focus each of the four controls; type in search and see the S of Search clear of the icon; more thread rows above the fold vs evidence `03`.

**Acceptance Scenarios**:

1. **Given** the compact toolbar, **When** staff hover (~300–400ms) or focus a control, **Then** they see exactly: Send channel, Templates, Attach file, Expand editor
2. **Given** the inbox list header, **When** staff view desktop ~1280×800, **Then** title/search/Needs attention fit in ≤2 compact rows with 8px gaps and search padding-left ≥36–40px
3. **Given** Sprint 5 lean cards, **When** the denser header ships, **Then** chip-row does not return and `?thread=` still works

---

### Edge Cases

- Refresh bodies on a thread with no sentinels reports “No unavailable WhatsApp Web bodies” and does not invent text.
- Scrolled-off WhatsApp Web history stays residual — documented, not invented.
- Search with `q` still honors `limit` after matching.
- Pop-out while NeedsGrant attach is disabled: pop-out stays enabled; attach still shows tooltip + disabled reason.
- Inbox API failure shows a staff-visible error; previous threads are not invented.
- Filter `needs-attention` + `limit` returns at most `limit` matching rows.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST honor inbox `limit` (default page 20–30) and a cursor/keyset so the first response is a page, not the full corpus.
- **FR-002**: System MUST load the inbox list with a small number of storage round-trips (no per-thread N+1 for preview / unanswered / care window).
- **FR-003**: System MUST slim or defer heavy care-window enrichment on the list; full window details load on thread open.
- **FR-004**: System MUST expose a sentinel target list of `whatsapp_web` inbound rows whose body is exactly `[body unavailable]` or `[metadata-only]`, returning thread id + last4/bookerName with no vision.
- **FR-005**: Staff MUST be able to Refresh bodies on the current thread (and/or a capped batch ≤10 chats) that persists via the existing Ship B update-in-place ingest/backfill path.
- **FR-006**: When a WhatsApp Web body is recovered and the thread is matched to a stay/booking, the system MUST clear or reclassify Filtered/spam so readable guest care is not stuck as Filtered (Anneri path).
- **FR-007**: On body refresh failure the system MUST leave the sentinel, show staff state + next action, and MUST NOT invent a body.
- **FR-008**: Going-forward observe hooks MUST document body capture only on unread or existing sentinel — not continuous full-vision cycles. This package owns API/storage only (no WhatsApp Web Chrome driver).
- **FR-009**: Composer MUST keep one draft store; pop-out MUST move the whole edit section into a large overlay (desktop) or full-screen sheet (phone) with Approve&Send visible.
- **FR-010**: Esc / ✕ / backdrop MUST restore compact Zone C with identical channel, template, and body; focus returns to Expand editor.
- **FR-011**: Toolbar MUST expose native title plus accessible tooltip copy exactly: Send channel, Templates, Attach file, Expand editor (hover delay ~300–400ms; immediate on focus).
- **FR-012**: Inbox list header MUST be ≤2 compact rows, search padding-left ≥36–40px, Refresh tooltip “Refresh inbox”, Needs attention kept, no chip-row return, `?thread=` preserved.
- **FR-013**: Inbox MUST show a loading skeleton before the first page (not a long blank).
- **FR-014**: Redirect stays ON; Approve&Send stays human; no auto-send; WhatsApp From stays +27600200825; personal +27836458313 is not converted to Cloud.
- **FR-015**: Staff list/transcript copy MUST be state + next action only (no Redirect/Approve&Send sermons). Template & Care accordion MUST NOT return.

### Key Entities

- **Inbox page**: A limited, sorted set of stay/temp threads with lean preview fields.
- **WA Web sentinel row**: An inbound `whatsapp_web` message whose stored body is exactly `[body unavailable]` or `[metadata-only]`.
- **Recovered stay body**: A sentinel replaced in place with source-backed guest text on a booking-linked thread.
- **Composer draft**: One shared channel + template + body used by compact and pop-out surfaces.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff see the first inbox page within 3 seconds on a warm stay-morning load (stretch 1.5 seconds).
- **SC-002**: Changing the requested page size changes how many threads appear; staff do not wait for the full corpus before the first page.
- **SC-003**: Staff can name sentinel stay threads (including thread 46 class) from a cheap list, then read real WhatsApp Web wording after one on-demand pull when source text exists.
- **SC-004**: After a successful recovery on a booking-linked stay, staff no longer see those guest-care bubbles as Filtered.
- **SC-005**: Staff can expand the whole editor, edit a long draft, and return to the compact bar with the same words and channel in one round-trip (open + Esc).
- **SC-006**: All four toolbar controls announce a ≤3-word hint on hover and keyboard focus; search placeholder/typed text is never covered by the magnifying glass.
- **SC-007**: More thread rows are visible above the fold on desktop ~1280×800 than in evidence screenshot `03`.
- **SC-008**: Idle-day observe token burn is not materially higher than today’s metadata pass (no continuous full-vision cycle).

## Assumptions

- Ship B (`POST /api/umi/backfill/wa-web` / ingest replace-in-place) remains the only persistence path for recovered WhatsApp Web bodies.
- CoS/GFM own the WhatsApp Web Chrome clicker; this package does not drive a browser session.
- Sprint 5 compact overlay composer and lean list cards stay the default; this package extends them.
- Default inbox page size is 25 (allowed range 20–30 unless staff pass another `limit`).
- Sentinel list looks at open stays and/or the last 14 days — same window as Ship B — and never invents names or bodies.
- Residual scrolled-off WhatsApp Web history is acceptable when documented.
- MERGE HOLD until GFM Preview ACCEPT; agents do not merge.
