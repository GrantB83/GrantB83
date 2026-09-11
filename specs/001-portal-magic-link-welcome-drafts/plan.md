# Implementation Plan: Portal Magic Link Minting in Welcome Drafts

**Branch**: `cursor/portal-magic-link-welcome-drafts-ef7d` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-portal-magic-link-welcome-drafts/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Automatically mint guest portal magic links during welcome draft generation in the Ops Hub. When staff generate welcome drafts for upcoming check-ins, the system will create cryptographic tokens, store them securely in the guest_tokens table, and include the full portal URL in the draft message body - eliminating the need for manual token generation or placeholder replacement.

Technical approach: Extend the existing `/api/welcome-drafts` route to call token generation utilities (`generateGuestToken`, `hashToken`, `calculateTokenExpiry`) and portal URL helpers (`getGuestPortalUrl`) for each booking during draft generation. Implement token reuse logic to check for existing valid tokens before creating new ones.

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js 20+

**Primary Dependencies**: Next.js 14.2 (App Router), better-sqlite3 11.0, date-fns 3.6

**Storage**: SQLite (better-sqlite3) with existing `bookings` and `guest_tokens` tables

**Testing**: Vitest 1.0 (existing test suite pattern)

**Target Platform**: Next.js App Router API routes (Node.js runtime), Vercel deployment

**Project Type**: Web application (Next.js full-stack) - internal ops tool

**Performance Goals**: Draft generation <2s for typical date window (1-5 bookings), token generation adds <50ms per booking

**Constraints**: Must not break existing welcome drafts flow, must reuse tokens when valid, must handle token generation errors gracefully, sandbox-safe (works in demo/test mode)

**Scale/Scope**: Internal Browns Dullstroom ops tool, ~10-50 bookings per week, single-tenant deployment, staff-only access

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**No project constitution file found** - proceeding with standard software engineering best practices:
- ✅ Reuse existing utilities (token.ts, portal-url.ts) rather than reinventing
- ✅ Follow existing API route patterns in apps/guestflow/src/app/api
- ✅ Maintain backwards compatibility with existing welcome drafts interface
- ✅ Add tests following existing Vitest patterns in __tests__/
- ✅ No breaking changes to inbound #183 send path or contact API
- ✅ AGENTS.md Hard Rule #1 compliance: Edit only files in assigned work package (welcome-drafts route, related utilities)

## Project Structure

### Documentation (this feature)

```text
specs/001-portal-magic-link-welcome-drafts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── welcome-drafts/
│   │           └── route.ts                    # PRIMARY: Add token minting logic
│   ├── lib/
│   │   ├── token.ts                            # EXISTING: Token generation utilities
│   │   ├── portal-url.ts                       # EXISTING: Portal URL construction
│   │   └── db.ts                               # EXISTING: Database connection
│   └── __tests__/
│       └── welcome-drafts-portal-links.test.ts # NEW: Integration tests
└── package.json                                # Dependencies (no changes needed)
```

**Structure Decision**: This is a Next.js 14 App Router web application. The feature modifies a single API route (`apps/guestflow/src/app/api/welcome-drafts/route.ts`) to integrate existing token generation and portal URL utilities during draft generation. No new directories or major structural changes required - follows established patterns in the guestflow app.

## Complexity Tracking

> **No violations** - Feature reuses existing utilities and follows established patterns. No additional complexity introduced.
