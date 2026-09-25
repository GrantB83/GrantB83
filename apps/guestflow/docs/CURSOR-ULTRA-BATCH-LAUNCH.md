# Launching GuestFlow Phase 1 Cursor Ultra Batch Worker

**For**: Coding / Grok Bot orchestration + GuestFlow Manager dry-run  
**Updated**: 25 Sep 2026  
**Spec**: `specs/027-sprint3-phase1-ultra-only/`

## What This Is

GuestFlow Phase 1 batch drafts run **as a Cursor Ultra Cloud Agent**. The CA generates drafts using its own model (Cursor Ultra Models pool). There is **no** OpenAI / third-party chat-completion path on Production Phase 1.

**Do not set `OPENAI_API_KEY` for this path.** It is ignored.

## How It Works

1. **Coding/Grok launches** a Cursor Ultra Cloud Agent with the task below
2. **CA confirms** the batch contract (window 07:00–21:00 SAST, ≥5 jobs or 20 min, ≤6 batches/day)
3. **CA writes** editable replies from `prompts/DRAFT_PROMPT.md` + property knowledge + message context
4. **CA never invents** rates, phones, codes, or facts; uses `[ASK STAFF]` / `[ASK GRANT]`
5. **Worker upserts** via `POST /api/drafts/upsert` with `DRAFT_WORKER_SECRET` and `draft_source=llm`
6. **Staff** still Approve&Send with a one-time confirm token. **No auto-send.**
7. **CA reports** results and exits (one batch, no loop)

Practical CA options:

- Library: call `runBatch(db, config, draftGenerator)` where `draftGenerator` is the CA writing each reply
- CLI: write `{ "<messageId>": "<draftReply>" }` then `npm run batch-worker -- --drafts-file ./drafts.json`

`npm run batch-worker` with neither `--dry-run` nor `--drafts-file` **refuses the batch** (exit ≠ 0, zero claims).

## Launch Command

When Coding or Grok Bot needs to run a batch:

```text
Launch Cursor Ultra Cloud Agent on GrantB83/GrantB83:

Branch: main
Model: Cursor Ultra (required)

Task:
Run GuestFlow Phase 1 batch draft worker (Ultra-only, fail-closed):

1. cd apps/guestflow
2. Confirm you are a Cursor Ultra Cloud Agent. Do not call OpenAI or any chat.completions API.
3. Do not set or read OPENAI_API_KEY.
4. For each pending draft_job that meets the batch contract:
   - Load prompts/DRAFT_PROMPT.md via loadPromptForDraft (includes property knowledge)
   - Generate a warm, professional editable reply
   - Never invent rates, phone numbers, access codes, or facts
   - Use [ASK STAFF] or [ASK GRANT] for unknown info
5. Upsert with POST /api/drafts/upsert (DRAFT_WORKER_SECRET, draft_source=llm)
   or npm run batch-worker -- --drafts-file <map you wrote>
6. Report: jobs claimed, succeeded, failed, skip reason

Stop after one batch. Do not loop. Do not send. Do not flip OUTBOUND_MODE.

Environment secrets (names only):
- GUESTFLOW_API_URL
- DRAFT_WORKER_SECRET
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
```

## Why Not a Standalone Script?

Phase 1 is **Cursor Ultra-only**. A live standalone `npm run batch-worker` fails closed:

```text
Error: Draft generation requires Cursor Ultra Cloud Agent.
This worker must be launched by Coding/Grok as a Cursor Ultra CA task,
or given --drafts-file / an injected generator.
OPENAI_API_KEY is ignored and is not a Production Phase 1 path.
```

## Batch Contract (unchanged)

- **Window**: 07:00–21:00 Africa/Johannesburg
- **Minimum**: ≥5 jobs OR 20 minutes elapsed
- **Soft cap**: ≤6 batches/day (SAST date)
- **One-in-flight**: Only one CA/worker processing at a time
- **Intents**: `general_question`, `maintenance_other`, `confidence < 0.6`
- **From**: `+27600200825` (do not change)
- **Redirect**: leave as configured (pilot ON). Do not flip go-live.

## What Gets Billed

- **Cursor Ultra Models pool**: Draft generation by the CA
- **No external API costs**: No OpenAI, Anthropic, or other provider

## Dry Run (GFM / testing)

```bash
cd apps/guestflow
npm run batch-worker -- --dry-run
```

Dry run:

- Exercises window / cap / claim
- Placeholder drafts only
- Does **not** upsert
- Do **not** point at Production Turso

## GFM after Preview READY (MERGE HOLD)

1. Confirm header redirect is still ON
2. Open one Preview thread with an `llm` draft
3. Confirm the reply is editable
4. Confirm Approve&Send still requires the human confirm token
5. Do not send to a live guest

## References

- Full docs: `apps/guestflow/docs/PHASE1-BATCH-DRAFTS.md`
- Spec: `specs/027-sprint3-phase1-ultra-only/`
- Worker: `apps/guestflow/src/lib/batch-worker.ts`
- Script: `apps/guestflow/scripts/batch-worker.ts`
- Prompt: `apps/guestflow/prompts/DRAFT_PROMPT.md`
