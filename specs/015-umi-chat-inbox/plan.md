# Implementation Plan: GuestFlow Unified Messaging Interface (UMI v2.1)

**Branch**: `cursor/umi-v21-d18e` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-umi-chat-inbox/spec.md`

## Summary

Make the staff home a WhatsApp-style inbox: one thread per Nightsbridge booking (booker contact), all channels in that timeline, auto-draft after spam filter, Approve&Send only. Extend live `inbound_threads` / `inbound_messages` / `guest_contacts` / `draft_jobs` rather than a parallel comms system. Slim nav in the same change. Lift Resend inbound product HOLD. Store WA Web full bodies + one-time 14-day backfill with Cloud↔Web dedup. SMS day one on the existing Twilio family.

## Technical Context

**Language/Version**: TypeScript 5.5 / Next.js 14.2 App Router (existing `apps/guestflow`)

**Primary Dependencies**: React 18, date-fns, lucide-react, Zod, `@libsql/client`, better-sqlite3, existing Twilio / Resend / Meta helpers

**Storage**: Turso (libsql) in Production; better-sqlite3 locally. Additive ALTER TABLE + `ensureUmiSchema()` at request time (same pattern as Phase 0).

**Testing**: Vitest (`npm test` in `apps/guestflow`) plus Next lint/build

**Target Platform**: Vercel Production `https://guestflow.thebrowns.co.za` + Preview; staff browser (desktop + mobile nav)

**Project Type**: Existing web application (staff ops + inbound webhooks)

**Performance Goals**: Inbox list for a Browns-scale stay book (tens to low hundreds of active threads) in one query; webhook ingest fail-closed under 30s

**Constraints**: No auto-send; `OUTBOUND_MODE=redirect` until separate CLEAR; From +27600200825; personal +27836458313 observe-only; never invent PII/rates/ETAs/codes; no new Twilio buy; no multi-tenant; no production deploy/migration apply without Grant

**Scale/Scope**: Single property (Browns Dullstroom). Touch `apps/guestflow` + this spec dir + STATUS/labor-ledger.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | Drafts only; send stays `confirmToken` + approve; no auto-send; redirect sinks unchanged |
| II. Fail-Closed Facts | PASS | Match on stored booker phone/email only; spam unsure → store without draft; no invented rates/PII |
| III. Booking SoR vs Comms SoR | PASS | `booking_id` FK on threads; UMI does not write stay facts |
| IV. Channel Identity Freeze | PASS | Cloud From unchanged; WA Web observe; SMS reuses Twilio family; no number buy |
| V. Extend Live Systems | PASS | ALTER live inbound tables; reuse ingest, send, contacts, draft_jobs |
| VI. Retention + lanes | PASS | Keep `guest_contacts` 5y-after-last-stay; hospitality lane only |

Post-design re-check: still PASS. Complexity is additive columns + one inbox UI, not a new product.

## Project Structure

### Documentation (this feature)

```text
specs/015-umi-chat-inbox/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-umi-inbox.md
│   └── api-umi-inbound.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/umi-schema.ts
├── src/lib/umi-threads.ts
├── src/lib/umi-sort.ts
├── src/lib/umi-spam.ts
├── src/lib/umi-dedup.ts
├── src/lib/umi-channels.ts
├── src/lib/inbound-ingest.ts          # booking/temp match + channel + draft
├── src/lib/inbound-classifier.ts      # keep; spam upgrade via umi-spam
├── src/lib/email.ts                   # source+sender tag helper
├── src/lib/approvals-queue.ts         # needs-attention projection
├── src/types/inbound.ts               # sms channel
├── src/app/page.tsx                   # chat inbox home
├── src/app/comms/page.tsx             # redirect or reuse inbox
├── src/app/needs-approval/page.tsx    # keep copy-only staff_ops; not in nav
├── src/components/Navigation.tsx      # slim primary + More
├── src/app/ops/page.tsx               # drop Needs Approval from primary
├── src/app/api/umi/inbox/route.ts
├── src/app/api/umi/threads/[id]/route.ts
├── src/app/api/umi/threads/[id]/link/route.ts
├── src/app/api/umi/threads/[id]/draft/route.ts
├── src/app/api/umi/backfill/wa-web/route.ts
├── src/app/api/inbound/webhook/route.ts
├── src/app/api/inbound/email/route.ts
├── src/app/api/inbound/send/route.ts
├── scripts/migrate-umi-v21.js
├── docs/UMI-V21.md
└── __tests__/umi-*.test.ts
```

**Structure Decision**: Extend the existing Next.js GuestFlow app. No new package or service.

## Complexity Tracking

> No constitution violations requiring justification.
