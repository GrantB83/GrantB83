# Data Model: UMI Inbox Search & Surface Fix

**Feature**: UMI Inbox Search & Surface Fix
**Date**: September 25, 2026

## Entities

### InboundThread

Represents a guest communication thread. One thread per booking (or temporary thread for unlinked inquiries).

**Database Table**: `inbound_threads`

**Key Fields**:
- `id` (INTEGER, PRIMARY KEY) - Thread identifier
- `tenant_id` (INTEGER, NOT NULL) - Tenant/property identifier (filtering key)
- `thread_kind` (TEXT, NOT NULL) - Either 'booking' or 'temp'
- `status` (TEXT) - Thread status (e.g., 'new', 'drafted', 'linked')
- `from_number` (TEXT, NOT NULL) - Guest contact identifier
- `guest_name` (TEXT, NULLABLE) - Guest name if known
- `booking_id` (INTEGER, NULLABLE) - Link to bookings table
- `metadata` (TEXT, NULLABLE) - JSON blob containing email subject and other metadata
- `last_message_at` (DATETIME, NULLABLE) - Timestamp of most recent message
- `pending_reply` (INTEGER, DEFAULT 0) - Flag for unanswered inbound
- `last_channel` (TEXT, NULLABLE) - Most recent channel (whatsapp, email, sms)

**Relationships**:
- One thread has many inbound messages (1:N via `inbound_messages.thread_id`)
- One thread may link to one booking (1:1 via `booking_id`)

**Validation Rules**:
- `tenant_id` must match authenticated staff user's tenant
- `thread_kind` must be 'booking' or 'temp'
- `from_number` is required (fail-closed: no invented contacts)
- `metadata` if present must be valid JSON

**State Transitions**:
- `status='linked'` threads are excluded from inbox (archived)
- `status='drafted'` threads should appear in inbox (currently may be missing - bug to fix)

**Search Fields**:
- Direct: `from_number`, `guest_name`
- Metadata: `metadata.subject` (parsed from JSON)
- Indirect: message bodies via `inbound_messages` join

### InboundMessage

Represents a single message within a thread (inbound from guest or outbound from staff).

**Database Table**: `inbound_messages`

**Key Fields**:
- `id` (INTEGER, PRIMARY KEY) - Message identifier
- `thread_id` (INTEGER, NOT NULL) - Foreign key to `inbound_threads.id`
- `tenant_id` (INTEGER, NOT NULL) - Same as parent thread
- `direction` (TEXT, DEFAULT 'inbound') - Either 'inbound' or 'outbound'
- `from_number` (TEXT, NOT NULL) - Sender identifier
- `message_text` (TEXT, NOT NULL) - Full message body content
- `message_timestamp` (DATETIME, NOT NULL) - When message was sent/received
- `channel` (TEXT, NULLABLE) - Communication channel (whatsapp, email, sms)
- `external_message_id` (TEXT, NULLABLE) - Provider's message ID (Twilio/Resend/etc)
- `sender_address` (TEXT, NULLABLE) - Full email/phone if available
- `is_spam` (INTEGER, DEFAULT 0) - Spam filter flag
- `draft_reply` (TEXT, NULLABLE) - Staff draft response
- `status` (TEXT, DEFAULT 'new') - Message status

**Relationships**:
- Many messages belong to one thread (N:1 via `thread_id`)

**Validation Rules**:
- `thread_id` must reference existing thread
- `tenant_id` must match parent thread
- `message_text` is required (cannot be NULL or empty)
- `direction` must be 'inbound' or 'outbound'

**Search Fields**:
- Primary: `message_text` (full body content)

### Booking (Reference Only)

Booking information is linked but not modified by this feature.

**Database Table**: `bookings`

**Key Fields** (relevant to search):
- `id` (INTEGER, PRIMARY KEY)
- `guest_name` (TEXT)
- `suite_or_unit` (TEXT)
- `nightsbridge_booking_id` (TEXT)

**Relationships**:
- One booking may link to one thread (1:1 from thread's perspective)

**Validation Rules** (informational):
- NightsBridge is the booking SoR (Constitution Principle III)
- Search may include booking fields but does not modify them

## Search Data Flow

### Input
- Query string `q` (e.g., "DIRECT2" or "INBOUND TEST")
- Tenant context from authenticated staff session
- Optional filter (e.g., 'needs-attention')

### Processing Steps

1. **Fetch All Threads** (SQL):
   ```sql
   SELECT t.*, b.guest_name, b.check_in, b.check_out, b.suite_or_unit, b.nightsbridge_booking_id
   FROM inbound_threads t
   LEFT JOIN bookings b ON b.id = t.booking_id
   WHERE t.tenant_id = ?
     AND COALESCE(t.status, '') <> 'linked'
   ```

2. **Build In-Memory Thread List** (JavaScript):
   - For each thread, construct `InboxThread` object with:
     - Thread metadata
     - Message preview (most recent message text)
     - Booking details if linked

3. **Apply Existing Search** (if `q` provided):
   - Check: `bookerName`, `fromNumber`, `suite`, `nightsbridgeBookingId`, `bookingId`
   - Match: case-insensitive substring (current behavior)

4. **Apply Extended Search** (NEW - if `q` provided):
   - Parse `thread.metadata` JSON for `subject` field
   - Fetch messages for thread: `SELECT message_text FROM inbound_messages WHERE thread_id = ? AND tenant_id = ?`
   - For multi-token queries:
     - Split `q` on whitespace into tokens
     - For each token, check if it appears (case-insensitive) in:
       - Thread metadata.subject
       - Any message body
       - Existing fields (bookerName, etc.)
     - Include thread only if ALL tokens match

5. **Apply Filters** (needs-attention, etc.)

6. **Sort and Return**:
   - Sort by `sortBucket` (attention level) and `lastMessageAt`
   - Return array of `InboxThread` objects

### Output
- `InboxThread[]` - Array of thread summaries matching search criteria

## Metadata Schema

### thread.metadata (JSON TEXT column)

**Structure**:
```json
{
  "subject": "Booking inquiry for Main House",
  "originalFrom": "grant830318@gmail.com",
  // ... other fields may exist
}
```

**Fields Used by Search**:
- `subject` (string, optional) - Email subject line (if message came via email)

**Parsing**:
```typescript
function parseJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const metadata = parseJson(thread.metadata)
const subject = typeof metadata.subject === 'string' ? metadata.subject : ''
```

## Indexes (Existing)

The following indexes already exist and support this feature:

```sql
-- Thread lookup by tenant and status
CREATE INDEX idx_umi_threads_kind_status
  ON inbound_threads(tenant_id, thread_kind, status);

-- Thread lookup by contact
CREATE INDEX idx_umi_threads_from
  ON inbound_threads(tenant_id, from_number);

-- Message deduplication
CREATE UNIQUE INDEX idx_umi_msg_external
  ON inbound_messages(external_message_id)
  WHERE external_message_id IS NOT NULL;
```

**Note**: No new indexes required for initial implementation. Message body search will use full table scan on small result set (typically 3-10 messages per thread after initial thread filter).

## Data Volume

**Typical Production Scale**:
- Threads per tenant: 50-200 active (status != 'linked')
- Messages per thread: 3-10 average
- Total messages to search: ~500-2000 per search query
- Expected search results: 0-20 threads

**Performance Expectation**: <2 seconds for typical search

## Tenant Isolation

**Critical**: All queries MUST filter by `tenant_id` to prevent cross-tenant data leakage.

**Thread Query**:
```sql
WHERE t.tenant_id = ? -- Always include this
```

**Message Query**:
```sql
WHERE thread_id = ? AND tenant_id = ? -- Always include tenant_id
```

**Staff Authentication**: Must resolve to correct tenant_id (currently suspected as root cause of thread 48/49 omission).
