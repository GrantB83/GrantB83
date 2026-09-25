# API Contract: UMI Inbox Search & Surface Fix

**Feature**: UMI Inbox Search & Surface Fix
**Date**: September 25, 2026

## Endpoint: GET /api/umi/inbox

### Purpose
Retrieve filtered and searchable list of guest communication threads for staff inbox.

### Request

**Method**: `GET`

**Query Parameters**:
- `filter` (optional, string) - Filter type: 'all' | 'needs-attention'
  - Default: 'all'
  - 'needs-attention': Only threads with `needsAttention=true`
- `q` (optional, string) - Search query
  - Searches across: bookerName, fromNumber, suite, nightsbridgeBookingId, bookingId, **email subject, message preview, message bodies** (NEW)
  - Case-insensitive
  - Multi-token: all tokens must match (AND logic)
  - Partial word/phrase matching allowed
  - Examples: "DIRECT2", "grant830318", "INBOUND TEST"

**Headers**:
- `Cookie`: Staff session cookie (required for authentication)

**Authentication**: Staff session must be valid and resolve to a tenant_id

### Response

**Success** (200 OK):

```json
{
  "threads": [
    {
      "id": 49,
      "threadKind": "temp",
      "bookingId": null,
      "bookerName": "grant830318@gmail.com",
      "suite": null,
      "checkIn": null,
      "checkOut": null,
      "nightsbridgeBookingId": null,
      "lastChannel": "email",
      "lastInboundChannel": "email",
      "lastMessageAt": "2026-09-25T02:45:00.000Z",
      "preview": "GF-INBOUND-TEST-20260925-DIRECT2",
      "pendingReply": true,
      "hasOpenDraft": false,
      "needsAttention": true,
      "sortBucket": 0,
      "hygieneStatus": null,
      "fromNumber": "grant830318@gmail.com",
      "careWindow": {
        "start": "08:00",
        "end": "20:00",
        "timezone": "Africa/Johannesburg",
        "isOpen": true
      },
      "arrivalStage": null,
      "attentionReason": "Unanswered inbound"
    }
  ]
}
```

**Response Fields** (InboxThread):
- `id` (number) - Thread identifier
- `threadKind` ('booking' | 'temp') - Thread type
- `bookingId` (number | null) - Linked booking ID if thread_kind='booking'
- `bookerName` (string) - Guest name or contact identifier
- `suite` (string | null) - Property unit/suite name
- `checkIn` (string | null) - ISO date string (YYYY-MM-DD)
- `checkOut` (string | null) - ISO date string (YYYY-MM-DD)
- `nightsbridgeBookingId` (string | null) - External booking system ID
- `lastChannel` (string | null) - Most recent channel ('whatsapp' | 'email' | 'sms')
- `lastInboundChannel` (string | null) - Most recent inbound channel
- `lastMessageAt` (string | null) - ISO timestamp of last message
- `preview` (string) - First ~100 chars of most recent message
- `pendingReply` (boolean) - Has unanswered inbound message
- `hasOpenDraft` (boolean) - Has unsent staff draft
- `needsAttention` (boolean) - Requires staff action
- `sortBucket` (0 | 1 | 2) - Sort priority (0=highest)
- `hygieneStatus` (string | null) - Thread health status
- `fromNumber` (string) - Guest contact (phone or email)
- `careWindow` (object | undefined) - Guest contact hours
- `arrivalStage` (string | null) - Arrival workflow stage
- `attentionReason` (string | null) - Why thread needs attention

**Errors**:

- `401 Unauthorized` - No valid staff session
  ```json
  { "error": "Unauthorized" }
  ```

- `500 Internal Server Error` - Database or application error
  ```json
  { "error": "Internal server error" }
  ```

### Behavior Changes (NEW)

**Extended Search Fields**:
1. **Email Subject** - Searches `thread.metadata.subject` (JSON field)
2. **Message Bodies** - Searches `message_text` across ALL messages in thread
3. **Cross-Channel** - Searches messages regardless of channel (email, WhatsApp, SMS)
4. **Multi-Token AND** - Query "INBOUND TEST" requires BOTH tokens present
5. **Case-Insensitive** - "DIRECT2" matches "direct2" or "DiReCt2"

**Example Searches**:

| Query | Matches Thread If... |
|-------|---------------------|
| "DIRECT2" | Any message contains "DIRECT2" (case-insensitive) |
| "grant830318" | bookerName, fromNumber, OR any message contains "grant830318" |
| "INBOUND TEST" | Thread has "INBOUND" somewhere AND "TEST" somewhere (can be different messages/fields) |
| "Booking inquiry" | Email subject OR message body contains both "booking" and "inquiry" |

**Preserved Behavior**:
- Existing search fields still work: bookerName, fromNumber, suite, nightsbridgeBookingId, bookingId
- Sorting order unchanged: sortBucket (attention level), then lastMessageAt descending
- Filter='needs-attention' still applies after search

## Endpoint: GET /api/umi/threads/:id

### Purpose
Retrieve full details of a single thread by ID.

### Request

**Method**: `GET`

**Path Parameters**:
- `id` (number) - Thread ID

**Headers**:
- `Cookie`: Staff session cookie (required for authentication)

### Response

**Success** (200 OK):

```json
{
  "thread": {
    "id": 49,
    "threadKind": "temp",
    "bookingId": null,
    "bookerName": "grant830318@gmail.com",
    "fromNumber": "grant830318@gmail.com",
    "status": "drafted",
    "metadata": {
      "subject": "Test inbound message"
    },
    "lastMessageAt": "2026-09-25T02:45:00.000Z"
  },
  "messages": [
    {
      "id": 129,
      "direction": "inbound",
      "fromNumber": "grant830318@gmail.com",
      "messageText": "GF-INBOUND-TEST-20260925-DIRECT2",
      "messageTimestamp": "2026-09-25T02:45:00.000Z",
      "channel": "email"
    }
  ],
  "booking": null,
  "contact": {
    "displayName": null,
    "phone": null,
    "email": "grant830318@gmail.com"
  }
}
```

**Errors**:

- `401 Unauthorized` - No valid staff session
  ```json
  { "error": "Unauthorized" }
  ```

- `404 Not Found` - Thread does not exist OR tenant_id mismatch
  ```json
  { "error": "Thread not found" }
  ```
  **NOTE**: This was the bug for threads 48/49. They exist but returned 404 due to tenant filtering.

- `500 Internal Server Error` - Database or application error
  ```json
  { "error": "Internal server error" }
  ```

### Bug Fix

**Previous Behavior** (threads 48/49):
- `GET /api/umi/threads/49` → 404 "Thread not found"
- Thread 49 exists in database with tenant_id=1, status='drafted', thread_kind='temp'

**Root Cause Hypothesis**:
- Staff session tenant resolution returns incorrect tenant_id
- OR thread query filters out temp/drafted threads incorrectly

**Fixed Behavior**:
- `GET /api/umi/threads/49` → 200 OK with thread details
- Threads with thread_kind='temp' are retrievable
- Threads with status='drafted' are retrievable
- Only status='linked' threads are excluded (archived)

## Data Types

### InboxThread (TypeScript Interface)

```typescript
interface InboxThread {
  id: number
  threadKind: 'booking' | 'temp'
  bookingId: number | null
  bookerName: string
  suite: string | null
  checkIn: string | null  // YYYY-MM-DD
  checkOut: string | null  // YYYY-MM-DD
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  lastInboundChannel: string | null
  lastMessageAt: string | null  // ISO 8601
  preview: string
  pendingReply: boolean
  hasOpenDraft: boolean
  needsAttention: boolean
  sortBucket: 0 | 1 | 2
  hygieneStatus: string | null
  fromNumber: string
  careWindow?: CareWindow
  arrivalStage?: string | null
  attentionReason?: string | null
}
```

### Search Behavior Contract

**Multi-Token AND Logic**:
1. Split query on whitespace: `"INBOUND TEST"` → `["INBOUND", "TEST"]`
2. For each token, search:
   - Existing fields: bookerName, fromNumber, suite, nightsbridgeBookingId, bookingId
   - NEW: thread.metadata.subject (parsed from JSON)
   - NEW: All message bodies for the thread
3. Include thread if and only if ALL tokens match (at least once, anywhere)

**Case-Insensitive**:
- All comparisons use `.toLowerCase()` on both query and data

**Partial Matching**:
- Uses `.includes()` - substring matching allowed
- "DIRECT2" matches "GF-INBOUND-TEST-20260925-DIRECT2"
- "grant" matches "grant830318@gmail.com"

**Performance Guarantee**:
- Search completes in <2 seconds for typical inbox (50-200 threads)

## Backward Compatibility

✓ **Fully backward compatible**:
- Existing searches continue to work unchanged
- New search fields are additive only
- Response format unchanged
- No breaking changes to query parameters or response structure

## Testing Contract

**Minimum Test Coverage**:
1. Search by email subject → thread found
2. Search by message body (single message) → thread found
3. Search by message body (any message in thread) → thread found
4. Multi-token search (both tokens match) → thread found
5. Multi-token search (one token missing) → thread NOT found
6. Case-insensitive search → thread found
7. Thread 48 appears in inbox list
8. Thread 49 retrievable via GET /api/umi/threads/49 (not 404)
9. Existing search fields still work (bookerName, fromNumber, etc.)
10. Search with no query returns all threads (existing behavior)
