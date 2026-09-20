# Quick Start: Access Codes Source of Record

**Feature**: Access Codes SoR | **Date**: 2026-09-20

This guide walks you through setting up, using, and testing the Access Codes Source of Record feature for GuestFlow.

## Table of Contents

1. [Overview](#overview)
2. [Local Development Setup](#local-development-setup)
3. [Staff Usage](#staff-usage)
4. [Guest Experience](#guest-experience)
5. [Testing Scenarios](#testing-scenarios)
6. [Troubleshooting](#troubleshooting)

---

## Overview

**What problem does this solve?**

Before: Access codes (gate pinpads + lockboxes) lived in env vars. Changing a compromised code required a Vercel deploy.

After: Access codes live in the database. Staff edit codes through a UI. Changes take effect immediately. Env vars remain as fallback for smooth migration.

**Key features**:
- **Staff UI** at `/staff/access-codes` to view and edit codes
- **DB-first resolution**: Portal and templates read from DB, fall back to env vars
- **Audit trail**: Every change logged (who, when, what changed)
- **Redaction**: Live codes never appear in browser DevTools, logs, or tests
- **Time-gated**: Codes still hidden from guests until 24h before check-in

---

## Local Development Setup

### Prerequisites

- Node.js 18+ installed
- `apps/guestflow` project set up locally
- SQLite (for local dev) or Turso (for production)

### Step 1: Run migration

```bash
cd apps/guestflow
node scripts/migrate-access-codes-sor.js
```

**Expected output**:
```
✅ Access codes SoR migration complete
✅ Created property_access_codes table
✅ Created access_code_audit_log table
✅ Created indexes
```

### Step 2: (Optional) Seed from env vars

If you want to populate DB from existing env vars:

```bash
SEED_ACCESS_CODES=APPROVE node scripts/seed-access-codes.js
```

**This will**:
- Read `PROPERTY_GATE_CODE` and `PROPERTY_DOOR_CODE` from `.env.local`
- Insert gate codes for cottage and main-house
- Insert audit log entries for seed action

**⚠️ Only run once!** Subsequent runs are safe (idempotent) but unnecessary.

### Step 3: Start dev server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Step 4: Test staff access

1. Open `http://localhost:3000/ops/access-codes`
2. Log in as staff (use existing staff auth)
3. You should see the Access Codes Manager page

---

## Staff Usage

### View Current Codes

1. Navigate to `/ops/access-codes`
2. Codes are grouped by property:
   - **Cottage (278 Blue Crane)**: Gate pinpad (suite='')
   - **Main House (279 Blue Crane)**: Gate pinpad (suite='') + lockbox codes per suite

Each row shows:
- Code type (Gate / Lockbox)
- Suite (for lockboxes)
- Last updated timestamp
- Last updated by (staff name)

### Edit a Code

1. Click the **Edit** button next to a code (or inline edit if that UI is implemented)
2. Code input is masked by default (`****`)
3. Click **Reveal** to see actual code (if you need to verify)
4. Type new code
5. Click **Save**

**Validation**:
- Code cannot be empty
- Whitespace is trimmed
- Typical length: 4-6 characters

### View Change History

Scroll down to **Audit Log** section.

Shows last 90 days of changes:
- Property
- Code type
- Suite (if lockbox)
- Changed by (staff name)
- Changed at (timestamp)
- Action (create/update)
- Notes (optional)

**Note**: Actual code values are NOT displayed in audit log for security.

### Add a New Lockbox Code

1. If a suite doesn't have a lockbox code yet, you'll see an "Add" button or placeholder row
2. Click **Add lockbox code**
3. **Enter suite name as free text** (not dropdown) - must exactly match booking.room or booking.suite
4. Enter code
5. Save

---

## Guest Experience

### When Codes Are Shown

Guests see access codes in their magic-link portal **only** when:
- Check-in is within 24 hours OR
- Current date is between check-in and checkout

### What Guests See

**Within time-gate window**:
- Gate code (e.g., `1234`)
- Lockbox code for their suite (e.g., `5678`)

**Outside time-gate window**:
- Message: "Access codes will be available 24 hours before your check-in date"

**If codes are missing from DB and env**:
- Message: `[ASK STAFF]` with instruction to contact reception

### Example Portal View

```
Access Codes
━━━━━━━━━━━━━━━━━━━━━━━

Gate Code:  1234
(Main house entrance - 279 Blue Crane)

Lockbox Code:  5678
(Suite 2 - key lockbox by front door)
```

---

## Testing Scenarios

### Test 1: DB code exists, guest within time-gate

**Setup**:
1. Run migration + seed (or manually add via `/ops/access-codes`)
2. Edit gate code via staff UI: `TEST_GATE_9999` (suite='')
3. Create test booking with check-in = today
4. Generate magic link for that booking

**Expected result**:
- Guest portal shows `TEST_GATE_9999`
- Env var is ignored (DB row exists, so DB wins)

---

### Test 2: NO DB row, env fallback

**Setup**:
1. Clear DB row for cottage gate (DELETE or never create)
2. Set env var: `PROPERTY_GATE_CODE=ENV_FALLBACK_1234`
3. Same test booking for cottage

**Expected result**:
- Guest portal shows `ENV_FALLBACK_1234`
- Env fallback used because NO DB row exists for cottage gate

---

### Test 3: Both empty, fail-closed

**Setup**:
1. Clear DB row for main-house gate
2. Clear env var (or set to empty string)
3. Test booking for main-house

**Expected result**:
- Guest portal shows `[ASK STAFF]`
- Message: "Please contact reception for access details"

---

### Test 4: No cross-property env bleed

**Setup**:
1. Add DB row for cottage gate: `COTTAGE_DB_CODE` (suite='')
2. NO DB row for main-house gate
3. Set env var: `PROPERTY_GATE_CODE=GLOBAL_ENV_CODE`
4. Create two bookings: one for cottage, one for main-house

**Expected result**:
- Cottage portal shows `COTTAGE_DB_CODE` (DB row exists, env ignored)
- Main-house portal shows `GLOBAL_ENV_CODE` (NO DB row, env used)
- No cross-property bleed ✅

---

### Test 4: Outside time-gate, codes hidden

**Setup**:
1. Set gate code in DB: `TEST_GATE_9999`
2. Create test booking with check-in = tomorrow + 1 day (outside 24h window)
3. Generate magic link

**Expected result**:
- Guest portal hides codes
- Message: "Access codes will be available 24 hours before your check-in date"

---

### Test 5: Suite-specific lockbox code

**Setup**:
1. Add lockbox code for Suite 1: `SUITE1_LOCKBOX_1111`
2. Add lockbox code for Suite 2: `SUITE2_LOCKBOX_2222`
3. Create booking for Suite 2, check-in = today

**Expected result**:
- Guest portal shows `SUITE2_LOCKBOX_2222`
- Does NOT show Suite 1's code

---

### Test 6: Welcome draft uses DB code

**Setup**:
1. Set gate code in DB: `TEST_GATE_9999`
2. Generate welcome draft for a booking (check-in = today or soon)

**Expected result**:
- Welcome draft body includes gate code `TEST_GATE_9999`
- Env var is ignored

---

### Test 7: Audit trail records changes

**Setup**:
1. Log in as Staff A
2. Edit gate code for cottage: `NEW_CODE_1111`
3. Log in as Staff B (different session)
4. Edit same gate code again: `NEW_CODE_2222`
5. View audit log

**Expected result**:
- Two entries in audit log
- First entry: Staff A, timestamp 1
- Second entry: Staff B, timestamp 2
- Actual code values NOT shown in audit UI (redacted)

---

### Test 8: Redaction in server logs

**Setup**:
1. Tail server logs: `tail -f logs/server.log` (or wherever your logs go)
2. Open `/ops/access-codes` as staff
3. Edit a code and save

**Expected result**:
- Server logs never print actual code values
- Authorized HTTPS API responses may contain plaintext codes (required for edit/display)
- console.log statements never print actual codes

---

## Troubleshooting

### Problem: Codes not showing in guest portal

**Possible causes**:
1. **Outside time-gate**: Check booking dates. Codes only show 24h before check-in.
2. **DB empty and env not set**: Check DB has codes, or set `PROPERTY_GATE_CODE` env var.
3. **Property mismatch**: Ensure booking property matches code property (`cottage` vs `main-house`).

**Debug steps**:
```bash
# Check DB contents
sqlite3 .guestflow.db "SELECT * FROM property_access_codes;"

# Check env vars
cat .env.local | grep PROPERTY_

# Check booking dates (in guest portal API route logs)
# Should see: "shouldShowAccessCodes: true" or "false"
```

---

### Problem: Staff UI shows blank page

**Possible causes**:
1. **Not authenticated**: Staff session expired or not logged in.
2. **Migration not run**: Tables don't exist.
3. **Wrong path**: Use `/ops/access-codes`, not `/staff/access-codes`.

**Debug steps**:
```bash
# Check tables exist
sqlite3 .guestflow.db ".tables"
# Should see: property_access_codes, access_code_audit_log

# Check server logs for auth error
npm run dev
# Look for 401 or redirect logs
```

---

### Problem: Code changes not reflected in portal

**Possible causes**:
1. **Cache**: Portal may be cached (unlikely in dev mode).
2. **Wrong property**: Editing cottage code but booking is for main-house.
3. **Time-gate**: Portal is hiding codes (outside 24h window).

**Debug steps**:
- Hard refresh portal (Cmd+Shift+R or Ctrl+Shift+R)
- Check API route logs: does `resolveAccessCodes()` return the new code?
- Verify booking property matches code property

---

### Problem: Audit log empty

**Possible causes**:
1. **No changes yet**: Audit log only populates after codes are edited.
2. **Migration not run**: `access_code_audit_log` table doesn't exist.

**Debug steps**:
```bash
# Check audit log table
sqlite3 .guestflow.db "SELECT COUNT(*) FROM access_code_audit_log;"

# Manually insert a test entry
sqlite3 .guestflow.db "INSERT INTO access_code_audit_log (...) VALUES (...);"
```

---

### Problem: Live codes visible in server logs

**This is a bug! Report immediately.**

**Expected behavior**:
- Server logs never print actual codes (check with `grep` for patterns like `1234`)
- Authorized HTTPS API responses may contain plaintext codes (required for edit/display)
- console.log statements never print actual codes

**If you see live codes in logs**:
- Check `src/app/api/ops/access-codes/upsert/route.ts`: No `console.log(code)`
- Check `src/lib/access-codes.ts`: Use DEBUG mode with redaction if needed

---

## Environment Variables

**Required** (global fallback for migration, used ONLY when NO DB row exists):
```bash
PROPERTY_GATE_CODE=****       # Global fallback if NO DB row
PROPERTY_DOOR_CODE=****       # Global fallback if NO DB row
```

**WARNING**: Single global env vars cannot safely back both cottage and main-house long-term. Once DB rows exist for properties, env vars are ignored for those properties (no cross-property bleed).

**Optional** (for seeding):
```bash
SEED_ACCESS_CODES=APPROVE     # One-time flag to seed from env
```

**Optional** (for app-level encryption, if implemented):
```bash
ACCESS_CODE_ENCRYPTION_KEY=****  # AES-256 key
```

---

## Production Rollout

### Step 1: Merge design PR
- Wait for GFM acceptance

### Step 2: Deploy migration
- Run `node scripts/migrate-access-codes-sor.js` on production DB (with Grant's `APPROVE APPLY MIGRATION`)

### Step 3: Seed DB (one-time)
```bash
SEED_ACCESS_CODES=APPROVE node scripts/seed-access-codes.js
```

### Step 4: Verify staff can edit codes
- Log in to production as staff
- Navigate to `/ops/access-codes`
- Edit a test code (non-critical property if available)
- Verify audit log entry

### Step 5: Verify guest portal
- Find a booking with check-in = today
- Generate magic link
- Open portal, verify codes show

### Step 6: Monitor audit log
- Check for unexpected entries
- Verify only authorized staff are making changes

### Step 7: (Optional) Deprecate env vars
- After DB is stable for 30+ days, can remove env var fallback in future phase
- Requires separate design decision from Grant

---

## Next Steps

- **If this is design-only PR**: Wait for GFM acceptance, then implement in follow-up PR
- **If tight scope + tests green**: Implementation may be in this same PR
- **After merge**: Staff can immediately start managing codes via UI, no more emergency deploys for code rotation

---

## Links

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [Task Breakdown](./tasks.md)
- [Full Documentation](../../apps/guestflow/docs/ACCESS-CODES-SOR.md) (after implementation)

---

**⚠️ Security Reminder**: Never paste live access codes in PR descriptions, commit messages, or Slack/chat. Always use `REDACTED` or `****` as placeholders.
