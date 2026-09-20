# Implementation Plan: GuestFlow Email Control Center & WhatsApp Web Bridge

**Branch**: `cursor/email-wa-bridge-6cf2` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-email-wa-bridge/spec.md`

## Summary

Ship a human-gated Email control center on GuestFlow (P0) plus an Interim WhatsApp Web job queue (P1) for Browns Dullstroom only. Email Send calls the existing Resend production identity (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`). Inbound Resend `email.received` events become `inbound_threads` with `source: email`. WhatsApp Web Send never reports success until the CoS clicker claims and completes a `send_jobs` row. `staff_ops` stays copy-only.

**Technical approach**:
- Add reusable `lib/email.ts` (Resend send + receiving fetch) and `lib/send-jobs.ts` (Turso-safe `send_jobs` + claim/complete)
- Extract shared inbound persist/classify into `lib/inbound-ingest.ts` so webhook + email intake reuse one path
- New routes: `POST /api/inbound/email`, `GET/POST` bridge job APIs, staff job-status poll
- Extend `POST /api/inbound/send` with an explicit `channel` (`email` | `whatsapp_web`); existing WhatsApp path remains
- UI: channel selector + confirm dialog on inbound-queue and Needs Approval (never on `staff_ops`)

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 App Router

**Primary Dependencies**: React 18.3, Next.js route handlers, `@libsql/client` 0.18, better-sqlite3 (local), Vitest 1.0, existing `src/lib/whatsapp.ts` (unchanged live behaviour), existing inbound classifier

**Storage**: Turso (production) / local SQLite. New table `send_jobs`. Existing `inbound_threads`, `inbound_messages`, `audit_log`

**Testing**: Vitest (`apps/guestflow` `npm test`) with mocked Resend `fetch` and mocked DB

**Target Platform**: Vercel production `https://guestflow.thebrowns.co.za`

**Project Type**: Web application (Next.js full-stack under `apps/guestflow`)

**Performance Goals**: Email Send completes within 8s including Resend; inbound email ingest within 15s including receiving-body fetch; bridge list/claim under 1s

**Constraints**:
- NEVER auto-send
- `staff_ops` copy-only unchanged
- No Twilio live WA / Cloud API / SMS buy; do not convert `+27836458313`
- Do not invent From addresses
- WA Web success only after bridge `complete` with `sent`
- Browns Dullstroom only
- Named env secrets only; never print secrets
- Turso migrations must be multi-statement-safe (`db.exec` already splits)

**Scale/Scope**: Single tenant, tens of guest messages/day, one CoS clicker

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: `.specify/memory/constitution.md` is an unfilled template. Skip constitution MUST checks; apply AGENTS.md + CA-PROMPT hard gates.

**Hard gates**:
- Human Send + confirm only
- staff_ops copy-only
- No live Twilio/SMS/number buy
- Existing `RESEND_*` envs
- WA Web fail-closed
- One specialised package, cheap tests, no production deploy

**Evaluation**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/005-email-wa-bridge/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-email-send.md
│   ├── api-inbound-email.md
│   └── api-bridge-jobs.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/email.ts
├── src/lib/send-jobs.ts
├── src/lib/inbound-ingest.ts
├── src/lib/__tests__/email.test.ts
├── src/lib/__tests__/send-jobs.test.ts
├── src/app/api/inbound/email/route.ts
├── src/app/api/inbound/send/route.ts          # extend channel
├── src/app/api/inbound/webhook/route.ts       # source: whatsapp_web
├── src/app/api/inbound/send-jobs/[id]/route.ts
├── src/app/api/bridge/jobs/route.ts
├── src/app/api/bridge/jobs/[id]/claim/route.ts
├── src/app/api/bridge/jobs/[id]/complete/route.ts
├── src/app/ops/inbound-queue/page.tsx
├── src/app/needs-approval/page.tsx
├── src/middleware.ts
├── src/types/inbound.ts
├── scripts/migrate-add-send-jobs.js
├── __tests__/email-send-handler.test.ts
├── __tests__/inbound-email-webhook.test.ts
├── __tests__/bridge-jobs.test.ts
├── docs/EMAIL-CONTROL-CENTER.md
├── docs/WA-WEB-BRIDGE-CONTRACT.md
└── .env.example
```

**Structure Decision**: Extend existing GuestFlow Next.js app. No new product. Libraries first (`email.ts`, `send-jobs.ts`), then routes, then UI.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
