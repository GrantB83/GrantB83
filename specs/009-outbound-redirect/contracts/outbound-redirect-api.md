# Contract: Outbound Redirect Resolver API

**Feature**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

## Overview

This contract defines the internal API for the `resolveOutboundRecipient` function in `src/lib/outbound-redirect.ts`. This function is called by `whatsapp.ts`, `email.ts`, and `send-jobs.ts` before sending messages or creating jobs. It resolves the final recipient based on environment configuration (redirect mode vs live mode).

**Consumers**: Internal GuestFlow modules (`whatsapp.ts`, `email.ts`, `send-jobs.ts`)

**Stability**: Internal API. Breaking changes allowed with coordinated updates to consumers.

---

## Function Signature

### `resolveOutboundRecipient`

**Purpose**: Determine the final recipient for an outbound message or job based on redirect/live mode configuration.

**Signature**:
```typescript
export function resolveOutboundRecipient(input: {
  channel: 'whatsapp' | 'email'
  intendedTo: string
}): OutboundRecipientResolution

export interface OutboundRecipientResolution {
  to: string
  redirected: boolean
  intendedTo: string
  mode: 'redirect' | 'live'
}
```

**Parameters**:

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `channel` | `'whatsapp' \| 'email'` | Yes | Channel type for the send | Must be one of the enum values. `'whatsapp_web'` jobs should use `'whatsapp'` (internally normalized). |
| `intendedTo` | `string` | Yes | Original guest contact (phone or email) | Non-empty string. Caller must validate format before calling. E.164 for WhatsApp, email format for email. |

**Returns**: `OutboundRecipientResolution` object with:

| Field | Type | Description |
|-------|------|-------------|
| `to` | `string` | Resolved recipient. Grant's sink when `mode=redirect`, original `intendedTo` when `mode=live`. |
| `redirected` | `boolean` | `true` if redirect was applied, `false` if live send. |
| `intendedTo` | `string` | Echo of input `intendedTo` (original guest contact). |
| `mode` | `'redirect' \| 'live'` | Active outbound mode at time of resolution. |

**Throws**:
- `Error('Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set')` when `mode=redirect`, `channel=whatsapp`, and `OUTBOUND_REDIRECT_TO_WA` is missing/empty
- `Error('Redirect enabled but OUTBOUND_REDIRECT_TO_EMAIL not set')` when `mode=redirect`, `channel=email`, and `OUTBOUND_REDIRECT_TO_EMAIL` is missing/empty
- `Error('Invalid channel: ...')` when `channel` is not `'whatsapp'` or `'email'`
- `Error('intendedTo is required')` when `intendedTo` is missing/empty (defensive check; callers should validate)

**Behavior**:

1. Read `OUTBOUND_MODE` from `process.env`. If missing/unknown/empty → default to `'redirect'` (fail-closed).
2. If `OUTBOUND_MODE=live`:
   - Check `OUTBOUND_LIVE_CLEAR`. If not exactly `"true"` → block (treat as redirect or throw; implementation may vary).
   - If `OUTBOUND_LIVE_CLEAR=true` → return `{ to: intendedTo, redirected: false, intendedTo, mode: 'live' }`
3. If `OUTBOUND_MODE=redirect` (or defaulted to redirect):
   - Read appropriate sink env:
     - `channel=whatsapp` → read `OUTBOUND_REDIRECT_TO_WA`
     - `channel=email` → read `OUTBOUND_REDIRECT_TO_EMAIL`
   - If sink is missing/empty → throw (fail-closed)
   - If sink is present → return `{ to: sink, redirected: true, intendedTo, mode: 'redirect' }`

**Example Calls**:

```typescript
// Redirect mode, WhatsApp channel, sink configured
const result = resolveOutboundRecipient({
  channel: 'whatsapp',
  intendedTo: '+27821234567'
})
// Returns: {
//   to: '+15124064300',
//   redirected: true,
//   intendedTo: '+27821234567',
//   mode: 'redirect'
// }

// Live mode, email channel, LIVE_CLEAR=true
const result = resolveOutboundRecipient({
  channel: 'email',
  intendedTo: 'guest@example.com'
})
// Returns: {
//   to: 'guest@example.com',
//   redirected: false,
//   intendedTo: 'guest@example.com',
//   mode: 'live'
// }

// Redirect mode, missing sink → throws
const result = resolveOutboundRecipient({
  channel: 'whatsapp',
  intendedTo: '+27821234567'
})
// Throws: Error('Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set')
```

---

## Helper Function: `getOutboundStatus`

**Purpose**: Return current outbound mode and redirect status for health endpoint and banner.

**Signature**:
```typescript
export function getOutboundStatus(): OutboundStatus

export interface OutboundStatus {
  mode: 'redirect' | 'live'
  redirectStatus: 'on' | 'off' | 'blocked'
}
```

**Parameters**: None. Reads from `process.env`.

**Returns**: `OutboundStatus` object with:

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `'redirect' \| 'live'` | Value of `OUTBOUND_MODE` (or `'redirect'` if unknown/missing). |
| `redirectStatus` | `'on' \| 'off' \| 'blocked'` | Effective redirect state. `'on'` if `mode=redirect`, `'off'` if `mode=live` + `LIVE_CLEAR=true`, `'blocked'` if `mode=live` + `LIVE_CLEAR` ≠ `"true"`. |

**Throws**: None. Always returns a valid result (defaults to fail-closed).

**Example Calls**:

```typescript
// Redirect mode
const status = getOutboundStatus()
// Returns: { mode: 'redirect', redirectStatus: 'on' }

// Live mode, LIVE_CLEAR=true
const status = getOutboundStatus()
// Returns: { mode: 'live', redirectStatus: 'off' }

// Live mode, LIVE_CLEAR=false (or missing)
const status = getOutboundStatus()
// Returns: { mode: 'live', redirectStatus: 'blocked' }
```

---

## Integration Points

### `whatsapp.ts` (sendWhatsAppMessage)

**Integration**:
```typescript
import { resolveOutboundRecipient } from './outbound-redirect'

export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendResult> {
  const timestamp = new Date().toISOString()

  // Resolve recipient (redirect if enabled)
  const resolution = resolveOutboundRecipient({
    channel: 'whatsapp',
    intendedTo: params.to
  })

  // Override params.to with resolved recipient
  const effectiveTo = resolution.to

  // Proceed with existing Twilio/Meta logic using effectiveTo
  // (rest of function unchanged except `to` variable)
  
  // Log/metadata: include resolution.intendedTo, resolution.redirected, resolution.mode
}
```

**Error Handling**: If `resolveOutboundRecipient` throws (missing sink), catch and return `{ success: false, error: 'Redirect configuration incomplete', ... }` with HTTP 503 at API route level.

### `email.ts` (sendEmail)

**Integration**:
```typescript
import { resolveOutboundRecipient } from './outbound-redirect'

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const timestamp = new Date().toISOString()

  // Resolve recipient
  const resolution = resolveOutboundRecipient({
    channel: 'email',
    intendedTo: input.to
  })

  const effectiveTo = resolution.to

  // Proceed with Resend API call using effectiveTo
  // (rest of function unchanged except `to` variable)
  
  // Log/metadata: include resolution fields
}
```

### `send-jobs.ts` (createQueuedJob)

**Integration**:
```typescript
import { resolveOutboundRecipient } from './outbound-redirect'

export async function createQueuedJob(
  db: DbClient,
  input: CreateQueuedJobInput
): Promise<SendJobRow> {
  await ensureSendJobsTable(db)

  // Map channel ('whatsapp_web' → 'whatsapp' for resolver)
  const resolverChannel = input.channel === 'whatsapp_web' ? 'whatsapp' : input.channel

  // Resolve recipient
  const resolution = resolveOutboundRecipient({
    channel: resolverChannel,
    intendedTo: input.toAddress
  })

  const effectiveToAddress = resolution.to

  // Build metadata JSON with redirect audit fields
  const metadata = {
    intended_to: resolution.intendedTo,
    redirect_enabled: resolution.redirected,
    mode: resolution.mode
  }

  // Insert job with effectiveToAddress and metadata
  const inserted = await db
    .prepare(`
      INSERT INTO send_jobs (channel, status, thread_id, to_address, body_text, subject, metadata)
      VALUES (?, 'queued', ?, ?, ?, ?, ?)
    `)
    .run(
      input.channel,
      input.threadId,
      effectiveToAddress,
      input.bodyText,
      input.subject ?? null,
      JSON.stringify(metadata)
    )

  // Return created job
}
```

---

## Testing Contract

**Test Coverage Requirements**:

1. **Resolver Unit Tests** (`outbound-redirect.test.ts`):
   - Redirect mode + WA sink set → returns sink as `to`
   - Redirect mode + email sink set → returns sink as `to`
   - Redirect mode + missing WA sink → throws with clear message
   - Redirect mode + missing email sink → throws
   - Live mode + LIVE_CLEAR=true → returns original `intendedTo` as `to`
   - Live mode + LIVE_CLEAR=false → blocks (throws or redirects)
   - Unknown OUTBOUND_MODE → defaults to redirect
   - Invalid channel → throws

2. **Integration Tests**:
   - `whatsapp.test.ts`: Mocked Twilio calls verify `to` is redirected when mode=redirect
   - `email.test.ts`: Mocked Resend calls verify `to` is redirected
   - `send-jobs.test.ts`: Job `to_address` is redirected, metadata includes `intended_to`

3. **Health/Banner Tests**:
   - `getOutboundStatus()` returns correct status for each mode combination
   - Health endpoint includes `outboundRedirect` and `outboundMode` fields

**Mock Strategy**: Set `process.env` variables in test setup. No live API calls. Twilio/Resend responses are mocked.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-20 | Initial contract definition for Phase 0 |

---

## Notes

- This is an internal API. No external consumers.
- Breaking changes: Update all three consumers (`whatsapp.ts`, `email.ts`, `send-jobs.ts`) in the same PR.
- Future extensions (Phase 1 allowlist, etc.) may add optional parameters or return fields. Use optional fields to maintain backward compatibility where possible.
