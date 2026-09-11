# Quickstart: WhatsApp Approve & Send — Manual Smoke Test

**Feature**: WhatsApp Approve & Send for Inbound Queue  
**Purpose**: Validate end-to-end send functionality in sandbox mode  
**Estimated Time**: 5 minutes

## Prerequisites

1. **Environment**: Local development server or Vercel preview deployment
2. **Database**: Turso database with inbound WhatsApp tables migrated (including new `direction` field)
3. **WhatsApp Mode**: Set `WHATSAPP_MODE=sandbox` in `.env.local` (no live credentials required)
4. **Test Data**: At least one test thread with a draft reply

**Environment Setup**:
```bash
# .env.local
WHATSAPP_MODE=sandbox
DATABASE_URL=libsql://...
```

## Step 1: Run Database Migration

Add the `direction`, `whatsapp_provider`, `whatsapp_message_id`, and `send_error` fields to `inbound_messages` table.

**Command**:
```bash
cd apps/guestflow
npm run db:migrate:send
```

**Expected Output**:
```
Migration: Add outbound message support to inbound_messages
✓ Added direction column
✓ Added whatsapp_provider column
✓ Added whatsapp_message_id column
✓ Added send_error column
Migration complete
```

**Verify Schema**:
```bash
# Via turso CLI or sqlite3
turso db shell <db-name>
sqlite> PRAGMA table_info(inbound_messages);
# Should show direction, whatsapp_provider, whatsapp_message_id, send_error columns
```

## Step 2: Create Test Thread with Draft Reply

If no test data exists, create a test thread via the inbound webhook.

**Command**:
```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INBOUND_WEBHOOK_SECRET}" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, I would like to book The Browns for 15-17 December, 2 adults",
    "timestamp": "2026-09-11T10:00:00Z",
    "source": "manual_test"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "threadId": 1,
  "messageId": 1,
  "classification": {
    "intent": "booking_inquiry",
    "confidence": 0.85,
    ...
  },
  "draftReply": "Hi there,\n\nThank you for your interest in The Browns...",
  "status": "drafted"
}
```

**Note the `threadId`** — you'll use this in Step 4.

## Step 3: Start Development Server

**Command**:
```bash
cd apps/guestflow
npm run dev
```

**Expected Output**:
```
▲ Next.js 14.2.0
- Local:        http://localhost:3100
- Environments: .env.local

✓ Ready in 1.2s
```

**Open Browser**:
```
http://localhost:3100/ops/inbound-queue
```

## Step 4: Open Thread Detail Modal

1. Navigate to `http://localhost:3100/ops/inbound-queue`
2. You should see the test thread from Step 2 with status "drafted"
3. Click on the thread card to open the detail modal
4. Verify you see:
   - Guest phone number: `+27821234567`
   - Classification: `booking_inquiry` (~85% confidence)
   - Extracted data: check-in, check-out, adults
   - Draft reply text: "Hi there, Thank you for your interest..."
5. Verify you see a "Send via WhatsApp (Sandbox Mode)" button (yellow background with ⚠️ icon)

**Expected UI**:
- Thread card shows "drafted" status (yellow badge)
- Draft reply is displayed in green box with "⚠️ Requires Approval" badge
- Send button is visible and enabled

## Step 5: Send Message (Sandbox Mode)

1. Click the "Send via WhatsApp (Sandbox Mode)" button
2. Confirm the browser dialog that shows:
   ```
   Send via WhatsApp?
   
   To: +27821234567
   Mode: Sandbox
   
   Hi there, Thank you for your interest...
   
   Sandbox mode: Message will be logged but not sent
   ```
3. Click "OK"

**Expected Outcome**:
- Alert shows: "Sandbox Mode: Message logged but not sent"
- Thread status updates to "sent" (gray badge)
- Thread detail modal shows send history with:
  - Timestamp: current time
  - Provider: "sandbox"
  - Message ID: `sandbox_<timestamp>_<random>`
  - Outcome: "Success (Sandbox)"

**Verify in Database**:
```sql
SELECT 
  id, direction, whatsapp_provider, whatsapp_message_id, 
  send_error, message_timestamp
FROM inbound_messages
WHERE thread_id = 1 AND direction = 'outbound'
ORDER BY message_timestamp DESC
LIMIT 1;
```

**Expected Row**:
| id | direction | whatsapp_provider | whatsapp_message_id | send_error | message_timestamp |
|----|-----------|-------------------|---------------------|------------|-------------------|
| 2  | outbound  | sandbox           | sandbox_1726066800_abc123 | NULL | 2026-09-11T14:30:00Z |

**Verify in Console Logs**:
```
[SANDBOX] WhatsApp dry-run to +27821234567 at 2026-09-11T14:30:00.000Z
[Send Success] threadId=1, messageId=sandbox_1726066800_abc123, provider=sandbox
```

## Step 6: Test Send Error (Optional)

To test error handling, modify the send API route temporarily to throw an error.

**Edit**: `apps/guestflow/src/app/api/inbound/send/route.ts`

**Add before `sendWhatsAppMessage()` call**:
```typescript
// TEMP: Test error handling
if (thread.fromNumber === '+27821234567') {
  throw new Error('Test error: Invalid phone number')
}
```

**Repeat Step 5** (create a new test thread or change status back to "drafted"):
- Expected: Alert shows "Send failed: Test error: Invalid phone number"
- Thread status updates to "failed" (red badge)
- Database row has `send_error = 'Test error: Invalid phone number'`
- Console shows error log

**Remove the test error code** after verifying error handling works.

## Step 7: Verify Send History Display

1. After sending (sandbox or error), click the thread again to re-open detail modal
2. Verify the modal shows send history section with:
   - Timestamp of send attempt
   - Provider: "sandbox"
   - Outcome: "Success" or error message
   - For failures: "Retry" button is visible

**Expected UI**:
```
Send History:
✓ Sent via sandbox at Sep 11, 2:30 PM
  Message ID: sandbox_1726066800_abc123
```

Or for errors:
```
Send History:
✗ Failed at Sep 11, 2:35 PM
  Error: Test error: Invalid phone number
  [Retry] button
```

## Step 8: Test Double-Send Prevention

1. Open thread detail modal
2. Click "Send via WhatsApp (Sandbox Mode)"
3. Immediately click the button again (rapidly, multiple times)
4. Verify:
   - Button is disabled after first click
   - Only one outbound message is created in database
   - Only one console log entry

**Expected**: Button shows "Sending..." or is disabled after first click, preventing double-sends.

## Cleanup

**Remove Test Data** (optional):
```sql
DELETE FROM inbound_messages WHERE thread_id = 1;
DELETE FROM inbound_threads WHERE id = 1;
```

**Or Reset Database**:
```bash
npm run db:init  # Re-creates empty database
```

## Success Criteria

✅ All smoke test steps completed without errors  
✅ Sandbox send creates outbound message in database with correct metadata  
✅ Thread status updates to "sent" after successful send  
✅ Send history displays in UI with timestamp and provider  
✅ Error handling works (failed sends update status to "failed", show error message)  
✅ Double-send prevention works (button disabled after first click)  
✅ No live WhatsApp API calls made (all sandbox mode)

## Troubleshooting

**Issue**: "threadId is required" error  
**Solution**: Check that `threadId` is being passed in request body, verify network tab in browser DevTools

**Issue**: "Thread has no draft reply to send"  
**Solution**: Verify the thread has `latestMessage.draft_reply` populated, re-classify the message if needed

**Issue**: Button not visible  
**Solution**: Check thread status is "drafted" or "approved", check console for React errors

**Issue**: Database migration fails  
**Solution**: Check if columns already exist (`PRAGMA table_info(inbound_messages)`), drop and re-run migration if needed

**Issue**: Send API returns 500 error  
**Solution**: Check server console logs for stack trace, verify `sendWhatsAppMessage()` function exists in `src/lib/whatsapp.ts`

## Next Steps After Smoke Test

1. **Test in Live Mode** (after Twilio credentials are configured):
   - Set `WHATSAPP_MODE=live` and `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
   - Repeat smoke test with your own phone number
   - Verify real WhatsApp message is received
2. **Deploy to Preview** (Vercel):
   - Push to branch, verify preview deployment works
   - Test with production-like environment variables (still sandbox mode)
3. **Run Automated Tests**:
   - `npm test` — unit tests for send handler
   - Verify all tests pass before merging
4. **Staff Training**:
   - Share quickstart with SA Ops team
   - Walk through sandbox send flow
   - Explain sandbox vs live mode indicators
