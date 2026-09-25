# Contract: Ultra-only Phase 1 batch worker

## CLI

```text
npm run batch-worker
npm run batch-worker -- --dry-run
npm run batch-worker -- --drafts-file <path.json>
```

| Flag | Effect |
| --- | --- |
| (none) | Live batch. Requires Ultra path (`--drafts-file` or injected generator). Otherwise refuse, exit ≠ 0, claim nothing. |
| `--dry-run` | Placeholders. May claim for contract testing. MUST NOT POST upsert. |
| `--drafts-file` | JSON object `{ "<messageId>": "<draftReply>" }`. Non-empty map is an Ultra path. |

Required env (names only): `GUESTFLOW_API_URL`, `DRAFT_WORKER_SECRET`, `TURSO_DATABASE_URL` or `DATABASE_URL`, `TURSO_AUTH_TOKEN` when Turso.

Forbidden as a Production Phase 1 requirement: `OPENAI_API_KEY`, `OPENAI_API_BASE`, `LLM_MODEL`, `ANTHROPIC_API_KEY`.

## Library

`runBatch(db, config, draftGenerator?)`

Refuse (no claim, no `batch_runs` row) when `isCursorUltraPathAvailable(config, draftGenerator)` is false.

Skip reasons (no claim):

| `skippedReason` contains | When |
| --- | --- |
| `Cursor Ultra` | Ultra path unavailable |
| `Outside batch window` | not 07:00–21:00 SAST |
| `Soft cap` | ≥6 batches today SAST |
| `in flight` | another claimed worker <5 minutes old |
| `No jobs ready` | <5 pending and oldest <20 minutes |

## Upsert (unchanged)

`POST /api/drafts/upsert`

- Header: `X-Draft-Worker-Secret` or Bearer `DRAFT_WORKER_SECRET`
- Reject `CRON_SECRET`
- Body: `{ threadId, messageId, draftReply, draftSource: "llm" }`
- MUST NOT send

## Webhook (unchanged)

`/api/inbound/webhook` enqueues `draft_jobs` for `general_question` / `maintenance_other` / confidence < 0.6. No LLM.

## Prompt

Worker MUST call `buildDraftPrompt` with property knowledge. MUST NOT call `fetch(.../chat/completions)`.
