# Implementation Plan: Sprint 2 WhatsApp Window, Templates, and Property Knowledge

**Branch**: `cursor/sprint2-whatsapp-12b6` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-sprint2-whatsapp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add per-thread WhatsApp Cloud 24h customer-care awareness (UI + 409 free-text guard), a Grant-approved but unsubmitted template catalogue with WhatsApp-approved-only picker and ContentSid send, a never-run submit script, and a staff-editable property knowledge base injected into LLM draft context with a no-invent instruction. Stay inside `apps/guestflow/`. No merge, deploy, Production Turso writes, guest sends, or Meta/Twilio template submission.

## Technical Context

**Language/Version**: TypeScript 5.5 / Node 20, Next.js 14 App Router

**Primary Dependencies**: Existing GuestFlow stack (Next.js, React 18, Tailwind, Vitest, `@libsql/client`, `better-sqlite3`, `date-fns`). Twilio Messages API + read-only Content API fetch. No new runtime packages.

**Storage**: Turso/libSQL in production; local SQLite in tests. New tables `wa_templates` and `property_knowledge` created via `ensure*` on Preview/dev only (migration scripts exist, **not run against Production**).

**Testing**: Vitest (`npm test` in `apps/guestflow`). Unit tests for window math, 409 guard, SoR fill, picker filter, knowledge injection, prompt-level no-fact guard.

**Target Platform**: Vercel Preview for `apps/guestflow`. Typecheck must pass without `typescript.ignoreBuildErrors`.

**Project Type**: Web application (GuestFlow staff inbox + ops pages)

**Performance Goals**: Inbox list may add one grouped MAX(timestamp) query for last WABA inbound; no full-inbox scan.

**Constraints**: Human Approve&Send + confirmToken unchanged. Redirect still applies. Fail-closed codes. No suite-name substring property matching. No template create/submit. No Production Turso writes from this agent. Diff stays focused (do not rewrite the shared lockbox resolver owned by the data-fixes PR).

**Scale/Scope**: One property (The Browns), seven templates, two properties (cottage / main-house) plus shared knowledge, UMI inbox already on main.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Human-Gated Guest Send | PASS | Approve&Send + confirmToken unchanged; no auto-send; submit script not run |
| II. Fail-Closed Facts | PASS | Codes omitted without lockbox.property; KB unknowns ask staff; no invented seed |
| III. Booking SoR vs Comms SoR | PASS | Templates/KB do not rewrite Nightsbridge bookings |
| IV. Channel Identity Freeze | PASS | Window keyed to `+27600200825` Cloud only; Web observe does not open window |
| V. Extend Live Systems | PASS | Extend UMI inbox, inbound/send, access-codes SoR pattern; no new product |
| VI. Retention / lanes | PASS | Hospitality-only; no family/trust mix |

Post-design re-check: PASS. New tables are additive SoR lanes inside GuestFlow, not a parallel comms product.

## Project Structure

### Documentation (this feature)

```text
specs/019-sprint2-whatsapp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-inbound-send-window.md
│   ├── api-wa-templates.md
│   └── api-property-knowledge.md
├── checklists/requirements.md
├── seed-sources.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/whatsapp-care-window.ts
├── src/lib/wa-templates.ts
├── src/lib/wa-templates-seed.ts
├── src/lib/property-knowledge.ts
├── src/lib/property-knowledge-seed.ts
├── src/lib/access-codes-from-lockbox.ts
├── src/lib/whatsapp.ts                  # ContentSid send + comment fix
├── src/lib/umi-threads.ts               # window fields on list/detail
├── src/lib/batch-worker.ts              # KB injection
├── src/lib/__tests__/
├── src/app/page.tsx                     # badges, warning, picker
├── src/app/api/inbound/send/route.ts    # 409 + template send
├── src/app/api/ops/wa-templates/
├── src/app/api/ops/property-knowledge/
├── src/app/ops/property-knowledge/
├── prompts/DRAFT_PROMPT.md
├── scripts/migrate-sprint2-whatsapp.js  # NOT run on Production
├── scripts/submit-wa-templates.ts       # NOT run
├── __tests__/inbound-send-handler.test.ts
├── __tests__/wa-templates-picker.test.ts
└── __tests__/fixtures/kb-eval-questions.json
```

**Structure Decision**: Extend live GuestFlow app only. Spec artifacts live under `specs/019-sprint2-whatsapp/`.

## Complexity Tracking

> No constitution violations.
