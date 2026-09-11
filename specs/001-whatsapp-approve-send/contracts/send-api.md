# API Contract: POST /api/inbound/send

**Feature**: WhatsApp Approve & Send  
**Endpoint**: `POST /api/inbound/send`  
**Purpose**: Send an approved WhatsApp reply to a guest

## Authentication

Uses existing GuestFlow authentication (session-based, Ops Hub staff only).

**Required**: Staff must be authenticated and have access to `/ops/inbound-queue`

## Request

**Method**: POST  
**Content-Type**: `application/json`

**Request Body**:
```typescript
{
  threadId: number  // Required: Thread ID from inbound_threads table
}
```

**Example**:
```json
{
  "threadId": 15
}
```

**Validation**:
- `threadId` must be a positive integer
- Thread must exist in database
- Thread must have a draft reply (`latestMessage.draft_reply` must be non-null)
- Thread status should be "drafted" or "approved" (informational only, not blocking)

## Response

**Success Response** (HTTP 200):
```typescript
{
  success: true,
  data: {
    messageId: string | null,      // WhatsApp message ID from provider (null for sandbox)
    timestamp: string,              // ISO 8601 timestamp of send
    provider: 'meta' | 'twilio' | 'sandbox',
    sandboxMode: boolean,           // True if WHATSAPP_MODE=sandbox
    threadStatus: 'sent'            // Updated thread status
  }
}
```

**Example (Success, Live Mode)**:
```json
{
  "success": true,
  "data": {
    "messageId": "SM1234567890abcdef",
    "timestamp": "2026-09-11T14:30:00.000Z",
    "provider": "twilio",
    "sandboxMode": false,
    "threadStatus": "sent"
  }
}
```

**Example (Success, Sandbox Mode)**:
```json
{
  "success": true,
  "data": {
    "messageId": "sandbox_1726066800_abc123",
    "timestamp": "2026-09-11T14:30:00.000Z",
    "provider": "sandbox",
    "sandboxMode": true,
    "threadStatus": "sent"
  }
}
```

**Error Response** (HTTP 400):
```typescript
{
  success: false,
  error: string  // Human-readable error message
}
```

**Example (Missing threadId)**:
```json
{
  "success": false,
  "error": "threadId is required"
}
```

**Example (Thread not found)**:
```json
{
  "success": false,
  "error": "Thread not found"
}
```

**Example (No draft reply)**:
```json
{
  "success": false,
  "error": "Thread has no draft reply to send"
}
```

**Error Response** (HTTP 500):
```typescript
{
  success: false,
  error: string,  // Human-readable error message
  details?: string  // Optional technical details for debugging
}
```

**Example (WhatsApp API Error)**:
```json
{
  "success": false,
  "error": "Failed to send WhatsApp message",
  "details": "Twilio API error: Invalid phone number format"
}
```

## Side Effects

**On Success**:
1. Creates new row in `inbound_messages` table with `direction = 'outbound'`
2. Updates `inbound_threads.status` to `'sent'`
3. Updates `inbound_threads.last_message_at` to current timestamp
4. Logs send attempt (console.log with recipient, timestamp, provider, outcome)
5. Calls `sendWhatsAppMessage()` from `src/lib/whatsapp.ts` (unless sandbox mode)

**On Failure**:
1. Creates new row in `inbound_messages` table with `direction = 'outbound'` and `send_error` populated
2. Updates `inbound_threads.status` to `'failed'`
3. Logs error (console.error with full error details)
4. Does NOT send WhatsApp message
5. Returns error details to client for display

## Idempotency

**Not idempotent** — Each POST creates a new outbound message and may send a duplicate WhatsApp message if called multiple times for the same thread.

**Client Responsibility**: Disable send button after first click to prevent double-sends.

**Future Enhancement**: Add idempotency key header or check recent outbound messages before sending.

## Rate Limiting

**Current**: No rate limiting enforced at application level.

**Provider Limits**:
- Twilio: ~80 messages/second per account
- Meta: ~80 messages/second per phone number

**Future Enhancement**: Add per-tenant or per-staff rate limiting if needed.

## Security

**CSRF Protection**: Handled by Next.js (cookies with SameSite attribute).

**Authorization**: Staff must be authenticated via existing session middleware.

**Input Validation**: 
- `threadId` type-checked before database query
- SQL injection prevented via prepared statements
- No user-generated SQL executed

**Secrets**: 
- Never log `TWILIO_AUTH_TOKEN` or `WHATSAPP_TOKEN`
- Redact phone numbers in non-error logs (show last 4 digits only)

## Monitoring & Observability

**Logs** (via console.log/console.error):
- Every send attempt: `[Send] threadId={id}, to={phone}, provider={provider}, sandbox={bool}`
- Every success: `[Send Success] messageId={id}, provider={provider}`
- Every failure: `[Send Error] threadId={id}, error={message}, provider={provider}`

**Metrics** (future):
- Send success rate (success / total attempts)
- Send latency (time from API call to WhatsApp API response)
- Error rate by provider
- Sandbox vs live send counts

## Example Client Usage (React/TypeScript)

```typescript
async function handleSendMessage(threadId: number) {
  try {
    // Show confirmation first
    const confirmed = window.confirm(
      `Send via WhatsApp?\n\nTo: ${thread.fromNumber}\nMode: ${mode}\n\n${draft.slice(0, 100)}...`
    )
    if (!confirmed) return

    // Disable button to prevent double-send
    setSending(true)

    const response = await fetch('/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId })
    })

    const result = await response.json()

    if (result.success) {
      if (result.data.sandboxMode) {
        alert('Sandbox Mode: Message logged but not sent')
      } else {
        alert(`Message sent via ${result.data.provider}`)
      }
      // Refresh queue to show updated status
      await fetchQueue()
    } else {
      alert(`Send failed: ${result.error}`)
    }
  } catch (error) {
    alert('Network error: Could not send message')
    console.error(error)
  } finally {
    setSending(false)
  }
}
```

## OpenAPI Schema (Optional)

```yaml
/api/inbound/send:
  post:
    summary: Send approved WhatsApp reply
    tags: [Inbound Queue]
    security:
      - sessionAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [threadId]
            properties:
              threadId:
                type: integer
                minimum: 1
                example: 15
    responses:
      200:
        description: Message sent successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: object
                  properties:
                    messageId:
                      type: string
                      nullable: true
                      example: "SM1234567890abcdef"
                    timestamp:
                      type: string
                      format: date-time
                      example: "2026-09-11T14:30:00.000Z"
                    provider:
                      type: string
                      enum: [meta, twilio, sandbox]
                      example: "twilio"
                    sandboxMode:
                      type: boolean
                      example: false
                    threadStatus:
                      type: string
                      example: "sent"
      400:
        description: Invalid request
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: false
                error:
                  type: string
                  example: "threadId is required"
      500:
        description: Server error
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: false
                error:
                  type: string
                  example: "Failed to send WhatsApp message"
                details:
                  type: string
                  example: "Twilio API error: Invalid phone number format"
```
