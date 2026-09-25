# Research: Alert Noise Filter Implementation

**Feature**: Alert Noise Filter for Test and Empty Threads

**Date**: 2026-09-25

**Purpose**: Resolve technical unknowns and establish implementation patterns for thread exclusion logic.

## Research Areas

### 1. Existing Test/Probe Detection Patterns

**Decision**: Extend existing `isStaffOrTestPeer()` function pattern in `staff-alerts.ts`

**Rationale**: 
- GuestFlow already has `TEST_SINK_ADDRESSES` and `TEST_SINK_PHONES` sets for identifying test communications
- Current implementation checks `from_number` against known test phones: `+15124064300`, `+27600200825`
- This pattern is proven and currently used in `evaluateUnanswered()` to filter staff/test threads
- Extension point: Add `+27000000001` to `TEST_SINK_PHONES` set

**Alternatives Considered**:
- **Create separate test detection module**: Rejected because existing pattern is sufficient and consolidating test logic in one place reduces maintenance burden
- **Database flag for test threads**: Rejected as over-engineering; pattern matching is simpler and doesn't require schema changes

**Implementation Notes**:
```typescript
// Current pattern in staff-alerts.ts:
export const TEST_SINK_PHONES = new Set(['+15124064300', '15124064300', '+27600200825'])

// Extension needed:
export const TEST_SINK_PHONES = new Set([
  '+15124064300', '15124064300', 
  '+27600200825',
  '+27000000001', '27000000001'  // Add probe number
])
```

### 2. Thread Marker/Metadata Detection

**Decision**: Add metadata and guest_name pattern matching for smoke test markers

**Rationale**:
- Threads already have `metadata` field (JSON string) and `guest_name` field
- Test file `umi-missing-threads-reproduce.test.ts` shows thread 48 exists with `guest_name: null` and thread 49 with `metadata: '{"subject":"DIRECT2 test"}'`
- Pattern matching on these fields allows flexible test identification without schema changes
- Markers like "T-44", "T-48", "GF-INBOUND-TEST", "thread 44" can be detected in guest_name or metadata.subject

**Alternatives Considered**:
- **Add `is_test` boolean column**: Rejected because it requires schema migration and doesn't provide more value than pattern matching
- **Use thread_kind field**: Rejected because `thread_kind` is reserved for 'booking'/'temp' classification, not test status

**Implementation Notes**:
```typescript
// Check metadata for smoke test markers
function isSmokeTestThread(thread: {
  guest_name?: string | null
  metadata?: string | null
}): boolean {
  const name = String(thread.guest_name || '').toUpperCase()
  if (name.match(/T-\d+|THREAD \d+|GF-INBOUND-TEST/)) return true
  
  try {
    const meta = thread.metadata ? JSON.parse(thread.metadata) : {}
    const subject = String(meta.subject || '').toUpperCase()
    if (subject.match(/GF-INBOUND-TEST|SMOKE|TEST/)) return true
  } catch {}
  
  return false
}
```

### 3. Empty BLOCK Booking Detection

**Decision**: Count inbound messages per thread and exclude BLOCK bookings with 0 guest messages

**Rationale**:
- `inbound_threads` table has `booking_id` foreign key to `bookings` table
- `bookings` table has `guest_name` field (observed pattern: "BLOCK 5376", "Nomsa 5464", "Sakhile 5630")
- `inbound_messages` table has `direction` field to distinguish inbound vs outbound
- Existing code pattern in `umi-threads.ts` line 152 already filters bookings: `UPPER(TRIM(COALESCE(guest_name, ''))) != 'BLOCK'`
- Need to extend this to check message count for BLOCK bookings

**Alternatives Considered**:
- **Filter BLOCK bookings entirely**: Rejected because BLOCK bookings that later receive real guest messages should alert
- **Use booking status field**: Rejected because status doesn't indicate whether messages exist
- **Check pending_reply=0**: Rejected because pending_reply doesn't distinguish between "outbound sent" and "no inbound received"

**Implementation Notes**:
```typescript
// Check if thread is empty BLOCK booking
async function isEmptyBlockBooking(
  db: DbClient,
  thread: { booking_id: number | null }
): Promise<boolean> {
  if (!thread.booking_id) return false
  
  // Get booking guest_name
  const booking = await db.prepare(
    `SELECT guest_name FROM bookings WHERE id = ?`
  ).get(thread.booking_id)
  
  if (!booking) return false
  
  const name = String(booking.guest_name || '').toUpperCase()
  // Match patterns: "BLOCK", "BLOCK 5376", owner names like "Nomsa 5464"
  if (!name.match(/BLOCK|NOMSA|SAKHILE/)) return false
  
  // Count inbound messages (not outbound, not spam)
  const count = await db.prepare(
    `SELECT COUNT(*) as c FROM inbound_messages
     WHERE thread_id = ? AND (direction IS NULL OR direction = 'inbound')
       AND COALESCE(is_spam, 0) = 0`
  ).get(thread.id)
  
  return Number(count?.c || 0) === 0
}
```

### 4. Pattern vs Hardcoded ID Trade-offs

**Decision**: Use rule-based pattern matching with thread IDs only as test examples

**Rationale**:
- Requirement explicitly states: "Prefer durable rules over hardcoding thread IDs 37/40/42/44/48"
- Thread IDs are environment-specific (staging vs production have different IDs)
- Pattern matching is more maintainable and works across environments
- Thread IDs in requirements (37, 40, 42, 44, 48) are examples from CoS/GFM test pack

**Alternatives Considered**:
- **Hardcode thread IDs**: Rejected because it's brittle, environment-specific, and explicitly discouraged in requirements
- **Configuration file of excluded IDs**: Rejected because it requires ongoing maintenance and doesn't scale

**Implementation Notes**:
- Test cases will use specific thread IDs to verify exclusion logic
- Production logic will use patterns only (phone numbers, metadata markers, BLOCK + 0 messages)
- Documentation will clarify that thread IDs 37/40/42/44/48 are examples, not production configuration

### 5. Performance Impact

**Decision**: Add early-return checks to minimize database queries

**Rationale**:
- Alert evaluator runs every 10 minutes on all `pending_reply=1` threads (~50-100 threads)
- Test phone and smoke marker checks are in-memory (no DB query)
- Empty BLOCK check requires DB query but only for threads with booking_id and matching name pattern
- Current `evaluateUnanswered()` already queries each thread individually, so performance baseline is established

**Alternatives Considered**:
- **Batch query all bookings upfront**: Rejected because most threads don't have booking_id or BLOCK pattern
- **Cache exclusion results**: Rejected as premature optimization; cron runs are stateless

**Implementation Notes**:
```typescript
// Order checks from cheapest to most expensive:
// 1. Test phone (in-memory set lookup) - cheapest
// 2. Smoke markers (string pattern match) - cheap
// 3. Empty BLOCK (DB query) - only if booking_id exists
```

### 6. Testing Strategy

**Decision**: Unit tests for pattern functions + integration tests using existing Vitest infrastructure

**Rationale**:
- GuestFlow already uses Vitest at `apps/guestflow/__tests__/`
- Existing test file `staff-alerts.test.ts` can be extended
- Test database setup pattern exists in `umi-missing-threads-reproduce.test.ts`

**Test Coverage Needed**:
1. Unit tests for `isSmokeTestThread()` pattern matching
2. Unit tests for `isEmptyBlockBooking()` with various booking names
3. Integration test: thread from +27000000001 does not alert
4. Integration test: thread with T-44 marker does not alert
5. Integration test: BLOCK booking with 0 messages does not alert
6. Integration test: BLOCK booking with 1+ messages DOES alert (regression check)
7. Integration test: legitimate guest thread still alerts (no false negatives)

**Alternatives Considered**:
- **Manual testing only**: Rejected because regression risk is too high
- **E2E tests with real Vercel deployment**: Rejected as over-engineering for internal alert logic

## Summary of Technical Decisions

| Area | Decision | Confidence |
|------|----------|------------|
| Test phone detection | Extend TEST_SINK_PHONES set | High (proven pattern) |
| Smoke marker detection | guest_name + metadata pattern match | High (fields exist) |
| Empty BLOCK detection | Booking name + inbound message count | Medium (requires careful pattern) |
| Pattern vs hardcode | Rule-based patterns only | High (requirement + maintainability) |
| Performance approach | Early-return, minimal extra queries | High (measured baseline) |
| Testing strategy | Vitest unit + integration | High (existing infrastructure) |

## Open Questions

None. All technical unknowns resolved through codebase analysis.
