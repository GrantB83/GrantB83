# Implementation Plan: Sprint 2 Scheduled Arrival Drafts

**Branch**: `cursor/sprint2-arrival-drafts-e256` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-sprint2-arrival-drafts/spec.md`

## Summary

Idempotent Africa/Johannesburg arrival-draft job that writes T-3 / T-1 / Day-of editable UMI drafts (never sends). Codes only from `resolveAccessCodesForSuite`, re-read at Approve&Send. Channel WhatsApp-if-phone else email. Closed 24h window uses matching approved template or `template pending approval`. Skip cancelled + BLOCK. Late bookings get only remaining stages. Unique booking+stage. Date/suite change regenerates unsent. Cancel discards unsent. No contact → Needs-attention item, no guest draft.

Hobby rejects hourly Vercel cron, so Preview stays deployable with a **daily** `vercel.json` cron at the configured run hour (06:00 SAST = 04:00 UTC) plus an hourly GitHub Actions fallback that hits the same route. Do not put `0 * * * *` in `vercel.json`.

## Technical Context

**Language/Version**: TypeScript 5.5 / Node 20 / Next.js 14 (App Router)

**Primary Dependencies**: Existing GuestFlow (`apps/guestflow`), Vitest, date-fns, better-sqlite3 / Turso client (schema helpers only; no Production writes)

**Storage**: Additive `arrival_drafts` table on the existing SQLite/Turso GuestFlow DB. Migration script included, **not run** against Production.

**Testing**: Vitest unit + route tests (SAST midnight, late bookings, idempotency, cancel/date-change, code re-read, no-contact, property-unresolved)

**Target Platform**: Vercel Preview for `apps/guestflow` (`browns-guestflow`). No Production deploy.

**Project Type**: Web application (Next.js app in monorepo)

**Performance Goals**: One tenant scan of upcoming bookings per trigger; no full-inbox scan; job finishes well under the serverless timeout for Browns-scale books

**Constraints**: No auto-send; no Production Turso; no Meta/Twilio template submission; no `typescript.ignoreBuildErrors`; fail-closed codes; Inbox GET stays read-only

**Scale/Scope**: One app (`apps/guestflow`); three stages; one config file; resolver shims for #218/#219

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate |
| --- | --- |
| I. Human-Gated Guest Send | PASS — cron writes drafts only; send remains Approve&Send + confirmToken |
| II. Fail-Closed Facts | PASS — codes only from lockbox resolver; missing → placeholder + Needs attention; no LLM |
| III. Booking SoR vs Comms SoR | PASS — Nightsbridge bookings remain SoR; UMI stores drafts only |
| IV. Channel Identity Freeze | PASS — no new From numbers; current redirect behaviour unchanged |
| V. Extend Live Systems | PASS — extend UMI thread + inbound send; no parallel inbox product |
| VI. Retention / lanes | PASS — hospitality only; no new PII store beyond existing thread/draft rows |
| Safety | PASS — draft/queue/flag; no Production migration; no guest/bank/attorney send |

Post-design re-check: still PASS. Complexity is one table + one cron + shims, justified by Principle V.

## Project Structure

### Documentation (this feature)

```text
specs/023-sprint2-arrival-drafts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-cron-arrival-drafts.md
│   └── arrival-resolvers.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/arrival-drafts-config.ts
├── src/lib/arrival-templates.ts
├── src/lib/whatsapp-window.ts
├── src/lib/whatsapp-templates.ts
├── src/lib/contact-presence.ts
├── src/lib/arrival-drafts-schema.ts
├── src/lib/arrival-drafts.ts
├── src/lib/__tests__/arrival-drafts.test.ts
├── src/lib/__tests__/whatsapp-window.test.ts
├── src/lib/__tests__/contact-presence.test.ts
├── src/app/api/cron/arrival-drafts/route.ts
├── scripts/migrate-arrival-drafts.js
├── docs/ARRIVAL-DRAFTS.md
├── vercel.json
└── __tests__/arrival-drafts-cron.test.ts
.github/workflows/guestflow-arrival-drafts-hourly.yml
docs/automation/STATUS.md
docs/automation/labor-ledger.md
```

**Structure Decision**: Extend live GuestFlow (`apps/guestflow`) plus one Hobby-safe GitHub Actions workflow at repo root. No new app.

## Complexity Tracking

> No constitution violations.
