# Implementation Plan: WhatsApp Approve & Send for Inbound Queue

**Branch**: `cursor/whatsapp-approve-send-9a84` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-whatsapp-approve-send/spec.md`

**Note**: This plan implements the "Send via WhatsApp" functionality for the existing inbound queue, connecting the UI to the existing `sendWhatsAppMessage()` library function.

## Summary

Enable Ops Hub staff to send approved WhatsApp replies directly from the inbound queue UI by adding a "Send via WhatsApp" button that calls the existing `sendWhatsAppMessage()` function from `src/lib/whatsapp.ts`. The implementation must respect sandbox/live modes, persist outbound messages in the database with full audit trail, handle send failures gracefully, and prevent double-sends.

**Technical Approach**: 
- Add a new API route `POST /api/inbound/send` that accepts threadId, calls `sendWhatsAppMessage()`, and persists the outbound message
- Extend the inbound-queue UI modal to show a "Send via WhatsApp" button with confirmation dialog
- Add database migration to support "direction" field in `inbound_messages` table (or leverage existing schema)
- Add tests for the send action handler

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 (App Router)

**Primary Dependencies**: 
- React 18.3 (UI components)
- Next.js API routes (server-side send handler)
- Turso/libsql client 0.18 (database persistence)
- date-fns 3.6 (timestamp formatting)
- Existing `src/lib/whatsapp.ts` (Twilio/Meta WhatsApp send function)
- Existing `src/lib/db.ts` (database connection)

**Storage**: Turso (libsql) SQLite-compatible database with existing tables:
- `inbound_threads` (thread status tracking)
- `inbound_messages` (messages with direction field, or to be extended)
- `message_classifications` (existing classification data)

**Testing**: Vitest 1.0 (existing test framework in package.json)

**Target Platform**: Web application (Next.js server + browser client), deployed on Vercel

**Project Type**: Web service (Next.js full-stack app)

**Performance Goals**: 
- Send action completes within 5 seconds (including WhatsApp API call)
- UI remains responsive during send (optimistic updates + error handling)
- Database writes complete within 500ms

**Constraints**: 
- NEVER auto-send (human approval gate required)
- Respect WHATSAPP_MODE=sandbox (dry-run mode for testing)
- No production WhatsApp sends in CI/automated tests
- Preserve existing inbound webhook, classifier, and welcome-draft flows (non-breaking changes only)

**Scale/Scope**: 
- ~10-50 messages per day (internal Browns Dullstroom ops only)
- Single tenant (tenant_id=1)
- 2-3 staff users accessing the queue

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Template exists at `.specify/memory/constitution.md` but is not project-specific yet. Proceeding with standard best practices.

**Hard Rules Compliance**:
- ✅ NEVER auto-send without human approval (FR-002: confirmation dialog required)
- ✅ Respect sandbox mode (FR-008: honor WHATSAPP_MODE=sandbox)
- ✅ Conventional commits (will use `feat(guestflow):` prefix)
- ✅ Edit only files listed in tasks (UI modal, API route, database schema)
- ✅ Never commit secrets (using env vars only)

**Evaluation**: PASS - No violations detected

## Project Structure

### Documentation (this feature)

```text
specs/001-whatsapp-approve-send/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (message/thread entities)
├── quickstart.md        # Phase 1 output (manual smoke test guide)
├── contracts/           # Phase 1 output (API contract)
│   └── send-api.md     # POST /api/inbound/send contract
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── inbound/
│   │   │       ├── queue/route.ts          # Existing queue API (GET/PATCH)
│   │   │       ├── send/route.ts           # NEW: Send action handler (POST)
│   │   │       └── webhook/route.ts        # Existing inbound webhook
│   │   └── ops/
│   │       └── inbound-queue/
│   │           └── page.tsx                # MODIFY: Add send button + confirmation
│   ├── lib/
│   │   ├── whatsapp.ts                     # Existing send library (reuse as-is)
│   │   ├── db.ts                           # Existing database connection
│   │   └── inbound-classifier.ts           # Existing classifier (no changes)
│   └── types/
│       └── inbound.ts                      # NEW: TypeScript types for send action
├── scripts/
│   └── migrate-add-inbound-send.js         # NEW: Database migration for direction field (if needed)
└── __tests__/
    ├── inbound-send-handler.test.ts        # NEW: Tests for send API route
    └── inbound-classifier.test.ts          # Existing classifier tests (no changes)
```

**Structure Decision**: Single Next.js app (`apps/guestflow`) with API routes co-located in `src/app/api/`. The feature adds one new API route (`/api/inbound/send`) and modifies one UI page (`/ops/inbound-queue/page.tsx`). No new libraries or services required.

## Complexity Tracking

No constitution violations detected. No complexity justification required.
