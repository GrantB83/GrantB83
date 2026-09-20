# Contract: POST /api/drafts/upsert

Phase 0 stub. **No LLM.** Auth: `Authorization: Bearer <DRAFT_WORKER_SECRET>` **or** `x-draft-worker-secret`.

## Hard rejects (401/403)

- `DRAFT_WORKER_SECRET` env unset or empty
- Header missing or not equal to `DRAFT_WORKER_SECRET`
- Presented secret equals `CRON_SECRET` (even if that value is also the draft secret — Coding must set distinct values; if they collide, reject)

## Request

```json
{
  "threadId": 1,
  "messageId": 9,
  "draftReply": "supplied text",
  "draftSource": "llm"
}
```

`draftSource` if present must be `llm`. Phase 0 stores text only.

## Success (200)

```json
{
  "success": true,
  "threadId": 1,
  "messageId": 9,
  "draftSource": "llm"
}
```

Updates `inbound_messages.draft_reply` + `draft_source='llm'`. Does not send. Does not call a model.
