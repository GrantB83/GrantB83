# Quickstart: Alert Noise Filter Verification

**Feature**: Alert Noise Filter for Test and Empty Threads

**Purpose**: Verify that test threads, smoke test markers, and empty BLOCK bookings are correctly excluded from staff alerts.

## Prerequisites

- Node.js 18+ installed
- GuestFlow repository cloned
- Working directory: `apps/guestflow/`
- Test database available (in-memory or Turso local)

## Setup

```bash
cd apps/guestflow

# Install dependencies (if not already done)
npm install

# Verify test infrastructure
npm run test -- --version
```

Expected output: Vitest version information

## Run Verification Tests

### 1. Run Unit Tests (Pattern Matching)

Test the pattern matching helpers in isolation:

```bash
npm run test -- src/lib/staff-alert-filters.test.ts
```

**Expected Results**:
- ✓ `isSmokeTestThread()` correctly identifies T-44, T-48, GF-INBOUND-TEST markers
- ✓ `isSmokeTestThread()` returns false for legitimate guest names
- ✓ Test phone patterns match +27000000001 and existing test numbers
- ✓ BLOCK booking patterns match "BLOCK", "BLOCK 5376", "Nomsa 5464", "Sakhile 5630"

**Success Criteria**: All pattern matching tests pass, ~15-20 test cases

### 2. Run Integration Tests (Alert Exclusion)

Test the full alert evaluation flow with exclusions:

```bash
npm run test -- src/lib/staff-alerts.test.ts
```

**Expected Results**:
- ✓ Thread from +27000000001 does NOT trigger unanswered alert
- ✓ Thread with guest_name "T-44" does NOT trigger overnight digest
- ✓ Thread with metadata "GF-INBOUND-TEST" is excluded
- ✓ Empty BLOCK booking (0 messages) does NOT alert
- ✓ BLOCK booking with 1+ messages DOES alert (regression check)
- ✓ Legitimate guest thread DOES alert (no false negatives)
- ✓ Existing spam filter continues to work independently

**Success Criteria**: All integration tests pass, including regression checks for legitimate alerts

### 3. Run Full Test Suite

Verify no regressions in related functionality:

```bash
npm run test
```

**Expected Results**:
- ✓ All existing tests continue to pass
- ✓ No new test failures introduced
- ✓ Coverage for alert evaluation remains high

**Success Criteria**: Test suite passes with same or better coverage as baseline

## Manual Verification (Optional)

### Scenario 1: Test Phone Exclusion

1. Create test thread:
```sql
INSERT INTO inbound_threads (
  tenant_id, from_number, guest_name, pending_reply,
  last_inbound_at, first_message_at, last_message_at
) VALUES (
  1, '+27000000001', 'Probe Test', 1,
  datetime('now', '-35 minutes'),
  datetime('now', '-35 minutes'),
  datetime('now', '-35 minutes')
);
```

2. Run alert evaluator:
```bash
curl -X POST "http://localhost:3000/api/cron/alerts-evaluate" \
  -H "x-cron-secret: ${CRON_SECRET}"
```

3. **Verify**: No alert email sent for this thread (check logs or staff_alerts table)

### Scenario 2: Empty BLOCK Booking

1. Create BLOCK booking:
```sql
INSERT INTO bookings (tenant_id, guest_name, status) 
VALUES (1, 'BLOCK 5376', 'confirmed');

INSERT INTO inbound_threads (
  tenant_id, from_number, booking_id, pending_reply,
  last_inbound_at, first_message_at, last_message_at
) VALUES (
  1, '+27821111111', last_insert_rowid(), 1,
  datetime('now', '-35 minutes'),
  datetime('now', '-35 minutes'),
  datetime('now', '-35 minutes')
);
-- Note: No messages inserted (count=0)
```

2. Run evaluator (same curl command as above)

3. **Verify**: No alert sent for empty BLOCK thread

4. Add message to same thread:
```sql
INSERT INTO inbound_messages (
  thread_id, tenant_id, direction, message_timestamp
) VALUES (
  last_insert_rowid(), 1, 'inbound', datetime('now', '-34 minutes')
);
```

5. Run evaluator again

6. **Verify**: NOW alert IS sent (BLOCK booking no longer empty)

### Scenario 3: Smoke Test Marker

1. Create smoke test thread:
```sql
INSERT INTO inbound_threads (
  tenant_id, from_number, guest_name, pending_reply,
  last_inbound_at, metadata
) VALUES (
  1, '+27821234567', 'T-48', 1,
  datetime('now', '-35 minutes'),
  '{"subject": "GF-INBOUND-TEST"}'
);
```

2. Run evaluator

3. **Verify**: No alert sent for smoke test thread

## Troubleshooting

### Test Failures

**Problem**: Pattern tests fail with "no match"

**Solution**: Verify patterns are case-insensitive and handle null values:
```typescript
const name = String(thread.guest_name || '').toUpperCase()
if (name.match(/T-\d+/)) { /* ... */ }
```

**Problem**: Empty BLOCK test fails with "still alerting"

**Solution**: Verify message count query excludes spam and outbound:
```sql
SELECT COUNT(*) FROM inbound_messages
WHERE thread_id = ? 
  AND (direction IS NULL OR direction = 'inbound')
  AND COALESCE(is_spam, 0) = 0
```

### Integration Issues

**Problem**: Legitimate alerts stopped working

**Solution**: Verify exclusion logic uses early-return pattern:
```typescript
// Check exclusions FIRST
if (await shouldExcludeFromAlerts(...)) continue

// Then check existing filters (spam, staff peer)
if (isStaffOrTestPeer(...)) continue
if (await latestInboundIsSpam(...)) continue

// Finally, evaluate unanswered threshold
const action = classifyUnanswered(...)
```

**Problem**: Performance degradation

**Solution**: Verify BLOCK check only runs when needed:
```typescript
// Only query booking if thread has booking_id
if (!thread.booking_id) return false

// Only count messages if booking name matches BLOCK pattern
const name = String(booking.guest_name || '').toUpperCase()
if (!name.match(/BLOCK|NOMSA|SAKHILE/)) return false

// Finally, count messages
```

## Success Checklist

- [ ] Unit tests pass for all pattern matching functions
- [ ] Integration tests pass for all three exclusion categories
- [ ] Regression tests confirm legitimate alerts still work
- [ ] No performance degradation in alert evaluator
- [ ] Manual scenarios (if run) show expected exclusion behavior
- [ ] Existing test suite continues to pass

## Next Steps

After verification:
1. Review test coverage report
2. Run manual scenarios in Preview deployment (if available)
3. Document any edge cases discovered during testing
4. Prepare test plan for GFM verification in PR description
5. Commit with `test(guestflow): alert noise filter verification`

## Reference

- Implementation plan: [plan.md](plan.md)
- Data model: [data-model.md](data-model.md)
- Research decisions: [research.md](research.md)
