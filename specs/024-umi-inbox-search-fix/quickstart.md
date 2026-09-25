# Quickstart: UMI Inbox Search & Surface Fix

**Feature**: UMI Inbox Search & Surface Fix
**Date**: September 25, 2026

## Purpose

This guide provides runnable validation scenarios to prove the inbox search extension and thread surface fix work end-to-end.

## Prerequisites

- GuestFlow app running locally or on Vercel Preview
- Turso database seeded with test threads and messages
- Valid staff session cookie (logged in as staff user)
- Threads 48 and 49 exist in database with known marker text

## Validation Scenarios

### Scenario 1: Search by Email Subject

**Goal**: Verify search finds threads by email subject line.

**Setup**:
```bash
# Ensure test thread exists with known subject
# (or use existing thread 48/49 if metadata.subject is set)
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=booking+inquiry' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Response includes thread(s) where `metadata.subject` contains "booking inquiry" (case-insensitive).

**Success Criteria**: At least one thread returned; thread.bookerName or preview matches expected value.

---

### Scenario 2: Search by Message Body Marker

**Goal**: Verify search finds threads by message body content.

**Setup**:
```bash
# Thread 49 has message 129 with body "GF-INBOUND-TEST-20260925-DIRECT2"
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=DIRECT2' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Response includes thread 49 with message containing "DIRECT2" marker.

**Success Criteria**: 
- `threads` array contains object with `id: 49`
- `preview` or message body contains "DIRECT2"

---

### Scenario 3: Cross-Channel Body Search

**Goal**: Verify search works across email, WhatsApp, and SMS messages.

**Setup**:
```bash
# Create or verify threads with messages in different channels
# Thread A: WhatsApp message with "test marker WA"
# Thread B: Email message with "test marker EMAIL"
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=test+marker' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Both threads A and B returned (both channels matched).

**Success Criteria**: At least 2 threads returned with different `lastChannel` values.

---

### Scenario 4: Multi-Token AND Search

**Goal**: Verify multi-word queries require ALL tokens to match.

**Setup**:
```bash
# Thread 49 has message with "GF-INBOUND-TEST-20260925-DIRECT2"
# Contains both "INBOUND" and "DIRECT2"
# Does NOT contain "FOOBAR"
```

**Test Positive**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=INBOUND+DIRECT2' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Thread 49 returned (both tokens match).

**Test Negative**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=INBOUND+FOOBAR' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Thread 49 NOT returned (FOOBAR does not match).

**Success Criteria**: 
- Positive test returns thread 49
- Negative test returns empty array or does not include thread 49

---

### Scenario 5: Case-Insensitive Search

**Goal**: Verify search is case-insensitive.

**Setup**:
```bash
# Thread 49 has "grant830318@gmail.com" as sender
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=GrAnT830318' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Thread 49 returned despite mixed case query.

**Success Criteria**: Response includes thread with `fromNumber: "grant830318@gmail.com"`.

---

### Scenario 6: Partial Phrase Matching

**Goal**: Verify partial word/phrase matching works.

**Setup**:
```bash
# Thread has message "GF-INBOUND-TEST-20260925-DIRECT2"
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=20260925' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Thread returned (substring match).

**Success Criteria**: Response includes thread with matching message.

---

### Scenario 7: Thread 48 Appears in Inbox

**Goal**: Verify temp/drafted threads are no longer omitted from inbox list.

**Setup**:
```bash
# Verify thread 48 exists in database:
# - tenant_id=1
# - thread_kind='temp'
# - status='drafted'
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Response includes thread 48 in the threads array.

**Success Criteria**: 
- `threads` array contains object with `id: 48`
- `threadKind: "temp"`
- Thread is not filtered out

---

### Scenario 8: Thread 49 Retrievable by ID

**Goal**: Verify thread detail endpoint returns 200 (not 404) for thread 49.

**Setup**:
```bash
# Thread 49 exists with tenant_id=1, status='drafted', thread_kind='temp'
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/threads/49' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: 
- HTTP 200 OK
- Response contains thread object with `id: 49`
- Messages array includes message 129 with "DIRECT2" marker

**Success Criteria**: 
- NOT 404 error
- `thread.id === 49`
- `thread.status === "drafted"`
- `thread.threadKind === "temp"`

---

### Scenario 9: Existing Search Still Works

**Goal**: Verify backward compatibility - existing search fields unchanged.

**Setup**:
```bash
# Thread with bookerName "John Smith"
```

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox?q=John' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: Thread with bookerName "John Smith" returned (existing behavior).

**Success Criteria**: Response includes thread; no regression.

---

### Scenario 10: Empty Query Returns All

**Goal**: Verify empty/no query returns all threads (existing behavior preserved).

**Test**:
```bash
curl 'http://localhost:3000/api/umi/inbox' \
  -H 'Cookie: staff-session=<your-session-cookie>'
```

**Expected**: All non-linked threads for tenant returned.

**Success Criteria**: 
- Response contains multiple threads
- Includes threads 48 and 49
- Sorted by sortBucket and lastMessageAt

---

## Automated Test Run

**Command**:
```bash
cd apps/guestflow
npm test -- umi-inbox-search
```

**Expected Output**:
```
✓ Search by email subject finds thread
✓ Search by message body finds thread
✓ Cross-channel search finds multiple threads
✓ Multi-token AND requires all tokens
✓ Case-insensitive search works
✓ Partial phrase matching works
✓ Thread 48 appears in inbox list
✓ Thread 49 fetchable by ID (not 404)
✓ Existing search fields still work
✓ Empty query returns all threads
```

## Manual Testing (GFM Preview)

**Access**: Preview deployment URL from PR (e.g., `https://guestflow-<pr-id>.vercel.app`)

**Steps**:
1. Navigate to staff login: `https://guestflow-<pr-id>.vercel.app/staff-login`
2. Log in with staff credentials
3. Navigate to inbox: `https://guestflow-<pr-id>.vercel.app/`
4. **Test Search via URL**:
   - URL: `https://guestflow-<pr-id>.vercel.app/?q=DIRECT2` → Expect thread 49 visible in filtered list
   - URL: `https://guestflow-<pr-id>.vercel.app/?q=grant830318` → Expect thread 49 visible (sender match)
   - URL: `https://guestflow-<pr-id>.vercel.app/?q=INBOUND%20TEST` → Expect thread 49 visible (multi-token)
   - URL: `https://guestflow-<pr-id>.vercel.app/?q=INBOUND%20FOOBAR` → Expect thread 49 NOT visible (missing token)
5. **Test Search via Input**:
   - Type "DIRECT2" in search box (should update URL to `?q=DIRECT2` and filter list)
   - Clear search (should remove `?q=` from URL and show all threads)
6. **Test Thread Retrieval**:
   - Direct URL: `https://guestflow-<pr-id>.vercel.app/?thread=49`
   - Expect: Thread detail panel opens (not 404)
   - With search: `https://guestflow-<pr-id>.vercel.app/?thread=49&q=DIRECT2`
   - Expect: Thread opens with search filter active
   - **Note**: Thread deep-link is `/?thread=<id>` (query param), NOT `/thread/<id>` (route)
   - Verify: Message with "DIRECT2" marker visible

**Success**: All manual tests pass; no 404 errors; search results correct; URL syncs with search input.

## Rollback Plan

If issues found in production:

1. **Quick Fix**: Add feature flag to disable extended search
   ```typescript
   const ENABLE_EXTENDED_SEARCH = process.env.ENABLE_EXTENDED_SEARCH === 'true'
   ```

2. **Revert**: PR can be reverted; existing search logic restored

3. **Data Safety**: No database writes; read-only feature; no rollback data needed

## Production Smoke Test

After merge to main and deploy:

```bash
# Production inbox search
curl 'https://guestflow.vercel.app/api/umi/inbox?q=<known-marker>' \
  -H 'Cookie: <production-staff-session>'

# Verify thread 49 retrievable
curl 'https://guestflow.vercel.app/api/umi/threads/49' \
  -H 'Cookie: <production-staff-session>'
```

**Expected**: Same results as preview; threads 48/49 visible in production.
