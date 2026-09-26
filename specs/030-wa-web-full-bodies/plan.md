# Implementation Plan: WA Web Full Bodies + Source Display Names (Ship B)

**Branch**: `cursor/wa-web-full-bodies-dbab` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-wa-web-full-bodies/spec.md`

## Summary

Fix GuestFlow WhatsApp Web observe so staff can read real guest wording and a real source display name on unmatched threads. Stop writing sentinel bodies. Replace existing `[metadata-only]` / `[body unavailable]` WhatsApp Web rows in place from a one-shot backfill. Dedup against WhatsApp Cloud when both copies exist. Persist contact / push / chat title onto temp threads. Reuse Ship A inbox chrome. Locks unchanged. **MERGE HOLD until GFM ACCEPT after QA job-script.** S10 evidence: Prod `?thread=28` before/after (or Preview of the same data) plus `whatsapp_web` metadata-only inbox count.

## Operator Job & Saleable DoD (must not be thinned)

**Operator job**: Staff open any WhatsApp Web soft-inbox thread (e.g. Prod `?thread=28`) and read the actual guest message text plus a real contact/display name on unmatched threads — no `[metadata-only]` / `[body unavailable]` sentinels.

| ID | Score | Plan obligation |
| --- | --- | --- |
| S1 | Y | Operator job above |
| S2 | Y | `?thread=28` / peer WA Web temp shows real body; title / bookerName = source name when present |
| S3 | Y | No invent; skip fake row if source has no history; document residual |
| S4 | N/A | No IA chrome change; reuse Ship A |
| S5 | N/A chrome | Bodies must render on phone thread view (existing transcript) |
| S6 | Y | Redirect ON; Approve&Send human; no auto-send; From `+27600200825` |
| S7 | Y | Staff copy = state + next action; no sermon; no invent PII/bodies/names |
| S8 | N/A | No new unlabeled primary controls |
| S9 | Design N / QA Y | Job-script: open thread 28 + peers; read real text + names |
| S10 | Y | **Must include** Prod `?thread=28` before/after (or Preview of the **same** data) **plus** inbox scan metadata-only count for `whatsapp_web` |

## Technical Context

**Language/Version**: TypeScript 5.5 + React 18.3 + Next.js 14.2

**Primary Dependencies**: Next.js App Router, Vitest, better-sqlite3 (tests), @libsql/client (Turso)

**Storage**: Existing Turso / SQLite `inbound_messages` + `inbound_threads` (no new tables; no Production migration)

**Testing**: Vitest unit + route tests in `apps/guestflow`

**Target Platform**: GuestFlow staff inbox (desktop + phone thread view already shipped)

**Project Type**: Web application — ingest / storage fix inside `apps/guestflow`

**Performance Goals**: Single-row in-place replace; idempotent backfill of a two-week / open-sentinel set without duplicate storms

**Constraints**: No auto-send; no Redirect / From change; no invent; no composer / Link-modal / Cloud conversion of `+27836458313`; no Production Turso apply without Grant

**Scale/Scope**: Personal WA Web observe → one inbound webhook + one backfill route + UMI thread title; ~thread 28 and peer temps

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Human-Gated Guest Send ✅
**Status**: PASS — ingest/backfill only. Approve&Send and outbound sinks untouched.

### Principle II: Fail-Closed Facts ✅
**Status**: PASS — never invent bodies or names; skip row if source has no text; phone fallback only when source has no name.

### Principle III: Booking SoR vs Comms SoR ✅
**Status**: PASS — unmatched temps stay temps; booking booker name still wins when a booking is linked.

### Principle IV: Channel Identity Freeze ✅
**Status**: PASS — From stays `+27600200825`; personal `+27836458313` remains observe-only.

### Principle V: Extend Live Systems, Stay Cost-Conscious ✅
**Status**: PASS — fix `inbound-ingest`, webhook, existing `/api/umi/backfill/wa-web`, and `umi-threads`. No parallel product.

### Principle VI: Retention and Lane Separation ✅
**Status**: PASS — hospitality comms only; 5-year retention unchanged.

**Post-design re-check**: still PASS. Design adds helpers and in-place UPDATE, not a new comms schema.

## Project Structure

### Documentation (this feature)

```text
specs/030-wa-web-full-bodies/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── wa-web-inbound.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/src/lib/wa-web-body.ts
apps/guestflow/src/lib/inbound-ingest.ts
apps/guestflow/src/lib/umi-threads.ts
apps/guestflow/src/app/api/inbound/webhook/route.ts
apps/guestflow/src/app/api/umi/backfill/wa-web/route.ts
apps/guestflow/docs/WA-WEB-BRIDGE-CONTRACT.md
apps/guestflow/docs/WA-WEB-FULL-BODIES.md
apps/guestflow/src/lib/__tests__/wa-web-body.test.ts
apps/guestflow/src/lib/__tests__/umi-threads.test.ts
apps/guestflow/__tests__/inbound-webhook-whatsapp-web.test.ts
apps/guestflow/__tests__/umi-wa-web-backfill.test.ts
docs/automation/STATUS.md
docs/automation/labor-ledger.md
```

**Structure Decision**: Extend live GuestFlow ingest/UMI files. Add one small helper module for sentinel + display-name rules so webhook, ingest, and backfill share one definition.

## Complexity Tracking

> No constitution violations.
