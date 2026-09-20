# Quickstart: GuestFlow Outbound Redirect Validation

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

## Overview

This quickstart provides runnable validation scenarios to prove the outbound redirect feature works end-to-end. These scenarios are designed for manual testing in non-production environments (Preview or local dev) before enabling redirect in Production.

**Target Audience**: Grant (for smoke testing), Coding (for implementation validation), CoS (for acceptance)

**Prerequisites**:
- GuestFlow deployed to a non-production Vercel environment (Preview deployment)
- Staff authentication working (cookie or test auth)
- At least one test guest conversation with draft ready for approval
- Grant's test sink contacts available: `+15124064300` (WhatsApp), `grant830318@gmail.com` (email)

---

## Scenario 1: Redirect Mode WhatsApp Send

**Goal**: Verify WhatsApp messages are redirected to Grant's test WhatsApp when `OUTBOUND_MODE=redirect`.

**Environment Setup**:
```bash
# Set in Vercel environment (or .env.local for local dev)
OUTBOUND_MODE=redirect
OUTBOUND_REDIRECT_TO_WA=+15124064300
OUTBOUND_REDIRECT_TO_EMAIL=grant830318@gmail.com
OUTBOUND_LIVE_CLEAR=false
```

**Steps**:
1. Redeploy GuestFlow to apply env vars
2. Log in to staff UI
3. Navigate to Needs Approval or inbound queue
4. Find a conversation with a guest phone number (e.g., `+27821234567`)
5. Approve the draft
6. Click Send (Phase 0 confirmToken flow)
7. Confirm send in the dialog

**Expected Result**:
- Send succeeds with HTTP 200
- Grant receives WhatsApp message at `+15124064300` (not the guest's actual number)
- Message From identity is `+27600200825` (live Twilio number, unchanged)
- Message body matches the draft (with portal link if applicable)

**Verification**:
- Check Grant's WhatsApp for incoming message
- Check send_jobs table: `to_address` should be `+15124064300`, metadata JSON should include `intended_to: "+27821234567"`, `redirect_enabled: true`, `mode: "redirect"`
- Check logs for `[REDIRECT]` or similar marker showing redirect applied

**Failure Modes**:
- If `OUTBOUND_REDIRECT_TO_WA` is missing → HTTP 503 error with message "Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set"
- If message goes to real guest number → FAIL (redirect not working)

---

## Scenario 2: Redirect Mode Email Send

**Goal**: Verify emails are redirected to Grant's test email when `OUTBOUND_MODE=redirect`.

**Environment Setup**: Same as Scenario 1.

**Steps**:
1. Find or create a conversation with a guest email address (e.g., `guest@example.com`)
2. Approve draft for email send
3. Click Send → Confirm

**Expected Result**:
- Send succeeds with HTTP 200
- Grant receives email at `grant830318@gmail.com` (not `guest@example.com`)
- Email From identity is `RESEND_FROM_EMAIL` (unchanged)
- Email subject and body match the draft

**Verification**:
- Check Grant's Gmail inbox for the email
- Check email audit/logs: `intended_to: "guest@example.com"`, `actual_to: "grant830318@gmail.com"`, `redirect_enabled: true`

**Failure Modes**:
- If `OUTBOUND_REDIRECT_TO_EMAIL` is missing → HTTP 503 error
- If email goes to real guest address → FAIL

---

## Scenario 3: Redirect Mode WhatsApp Web Job Creation

**Goal**: Verify WhatsApp Web send_jobs are created with redirected `to_address`.

**Environment Setup**: Same as Scenario 1.

**Steps**:
1. Approve a draft for WhatsApp Web channel (if applicable; may require specific guest preference or fallback)
2. Or manually enqueue a job via API/script: `POST /api/inbound/send` with `channel: whatsapp_web`
3. Check `send_jobs` table for the created job

**Expected Result**:
- Job row created with `status='queued'`, `channel='whatsapp_web'`, `to_address='+15124064300'`
- Metadata JSON includes `intended_to: "+27821234567"`, `redirect_enabled: true`, `mode: "redirect"`

**Verification**:
- Query DB: `SELECT * FROM send_jobs WHERE status='queued' ORDER BY created_at DESC LIMIT 1;`
- Confirm `to_address` is Grant's sink, not guest number

**Note**: CoS WhatsApp Web clicker (if running) will send to the redirected `to_address`, so Grant's WhatsApp receives the message.

---

## Scenario 4: Fail-Closed Missing Sink (WhatsApp)

**Goal**: Verify send is blocked when redirect is enabled but WhatsApp sink is missing.

**Environment Setup**:
```bash
OUTBOUND_MODE=redirect
OUTBOUND_REDIRECT_TO_WA=         # Empty or unset
OUTBOUND_REDIRECT_TO_EMAIL=grant830318@gmail.com
OUTBOUND_LIVE_CLEAR=false
```

**Steps**:
1. Redeploy with missing `OUTBOUND_REDIRECT_TO_WA`
2. Approve a WhatsApp draft
3. Attempt send

**Expected Result**:
- HTTP 503 Service Unavailable
- Error message: "Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set" (or similar)
- No Twilio API call made (check Twilio logs if available)
- No WhatsApp sent to real guest

**Verification**:
- Staff UI shows error dialog or toast
- No message received by Grant or guest
- Logs show refusal reason

**Failure Modes**:
- If send proceeds to guest number → FAIL (fail-closed not working)
- If send silently fails without error → FAIL (user feedback missing)

---

## Scenario 5: Fail-Closed Missing Sink (Email)

**Goal**: Verify email send is blocked when redirect is enabled but email sink is missing.

**Environment Setup**:
```bash
OUTBOUND_MODE=redirect
OUTBOUND_REDIRECT_TO_WA=+15124064300
OUTBOUND_REDIRECT_TO_EMAIL=      # Empty or unset
OUTBOUND_LIVE_CLEAR=false
```

**Steps**:
1. Redeploy with missing `OUTBOUND_REDIRECT_TO_EMAIL`
2. Approve an email draft
3. Attempt send

**Expected Result**:
- HTTP 503 or 500 error
- Error message: "Redirect enabled but OUTBOUND_REDIRECT_TO_EMAIL not set"
- No Resend API call
- No email sent to guest or Grant

---

## Scenario 6: Live Mode Blocked by LIVE_CLEAR

**Goal**: Verify live mode does not send to real guests when `OUTBOUND_LIVE_CLEAR` is not exactly `"true"`.

**Environment Setup**:
```bash
OUTBOUND_MODE=live
OUTBOUND_REDIRECT_TO_WA=+15124064300
OUTBOUND_REDIRECT_TO_EMAIL=grant830318@gmail.com
OUTBOUND_LIVE_CLEAR=false        # Or missing or any value except "true"
```

**Steps**:
1. Redeploy
2. Approve a draft
3. Attempt send

**Expected Result**:
- Send is blocked or redirected (behavior may vary; acceptable: either block with error or redirect to sink)
- No message sent to real guest contact
- Health endpoint reports `outboundRedirect: "blocked"` or `"on"`

**Verification**:
- Check `/api/health`: `"outboundMode": "live"`, `"outboundRedirect": "blocked"` (or `"on"` if implementation redirects)
- No real guest send

---

## Scenario 7: Live Mode Active (Real Guest Send)

**Goal**: Verify live mode sends to real guest contacts when `OUTBOUND_LIVE_CLEAR=true`.

**Environment Setup**:
```bash
OUTBOUND_MODE=live
OUTBOUND_LIVE_CLEAR=true
# Sinks can remain set but will not be used
OUTBOUND_REDIRECT_TO_WA=+15124064300
OUTBOUND_REDIRECT_TO_EMAIL=grant830318@gmail.com
```

**Steps**:
1. Redeploy
2. Approve a draft for a **safe test guest** contact (e.g., Grant's own guest profile or a known-safe number)
3. Click Send

**Expected Result**:
- Send succeeds
- Message/email goes to the **real guest contact** (not Grant's sink)
- From identity unchanged

**Verification**:
- Real guest receives message (Grant can test with his own number/email as guest)
- Audit shows `redirect_enabled: false`, `mode: "live"`, `intended_to` equals `actual_to`
- Health endpoint: `"outboundRedirect": "off"`, `"outboundMode": "live"`

**Safety Note**: Only test this scenario with a known-safe guest contact. Do not use a real guest's contact unless you intend to send them a live message.

---

## Scenario 8: Staff Banner Visibility (Redirect On)

**Goal**: Verify staff see a banner when redirect is active.

**Environment Setup**:
```bash
OUTBOUND_MODE=redirect
# Sinks set
```

**Steps**:
1. Redeploy
2. Log in as staff
3. Navigate to any staff page (Ops hub, Needs Approval, inbound queue)

**Expected Result**:
- Persistent banner displayed at top of page: "ℹ️ Outbound Redirect Active – All guest sends go to test sinks."
- Banner is info-level styling (blue/gray, not error-red)
- Banner does not block UI interaction

**Verification**:
- Screenshot banner for Grant acceptance
- Banner text is clear and non-alarming

---

## Scenario 9: Staff Banner Hidden (Live Mode)

**Goal**: Verify banner is hidden when live mode is active.

**Environment Setup**:
```bash
OUTBOUND_MODE=live
OUTBOUND_LIVE_CLEAR=true
```

**Steps**:
1. Redeploy
2. Log in as staff
3. Navigate to staff pages

**Expected Result**:
- No redirect banner displayed
- UI looks normal (no "redirect active" message)

---

## Scenario 10: Health Endpoint Reports Status

**Goal**: Verify `/api/health` endpoint includes redirect status fields.

**Environment Setup**: Varies per sub-scenario.

**Sub-Scenario A (Redirect On)**:
```bash
OUTBOUND_MODE=redirect
```

**Steps**:
```bash
curl https://guestflow-preview-xyz.vercel.app/api/health | jq .
```

**Expected Result**:
```json
{
  "status": "ok",
  "service": "guestflow",
  "tenant": "Browns Dullstroom",
  "database": "turso",
  "timestamp": "2026-09-20T12:34:56Z",
  "outboundMode": "redirect",
  "outboundRedirect": "on"
}
```

**Sub-Scenario B (Live Mode Active)**:
```bash
OUTBOUND_MODE=live
OUTBOUND_LIVE_CLEAR=true
```

**Expected Result**:
```json
{
  ...
  "outboundMode": "live",
  "outboundRedirect": "off"
}
```

**Sub-Scenario C (Live Mode Blocked)**:
```bash
OUTBOUND_MODE=live
OUTBOUND_LIVE_CLEAR=false
```

**Expected Result**:
```json
{
  ...
  "outboundMode": "live",
  "outboundRedirect": "blocked"
}
```

---

## Scenario 11: From Identities Unchanged (Redirect Mode)

**Goal**: Verify WhatsApp From and email From remain unchanged when redirect is active.

**Environment Setup**: Redirect mode (Scenario 1/2).

**Steps**:
1. Send WhatsApp message (Scenario 1)
2. Send email (Scenario 2)

**Expected Result**:
- WhatsApp message received by Grant shows From: `+27600200825` (or `TWILIO_WHATSAPP_FROM` value)
- Email received by Grant shows From: value of `RESEND_FROM_EMAIL` (e.g., `stay@brownsdullstroom.com` or similar)

**Verification**:
- Check message From header/sender in WhatsApp and email
- Confirm From is **not** Grant's sink addresses

---

## Scenario 12: Unknown OUTBOUND_MODE Defaults to Redirect

**Goal**: Verify fail-closed behavior when `OUTBOUND_MODE` is missing or unknown.

**Environment Setup**:
```bash
# OUTBOUND_MODE not set, or set to unknown value
OUTBOUND_MODE=test_mode          # Or omit entirely
OUTBOUND_REDIRECT_TO_WA=+15124064300
OUTBOUND_REDIRECT_TO_EMAIL=grant830318@gmail.com
```

**Steps**:
1. Redeploy
2. Attempt send

**Expected Result**:
- System treats mode as `redirect` (fail-closed default)
- Send goes to Grant's sink (not real guest)
- Health endpoint: `"outboundMode": "redirect"`, `"outboundRedirect": "on"`

---

## Automated Test Coverage

The above scenarios are for manual validation. The feature also includes automated tests covering all scenarios:

**Run Tests**:
```bash
cd apps/guestflow
npm run test
```

**Test Files**:
- `src/lib/__tests__/outbound-redirect.test.ts`: Resolver unit tests (all modes, fail-closed, etc.)
- `__tests__/whatsapp.test.ts`: Redirect scenarios with mocked Twilio
- `__tests__/email.test.ts` or `src/lib/__tests__/email.test.ts`: Redirect scenarios with mocked Resend
- `__tests__/send-jobs.test.ts` or `src/lib/__tests__/send-jobs.test.ts`: Job creation with redirect

**Expected**: All tests pass (green) before PR merge.

---

## Go-Live Checklist

After all scenarios pass, follow this checklist to go live:

1. ✅ All quickstart scenarios validated in Preview environment
2. ✅ Automated tests pass (`npm run test`)
3. ✅ PR merged to main
4. ✅ Grant CLEAR to proceed with Production go-live
5. ☐ NeedsGrant: Set Production env vars in Vercel dashboard:
   - `OUTBOUND_MODE=live`
   - `OUTBOUND_LIVE_CLEAR=true`
   - (Keep `OUTBOUND_REDIRECT_TO_WA` and `OUTBOUND_REDIRECT_TO_EMAIL` set for future use)
6. ☐ Redeploy Production (Vercel auto-redeploy or manual trigger)
7. ☐ Verify health: `curl https://guestflow.brownsdullstroom.com/api/health | jq .outboundRedirect` returns `"off"`
8. ☐ Verify banner: Staff UI shows no redirect banner
9. ☐ Safe live test: Approve and send one message to a known-safe guest contact (Grant's own reservation or test guest)
10. ☐ Monitor: First 5-10 live sends, verify they reach real guests (not Grant's sinks)

**Rollback**: If issues occur, set `OUTBOUND_MODE=redirect` + redeploy. Sends revert to Grant's sinks.

---

## Notes

- These scenarios are designed for non-production environments. Do not enable redirect in Production until Grant CLEAR.
- Use Grant's actual test sink contacts (`+15124064300`, `grant830318@gmail.com`) for realistic testing.
- Fail-closed behavior is a safety feature. Blocked sends with clear errors are **expected** when config is incomplete.
- From identities remaining unchanged is **expected** and correct behavior.

**Ready for Implementation**: All scenarios documented and acceptance criteria clear.
