# Implementation Plan: Sprint 6 Inbox Bodies, Composer, and Load Time

**Branch**: `cursor/sprint6-inbox-composer-0597` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/034-sprint6-inbox-composer/spec.md`

## Summary

One PR (MERGE HOLD) that (1) lists WhatsApp Web sentinel bodies cheaply and refreshes them on demand via Ship B update-in-place, with Filtered hygiene on booking-linked recoveries; (2–3) pops the whole Sprint 5 composer into a large overlay/sheet with exact toolbar tooltips and one draft store; (4) densifies inbox list chrome and clears search-icon overlap; (5) honors `limit`/keyset, kills list N+1, and slims `careWindow` so warm first page is ≤3s.

## Technical Context

**Language/Version**: TypeScript 5.5 / Next.js 14.2 (App Router) in `apps/guestflow`

**Primary Dependencies**: React 18, Tailwind 3, lucide-react, Vitest, better-sqlite3 (tests), Turso/libsql (Prod)

**Storage**: Existing Turso `inbound_threads` / `inbound_messages` / `bookings`. No schema migration.

**Testing**: Vitest unit/route tests for limit honor, sentinel list, spam reclassify, UI contract strings

**Target Platform**: Staff Inbox at `/?` (desktop ~1280×800 + phone ~390); Vercel Preview

**Project Type**: Web application (staff inbox + staff APIs)

**Performance Goals**: Warm Prod `/api/umi/inbox` p95 ≤3s for default page (stretch ≤1.5s); `limit` changes thread count

**Constraints**: Redirect ON; Approve&Send human; no auto-send; WA From +27600200825; no invent PII/rates/codes; no Cloud convert +27836458313; no WhatsApp Web Chrome in this CA; no `@every 5m` full vision; no Template & Care return; no list chip-row return

**Scale/Scope**: ~83 inbox threads today; default page 25; sentinel list last 14 days / open stays; refresh cap ≤10 chats

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| I. Human-Gated Guest Send | PASS — Approve&Send + confirmToken unchanged; pop-out does not send |
| II. Fail-Closed Facts | PASS — refresh failure leaves sentinel; no invented bodies/names/codes |
| III. Booking SoR vs Comms SoR | PASS — hygiene only reclassifies when thread already booking-linked |
| IV. Channel Identity Freeze | PASS — From +27600200825; +27836458313 observe-only |
| V. Extend Live Systems | PASS — extend `listInboxThreads`, Ship B backfill/ingest, Sprint 5 `ThreadComposer` |
| VI. Retention / lanes | PASS — no family/trust data; no retention change |

Post-design re-check: still PASS. Complexity is justified: list N+1 is the measured 30s cause; pop-out is one component + overlay, not a second product.

## Project Structure

### Documentation (this feature)

```text
specs/034-sprint6-inbox-composer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-umi-inbox.md
│   ├── api-wa-web-sentinels.md
│   └── ui-composer-list.md
└── tasks.md

specs/verify/sprint-6/VERIFY-PACK.md
apps/guestflow/docs/WA-WEB-CHEAP-BODIES.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/app/page.tsx
├── src/app/globals.css
├── src/app/api/umi/inbox/route.ts
├── src/app/api/umi/wa-web/sentinels/route.ts
├── src/app/api/umi/threads/[id]/refresh-bodies/route.ts
├── src/components/inbox/ThreadComposer.tsx
├── src/components/inbox/ComposerTooltip.tsx
├── src/lib/umi-threads.ts
├── src/lib/wa-web-body.ts
├── src/lib/umi-spam.ts
├── src/lib/inbound-ingest.ts
├── src/lib/whatsapp-care-window.ts
├── __tests__/umi-inbox.test.ts
├── __tests__/umi-wa-web-sentinels.test.ts
├── __tests__/sprint6-inbox-ui.test.ts
└── src/lib/__tests__/umi-threads.test.ts
```

**Structure Decision**: Extend live GuestFlow UMI inbox and Ship B ingest. No new app, no Chrome driver, no schema migration.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |

## Saleable DoD in this plan

S1–S10 from spec.md are acceptance for this PR. VERIFY PACK must include Design #2–#4 ACCEPT rows, QA job-script rows, locks, and re-run steps before READY.

## PR strategy

**One PR** on `cursor/sprint6-inbox-composer-0597`. UI #2–#4 and bodies/perf #1+#5 ship together so GFM ACCEPT is one Preview tip. MERGE HOLD.
