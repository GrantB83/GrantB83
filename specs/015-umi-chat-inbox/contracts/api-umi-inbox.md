# Contract: UMI inbox + thread APIs

Staff-session required (existing GuestFlow staff auth). Tenant defaults to 1. Bodies are JSON. Never return raw secrets. BigInt ids serialize as numbers (`jsonSafeResponse`).

## GET /api/umi/inbox

Query: `filter=all|needs-attention` (default `all`), `q` optional search (name/phone/email/booking id).

Response `200`:

```json
{
  "success": true,
  "filter": "all",
  "threads": [
    {
      "id": 12,
      "threadKind": "booking",
      "bookingId": 44,
      "bookerName": "Ada Example",
      "suite": "Trout",
      "checkIn": "2026-09-25",
      "checkOut": "2026-09-27",
      "nightsbridgeBookingId": "NB-1",
      "lastChannel": "whatsapp_cloud",
      "lastInboundChannel": "whatsapp_cloud",
      "lastMessageAt": "2026-09-24T16:00:00.000Z",
      "preview": "What time is check-in?",
      "pendingReply": true,
      "hasOpenDraft": true,
      "needsAttention": true,
      "sortBucket": 0,
      "hygieneStatus": null
    }
  ]
}
```

Sort: `sortBucket` 0 then 1 then 2; within bucket `lastMessageAt` DESC. Arriving = check-in today or tomorrow SAST.

## GET /api/umi/threads/:id

Response includes header fields above plus chronological `messages[]`:

```json
{
  "id": 1,
  "direction": "inbound",
  "channel": "email",
  "sourceTag": "email",
  "senderAddress": "booker@example.com",
  "body": "Hello",
  "timestamp": "2026-09-24T12:00:00.000Z",
  "isSpam": false,
  "draftReply": "Thanks for writing…",
  "draftSource": "heuristic"
}
```

Plus `defaultOutboundChannel`, `openDraft`, `linkCandidates` (temps only).

## POST /api/umi/threads/:id/link

Body: `{ "bookingId": 44 }`. Temp only. `200` `{ success, threadId, mergedFromThreadId }`. `409` if booking already linked and merge refused; `400` if not a temp or booking missing.

## PUT /api/umi/threads/:id/draft

Body: `{ "text": "…" }`. Sets `draft_source=human`. Does not send.

## GET /api/comms

Redirect or alias of inbox for old bookmarks (`302` to `/` or same JSON as inbox). Must not 500.

## /needs-approval

Remains for `staff_ops` copy-only. Not linked from nav/ops primary.
