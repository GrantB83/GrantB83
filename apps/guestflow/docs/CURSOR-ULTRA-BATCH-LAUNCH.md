# Launching GuestFlow Phase 1 Cursor Ultra Batch Worker

**For**: Coding / Grok Bot orchestration  
**Updated**: 21 Sep 2026

## What This Is

GuestFlow Phase 1 batch draft worker runs **as a Cursor Ultra Cloud Agent**. The CA generates drafts using its own model (Cursor Ultra), not by calling external APIs like OpenAI.

## How It Works

1. **Coding/Grok launches** a Cursor Ultra Cloud Agent with a specific task
2. **CA runs** the batch-worker script (`npm run batch-worker`)
3. **Script claims** pending draft_jobs from the database (≥5 jobs OR 20 min elapsed)
4. **For each job:**
   - Script loads prompt template from `prompts/DRAFT_PROMPT.md`
   - Script substitutes message context into template
   - **Cursor Ultra CA generates the draft** using its own model
   - Script receives generated draft from CA
   - Script calls `POST /api/drafts/upsert` to save draft
5. **CA reports** results and exits

## Launch Command

When Coding or Grok Bot needs to run a batch:

```
Launch Cursor Ultra Cloud Agent on GrantB83/GrantB83:

Branch: main
Model: Cursor Ultra (required)

Task:
Run GuestFlow Phase 1 batch draft worker:

1. cd apps/guestflow
2. npm run batch-worker
3. For each claimed draft_job:
   - Read prompts/DRAFT_PROMPT.md
   - Load message context from database
   - Generate a warm, professional draft reply following template instructions
   - Never invent rates, phone numbers, or facts
   - Use [ASK STAFF] or [ASK GRANT] placeholders for unknown info
4. Report results: jobs claimed, succeeded, failed

Stop after one batch completes. Do not loop or wait.

Environment secrets:
- GUESTFLOW_API_URL
- DRAFT_WORKER_SECRET
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
```

## Why Not a Standalone Script?

Phase 1 is **Cursor Ultra-only**. The CA *is* the LLM. Running `npm run batch-worker` as a standalone script will fail with:

```
Error: Draft generation requires Cursor Ultra Cloud Agent.
This worker must be launched by Coding/Grok as a Cursor Ultra CA task.
```

## Batch Contract

- **Window**: 07:00–21:00 Africa/Johannesburg
- **Minimum**: ≥5 jobs OR 20 minutes elapsed since last batch
- **Soft cap**: ≤6 batches/day (SAST date)
- **One-in-flight**: Only one CA/worker processing at a time
- **Intents**: `general_question`, `maintenance_other`, `confidence < 0.6`

## What Gets Billed

- **Cursor Ultra Models pool**: Draft generation by the CA
- **No external API costs**: No OpenAI, Anthropic, or other provider

## No Production Secrets Needed

- `OPENAI_API_KEY` — **NOT REQUIRED**
- `ANTHROPIC_API_KEY` — **NOT REQUIRED**
- `DRAFT_WORKER_SECRET` — **REQUIRED** (set by Coding in Vercel Production)

## When to Launch

- Manually by Coding when asked
- Eventually: Grok Bot routine checks pending jobs and launches CA if batch conditions met
- **Not**: Cron job, per-message trigger, or auto-loop

## Dry Run (Testing Only)

For testing batch claim logic without generating real drafts:

```bash
cd apps/guestflow
npm run batch-worker -- --dry-run
```

Dry run:
- Claims jobs normally
- Generates placeholder drafts (no model call)
- Does NOT upsert to database
- Useful for testing batch contract rules

## References

- Full docs: `apps/guestflow/docs/PHASE1-BATCH-DRAFTS.md`
- Spec: `specs/008-guestflow-phase1-batch-drafts/spec.md`
- Worker code: `apps/guestflow/src/lib/batch-worker.ts`
- Script: `apps/guestflow/scripts/batch-worker.ts`
- Prompt template: `apps/guestflow/prompts/DRAFT_PROMPT.md`
