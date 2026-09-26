# Research: Sprint 6 Inbox Bodies, Composer, and Load Time

## 1. Inbox TTFB / ignored `limit`

**Decision**: Honor `limit` (default 25, clamp 1–50) and a keyset cursor after sort; collapse list enrichment to batched queries; slim `careWindow` on the list to `{ state, label }`.

**Rationale**: MEASURE-2026-09-26 shows `/api/umi/inbox?limit=10|20|50` all return 55318 bytes / 83 threads in ~27–33s TTFB. `listInboxThreads` currently (a) ignores limit, (b) calls `latestMessagePreview` + `hasUnansweredInbound` (3 queries) per thread, (c) attaches full `CareWindow` (fattest JSON field) for every row. Thread detail is ~5–7s — list is ~5× slower because it enriches the whole corpus.

**Alternatives considered**:
- Cache-only warm list: hides the N+1; `limit` still ignored; stale rows.
- SQL LIMIT before sort: would drop arriving/pending threads that sort first.
- Offset pagination: acceptable but keyset (`cursor` = last `(sortBucket, lastMessageAt, id)`) is what the kick asked for.

## 2. WA Web cheap bodies (not full vision)

**Decision**: Staff/API sentinel list for bodies exactly `[body unavailable]` or `[metadata-only]` on `whatsapp_web` inbound (open stays / last 14 days). Staff **Refresh bodies** on the current thread POSTs through the existing Ship B ingest/backfill replace-in-place path. CA does not drive WhatsApp Web Chrome. Document hybrid observe: body only on unread or existing sentinel.

**Rationale**: Ship B (#246) already replaces sentinels when real text arrives. Observe still posts metadata-only for cost. Thread 46 Anneri msgs 248/252 are sentinel + Filtered. A continuous `@every 5m` 18–22 chat vision scan is explicitly out of scope.

**Alternatives considered**:
- Full vision every cycle: burns tokens; kick forbids it.
- Invent bodies from names/dates: constitution II fail-close.
- Convert +27836458313 to Cloud: channel-identity freeze.

## 3. Filtered hygiene on recovered stay traffic

**Decision**: When a sentinel is replaced with a real body AND the thread has a booking/stay match, clear `is_spam` / `status=spam` unless the recovered text independently matches spam/marketing phrases. Do not invent.

**Rationale**: `isSpamOrMarketing` treats empty/sentinel as spam (`empty_or_unavailable_body`). Ingest replace already sets `is_spam=0`, but `finishInboundAfterPersist` re-runs the classifier and can restamp spam. Booking-linked stay traffic (Anneri) must not stay Filtered after recovery.

**Alternatives considered**:
- Always clear Filtered on any recovered body: would unmask real junk on unmatched temps.
- Leave Filtered and teach staff to ignore it: fails the operator job.

## 4. Composer pop-out + tooltips

**Decision**: Extend Sprint 5 `ThreadComposer` with a rightmost Maximize2 control. One React state in `page.tsx` (`draft`, `channel`, `selectedTemplate`, `templateVars`). Overlay/sheet renders the same controls; Esc/✕/backdrop sets `popOut=false` and restores focus. Tooltips: native `title` + `role="tooltip"` with exact SoR copy.

**Rationale**: Design SoR fail-closes on a second draft store, CTAs left in the compact bar, Template & Care return, and mystery icons.

**Alternatives considered**:
- Only enlarge the textarea: leaves Approve&Send in the cramped bar (SoR kill).
- Duplicate draft in modal local state: operator loses work on Esc.

## 5. List chrome

**Decision**: Collapse header to two compact rows; search `padding-left` ≥40px; refresh `title`/`aria-label` **Refresh inbox**; keep Needs attention; do not restore chip rows.

**Rationale**: Evidence `03` shows title/search/filter stacking with `p-4 space-y-3` and `pl-9` under a `left-3 top-3` glass. Sprint 5 already removed chip rainbow — do not bring it back.

## 6. Observe hybrid hooks (API/storage only)

**Decision**: Document in `apps/guestflow/docs/WA-WEB-CHEAP-BODIES.md`: CoS observe should POST real `text` only when (a) allowlisted chat shows unread, or (b) sentinel list includes that chat. Daytime metadata/unread fingerprint stays. No `@every 5m` vision cron in this package.

**Rationale**: Kick: CA owns API/storage; GFM/CoS own the clicker.
