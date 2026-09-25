# Research: UMI Inbox Search & Surface Fix

**Feature**: UMI Inbox Search & Surface Fix
**Date**: September 25, 2026
**Status**: Complete

## Research Questions Resolved

### Q1: Current Search Implementation

**Question**: How does the current search in `listInboxThreads` work, and what fields does it cover?

**Finding**: The current search implementation is in `apps/guestflow/src/lib/umi-threads.ts` at lines 915-922:

```typescript
if (options.q?.trim()) {
  const q = options.q.trim().toLowerCase()
  result = result.filter((thread) =>
    [thread.bookerName, thread.fromNumber, thread.suite, thread.nightsbridgeBookingId, String(thread.bookingId || '')]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  )
}
```

**Decision**: Extend this filter to also search message bodies and thread metadata (subject). The search must preserve all existing functionality.

### Q2: Database Schema for Messages and Metadata

**Question**: Where are message bodies and email subjects stored in the database?

**Finding**: 
- Message bodies are in `inbound_messages.message_text` (TEXT column)
- Email subjects are in `inbound_threads.metadata` (JSON TEXT column with `subject` field)
- The `metadata` column is created by the base schema (test files show it's a standard column)
- Messages are linked to threads via `inbound_messages.thread_id` foreign key

**Decision**: Implement search by:
1. Parse `thread.metadata` JSON to extract `subject` field if present
2. Join against `inbound_messages` table to search across all message bodies for a thread
3. Use SQL LIKE with case-insensitive collation for efficient substring matching

### Q3: Multi-Token Search Strategy

**Question**: How should multi-token queries (e.g., "INBOUND TEST") be handled?

**Options Considered**:
- **A**: Single token - treat entire query as one string (current behavior)
- **B**: OR logic - any token matches → result appears
- **C**: AND logic - all tokens must match (can be in different fields/messages)

**Decision**: **Option C - AND logic**
- **Rationale**: More precise search results; "INBOUND TEST" should only match threads containing BOTH words, not just one
- **Implementation**: Split query on whitespace, filter threads where ALL tokens match (any field, any message)
- **User Benefit**: Reduces false positives; aligns with user mental model of multi-word search

### Q4: Case-Insensitive Matching

**Question**: How to implement case-insensitive search efficiently in SQLite/Turso?

**Finding**: SQLite LIKE operator is case-insensitive by default for ASCII characters. For broader Unicode support, can use `COLLATE NOCASE` or lowercase both query and data.

**Decision**: Use JavaScript `.toLowerCase()` on both query and data (existing pattern in codebase). This works across all Unicode and is consistent with current implementation.

### Q5: Thread 48/49 Omission Root Cause

**Question**: Why do threads 48 and 49 not appear in inbox list or return 404 on detail endpoint?

**Hypothesis Testing**:
1. **LIMIT clause**: listInboxThreads has no LIMIT - ❌ not the cause
2. **Status filtering**: Query excludes `status='linked'` only - ✓ `status='drafted'` should be included
3. **Thread kind filtering**: No explicit thread_kind filter - ✓ `thread_kind='temp'` should be included
4. **Tenant filtering**: Query filters by `tenant_id` - ⚠️ **LIKELY ROOT CAUSE**
5. **BigInt serialization**: Thread IDs use `asNumber()` helper - unlikely root cause
6. **UI client cap**: No client-side row limit found - ❌ not the cause

**Root Cause Analysis**:
- Threads 48/49 have `tenant_id=1`
- Need to verify staff authentication provides correct tenant context
- If authenticated user's tenant doesn't match, threads are filtered out
- The `getThreadDetail` function also filters by `tenantId` (line 930 in umi-threads.ts)

**Decision**: Investigate tenant resolution in staff authentication flow. Verify that staff sessions correctly map to `tenant_id=1`. This is likely a configuration or auth mapping issue, not a code bug in the query itself.

### Q6: Performance Considerations

**Question**: Will searching message bodies across all channels cause performance issues?

**Analysis**:
- Typical inbox: 50-200 threads
- Average messages per thread: 3-10
- Total rows to scan: ~1000-2000 message records per search
- SQLite LIKE is efficient for this scale
- No full-text search index needed initially

**Decision**: Proceed without FTS index. If performance becomes an issue in production (search >2s), can add:
```sql
CREATE INDEX idx_inbound_messages_text ON inbound_messages(message_text);
```

**Monitoring**: Log search query time in development; flag if >1s

### Q7: Cross-Channel Search

**Question**: Should search behavior differ by channel (email vs WhatsApp vs SMS)?

**Decision**: No. Search should be channel-agnostic - all message bodies are treated equally regardless of channel. Users searching for "DIRECT2" should find it whether it came via email or WhatsApp.

## Implementation Strategy

1. **Search Extension** (umi-threads.ts):
   - Keep current in-memory filter for bookerName, fromNumber, etc.
   - Add new in-memory filter stage that:
     - Parses thread.metadata JSON for subject
     - Fetches messages for matching threads
     - Checks if any message body or subject matches all query tokens
   
2. **Thread Surface Fix**:
   - Add logging to identify actual tenant_id returned by staff auth
   - Verify tenant resolution matches expected value (tenant_id=1)
   - If auth is returning wrong tenant, fix in auth middleware
   - If correct, verify thread 48/49 actually exist with tenant_id=1

3. **Testing Strategy**:
   - Unit tests for multi-token parsing and AND logic
   - Integration tests with real Turso schema
   - Test fixtures with known markers (e.g., GF-INBOUND-TEST-*)
   - Verify threads 48/49 appear after fix

## Dependencies

- Existing: `apps/guestflow/src/lib/umi-threads.ts`
- Existing: `apps/guestflow/src/lib/umi-schema.ts`
- Existing: Turso database with `inbound_messages` and `inbound_threads` tables
- Testing: Vitest framework (already in use)

## Alternatives Considered and Rejected

### Alternative: SQL-Based Full Search

Instead of in-memory filtering, implement search entirely in SQL with JOINs:

```sql
SELECT DISTINCT t.* 
FROM inbound_threads t
LEFT JOIN inbound_messages m ON m.thread_id = t.id
WHERE (
  t.guest_name LIKE ? OR
  t.from_number LIKE ? OR
  m.message_text LIKE ? OR
  t.metadata LIKE ?
)
```

**Rejected Because**: 
- More complex to implement multi-token AND logic in SQL
- Current in-memory approach is simpler and performs well at current scale
- Easier to test and debug
- Can migrate to SQL-based approach if performance requires

### Alternative: Full-Text Search Index

Add SQLite FTS5 table for message bodies:

```sql
CREATE VIRTUAL TABLE message_fts USING fts5(message_text, thread_id);
```

**Rejected Because**:
- Overkill for current scale (~1000-2000 messages)
- Adds schema complexity
- Simple LIKE performs well enough
- Can add later if needed
