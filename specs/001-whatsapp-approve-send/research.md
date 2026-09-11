# Research: WhatsApp Approve & Send

**Feature**: WhatsApp Approve & Send for Inbound Queue  
**Created**: 2026-09-11  
**Status**: Phase 0 Complete

## Decision: API Route Structure

**Question**: Should the send action be a separate POST endpoint or part of the existing PATCH `/api/inbound/queue`?

**Decision**: Separate POST endpoint at `/api/inbound/send`

**Rationale**:
- The existing PATCH `/api/inbound/queue` only handles status and assignment updates
- Send action has different semantics (triggers external API call, creates outbound message record)
- Separate endpoint makes it easier to add middleware for rate limiting or send-specific validation later
- Clearer separation of concerns: queue management vs message sending

**Alternatives Considered**:
- PATCH `/api/inbound/queue` with `action: 'send'` — Rejected because mixing status updates with external API calls makes error handling more complex
- POST `/api/inbound/queue/:threadId/send` — Rejected in favor of simpler flat structure

## Decision: Database Schema for Outbound Messages

**Question**: How should outbound messages be stored? New table or extend `inbound_messages`?

**Decision**: Extend existing `inbound_messages` table with a `direction` field

**Rationale**:
- The `inbound_messages` table already has the right structure (message_text, timestamp, thread_id)
- Adding a `direction` field (`inbound` or `outbound`) is simpler than creating a new table with duplicate columns
- Queries like "get all messages for a thread" become simpler (single table scan)
- Follows existing pattern in the codebase

**Schema Extension**:
```sql
ALTER TABLE inbound_messages 
ADD COLUMN direction TEXT DEFAULT 'inbound';

ALTER TABLE inbound_messages 
ADD COLUMN whatsapp_provider TEXT;  -- 'meta', 'twilio', 'sandbox'

ALTER TABLE inbound_messages 
ADD COLUMN whatsapp_message_id TEXT;  -- Message ID from provider

ALTER TABLE inbound_messages 
ADD COLUMN send_error TEXT;  -- Error message if send failed
```

**Alternatives Considered**:
- New `outbound_messages` table — Rejected due to schema duplication and complexity in thread history queries
- Store send metadata in `thread.metadata` JSON — Rejected because it makes querying and audit trail more difficult

## Decision: Confirmation Dialog UX

**Question**: Should confirmation be inline or a separate modal/dialog?

**Decision**: Browser-native `confirm()` dialog for MVP, with clear sandbox mode indicator

**Rationale**:
- Fastest to implement (no additional component state or styling)
- Works on mobile (thread detail modal is already responsive)
- Clear blocking UX (staff must click OK or Cancel)
- Can be upgraded to custom modal in follow-up if needed

**Confirmation Message Format**:
```
Send via WhatsApp?

To: +27836458313
Mode: [Sandbox | Live]

[First 100 chars of draft message...]

[Sandbox mode: Message will be logged but not sent]
[Live mode: This will send a real WhatsApp message]
```

**Alternatives Considered**:
- Custom modal with message preview and edit option — Rejected as out of scope for MVP (draft editing should happen before approval)
- Toast notification only — Rejected because no blocking confirmation increases risk of accidental sends

## Decision: Error Handling Strategy

**Question**: How should send failures be surfaced to staff?

**Decision**: Three-tier error handling:
1. Update thread status to "failed"
2. Store error message in `inbound_messages.send_error` field
3. Show error alert in UI with "Retry" button

**Rationale**:
- Staff need immediate feedback (alert) and persistent record (database)
- "Retry" button allows quick recovery from transient failures
- Failed status in queue allows filtering/monitoring of problem threads

**Common Error Scenarios**:
- Twilio/Meta API down → Store full error message, allow retry
- Invalid credentials → Store error, show "Check TWILIO_* env vars" message
- Rate limit hit → Store error, suggest waiting 5 minutes
- Invalid phone number → Store error, thread requires manual review

**Alternatives Considered**:
- Retry automatically with exponential backoff — Rejected because staff should review errors before retrying
- Move failed threads to separate queue — Rejected as over-engineering for low volume

## Decision: Sandbox Mode Indicators

**Question**: How should sandbox mode be communicated in the UI?

**Decision**: Three-level indication:
1. Badge on send button: "Send via WhatsApp (Sandbox Mode)" when `WHATSAPP_MODE=sandbox`
2. Confirmation dialog shows mode clearly
3. Success message after send shows "Sandbox Mode: Message logged but not sent"

**Rationale**:
- Prevents accidental production sends during development/testing
- Clear at every decision point (button, confirmation, result)
- Works with existing environment variable pattern

**Visual Design**:
- Sandbox mode send button: Yellow background with ⚠️ icon
- Live mode send button: Green background with standard styling
- Result badge after send: Gray for sandbox, green for live success, red for error

**Alternatives Considered**:
- Global banner on inbound-queue page — Rejected as too intrusive for production use
- Only show mode in confirmation — Rejected because staff might miss it

## Best Practices: Next.js API Routes (14.2)

**Relevant Patterns**:
- Use `export const dynamic = 'force-dynamic'` for routes that call external APIs
- Validate request body with Zod or type guards before processing
- Return consistent JSON shape: `{ success: boolean, data?: any, error?: string }`
- Use proper HTTP status codes: 200 (success), 400 (bad request), 500 (server error)
- Keep route handlers thin — business logic goes in separate functions

**Applied to Send API**:
```typescript
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 1. Validate body
  const body = await request.json()
  const { threadId } = body
  if (!threadId) return NextResponse.json({ success: false, error: 'threadId required' }, { status: 400 })
  
  // 2. Fetch thread and draft
  // 3. Call sendWhatsAppMessage()
  // 4. Persist outbound message
  // 5. Update thread status
  // 6. Return result
}
```

## Best Practices: Turso/libsql Client

**Connection Pattern** (from existing `src/lib/db.ts`):
- Use `getDbAsync()` helper that returns cached client
- Prepare statements before execution for SQL injection protection
- Use transactions for multi-step writes (insert outbound message + update thread status)

**Transaction Example**:
```typescript
await db.batch([
  db.prepare('INSERT INTO inbound_messages ...').bind(...),
  db.prepare('UPDATE inbound_threads SET status = ? ...').bind('sent', threadId)
])
```

## Testing Strategy

**Unit Tests** (Vitest):
- Mock `sendWhatsAppMessage()` to test send handler logic without calling live API
- Test sandbox mode flag propagation
- Test error handling for each failure scenario
- Test double-send prevention (idempotency)

**Integration Tests** (Manual Smoke):
- Create test thread with drafted reply
- Open thread detail modal
- Click "Send via WhatsApp" (sandbox mode)
- Verify dry-run log entry created
- Verify thread status updated to "sent"
- Verify outbound message persisted with correct metadata

**No CI WhatsApp Tests**: Per constraints, never call live WhatsApp API in automated tests

## References

- Existing send library: `apps/guestflow/src/lib/whatsapp.ts`
- Inbound queue UI: `apps/guestflow/src/app/ops/inbound-queue/page.tsx`
- Database schema: `apps/guestflow/scripts/migrate-add-inbound-whatsapp.js`
- Next.js 14 API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Turso TypeScript SDK: https://docs.turso.tech/sdk/ts/reference
