# Data Model: GuestFlow Outbound Redirect for Pre-Live Testing

**Date**: 2026-09-20

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document defines the data entities, types, and relationships for the outbound redirect feature. Most entities are ephemeral (function return types) or extend existing database schema with metadata fields.

## Core Types (TypeScript)

### OutboundRecipientResolution

**Purpose**: Result type returned by `resolveOutboundRecipient` function. Consumed by whatsapp/email/send-jobs modules.

**Definition**:
```typescript
export interface OutboundRecipientResolution {
  to: string                     // Resolved recipient (sink or original guest)
  redirected: boolean            // True if redirect was applied
  intendedTo: string             // Original guest contact (phone/email)
  mode: 'redirect' | 'live'      // Active outbound mode at resolution time
}
```

**Field Constraints**:
- `to`: Non-empty string. E.164 format for WhatsApp (`+15124064300`), email format for email (`grant830318@gmail.com`)
- `redirected`: `true` when `mode=redirect` and sink was used; `false` when `mode=live` or resolution failed
- `intendedTo`: Original guest contact as provided by caller. Must be non-empty. Caller validates format.
- `mode`: Enum `'redirect' | 'live'`. Unknown env values default to `'redirect'` in resolver logic.

**Validation**: Resolver throws on:
- Missing `intendedTo` (caller's responsibility to validate before calling)
- Missing sink when `mode=redirect` (fail-closed)
- Invalid channel (not `'whatsapp'` or `'email'`)

**Lifecycle**: Ephemeral. Created per send/job. Not persisted as a standalone entity. Fields extracted into audit metadata.

---

### OutboundStatus

**Purpose**: Health endpoint response type for outbound mode status.

**Definition**:
```typescript
export interface OutboundStatus {
  mode: 'redirect' | 'live'                   // Current OUTBOUND_MODE (or default)
  redirectStatus: 'on' | 'off' | 'blocked'    // Effective redirect state
}
```

**Field Values**:
- `mode`: Read from `OUTBOUND_MODE` env. Unknown/missing defaults to `'redirect'`.
- `redirectStatus`:
  - `'on'`: `mode=redirect`
  - `'off'`: `mode=live` AND `OUTBOUND_LIVE_CLEAR=true`
  - `'blocked'`: `mode=live` BUT `OUTBOUND_LIVE_CLEAR` ≠ `"true"`

**Usage**: Called by `/api/health` route. Included in health JSON response.

---

## Database Schema Extensions

### send_jobs Table (Existing, Modified)

**Table**: `send_jobs`

**Existing Columns** (unchanged):
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `channel`: TEXT ('whatsapp_web' | 'email')
- `status`: TEXT ('queued' | 'claimed' | 'sent' | 'failed' | 'blocked')
- `thread_id`: INTEGER
- `to_address`: TEXT (resolved recipient after redirect)
- `body_text`: TEXT
- `subject`: TEXT (nullable)
- `claim_token`: TEXT (nullable)
- `claimed_at`: DATETIME (nullable)
- `completed_at`: DATETIME (nullable)
- `error_code`: TEXT (nullable)
- `created_at`: DATETIME (default CURRENT_TIMESTAMP)
- `updated_at`: DATETIME (default CURRENT_TIMESTAMP)

**New/Modified**:
- `to_address`: Now holds **resolved** recipient (Grant's sink when redirect is on, original guest when live). Pre-redirect original stored in metadata.
- **Metadata JSON field** (new column or extended use of existing JSON column):
  ```json
  {
    "intended_to": "+27821234567",
    "redirect_enabled": true,
    "mode": "redirect"
  }
  ```
  If `send_jobs` table already has a metadata-like JSON column, reuse it. If not, add:
  ```sql
  ALTER TABLE send_jobs ADD COLUMN metadata TEXT; -- JSON string
  ```

**Field Constraints**:
- `intended_to` (in metadata): Original guest contact. Non-empty. May be phone (E.164) or email depending on `channel`.
- `redirect_enabled` (in metadata): Boolean. `true` if redirect was applied, `false` if live send.
- `mode` (in metadata): String `"redirect"` or `"live"`. Matches `OutboundRecipientResolution.mode`.

**Indexes**: No new indexes required. Existing `idx_send_jobs_status_created` and `idx_send_jobs_thread` sufficient.

**Migration**: If metadata column is new:
- Migration adds column (default NULL for existing rows)
- Existing rows (created before this feature) have `metadata=NULL` or `{}` → treat as heuristic/live (no redirect applied)
- New rows (created after this feature) always have metadata populated

---

### Message/Email Audit (Existing, Extended)

**Context**: GuestFlow Phase 0 already has message metadata for WhatsApp and email sends. Exact storage varies (may be in `messages` table, `email_audit` table, or structured logs).

**Extension**: Add same metadata fields as `send_jobs`:
- `intended_to`: Original guest contact
- `actual_to`: Resolved recipient (may differ from `intended_to` when redirected)
- `redirect_enabled`: Boolean
- `mode`: String `"redirect"` or `"live"`

**Implementation Options**:
1. If `messages` table has metadata JSON column: add fields there
2. If separate `email_audit` table: add columns or JSON field
3. If logs only: structure logs with these fields as top-level keys for queryability

**Requirement**: Must be queryable by Grant/CoS for post-send verification. Logs alone are acceptable for Phase 0 if they are structured and retained.

**Example Log Entry** (if using structured logging):
```json
{
  "timestamp": "2026-09-20T12:34:56Z",
  "level": "info",
  "event": "outbound_send",
  "channel": "whatsapp",
  "intended_to": "+2782***4567",
  "actual_to": "+15124064300",
  "redirect_enabled": true,
  "mode": "redirect",
  "success": true,
  "message_id": "SMXXXXX"
}
```

---

## Configuration (Environment Variables)

**Source of Truth**: Vercel environment variables (Production, Preview, Development).

**Variables**:

| Variable | Type | Required | Default | Example |
|----------|------|----------|---------|---------|
| `OUTBOUND_MODE` | String | No | `'redirect'` (fail-closed) | `'redirect'` or `'live'` |
| `OUTBOUND_REDIRECT_TO_WA` | E.164 String | Conditional* | None | `+15124064300` |
| `OUTBOUND_REDIRECT_TO_EMAIL` | Email String | Conditional* | None | `grant830318@gmail.com` |
| `OUTBOUND_LIVE_CLEAR` | String | No | `'false'` | `'true'` (exact string) |

*Required when `OUTBOUND_MODE=redirect` and the corresponding channel is used. Missing → fail-closed block.

**Validation**:
- `OUTBOUND_MODE`: Unknown/empty values default to `'redirect'` (fail-closed in production).
- `OUTBOUND_REDIRECT_TO_WA`: Must be valid E.164 if present. Validation in caller (phone lib), not resolver.
- `OUTBOUND_REDIRECT_TO_EMAIL`: Must be valid email if present. Validation in `email.ts`.
- `OUTBOUND_LIVE_CLEAR`: Only exact string `"true"` enables live mode. Case-sensitive.

**Access**: All vars read at runtime (no build-time baking). Server-side only (never exposed to client).

---

## State Transitions

### Outbound Mode States

```
┌─────────────┐
│  redirect   │ ◄─── Default (unknown MODE, missing MODE, or explicit MODE=redirect)
└──────┬──────┘
       │
       │ NeedsGrant: Set MODE=live + LIVE_CLEAR=true + redeploy
       ▼
┌─────────────┐
│    live     │ ──── Sends to real guests (only if LIVE_CLEAR=true)
└──────┬──────┘
       │
       │ Grant sets LIVE_CLEAR=false + redeploy
       ▼
┌─────────────┐
│  blocked    │ ──── MODE=live but LIVE_CLEAR ≠ true → no real guest sends
└─────────────┘
       │
       │ Grant sets MODE=redirect + redeploy
       ▼
┌─────────────┐
│  redirect   │ ──── Back to redirect (full circle)
└─────────────┘
```

**Transitions**:
- `redirect` → `live`: Requires `OUTBOUND_MODE=live` + `OUTBOUND_LIVE_CLEAR=true` + redeploy
- `live` → `blocked`: Set `OUTBOUND_LIVE_CLEAR=false` + redeploy (or remove it)
- `live` → `redirect`: Set `OUTBOUND_MODE=redirect` + redeploy
- `blocked` → `live`: Set `OUTBOUND_LIVE_CLEAR=true` + redeploy
- `blocked` → `redirect`: Set `OUTBOUND_MODE=redirect` + redeploy

**No Automatic Transitions**: Expiry timers, scheduled switches, or in-app toggles are FORBIDDEN. All transitions require env change + redeploy.

---

## Relationships

### Resolver → Send Functions

```
┌──────────────────────────┐
│ resolveOutboundRecipient │
│  (outbound-redirect.ts)  │
└────────────┬─────────────┘
             │
             │ returns OutboundRecipientResolution
             ├──────────────┬──────────────┬─────────────┐
             ▼              ▼              ▼             │
    ┌────────────────┐ ┌────────────┐ ┌─────────────┐  │
    │sendWhatsAppMsg │ │ sendEmail  │ │createQueuedJob│
    │ (whatsapp.ts)  │ │(email.ts)  │ │(send-jobs.ts) │
    └────────────────┘ └────────────┘ └─────────────┘  │
             │              │              │             │
             │              │              │             │
             ▼              ▼              ▼             ▼
       Twilio API     Resend API    Insert send_jobs   Staff UI
                                     with metadata      Banner/Health
```

### Data Flow (Redirect On)

```
Guest Contact          resolveOutboundRecipient        External API / DB
+27821234567    ──►    mode=redirect            ──►    to: +15124064300
                       redirected=true                  (Grant's sink)
                       intendedTo: +27821234567
                       mode: 'redirect'
                              │
                              └──► Audit Metadata
                                   { intended_to, redirect_enabled, mode }
```

### Data Flow (Live Mode)

```
Guest Contact          resolveOutboundRecipient        External API / DB
guest@example.com ──►  mode=live                ──►    to: guest@example.com
                       LIVE_CLEAR=true                  (Real guest)
                       redirected=false
                       intendedTo: guest@example.com
                       mode: 'live'
                              │
                              └──► Audit Metadata
                                   { intended_to, redirect_enabled: false, mode: 'live' }
```

---

## Summary

**New Entities**:
- `OutboundRecipientResolution` (TypeScript interface, ephemeral)
- `OutboundStatus` (TypeScript interface, ephemeral)

**Extended Entities**:
- `send_jobs` table: metadata JSON field with `intended_to`, `redirect_enabled`, `mode`
- Message/email audit: similar metadata fields (exact storage TBD, logs acceptable)

**Configuration**: 4 environment variables (`OUTBOUND_MODE`, `REDIRECT_TO_WA`, `REDIRECT_TO_EMAIL`, `LIVE_CLEAR`)

**No New Tables**: All data fits in existing schema or ephemeral function results.

**Next Steps**: Define contracts (if applicable) and quickstart validation scenarios.
