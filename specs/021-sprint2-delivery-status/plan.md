# Implementation Plan: Sprint 2 Delivery Status + Resend

**Branch**: `cursor/sprint2-delivery-status-2304` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-sprint2-delivery-status/spec.md`

## Summary

Staff need in-thread delivery bubbles and a human-gated Resend. Extend live GuestFlow outbound rows (not a parallel comms product): persist provider message IDs, accept signature-verified Twilio StatusCallback and secret-verified Resend delivery webhooks, poll after 10 minutes when no callback arrives, mark Pending stuck after 15 minutes (config), flag Needs attention, and resend the same body with a fresh confirmToken. Parallel Sprint 2 PRs stay untouched: 24h window and templates are ports with TODOs; staff identity uses the current helper (email after #215); `onSendFailed` is a no-op hook for alerts.

## Technical Context

**Language/Version**: TypeScript 5.5 / Next.js 14 (App Router)

**Primary Dependencies**: Existing GuestFlow send stack — Twilio Messaging API, Resend, `confirm-token`, `outbound-redirect`, UMI inbox

**Storage**: Turso / libSQL (additive columns on `inbound_messages`). Migration script included, **not run** against Production.

**Testing**: Vitest (unit + route handlers). No live provider calls.

**Target Platform**: Vercel Preview for GuestFlow (`apps/guestflow/`). Production deploy is out of scope.

**Project Type**: Web application (Next.js staff inbox + API routes)

**Performance Goals**: Webhook ack under typical Vercel function budget; poll batch capped (≤50 messages)

**Constraints**: No auto-send. No Production Turso writes from this agent. No `typescript.ignoreBuildErrors`. From remains `+27600200825`. Diff stays out of user-mgmt, contacts, WhatsApp template catalogue, alerts mailer, and mobile.

**Scale/Scope**: Single hospitality tenant (The Browns). One conversation thread per booking.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | Resend requires confirm dialog + fresh confirmToken. Cron/poll never send. |
| II. Fail-Closed Facts | PASS | Unknown error codes → safe plain phrase. Window/template ports do not invent templates. |
| III. Booking SoR vs Comms SoR | PASS | No booking writes. Status lives on existing outbound messages. |
| IV. Channel Identity Freeze | PASS | Twilio From unchanged. Redirect only changes To. |
| V. Extend Live Systems | PASS | Additive columns + existing `/api/inbound/send` helpers. No new product. |
| VI. Retention / lanes | PASS | Reuses inbound message retention. Hospitality lane only. |

Post-design re-check: still PASS. Webhook routes are unauthenticated to staff cookie but fail-closed on signature/secret. Middleware allowlist is required so Twilio/Resend can POST.

## Project Structure

### Documentation (this feature)

```text
specs/021-sprint2-delivery-status/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-twilio-status.md
│   ├── api-resend-delivery.md
│   ├── api-delivery-poll.md
│   └── api-inbound-resend.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/
│   ├── delivery-status.ts          # mapping, ranks, stuck, plain errors
│   ├── delivery-schema.ts          # ensure additive columns
│   ├── delivery-poll.ts            # 10-minute provider poll
│   ├── twilio-signature.ts         # StatusCallback HMAC-SHA1
│   ├── resend-delivery-webhook.ts  # secret / Svix-style verify
│   ├── wa-window.ts                # getWindowState + findApprovedTemplateFor
│   ├── staff-identity.ts           # current staff helper
│   ├── send-failed-hook.ts         # onSendFailed for alerts PR
│   ├── whatsapp.ts                 # StatusCallback URL on Twilio send
│   ├── sms.ts                      # StatusCallback URL
│   ├── email.ts                    # already returns Resend id
│   └── umi-threads.ts              # needsAttention + message delivery fields
├── src/app/api/
│   ├── webhooks/twilio/status/route.ts
│   ├── webhooks/resend/route.ts
│   ├── cron/delivery-poll/route.ts
│   ├── inbound/send/route.ts       # persist provider id + pending
│   ├── inbound/resend/route.ts
│   └── inbound/confirm-token/route.ts  # purpose=resend
├── src/app/page.tsx                # bubbles + Resend
├── src/middleware.ts               # allow webhook paths
├── scripts/migrate-sprint2-delivery-status.js
├── docs/DELIVERY-STATUS.md
└── __tests__/
    ├── delivery-status.test.ts
    ├── delivery-webhooks.test.ts
    └── delivery-resend.test.ts
```

**Structure Decision**: Extend `apps/guestflow/` in place. New lib modules + three webhook/cron/resend routes. Do not add a parallel messages table.

## Complexity Tracking

No constitution violations. Ports for the WhatsApp PR are the simpler alternative to merging that catalogue here.
