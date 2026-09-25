# Data Model: Sprint 2 Delivery Status + Resend

**Date**: 2026-09-25  
**Feature**: [spec.md](./spec.md)

## Entity: Outbound delivery fields (`inbound_messages`)

Additive columns only. Existing send/UMI columns stay.

| Field | Type | Constraint | Notes |
| --- | --- | --- | --- |
| `provider_message_id` | TEXT | nullable, indexed | Twilio SID or Resend email id |
| `delivery_status` | TEXT | `pending` \| `delivered` \| `failed` | Bubble state. Default `pending` on accept |
| `delivery_read` | INTEGER | NOT NULL DEFAULT 0 | 1 when provider reports read/opened |
| `delivery_error_code` | TEXT | nullable | Raw provider code, never logged as a secret |
| `delivery_error_plain` | TEXT | nullable | Staff-facing phrase |
| `delivery_updated_at` | DATETIME | nullable | Last applied receipt or poll |
| `queued_at` | DATETIME | nullable | Accept time; stuck/poll clocks start here |
| `sent_to_test_sink` | INTEGER | NOT NULL DEFAULT 0 | 1 when redirect rewrote To |
| `resend_of` | INTEGER | nullable | Parent `inbound_messages.id` |
| `resent_by` | TEXT | nullable | `getStaffIdentity()` at press time |
| `resend_in_flight` | INTEGER | NOT NULL DEFAULT 0 | 1 on the **original** while a child is still pending |

`whatsapp_message_id` continues to be written with the same provider id for older readers.

### Validation

- `delivery_status` MUST be one of `pending`, `delivered`, `failed`
- `delivery_read` MUST be 0 or 1; only meaningful when status is `delivered`
- `resend_of` MUST point at an outbound row on the same thread
- At most one child of a given original MAY be `pending` at a time (`resend_in_flight`)

### State transitions

```text
(accept) → pending
pending  → delivered | failed | (read flag on delivered)
delivered → delivered+read | failed
failed   → (terminal for this row; recovery is a new row via resend)
```

Rank: pending=10, delivered=20, read=30, failed=40. Ignore updates with lower rank.

## Entity: Provider receipt (ephemeral)

Not persisted as its own table. Applied in memory then written onto the outbound row.

| Field | Source |
| --- | --- |
| `providerMessageId` | Twilio `MessageSid` / Resend `data.email_id` |
| `providerStatus` | Twilio `MessageStatus` / Resend event type |
| `errorCode` | Twilio `ErrorCode` / Resend bounce type |
| `errorMessage` | Provider text, mapped to plain words |

## Computed: Stuck pending

`delivery_status === 'pending'` AND `now - queued_at >= DELIVERY_STUCK_PENDING_MINUTES` (default 15).

## Computed: Needs attention

Existing UMI flags **OR** any outbound on the thread is `failed` **OR** stuck pending.

## Window / template ports (not stored)

```text
WindowState { open: boolean, closesAt?: string }
ApprovedTemplate { name: string, language?: string }
```

Stubs until the WhatsApp PR writes the real 24h clock and template catalogue.
