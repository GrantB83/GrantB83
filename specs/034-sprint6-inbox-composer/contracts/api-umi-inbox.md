# Contract: GET /api/umi/inbox

## Request

| Query | Default | Rule |
|-------|---------|------|
| `filter` | `all` | `all` \| `needs-attention` |
| `q` | omitted | Existing booker/suite/booking/body search |
| `limit` | `25` | Integer 1–50. **MUST** change `threads.length` when corpus is larger |
| `cursor` | omitted | Opaque keyset: `{lastMessageAt}:{id}` of last item on previous page |
| `debug` | omitted | Existing diagnostics; must not disable `limit` |

## Response 200

```json
{
  "success": true,
  "filter": "all",
  "limit": 25,
  "cursor": null,
  "nextCursor": "2026-09-26T08:00:00.000Z:41",
  "hasMore": true,
  "timestamp": "2026-09-26T18:00:00.000Z",
  "threads": []
}
```

- `threads.length` ≤ `limit`
- Each list `careWindow` is `{ state, label }` or omitted — not the full thread-open object
- Sort order unchanged (arriving / pending / recent)
- No invented rows

## Errors

500 `{ success: false, error: "Failed to load inbox" }` — staff UI shows state + next action, not a blank 30s pane.
