# Implementation Plan: GuestFlow Outbound Redirect for Pre-Live Testing

**Branch**: `cursor/outbound-redirect-6711` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-outbound-redirect/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Implement a dual-gate pre-live redirect system for GuestFlow that intercepts ALL outbound guest communications (WhatsApp via Twilio, Resend email, WhatsApp Web send_jobs) and routes them to Grant's test sinks (`+15124064300` for WhatsApp, `grant830318@gmail.com` for email) when `OUTBOUND_MODE=redirect`. The system enforces fail-closed behavior (blocks sends when sinks are missing), requires explicit `OUTBOUND_LIVE_CLEAR=true` for live mode, maintains complete audit trail with intended and actual recipients, displays staff banner during redirect, exposes status via health endpoint, and provides comprehensive test coverage. From identities remain unchanged. Phase 0 approval gates unchanged. No auto-send. Technical approach: shared `resolveOutboundRecipient` resolver function called from `whatsapp.ts`, `email.ts`, and `send-jobs.ts` before external API calls or job creation.

## Technical Context

**Language/Version**: TypeScript (Next.js 15 App Router)

**Primary Dependencies**: Next.js 15, Turso (Turbo SQLite), Twilio Messaging API, Resend API, React 19

**Storage**: Turso (libsql) for `send_jobs` table and message metadata. Existing schema with `to_address` column and metadata JSON support.

**Testing**: Vitest for unit and integration tests. Existing test infrastructure in `apps/guestflow/__tests__/`. Mock external APIs (Twilio, Resend) for redirect tests.

**Target Platform**: Vercel Edge Runtime for API routes. Node.js 20+ runtime for functions.

**Project Type**: Web service (Next.js API routes + React staff UI)

**Performance Goals**: <500ms API response time for send operations. Zero added latency to redirect resolution (<5ms overhead). Health endpoint <100ms response.

**Constraints**: Fail-closed by default (block on missing config). Never hardcode test sinks in source (env-only). Never change From identities. Preserve Phase 0 approve + confirmToken gates. No external API calls in tests. Must work with existing Twilio live mode (not sandbox-dependent).

**Scale/Scope**: Single tenant (Browns Dullstroom). ~50-100 guest sends/day in live mode. Staff UI supports 2-5 concurrent users. 4 new test files. ~200 lines of production code (resolver + integrations + banner + health). 3-file core: `outbound-redirect.ts` (resolver), updates to `whatsapp.ts`, `email.ts`, `send-jobs.ts`. Staff banner in existing layout. Health endpoint extension.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS (No constitution file present; general engineering best practices apply)

This feature:
- Adds minimal complexity (one shared resolver, three integration points)
- Follows existing GuestFlow patterns (env-based configuration, audit metadata)
- Uses existing test infrastructure
- Does not introduce new dependencies or architectural layers
- Maintains fail-closed safety principles
- Preserves existing Phase 0 approval gates
- Single responsibility: redirect logic isolated in one module

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── lib/
│   │   ├── outbound-redirect.ts       # NEW: Shared resolver function
│   │   ├── whatsapp.ts                # MODIFIED: Call resolver before Twilio API
│   │   ├── email.ts                   # MODIFIED: Call resolver before Resend API
│   │   └── send-jobs.ts               # MODIFIED: Call resolver before job insert
│   ├── app/
│   │   ├── layout.tsx                 # MODIFIED: Add redirect banner component
│   │   └── api/
│   │       └── health/
│   │           └── route.ts           # MODIFIED: Add outbound status fields
│   └── components/
│       └── outbound-redirect-banner.tsx # NEW: Staff banner component (optional)
└── __tests__/
    ├── lib/
    │   └── __tests__/
    │       └── outbound-redirect.test.ts  # NEW: Resolver unit tests
    ├── whatsapp.test.ts               # MODIFIED: Add redirect scenarios
    ├── email.test.ts                  # MODIFIED: Add redirect scenarios (or new file)
    └── send-jobs.test.ts              # MODIFIED: Add redirect scenarios (or new file)
```

**Structure Decision**: Next.js monorepo structure under `apps/guestflow`. Core redirect logic in `src/lib/outbound-redirect.ts` (new). Modifications to three existing lib files to call resolver. Staff UI change in layout or dedicated banner component. Health endpoint extended. Tests follow existing Vitest structure in `__tests__/` with colocation for lib tests.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This feature adds minimal complexity and follows existing patterns.
