# Implementation Plan: UMI Inbox Search & Surface Fix

**Branch**: `024-umi-inbox-search-fix` | **Date**: September 25, 2026 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-umi-inbox-search-fix/spec.md`

## Summary

Extend the staff inbox search (`GET /api/umi/inbox?q=`) to search across email subject, message preview, and full message bodies across all channels (WhatsApp, email, SMS), and fix the staff surface so threads with `thread_kind=temp` and `status=drafted` appear in the inbox list and are retrievable by ID.

**Technical Approach**: Modify `listInboxThreads` in `apps/guestflow/src/lib/umi-threads.ts` to join against `inbound_messages` table and search `message_text` and `thread.metadata.subject`. Implement case-insensitive, multi-token AND matching. Investigate and fix thread 48/49 omission root cause (likely status or thread_kind filtering).

## Technical Context

**Language/Version**: TypeScript (Node.js 18+)

**Primary Dependencies**: Next.js App Router, Turso/libSQL (SQLite), Vercel deployment

**Storage**: Turso (libSQL) with tables `inbound_threads`, `inbound_messages`, `bookings`

**Testing**: Vitest for unit tests

**Target Platform**: Web service (Next.js API routes) deployed on Vercel

**Project Type**: web-service

**Performance Goals**: Search response <2 seconds for typical inbox sizes (~50-200 threads); acceptable for partial matching without full-text search index

**Constraints**: 
- Must preserve existing search functionality (bookerName, fromNumber, suite, nbid, bookingId)
- Must not auto-send or bypass human approval gates
- Must use existing Turso schema (additive ALTER only, no table drops)
- Multi-token search uses AND logic (all tokens must match)
- Case-insensitive matching
- Partial phrase/word matching allowed

**Scale/Scope**: ~50-200 active threads per tenant; search typically returns 0-20 results; production database has threads 48/49 that currently return 404 or are omitted

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle II (Fail-Closed Facts)**: ✓ PASS - Search extension does not invent facts; it queries existing database records.

**Principle V (Extend Live Systems, Stay Cost-Conscious)**: ✓ PASS - Extends existing `listInboxThreads` function and Turso schema; does not create parallel product or scan full inbox.

**Principle I (Human-Gated Guest Send)**: N/A - This feature is read-only (search and fetch); no send capability.

**Principle III (Booking SoR vs Comms SoR)**: N/A - Does not modify booking or comms SoR relationship.

**Principle IV (Channel Identity Freeze)**: N/A - Does not touch channel identities or From numbers.

**Principle VI (Retention and Lane Separation)**: ✓ PASS - Respects existing 5-year retention; does not mix lanes.

## Project Structure

### Documentation (this feature)

```text
specs/024-umi-inbox-search-fix/
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
│   │   ├── umi-threads.ts              # MODIFY: listInboxThreads search logic
│   │   ├── umi-schema.ts               # REVIEW: ensure metadata column exists
│   │   └── __tests__/
│   │       └── umi-inbox-search.test.ts  # NEW: test suite for search functionality
│   └── app/
│       └── api/
│           └── umi/
│               ├── inbox/route.ts       # REVIEW: ensure passes q parameter correctly
│               └── threads/[id]/route.ts # REVIEW: ensure tenant filtering is correct
```

**Structure Decision**: Extends existing GuestFlow monorepo structure under `apps/guestflow/src/lib`. Uses existing Turso database client and schema management pattern. Tests go in `__tests__` alongside implementation per existing convention.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All checks pass.
