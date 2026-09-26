# Contract: WA Web cheap bodies

## GET /api/umi/wa-web/sentinels

Staff/API target list. **No vision.**

### Query

| Query | Default | Rule |
|-------|---------|------|
| `days` | `14` | Lookback for sentinel timestamps; clamp 1–30 |
| `threadId` | omitted | If set, only that thread |

### Response 200

```json
{
  "success": true,
  "sentinels": [
    {
      "threadId": 46,
      "messageId": 248,
      "sentinel": "[body unavailable]",
      "bookerName": "Ada Booker",
      "last4": "5665",
      "bookingLinked": true
    }
  ],
  "count": 1
}
```

Identity is last4 / existing bookerName only. Bodies in the list are the sentinel strings, never invented guest text.

Sentinel match is **exact**: `[body unavailable]` or `[metadata-only]`. Not `[observe-probe]`.

## POST /api/umi/threads/:id/refresh-bodies

Staff on-demand update-in-place via Ship B ingest/backfill (`ingestInboundMessage` replace path). Cap: current thread, or batch ≤10 chats when `threadIds` provided on a batch helper.

### Body

```json
{
  "messages": [
    {
      "from": "+27820000000",
      "text": "What time is check-in?",
      "timestamp": "2026-09-26T00:23:00.000Z",
      "externalMessageId": "waweb-248"
    }
  ]
}
```

`messages` optional. Empty/missing → re-read stored rows + apply hygiene if bodies were already recovered; do not invent.

### Response 200

```json
{
  "success": true,
  "threadId": 46,
  "replaced": 2,
  "remainingSentinels": 0,
  "filteredCleared": 2,
  "nextAction": "Bodies updated. Read the thread."
}
```

### Failure (still 200 with staff next action, or 502)

```json
{
  "success": false,
  "threadId": 46,
  "remainingSentinels": 2,
  "error": "Bodies still unavailable",
  "nextAction": "Ask CoS for a one-shot observe on this chat. Do not invent text."
}
```

No Chrome. No continuous cron. Existing `POST /api/umi/backfill/wa-web` remains the observe/secret path.

## Going-forward hook (docs only)

Observe should POST real `text` only when the chat is unread **or** appears on the sentinel list. Metadata/unread fingerprint stays the idle default.
