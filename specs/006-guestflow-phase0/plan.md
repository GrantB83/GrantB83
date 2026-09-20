# Implementation Plan: GuestFlow Phase 0 Safety & Contact Foundation

**Branch**: `cursor/guestflow-phase0-1280` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-guestflow-phase0/spec.md`

## Summary

Close the GuestFlow send hole: `POST /api/inbound/send` must require approved/ready status **and** a one-time `confirmToken` for WhatsApp live, email, and WhatsApp Web queue. Persist `draft_source` (`heuristic|llm|human`). Add Turso-safe `guest_contacts` + `draft_jobs` (+ confirm-token table). Stub `POST /api/drafts/upsert` behind `DRAFT_WORKER_SECRET` only (never `CRON_SECRET`). Upsert contacts from Nightsbridge A&D ingest with ZA E.164 normalize. Email inbound already shares `ingestInboundMessage` — keep that path, enqueue draft jobs, document Resend webhook HOLD.

**Technical approach**:
- Reuse `src/lib/token.ts` hash/random for confirm tokens
- New libs: `confirm-token.ts`, `guest-contacts.ts`, `draft-jobs.ts`, `phone.ts`
- Idempotent `scripts/migrate-phase0-safety.js` + `db.ts` schema append
- UI: Needs Approval + inbound-queue obtain token after confirm, then POST send
- Tests first on send gate (reject / accept once / reuse)

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 App Router

**Primary Dependencies**: React 18.3, Next.js route handlers, `@libsql/client` 0.18, better-sqlite3 (local), Vitest 1.0, existing WhatsApp/email/send-jobs libs

**Storage**: Turso (production) / local SQLite. New tables `guest_contacts`, `draft_jobs`, `send_confirm_tokens`. Columns `draft_source` on `inbound_messages` (and `guest_tickets.guest_draft_source` if tickets drafts are edited)

**Testing**: Vitest (`apps/guestflow` `npm test`) with mocked DB / WhatsApp / Resend

**Target Platform**: Vercel production `https://guestflow.thebrowns.co.za`

**Project Type**: Web application (Next.js full-stack under `apps/guestflow`)

**Performance Goals**: Confirm+send stays inside existing staff click path (<8s including provider). Ingest upsert is per-row and must not fail A&D import if a single contact is unparseable.

**Constraints**:
- NEVER auto-send
- No Phase 1 LLM batch worker
- No Gmail Contacts merge
- `DRAFT_WORKER_SECRET` ≠ `CRON_SECRET`; stub rejects cron secret
- Never invent phones
- Retention 5 years after last stay then DELETE
- Resend inbound webhook HOLD
- Do not change Twilio/WA From or `WHATSAPP_MODE`
- No production deploy / no apply Turso migration without Grant
- Named env secrets only; never print secrets
- Turso migrations one statement at a time

**Scale/Scope**: Single Browns Dullstroom tenant; tens of guest messages/day; A&D files tens–hundreds of rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: `.specify/memory/constitution.md` is an unfilled template. Skip constitution MUST checks; apply AGENTS.md + CA-PROMPT-PHASE0 hard gates.

**Hard gates**:
- Human Send + confirmToken only
- No auto-send / allowlists
- No Phase 1 LLM batch
- No Gmail merge
- Dedicated `DRAFT_WORKER_SECRET`
- Null-tolerant contacts; never invent phones
- One specialised package; cheap tests; no production deploy

**Evaluation**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/006-guestflow-phase0/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-inbound-send.md
│   ├── api-confirm-token.md
│   ├── api-drafts-upsert.md
│   └── api-guest-contacts.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── scripts/migrate-phase0-safety.js
├── src/lib/phone.ts
├── src/lib/confirm-token.ts
├── src/lib/guest-contacts.ts
├── src/lib/draft-jobs.ts
├── src/app/api/inbound/confirm-token/route.ts
├── src/app/api/inbound/send/route.ts          # gate
├── src/app/api/drafts/upsert/route.ts
├── src/app/needs-approval/page.tsx
├── src/app/ops/inbound-queue/page.tsx
├── src/lib/inbound-ingest.ts
├── src/app/api/cron/nightsbridge-ingest/route.ts
├── __tests__/inbound-send-handler.test.ts
├── __tests__/email-send-handler.test.ts
├── src/lib/__tests__/phone.test.ts
├── src/lib/__tests__/guest-contacts.test.ts
├── src/lib/__tests__/draft-jobs.test.ts
├── __tests__/drafts-upsert-handler.test.ts
└── docs/PHASE0-SAFETY.md
```

**Structure Decision**: Extend existing `apps/guestflow` Next.js app. No new package.

## Complexity Tracking

> No constitution violations.
