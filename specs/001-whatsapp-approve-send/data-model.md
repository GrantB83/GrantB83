# Data Model: WhatsApp Approve & Send

**Feature**: WhatsApp Approve & Send for Inbound Queue  
**Created**: 2026-09-11  
**Status**: Phase 1 Complete

## Entity: Outbound Message

**Purpose**: Represents a WhatsApp message sent by staff in response to an inbound message.

**Storage**: `inbound_messages` table (existing table extended with new fields)

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO INCREMENT | Existing field, message unique identifier |
| `thread_id` | INTEGER | FOREIGN KEY (inbound_threads.id), NOT NULL | Existing field, links to conversation thread |
| `message_text` | TEXT | NOT NULL | Existing field, the message content sent to guest |
| `message_timestamp` | TEXT | NOT NULL, ISO 8601 format | Existing field, when message was sent |
| `tenant_id` | INTEGER | DEFAULT 1 | Existing field, tenant isolation |
| `direction` | TEXT | DEFAULT 'inbound', CHECK (direction IN ('inbound', 'outbound')) | **NEW FIELD**: 'inbound' for received messages, 'outbound' for sent replies |
| `whatsapp_provider` | TEXT | CHECK (whatsapp_provider IN ('meta', 'twilio', 'sandbox')) | **NEW FIELD**: Which provider was used to send (null for inbound messages) |
| `whatsapp_message_id` | TEXT | | **NEW FIELD**: Message ID returned by WhatsApp API (for tracking, null for sandbox or inbound) |
| `send_error` | TEXT | | **NEW FIELD**: Error message if send failed (null for successful sends or inbound messages) |
| `is_classified` | BOOLEAN | DEFAULT FALSE | Existing field, always FALSE for outbound messages |
| `draft_reply` | TEXT | | Existing field, always NULL for outbound messages |
| `external_message_id` | TEXT | UNIQUE | Existing field, deduplication ID (not used for outbound) |

**Validation Rules**:
- `message_text` must be non-empty for outbound messages
- `message_timestamp` must be valid ISO 8601 format
- `direction` must be either 'inbound' or 'outbound'
- If `direction = 'outbound'`, then `whatsapp_provider` must be non-null
- If `send_error` is non-null, the thread status should be 'failed'
- `whatsapp_message_id` should match provider format: Meta uses numeric IDs, Twilio uses SID format (e.g., `SM...`)

**Relationships**:
- **Belongs to** one `inbound_threads` entry (via `thread_id`)
- **Has one** classification (via `message_classifications` table) — only for inbound messages

**State Transitions**: N/A (messages are immutable once created)

## Entity: Thread (Extended)

**Purpose**: Conversation thread tracking, extended to support send outcomes.

**Storage**: `inbound_threads` table (existing, no new fields required)

**Relevant Attributes** (existing):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Thread unique identifier |
| `status` | TEXT | CHECK (status IN ('new', 'classified', 'drafted', 'approved', 'sent', 'failed', 'closed')) | Thread lifecycle status |
| `from_number` | TEXT | NOT NULL | Guest phone number (recipient for outbound) |
| `guest_name` | TEXT | | Extracted or provided guest name |
| `last_message_at` | TEXT | | Timestamp of most recent message (inbound or outbound) |

**Extended Status Values** (already supported):
- `sent`: At least one outbound message was successfully sent
- `failed`: Latest send attempt failed (can be retried)

**Validation Rules**:
- Status can transition: `drafted` → `sent` (on successful send)
- Status can transition: `drafted` → `failed` (on send error)
- Status can transition: `failed` → `sent` (on successful retry)
- `last_message_at` should update when an outbound message is created

**State Transitions**:
```
drafted → (send attempt)
   ↓
   ├─→ sent (success)
   ├─→ failed (error) → (retry) → sent
   └─→ closed (manual)
```

## Indexes (Existing, No Changes Required)

- `inbound_threads.status` — for filtering queue by status
- `inbound_messages.thread_id` — for fetching messages by thread
- `inbound_threads.last_message_at` — for sorting queue (most recent first)

## Migration Required

The `direction`, `whatsapp_provider`, `whatsapp_message_id`, and `send_error` fields must be added to the existing `inbound_messages` table. See migration script: `scripts/migrate-add-inbound-send.js`

**Migration SQL**:
```sql
-- Add direction field (default 'inbound' for existing rows)
ALTER TABLE inbound_messages 
ADD COLUMN direction TEXT DEFAULT 'inbound' 
CHECK (direction IN ('inbound', 'outbound'));

-- Add WhatsApp provider tracking
ALTER TABLE inbound_messages 
ADD COLUMN whatsapp_provider TEXT 
CHECK (whatsapp_provider IN ('meta', 'twilio', 'sandbox'));

-- Add message ID from WhatsApp API
ALTER TABLE inbound_messages 
ADD COLUMN whatsapp_message_id TEXT;

-- Add error tracking for failed sends
ALTER TABLE inbound_messages 
ADD COLUMN send_error TEXT;
```

**Rollback Strategy**: If needed, these columns can be dropped without data loss (they are additive).

## Query Patterns

**Get all messages for a thread (inbound + outbound)**:
```sql
SELECT 
  id, message_text, message_timestamp, direction,
  whatsapp_provider, whatsapp_message_id, send_error
FROM inbound_messages
WHERE thread_id = ?
ORDER BY message_timestamp ASC
```

**Get send history for a thread (outbound only)**:
```sql
SELECT 
  message_timestamp, whatsapp_provider, 
  whatsapp_message_id, send_error
FROM inbound_messages
WHERE thread_id = ? AND direction = 'outbound'
ORDER BY message_timestamp DESC
```

**Find all failed sends (for monitoring)**:
```sql
SELECT t.id, t.from_number, t.guest_name, m.send_error, m.message_timestamp
FROM inbound_threads t
JOIN inbound_messages m ON m.thread_id = t.id
WHERE t.status = 'failed' AND m.direction = 'outbound' AND m.send_error IS NOT NULL
ORDER BY m.message_timestamp DESC
```

## Example Data

**Outbound Message (Successful Send)**:
```json
{
  "id": 42,
  "thread_id": 15,
  "message_text": "Hi John, your booking at The Browns for 15-17 December is confirmed...",
  "message_timestamp": "2026-09-11T14:30:00Z",
  "tenant_id": 1,
  "direction": "outbound",
  "whatsapp_provider": "twilio",
  "whatsapp_message_id": "SM1234567890abcdef",
  "send_error": null,
  "is_classified": false,
  "draft_reply": null,
  "external_message_id": null
}
```

**Outbound Message (Failed Send)**:
```json
{
  "id": 43,
  "thread_id": 16,
  "message_text": "Hi Sarah, thank you for your inquiry...",
  "message_timestamp": "2026-09-11T15:45:00Z",
  "tenant_id": 1,
  "direction": "outbound",
  "whatsapp_provider": "meta",
  "whatsapp_message_id": null,
  "send_error": "Meta API error: Invalid phone number format",
  "is_classified": false,
  "draft_reply": null,
  "external_message_id": null
}
```

**Outbound Message (Sandbox Dry-Run)**:
```json
{
  "id": 44,
  "thread_id": 17,
  "message_text": "Hi Test User, this is a test message...",
  "message_timestamp": "2026-09-11T16:00:00Z",
  "tenant_id": 1,
  "direction": "outbound",
  "whatsapp_provider": "sandbox",
  "whatsapp_message_id": "sandbox_1726066800_abc123",
  "send_error": null,
  "is_classified": false,
  "draft_reply": null,
  "external_message_id": null
}
```
