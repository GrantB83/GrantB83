# Implementation Plan: WhatsApp Web Inbound Allowlist Bridge

**Branch**: `cursor/wa-web-inbound-allowlist-b93e` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-wa-web-inbound-allowlist/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Implement fail-closed allowlist gate for personal WhatsApp Web (+27836458313) inbound messages into GuestFlow. Only messages from known guests (in guest_contacts, has booking, or open Twilio thread) are ingested. Storage is metadata-only (no message bodies). Unknown senders route to triage queue with retention=0. Messages from allowlisted senders merge into existing Twilio threads when present (deduplication). Optional: remove noreply email fallback.

Technical approach: Extend existing `/api/inbound/webhook` to handle `source=whatsapp_web` with allowlist validation before any Turso write. Normalize phone to E.164, check guest_contacts + bookings + open threads. Strip/reject body content. Provide minimal triage UI for unknown senders.

## Technical Context

**Language/Version**: TypeScript 5.x + Node.js 20.x (Next.js 14 App Router)

**Primary Dependencies**: Next.js 14, Turso (libSQL), Resend (email), Twilio (outbound WhatsApp)

**Storage**: Turso serverless SQLite (libSQL) with schema migrations via Node.js scripts

**Testing**: Vitest (unit tests), focused test coverage for allowlist logic + metadata-only strip + triage routing

**Target Platform**: Vercel serverless (Node.js runtime), webhook endpoint at `/api/inbound/webhook`

**Project Type**: Next.js web service - hospitality guest communication platform

**Performance Goals**: Webhook response <2s, handle 100 concurrent inbound messages, zero duplicate threads

**Constraints**: Fail-closed security (no auto-create guests from unknown), metadata-only storage (Vault requirement), reuse existing webhook/auth, no second endpoint/secret, Twilio +27600200825 remains canonical outbound From

**Scale/Scope**: Browns-only personal WhatsApp bridge, batch cadence 15-20min SAST daytime, ~10-50 messages/day expected, staff triage UI for <5 unknowns/week

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS (no constitution.md exists; no gates to enforce)

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
│   ├── app/
│   │   └── api/
│   │       └── inbound/
│   │           └── webhook/
│   │               └── route.ts (MODIFY: add WhatsApp Web source handling)
│   ├── lib/
│   │   ├── guest-contacts.ts (EXISTING: allowlist check helper)
│   │   ├── phone.ts (EXISTING: E.164 normalization)
│   │   ├── inbound-ingest.ts (EXISTING: thread/message persistence)
│   │   └── whatsapp-web-allowlist.ts (NEW: allowlist gate logic)
│   └── types/
│       └── inbound.ts (MODIFY: add WhatsApp Web payload types)
├── scripts/
│   └── migrate-whatsapp-web-allowlist.js (NEW: schema changes if needed)
└── __tests__/
    ├── inbound-webhook-whatsapp-web.test.ts (EXISTING: extend for allowlist)
    └── whatsapp-web-allowlist.test.ts (NEW: unit tests for allowlist logic)

specs/007-wa-web-inbound-allowlist/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── whatsapp-web-webhook.md
└── quickstart.md
```

**Structure Decision**: Monorepo with Next.js App Router web service. Feature extends existing `/api/inbound/webhook` route. New library module for allowlist logic. Tests use Vitest. No new UI components initially (triage UI is minimal table extension).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
