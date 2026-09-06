# Testing Guide: Nightsbridge Autonomous Sync

## Overview

This guide documents the manual testing steps Grant should perform to verify the Nightsbridge → GuestFlow autonomous sync implementation.

## Prerequisites

Before testing, ensure the following environment variables are configured in Vercel:

```bash
# Generate a secure CRON_SECRET
openssl rand -hex 32

# Set in Vercel dashboard:
CRON_SECRET=<generated-secret>
NIGHTSBRIDGE_TENANT_ID=1  # The Browns Dullstroom
NIGHTSBRIDGE_DRIVE_FOLDER_ID=<drive-folder-id>  # Optional for Drive sync
```

---

## Test 1: Verify Deployment

**Command:**
```bash
cd /workspace/apps/guestflow
npm run build
```

**Expected Result:**
- Build succeeds with no TypeScript errors
- Route `/api/ops/nightsbridge-sync/route.ts` compiles successfully

---

## Test 2: Check Endpoint Status (No Auth Required)

**Command:**
```bash
# macOS/Linux
curl https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync | jq

# Windows PowerShell
Invoke-RestMethod -Uri "https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync" | ConvertTo-Json
```

**Expected Result:**
```json
{
  "endpoint": "/api/ops/nightsbridge-sync",
  "purpose": "Autonomous Nightsbridge → GuestFlow data import",
  "property": "The Browns Dullstroom (Nightsbridge 24299)",
  "timezone": "Africa/Johannesburg",
  "schedule": {
    "morning": "07:00 SAST (05:00 UTC)",
    "evening": "17:00 SAST (15:00 UTC)"
  },
  "configuration": {
    "CRON_SECRET": "[CONFIGURED]",
    "NIGHTSBRIDGE_TENANT_ID": "1",
    "NIGHTSBRIDGE_DRIVE_FOLDER_ID": "[CONFIGURED]" or "[MISSING]"
  }
}
```

---

## Test 3: Auth Rejection (Invalid Secret)

**Command:**
```bash
# macOS/Linux
curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json"

# Windows PowerShell
Invoke-RestMethod -Method POST -Uri "https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync" `
  -Headers @{"Authorization"="Bearer wrong-secret"; "Content-Type"="application/json"}
```

**Expected Result:**
- Status: 401 Unauthorized
- Body: `{"error": "Unauthorized. Valid CRON_SECRET required."}`

---

## Test 4: Auth Success (Valid Secret)

**Command:**
```bash
# macOS/Linux
curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"

# Windows PowerShell
Invoke-RestMethod -Method POST -Uri "https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync" `
  -Headers @{"Authorization"="Bearer <CRON_SECRET>"; "Content-Type"="application/json"}
```

**Expected Result:**
- Status: 200 OK
- Body contains `SyncResult` object:
```json
{
  "success": false,
  "source": "drive",
  "bookingsProcessed": 0,
  "bookingsInserted": 0,
  "errors": [],
  "missingFields": [],
  "timestamp": "2026-09-06T...",
  "message": "NIGHTSBRIDGE_DRIVE_FOLDER_ID not configured..." or "Google Drive integration not yet implemented..."
}
```

---

## Test 5: File Upload (Direct POST)

**Step 1: Prepare Test File**

Use existing fixture:
```bash
# macOS/Linux
cd /workspace
base64 tools/browns-nightsbridge-bookings-adapter/fixtures/nightsbridge-good.csv > /tmp/file.b64

# Windows PowerShell
cd C:\workspace
[Convert]::ToBase64String([IO.File]::ReadAllBytes("tools\browns-nightsbridge-bookings-adapter\fixtures\nightsbridge-good.csv")) | Out-File -Encoding ASCII file.b64
```

**Step 2: POST File**

```bash
# macOS/Linux
FILE_B64=$(cat /tmp/file.b64 | tr -d '\n')
curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{\"fileBase64\": \"$FILE_B64\", \"fileName\": \"nightsbridge-good.csv\"}"

# Windows PowerShell
$fileB64 = Get-Content file.b64 -Raw
$body = @{
  fileBase64 = $fileB64.Trim()
  fileName = "nightsbridge-good.csv"
} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync" `
  -Headers @{"Authorization"="Bearer <CRON_SECRET>"; "Content-Type"="application/json"} `
  -Body $body
```

**Expected Result:**
```json
{
  "success": true,
  "source": "uploaded_file",
  "fileName": "nightsbridge-good.csv",
  "bookingsProcessed": 5,
  "bookingsInserted": 5,
  "errors": [],
  "missingFields": [],
  "timestamp": "2026-09-06T..."
}
```

---

## Test 6: Verify Bookings in Database

**Command:**
```bash
# Visit GuestFlow Ops
# macOS/Linux
open https://guestflow.thebrowns.co.za/ops/bookings

# Windows
start https://guestflow.thebrowns.co.za/ops/bookings
```

**Expected Result:**
- Bookings from the uploaded file appear in the list
- Guest names, suites, dates match the fixture data
- Status is correctly derived (arriving/inhouse/departing)

---

## Test 7: Vercel Cron Configuration

**Command:**
```bash
# Check vercel.json
cat /workspace/apps/guestflow/vercel.json | jq .crons
```

**Expected Result:**
```json
[
  {
    "path": "/api/ops/nightsbridge-sync",
    "schedule": "0 5 * * *"
  },
  {
    "path": "/api/ops/nightsbridge-sync",
    "schedule": "0 15 * * *"
  }
]
```

---

## Test 8: Vercel Cron Dashboard

**Steps:**
1. Open Vercel dashboard: https://vercel.com/dashboard
2. Navigate to GuestFlow project
3. Go to Functions → Crons
4. Verify two entries for `nightsbridge-sync`:
   - Morning: `0 5 * * *` (07:00 SAST)
   - Evening: `0 15 * * *` (17:00 SAST)

**Expected Result:**
- Both cron entries appear
- Status shows "Scheduled" (after first deployment)
- Can manually trigger via "Run Now" button

---

## Test 9: Manual Cron Trigger (Vercel Dashboard)

**Steps:**
1. In Vercel Functions → Crons
2. Find `nightsbridge-sync` cron
3. Click "Run Now"
4. Wait for execution to complete
5. Check logs

**Expected Result:**
- Cron runs immediately
- Logs show sync attempt
- If NIGHTSBRIDGE_DRIVE_FOLDER_ID not configured, returns message about Drive sync
- If file in Drive folder, processes and imports bookings

---

## Test 10: Unit Tests

**Command:**
```bash
cd /workspace/apps/guestflow
npm test -- nightsbridge-sync.test.ts
```

**Expected Result:**
- All tests pass
- Auth tests verify CRON_SECRET enforcement
- File parsing tests verify booking extraction
- Schema tests verify SyncResult structure
- Cron config tests verify vercel.json schedules

---

## Test 11: Drive Sync (If Configured)

**Prerequisites:**
- `NIGHTSBRIDGE_DRIVE_FOLDER_ID` set in Vercel environment
- Google Drive MCP integration implemented (future)

**Steps:**
1. Export `arr_and_dep.xlsx` from Nightsbridge
2. Upload to designated Google Drive folder
3. Wait for next cron run (07:00 or 17:00 SAST)
4. Check `/ops/bookings` for new imports

**Expected Result:**
- File detected and processed automatically
- Bookings imported to database
- Logs show successful sync

---

## Test 12: Missing Fields Detection

**Command:**
```bash
# Upload sparse fixture with missing fields
base64 tools/browns-nightsbridge-bookings-adapter/fixtures/nightsbridge-sparse.csv > /tmp/sparse.b64

FILE_B64=$(cat /tmp/sparse.b64 | tr -d '\n')
curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{\"fileBase64\": \"$FILE_B64\", \"fileName\": \"nightsbridge-sparse.csv\"}"
```

**Expected Result:**
```json
{
  "success": true or false,
  "source": "uploaded_file",
  "fileName": "nightsbridge-sparse.csv",
  "bookingsProcessed": 2,
  "bookingsInserted": 0 or partial,
  "errors": [...],
  "missingFields": [
    {"guest": "Anna Müller", "field": "suiteOrUnit (Room Name)"},
    {"guest": "Row 4", "field": "checkInDate"}
  ],
  "timestamp": "2026-09-06T..."
}
```

---

## Safety Verification

### Never Invents Data

**Test:** Upload file with missing guest names  
**Expected:** `missingFields` array populated, NOT silently filled with defaults

### Never Auto-Sends WhatsApp/Email

**Test:** Check endpoint documentation  
**Expected:** No send-related workflow steps, only imports bookings

### CRON_SECRET Required

**Test:** POST without auth header  
**Expected:** 401 Unauthorized

### One-Way Import

**Test:** Import bookings  
**Expected:** No write-back to Nightsbridge, no API calls to Nightsbridge

---

## Rollback Plan

If issues are found during testing:

1. **Revert vercel.json cron entries:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Disable endpoint in Vercel:**
   - Remove CRON_SECRET from environment
   - Cron will fail auth, no imports will run

3. **Fall back to manual import:**
   - Use `/ops/nightsbridge-import` page
   - Manual workflow still works unchanged

---

## Sign-Off Checklist

Before marking this feature as complete:

- [ ] All tests pass (unit + integration)
- [ ] vercel.json cron entries confirmed in Vercel dashboard
- [ ] CRON_SECRET configured in Vercel environment
- [ ] NIGHTSBRIDGE_TENANT_ID configured (default: 1)
- [ ] Endpoint status check returns correct schedule info
- [ ] Auth correctly rejects invalid secrets
- [ ] File upload successfully imports bookings
- [ ] Bookings appear in `/ops/bookings` with correct data
- [ ] Missing fields are detected and reported (not invented)
- [ ] Runbook updated with autonomous workflow instructions
- [ ] Manual import still works as fallback
- [ ] SA Ops notified of new workflow (if rolling out)

---

## Next Steps (Future Enhancements)

1. **Google Drive MCP Integration**
   - Implement Drive file detection in sync endpoint
   - Process latest file automatically

2. **Duplicate Detection**
   - Check if booking already exists before insert
   - Update instead of creating duplicates

3. **Sync History/Logs**
   - Store sync results in database
   - View sync history in ops dashboard

4. **Notification on Failure**
   - Email/Slack alert if sync fails
   - Daily summary of imports

5. **Nightsbridge API (If Available)**
   - Replace manual export with API pull
   - Fully autonomous end-to-end

---

**End of Testing Guide**

Run these tests in order. If any test fails, investigate before proceeding to the next.
