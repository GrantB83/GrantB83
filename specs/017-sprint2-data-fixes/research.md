# Research: Sprint 2 Data Fixes

## 1. Active-guest predicate

**Decision**: One module `lib/booking-filters.ts` exports `isOwnerBlock(row)`, `isCancelledStatus(status)`, `isActiveGuestBooking(row)`, and `ACTIVE_GUEST_BOOKING_SQL` for WHERE clauses.

**Rationale**: Daily brief, enqueue, and checkin-status currently filter by date overlap only. UMI already excludes cancelled but not BLOCKs. A single predicate prevents drift.

**Alternatives considered**: Per-route ad-hoc filters (rejected: already drifted). Soft-delete BLOCK rows (rejected: NB is SoR; occupancy still matters).

## 2. Owner-block marker

**Decision**: `isOwnerBlock` is true when `upper(trim(guest_name)) === 'BLOCK'`. Confirm with a **read-only** `COUNT(*)` grouped by that expression (and a second count of total bookings). Script `scripts/count-owner-blocks.js` prints counts only. Do not run against Production from this agent unless a Preview/local URL is already present; never print names.

**Rationale**: Gap analysis named “BLOCK placeholders” (43 of 123). Coding brief requires confirming the marker before treating it as law. Tests use the synthetic name `BLOCK` only.

**Alternatives considered**: Match notes/room containing “block” (rejected: can false-positive guest notes). Match empty phone only (rejected: real guests can lack phones).

## 3. Property identity

**Decision**: `resolvePropertyForSuite(db, tenantId, suite)` loads lockbox rows (`code_type='lockbox'`, non-empty `suite`) and uses existing `suiteMatches` / `normalizeSuiteName`. Returns `'cottage' | 'main-house'` only when every matching row shares one `property` value. Otherwise `null`. Display via `propertyDisplayName`: env `PROPERTY_NAME_COTTAGE` / `PROPERTY_NAME_MAIN` or “Cottage (278 Blue Crane)” / “Main House (279 Blue Crane)”. Unknown string: “Property unknown – check suite”.

**Rationale**: Access-codes SoR (spec 010 FR-014/015). Grant M: never substring-match suite names for property.

**Alternatives considered**: `includes('cottage')` on suite/property name (rejected: Grant HARD). Hard-coded suite map (rejected: invents SoR). Write property on every UMI read (rejected: FR-022 / Constitution III).

## 4. Codes fail-closed

**Decision**: `resolveAccessCodesForSuite` calls the property resolver first. If `null`, return `{ ok: false, reason: 'codes: property unresolved', codes: null }` and do not call `resolveAccessCodes`. Callers draft/render without gate/lockbox/wifi codes and attach the reason. Shared so other Sprint 2 PRs can import it.

**Rationale**: Wrong-property codes are worse than omitted codes. Constitution II.

**Alternatives considered**: Default to main-house (rejected: current bug). Show `[ASK STAFF]` while still picking a property (rejected: still guesses the gate).

## 5. Demo seed

**Decision**: Delete the three demo `properties` inserts in `seedDefaultData` and `seedDefaultDataAsync`. Do not insert replacement rows from typed room counts. Optional later apply script can create the two real properties only when unreferenced demo rows exist.

**Rationale**: Cold start currently invents Riverside / Clarens / Hermanus. Room counts must come from lockbox rows, not literals.

**Alternatives considered**: Seed two real properties with typed 5+3 (rejected: typed counts). Leave demo rows (rejected: US2).

## 6. Exceptions without migration

**Decision**: GET selects live `guest_tickets` columns (`subject`, `description`, `staff_brief`, `guest_draft_reply`, `assigned_to`, …). Map into the page’s `whatAsked` / `whatAiFound` / `nextStep` shape. `metadata: {}`. PATCH wraps `audit_log` insert in try/catch. Webhook inserts at the timeout and missing-rate-card paths write only live columns; extra context folds into `description` / `staff_brief`.

**Rationale**: P0/P1 columns were never applied on Turso. Additive ALTER needs `APPROVE APPLY MIGRATION`.

**Alternatives considered**: Apply P0/P1 migration now (rejected: Production write). Leave 500s (rejected: US1 AC3 keep More Tools working).

## 7. Today stats

**Decision**: Delete `src/app/api/today-stats/route.ts`. Do not restore the Today board. Grep-style test: no `src/` reference.

**Rationale**: Only consumer was pre-UMI home. UMI FR-001 replaced it.

**Alternatives considered**: 410 stub (acceptable but deletion is cleaner). Move stats under More (rejected: Grant “do not restore”).

## 8. Inbox read-only

**Decision**: `listInboxThreads` and `getThreadDetail` must not call `ensureArrivingBookingThreads` or `applyTempHygiene`. Thread insert stays on inbound ingest and outbound send only. `needsAttention` is true iff the thread has at least one inbound message and no later outbound (unanswered inbound). Empty threads never flagged. Codes-unresolved is a reason string on the draft/thread, not a substitute for unanswered inbound.

**Rationale**: Grant N. Opening Inbox today creates arriving threads and writes hygiene.

**Alternatives considered**: Keep ensure-on-GET for arriving sort (rejected: writes on open; arriving bucket can still sort existing threads by `check_in`). Flag empty arriving threads as needs-attention (rejected: N).

## 9. Rate cards (Q)

**Decision**: No files under rate-cards. Do not convert `/api/rate-cards` to async.

**Rationale**: Grant 24 Sep 18:47 CT retired Rate Card Upload.

**Alternatives considered**: Async conversion from original gap-1 brief (dropped).

## 10. Scripts

**Decision**: Three scripts, dry-run default, not invoked from Vercel build/start:

1. `scripts/count-owner-blocks.js` — read-only COUNTs for BLOCK marker.
2. `scripts/migrate-gap1-properties.js` — report demo properties and FK counts; replace only with `--apply` and only if unreferenced.
3. `scripts/cleanup-umi-empty-threads.js` — clear false needs-attention on zero-message threads when `--apply`; always LIST empty auto-created threads; never DELETE.

**Rationale**: Coding brief + item N. Production apply needs a separate OK.

**Alternatives considered**: Run cleanup on deploy (rejected). Auto-delete empty threads (rejected: list for review).
