# Investigation: Missing Threads 48-50 in UMI Inbox

## Problem Statement

Production UMI inbox endpoint returns only threads up to ID 47, missing threads 48-50 that exist in the Turso database with `status='drafted'`.

## Evidence

### Working Endpoints (See threads 48-50)
- ✅ `GET /api/health/deep` → `maxInboundThreadId: 50, maxInboundMessageId: 138`
- ✅ `GET /api/inbound/queue?limit=5` → returns thread 50

### Broken Endpoints (Missing threads 48-50)
- ❌ `GET /api/umi/inbox` → `count: 47, max id: 47`
- ❌ `GET /api/umi/threads/49` → 404 Not Found

### Database State (Box Primary)
```sql
-- All exist with tenant_id=1, status='drafted'
48: temp thread, from ops@example.com
49: temp thread, from grant830318@gmail.com (DIRECT2 marker in metadata)
50: booking thread, booking_id=10
```

## Code Analysis

### listInboxThreads SQL Query (line 926-932)
```sql
SELECT t.*, b.guest_name as booking_guest_name, b.check_in, b.check_out,
       b.suite_or_unit, b.nightsbridge_booking_id
FROM inbound_threads t
LEFT JOIN bookings b ON b.id = t.booking_id
WHERE t.tenant_id = ?
  AND COALESCE(t.status, '') <> 'linked'
```

**Expected behavior**: Returns all threads where `status != 'linked'`  
**Should include**: Threads with `status='drafted'`

### getThreadDetail SQL Query (line 1049-1056)
```sql
SELECT t.*, b.guest_name as booking_guest_name, ...
FROM inbound_threads t
LEFT JOIN bookings b ON b.id = t.booking_id
WHERE t.id = ? AND t.tenant_id = ?
```

**Expected behavior**: Returns thread by ID + tenant, no status filter  
**Should include**: Any thread that exists

### Processing Loop (line 954-991)
```typescript
const threads: InboxThread[] = []
for (const row of rows) {
  const preview = await latestMessagePreview(db, asNumber(row.id))
  const unansweredInbound = await hasUnansweredInbound(db, asNumber(row.id))
  // ... build thread object ...
  threads.push(thread)  // Always pushes, no conditional skips
}
```

**Expected behavior**: All rows processed and added to threads array  
**No filtering logic**: No continue/break statements that would skip rows

## Test Coverage

### New Test: "includes drafted temp and booking threads in inbox list"
```typescript
// Creates threads 48, 49, 50 with status='drafted'
// Verifies all three appear in listInboxThreads result
✅ Test passes (14/14 in umi-threads.test.ts)
```

**Conclusion**: Code logic is correct for handling drafted threads

## Hypotheses

### 1. Turso vs SQLite Behavior Difference ⚠️ HIGH
- Test uses better-sqlite3 (in-memory)
- Production uses libsql/Turso (remote HTTP)
- Possible differences:
  - Row batching/chunking
  - Transaction isolation
  - Query timeout behavior
  - NULL handling in LEFT JOIN

### 2. Production Data Edge Case ⚠️ MEDIUM
- Test creates clean, minimal thread data
- Production threads may have:
  - Corrupted metadata JSON
  - NULL values in unexpected columns
  - Orphaned foreign key references
  - Character encoding issues

### 3. Replica Lag ❌ RULED OUT
- User confirmed health/deep reads correct Turso primary
- inbound/queue sees thread 50 (same connection pool)
- If replica lag, all endpoints would be affected

### 4. Race Condition ⚠️ LOW
- Unlikely given multiple endpoint tests show consistent behavior
- Would need to affect listInboxThreads but not inbound/queue

### 5. Cache Staleness ❌ RULED OUT (NOW FIXED)
- Added Cache-Control: no-store headers
- But issue existed before cache headers, so not root cause

## Diagnostic Strategy

### Phase 1: Identify Filter Location
```bash
curl 'https://guestflow.thebrowns.co.za/api/umi/inbox?debug=1'
```

Check debug output:
- `rawMaxId`: If 47 → threads filtered by SQL query
- `rawMaxId`: If 50 → threads filtered in post-processing

### Phase 2A: If SQL Query Filters (rawMaxId=47)
Possible causes:
- Turso query timeout/row limit
- JOIN condition issue
- WHERE clause bug with Turso NULL handling

Next steps:
- Run raw SQL directly against Turso
- Check Turso query execution plan
- Test with simpler query (no JOIN)

### Phase 2B: If Post-Processing Filters (rawMaxId=50)
Possible causes:
- Exception in latestMessagePreview/hasUnansweredInbound
- Async operation timeout
- Data shape issue causing silent skip

Next steps:
- Add try-catch around each async call
- Log thread IDs as they're processed
- Check for exceptions in Vercel logs

### Phase 3: Direct Database Query
```bash
# Via Turso CLI or SQL explorer
SELECT id, status, thread_kind, from_number, booking_id 
FROM inbound_threads 
WHERE tenant_id = 1 AND id IN (48, 49, 50);

# Check if they exist and match expected state
```

## Implementation Checklist

- [x] Add `?debug=1` diagnostics to /api/umi/inbox
- [x] Add Cache-Control headers to staff endpoints
- [x] Add test coverage for drafted threads
- [x] Document diagnostic feature
- [ ] Deploy to Preview
- [ ] Run diagnostic query
- [ ] Identify filter location from debug output
- [ ] Implement targeted fix based on findings
- [ ] Re-test and verify fix

## Success Criteria

1. ✅ Diagnostic PR merged (#233)
2. ⏳ `GET /api/umi/inbox` returns threads 48, 49, 50
3. ⏳ `GET /api/umi/threads/49` returns 200 with thread detail
4. ⏳ `?debug=1` shows `rawMaxId=50, listMaxId=50, idsPresentFor48_49_50: all true`
5. ⏳ Root cause identified and documented
6. ⏳ Fix PR includes regression test covering edge case

## Notes for GuestFlow Manager

The code logic is sound - the test proves it. The bug is either:
1. A Turso-specific behavior not replicated in SQLite tests
2. A Production data edge case the test doesn't cover

The `?debug=1` output will definitively show WHERE the threads are being lost:
- SQL query level → Turso or query construction issue
- Post-processing level → Async operation or data shape issue

Once we see the diagnostic output, the fix will be straightforward.
