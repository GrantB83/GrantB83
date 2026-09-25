# UMI Inbox Search & Surface Fix

## Overview

This update extends the staff inbox search functionality (`GET /api/umi/inbox?q=`) to search across email subjects, message previews, and full message bodies across all communication channels (WhatsApp, email, SMS). It also documents the investigation of threads 48/49 omission from inbox.

## Search Algorithm

### Multi-Token AND Logic

Query strings are tokenized on whitespace, and ALL tokens must match for a thread to appear in results:

```typescript
// Example: "INBOUND TEST" → ["inbound", "test"]
// Thread included only if BOTH tokens match (anywhere across fields/messages)
```

### Search Fields

**Existing fields** (preserved and enhanced):
- `bookerName` - Guest name
- `fromNumber` - Contact identifier (email or phone)
- `suite` - Property unit
- `nightsbridgeBookingId` - **Nightsbridge booking reference** (e.g., "NB-12345") - Case-insensitive, partial matching
- `bookingId` - **Internal booking ID** (e.g., 789) - Partial matching

**NEW extended fields**:
- `metadata.subject` - Email subject line (parsed from JSON)
- `message_text` - All message bodies across all channels

### Matching Behavior

- **Case-insensitive**: "DIRECT2" matches "direct2" or "DiReCt2"
- **Partial word/phrase**: "2026" matches "20260925"
- **Cross-channel**: Searches WhatsApp, email, and SMS messages equally

### Examples

| Query | Matches If... |
|-------|---------------|
| `DIRECT2` | Any message body contains "DIRECT2" (case-insensitive) |
| `grant830318` | Existing field OR any message contains "grant830318" |
| `INBOUND TEST` | Thread has "INBOUND" somewhere AND "TEST" somewhere |
| `booking inquiry` | Subject OR message contains both "booking" and "inquiry" |
| `NB-12345` | Nightsbridge booking reference matches "NB-12345" (case-insensitive) |
| `12345` | Partial match on Nightsbridge reference containing "12345" |
| `789` | Internal booking ID equals 789 (or partial match) |

## Thread Surface Fix Investigation

### Issue

Threads 48 and 49 exist in Turso database but were reported as:
- Not appearing in `GET /api/umi/inbox` response
- Returning 404 from `GET /api/umi/threads/49`

### Root Cause Analysis

**SQL Queries Review**:

1. **Inbox List Query** (line 927-932):
   ```sql
   SELECT t.*, b.guest_name as booking_guest_name, ...
   FROM inbound_threads t
   LEFT JOIN bookings b ON b.id = t.booking_id
   WHERE t.tenant_id = ?
     AND COALESCE(t.status, '') <> 'linked'
   ```
   - ✅ Only excludes `status='linked'` (archived threads)
   - ✅ Includes `status='drafted'` threads
   - ✅ Includes `thread_kind='temp'` threads

2. **Thread Detail Query** (line 1050-1056):
   ```sql
   SELECT t.*, b.guest_name as booking_guest_name, ...
   FROM inbound_threads t
   LEFT JOIN bookings b ON b.id = t.booking_id
   WHERE t.id = ? AND t.tenant_id = ?
   ```
   - ✅ Filters by thread ID and tenant ID
   - ✅ No status or thread_kind exclusions

**Findings**:
- **Code is correct**: Both queries properly include temp and drafted threads
- **Likely causes** of production issue:
  1. **Tenant resolution**: Staff session may resolve to wrong `tenant_id` (not matching thread's `tenant_id=1`)
  2. **Auth/session issue**: Staff authentication middleware may have configuration problem
  3. **Data verification**: Threads 48/49 may have been deleted or modified after initial report

**Resolution**:
- Tests added to verify temp/drafted threads appear correctly
- If issue persists in production, investigate staff authentication tenant mapping

## Implementation

### Files Modified

- `apps/guestflow/src/lib/umi-threads.ts`:
  - Added helper functions: `parseThreadMetadata`, `fetchThreadMessages`, `tokenizeSearchQuery`, `matchesSubject`, `matchesMessageBodies`, `searchThreadsByContentExt`
  - Extended `listInboxThreads` search filter logic to include subject and message body matching

### Files Created

- `apps/guestflow/src/lib/__tests__/umi-inbox-search.test.ts`:
  - Comprehensive test suite covering all search scenarios
  - Tests for temp/drafted thread visibility
  - Tests for tenant filtering

## Testing

### Unit Tests

Run:
```bash
cd apps/guestflow
npm test -- umi-inbox-search
```

**Test Coverage**:
- ✅ Search by email subject
- ✅ Search by message body marker
- ✅ Cross-channel search (WhatsApp + email)
- ✅ Multi-token AND logic (positive and negative cases)
- ✅ Case-insensitive matching
- ✅ Partial phrase matching
- ✅ Backward compatibility (existing fields)
- ✅ Temp threads appear in inbox
- ✅ Drafted threads appear in inbox
- ✅ Thread detail retrieval for temp/drafted
- ✅ Tenant filtering

### Manual Testing (GFM Preview)

1. **Staff Login**: Navigate to `/staff-login`
2. **Search Tests**:
   - URL: `/?q=DIRECT2` → Expect thread 49 visible in filtered list
   - URL: `/?q=grant830318` → Expect thread(s) with that sender
   - URL: `/?q=INBOUND%20TEST` → Expect threads with both tokens
3. **Thread Retrieval**: 
   - Direct URL: `/?thread=49` → Opens thread detail panel
   - With search: `/?thread=49&q=DIRECT2` → Opens thread with search filter active
   - **Note**: Thread deep-link format is `/?thread=<id>` (query param), NOT `/thread/<id>` (route)

**Fixture Mode** (`?fixture=1`):
- Fixture search is simplified: searches `bookerName`, `suite`, and `nightsbridgeBookingId` only
- Does NOT search subject/preview/body fields (fixtures lack full message data)
- Use live mode for full search testing

## Performance

**Expected**: Search completes in <2 seconds for typical inbox (50-200 threads)

**Current Approach**:
- In-memory filtering after initial SQL query
- Message bodies fetched per-thread for matching candidates
- No full-text search index initially (acceptable performance at current scale)

**Future Optimization** (if needed):
- Add SQLite FTS5 index on `message_text` column
- Move search logic to SQL with JOINs

## Backward Compatibility

✅ **Fully backward compatible**:
- Existing search fields continue to work unchanged
- New search fields are additive only
- Response format unchanged
- No breaking changes

## Security

- All queries properly parameterized (SQL injection safe)
- Tenant filtering enforced (cross-tenant data leak prevented)
- No logging of PII or message contents
- Read-only operation (no database writes)
