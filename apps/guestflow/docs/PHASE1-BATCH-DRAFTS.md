# GuestFlow Phase 1 — Cursor Ultra Batch Draft Pilot

**Status**: Implemented (Grant CLEAR 20 Sep 2026)  
**Spec**: `specs/008-guestflow-phase1-batch-drafts/spec.md`

## Overview

Phase 1 introduces **Cursor Ultra–only batch draft generation** for GuestFlow. Instead of generating drafts inline during webhook processing (which would bill Vercel function time and violate the 30s timeout), inbound messages with certain intents now enqueue `draft_jobs` for asynchronous processing by a Cursor Cloud Agent batch worker running on Cursor Ultra models.

**KEY CHANGE**: No OPENAI_API_KEY required. The Cursor Ultra Cloud Agent generates drafts using its own model context, not external API calls.

## What Changed

### 1. Webhook Behavior

The `/api/inbound/webhook` endpoint now:

- **Enqueues `draft_jobs`** for messages with:
  - Intent: `general_question`
  - Intent: `maintenance_other`
  - Low confidence: `confidence < 0.6`
- **Does NOT** call any LLM or generate drafts inline for these intents
- **Maintains existing behavior** for other intents:
  - `booking_inquiry` → rate card quote (heuristic)
  - `outlier_exception` → ticket playbook (heuristic)
  - `checkin_event` → check-in inference
  - `spam` → no draft
  - Other intents → existing heuristic draft

### 2. Batch Worker

A Cursor Ultra Cloud Agent batch worker (`scripts/batch-worker.ts`) processes queued draft jobs:

- Claims pending jobs in batches
- Generates drafts using Cursor Ultra model (the CA itself IS the LLM)
- Upserts drafts via authenticated API (`POST /api/drafts/upsert`)
- Updates job status (`pending` → `claimed` → `done`/`failed`)

**No external LLM API calls**: The Cursor Ultra CA reads the prompt template, generates the draft using its own model, and submits it. No OPENAI_API_KEY or other external API provider is used.

### 3. Batch Contract

The batch worker enforces these hard rules:

| Rule | Value | Reason |
|------|-------|--------|
| **Minimum batch size** | ≥5 jobs | Amortize LLM setup cost |
| **Max wait time** | 20 minutes | Ensure timely drafts (claims even if <5 jobs) |
| **Max claim size** | 5-20 jobs | Soft limit per batch |
| **Time window** | 07:00–21:00 SAST | Cost/availability control |
| **One-in-flight** | 1 worker at a time | Avoid claim races |
| **Soft cap** | ≤6 batches/day | Phase 1 pilot limit (counts batch runs, not jobs) |

## Running the Batch Worker

### Prerequisites

1. **Environment Variables** (set in Cursor Cloud Agent secrets or local `.env`):
   - `GUESTFLOW_API_URL` - GuestFlow API base URL (e.g., `https://guestflow.yourdomain.com`)
   - `DRAFT_WORKER_SECRET` - Draft worker authentication secret (distinct from `CRON_SECRET`)
   - `TURSO_DATABASE_URL` - Turso database URL
   - `TURSO_AUTH_TOKEN` - Turso auth token

2. **Runtime Environment**:
   - Must be launched BY a Cursor Ultra Cloud Agent
   - The CA provides the LLM capability - no external API keys needed
   - Fails closed if run as standalone script without CA context

### Manual Run

**NOTE**: Running manually outside a Cursor Ultra CA will fail with instructions. The worker must be launched BY Coding as a Cursor Ultra Cloud Agent task.

For testing the batch claim logic only (no draft generation):

```bash
cd apps/guestflow
npm run batch-worker -- --dry-run
```

Dry run:
- Claims jobs as normal
- Generates placeholder drafts (no real model call)
- Does NOT upsert to the database
- Useful for testing batch logic without affecting production

### Cursor Cloud Agent Run

To launch a Cursor Ultra Cloud Agent batch worker, Coding or Grok Bot instructs Cursor:

```
Launch Cursor Ultra Cloud Agent on GrantB83/GrantB83, branch main:

Task: Run GuestFlow Phase 1 batch draft worker

Steps:
1. cd apps/guestflow
2. npm run batch-worker
3. For each claimed job, read the prompt template at prompts/DRAFT_PROMPT.md
4. Generate a warm, professional draft reply following the template instructions
5. The worker will upsert each draft via POST /api/drafts/upsert
6. Report results (jobs claimed, succeeded, failed)

Stop after one batch completes. Do not loop or wait.

Environment secrets needed:
- GUESTFLOW_API_URL
- DRAFT_WORKER_SECRET  
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
```

The Cursor Ultra CA:
1. Executes the batch-worker script
2. Claims pending draft_jobs
3. For each job, reads the prompt template and message context
4. Generates the draft using its own Cursor Ultra model
5. Upserts via the authenticated API
6. Reports results and exits

## Batch Worker Output

Example successful run:

```
🚀 GuestFlow Phase 1 Batch Worker (Cursor Ultra Only)
=====================================================
API URL: https://guestflow.example.com
Dry Run: NO
Provider: Cursor Ultra Cloud Agent (no external API)

Batch ID: batch-1695000000000
Started: 2026-09-20T10:00:00.000Z
Completed: 2026-09-20T10:02:30.000Z

📊 Results:
  Jobs Claimed: 7
  Jobs Processed: 7
  ✅ Succeeded: 7
  ❌ Failed: 0

📝 Details:
  ✅ Job 101 (msg 501): Success
  ✅ Job 102 (msg 502): Success
  ✅ Job 103 (msg 503): Success
  ✅ Job 104 (msg 504): Success
  ✅ Job 105 (msg 505): Success
  ✅ Job 106 (msg 506): Success
  ✅ Job 107 (msg 507): Success
```

Example skipped run (outside window):

```
🚀 GuestFlow Phase 1 Batch Worker (Cursor Ultra Only)
=====================================================
API URL: https://guestflow.example.com
Dry Run: NO
Provider: Cursor Ultra Cloud Agent (no external API)

Batch ID: batch-1695000000000
Started: 2026-09-20T22:30:00.000Z
Completed: 2026-09-20T22:30:01.000Z

⏭️  Skipped: Outside batch window (07:00–21:00 SAST)
```

## LLM Prompt Template

Location: `apps/guestflow/prompts/DRAFT_PROMPT.md`

**QC Status**: QC'd by Cursor Cloud Agent (Grant CLEAR 20 Sep 2026)

The prompt template includes:
- System instructions (never invent facts, rates, phones)
- Property information (name, location, contact)
- Response format guidance
- Hard rules (use `[ASK STAFF]` and `[ASK GRANT]` placeholders)

### Template Variables

The worker substitutes these variables from the message context:

- `{from_number}` - Guest phone number
- `{guest_name}` - Guest name (or "Guest" if unknown)
- `{intent}` - Classified intent
- `{confidence}` - Classification confidence
- `{message_text}` - Original message text

### How Cursor Ultra CA Uses the Template

1. Worker claims draft_job from queue
2. Worker fetches message context from database
3. Worker loads `prompts/DRAFT_PROMPT.md` and substitutes variables
4. **Cursor Ultra CA reads the complete prompt**
5. **CA generates draft using its own model** (no external API call)
6. Worker receives generated draft from CA
7. Worker upserts draft via `POST /api/drafts/upsert`

## Draft Source Tracking

All LLM-generated drafts have `draft_source = 'llm'` in the database:

- Staff can distinguish LLM drafts from heuristic or human drafts
- Edit rates and approval rates can be measured
- If staff edit an LLM draft, `draft_source` changes to `human`

## Approval & Send

**No auto-send in Phase 1.** All LLM drafts still require:

1. Staff review in **Needs Approval** or inbound queue
2. **Approve** the thread
3. **Confirm** the browser dialog (issues one-time `confirmToken`)
4. **Send** with that token

This is unchanged from Phase 0. LLM drafts follow the same gate.

## Outbound Redirect

Phase 1 **respects outbound redirect mode** (Phase 0, PR #194):

- When `OUTBOUND_MODE=redirect` and `OUTBOUND_REDIRECT_TARGET` are set:
  - Batch worker writes drafts normally
  - Staff approve and send as usual
  - Send path redirects to `OUTBOUND_REDIRECT_TARGET` instead of real guest phone
- This allows safe testing of Phase 1 in production without contacting real guests

## Database Schema

Phase 1 uses the `draft_jobs` table created in Phase 0:

```sql
CREATE TABLE IF NOT EXISTS draft_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  thread_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  intent TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'claimed', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

No schema changes required for Phase 1 (schema added in Phase 0).

## Monitoring & Metrics

### Key Metrics to Track

1. **Enqueue rate**: How many messages/day trigger `draft_job` creation?
2. **Batch size**: Average jobs per batch
3. **Success rate**: `done` jobs / total processed
4. **Failure rate**: `failed` jobs / total processed (with error analysis)
5. **Edit rate**: How often do staff edit LLM drafts before sending?
6. **Rejection rate**: How often do staff clear/redraft LLM drafts?
7. **Time to draft**: How long from message received to draft generated?

### Queries for Reporting

#### Daily batch run counts (not job counts):

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as batch_runs,
  SUM(jobs_count) as total_jobs
FROM batch_runs
WHERE DATE(created_at) >= DATE('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY date DESC
```

#### LLM draft source distribution:

```sql
SELECT 
  draft_source,
  COUNT(*) as count
FROM inbound_messages
WHERE draft_reply IS NOT NULL
  AND DATE(created_at) >= DATE('now', '-7 days')
GROUP BY draft_source
ORDER BY count DESC
```

#### Edit rate (LLM → human):

```sql
-- Messages that started as LLM drafts and were edited by staff
SELECT 
  COUNT(*) as edited_count,
  (SELECT COUNT(*) FROM inbound_messages WHERE draft_source = 'llm') as llm_total,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM inbound_messages WHERE draft_source = 'llm'), 2) as edit_rate_pct
FROM inbound_messages
WHERE draft_source = 'human'
  AND EXISTS (
    SELECT 1 FROM draft_jobs
    WHERE draft_jobs.message_id = inbound_messages.id
      AND draft_jobs.status = 'done'
  )
```

## Troubleshooting

### "DRAFT_WORKER_SECRET is not configured"

**Solution**: Set `DRAFT_WORKER_SECRET` in environment variables. This must be different from `CRON_SECRET`.

### "Skipped: Outside batch window"

**Solution**: The worker only runs 07:00–21:00 Africa/Johannesburg time. Wait until the window or adjust the window in `batch-worker.ts` (requires code change).

### "Skipped: Soft cap reached"

**Solution**: Phase 1 soft-caps at 6 batches/day. Wait until tomorrow (SAST date) or increase the cap (requires code change and Grant approval).

### "Skipped: Another worker is in flight"

**Solution**: Another batch worker is currently claiming/processing jobs. Wait for it to complete (usually 2–5 minutes per batch).

### "Skipped: No jobs ready"

**Solution**: Fewer than 5 pending jobs exist AND oldest job is less than 20 minutes old. The batch worker waits for either condition: ≥5 jobs OR oldest job ≥20 minutes.

### "Draft generation requires Cursor Ultra Cloud Agent"

**Solution**: You attempted to run the batch worker as a standalone script. Phase 1 requires launching the worker AS a Cursor Ultra Cloud Agent task. The CA provides the LLM capability. See "Cursor Cloud Agent Run" section for launch instructions.

### Failed jobs with "Upsert failed (401)"

**Solution**: `DRAFT_WORKER_SECRET` is incorrect or missing. Verify the secret matches what's set in Vercel Production environment.

### Failed jobs with "Upsert failed (403)"

**Solution**: You may be accidentally using `CRON_SECRET` instead of `DRAFT_WORKER_SECRET`. Check the secret value.

## Phase 1 Pilot Success Criteria

- ✅ Webhook completes in <30s (no inline LLM)
- ✅ Batch worker claims ≥5 jobs or waits 20 min
- ✅ 07:00–21:00 SAST window enforced
- ✅ ≤6 batches/day soft cap enforced
- ✅ No auto-send (all drafts require Approve & Send)
- ✅ Outbound redirect mode respected
- ✅ Edit/reject rates measurable via `draft_source`
- ✅ **No OPENAI_API_KEY required** (Cursor Ultra only)
- ✅ **Fail-closed if not launched as Cursor Ultra CA**

## Out of Scope (Phase 1)

- Auto-send / allowlisted auto-send → Phase 2+
- Changing From or WhatsApp mode
- Gmail Contacts enrich
- `stock_order` intent
- Staff UI for `draft_source` display (database queries sufficient for pilot)
- Automatic retry of failed jobs (manual or future cron)
- Fine-tuned LLM models (use provider defaults)

## Next Steps (Phase 2+)

After Phase 1 pilot runs for ≥1 week with measurable edit/reject rates:

1. Evaluate success: Are LLM drafts acceptable quality?
2. Adjust intents: Add more intents to batch path (e.g., `date_query`, `suite_preference`)?
3. Auto-send gates: Define allowlist criteria for auto-send (requires Grant CLEAR)
4. GFM oversight: Transition to GFM Bot oversight with Grant as backup decision-gate

## References

- Spec: `specs/008-guestflow-phase1-batch-drafts/spec.md`
- Phase 0 Safety: `docs/PHASE0-SAFETY.md`
- Outbound Redirect: PR #194
- Draft Worker Auth: `src/lib/draft-worker-auth.ts`
- Batch Worker Logic: `src/lib/batch-worker.ts`
- Prompt Template: `prompts/DRAFT_PROMPT.md`
