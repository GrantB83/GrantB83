# Contract: CoS WhatsApp Web bridge jobs

Auth for all `/api/bridge/*`: `Authorization: Bearer <BRIDGE_JOB_SECRET|CRON_SECRET|INBOUND_WEBHOOK_SECRET>` or `x-bridge-secret`.

## `GET /api/bridge/jobs?status=queued`

Returns next jobs (default limit 10, oldest first).

```json
{
  "success": true,
  "jobs": [
    {
      "id": 44,
      "channel": "whatsapp_web",
      "status": "queued",
      "threadId": 12,
      "to": "+27821234567",
      "body": "Hi Sam,\n\nSee you Friday.",
      "subject": null,
      "createdAt": "2026-09-20T12:00:00.000Z"
    }
  ]
}
```

**Clicker typing**: Preserve `\n` as Shift+Enter. One job = one WhatsApp bubble. Do not split.

## `POST /api/bridge/jobs/:id/claim`

```json
{ "success": true, "job": { "id": 44, "status": "claimed", "claimToken": "…", "body": "…", "to": "+2782…" } }
```

409 if not `queued`.

## `POST /api/bridge/jobs/:id/complete`

```json
{ "status": "sent" }
```

or `{ "status": "failed", "error": "timeout" }`  
or `{ "status": "blocked", "error": "qr_required" }` (QR / Aw Snap)

```json
{ "success": true, "job": { "id": 44, "status": "sent", "completedAt": "…" } }
```

GuestFlow MUST NOT call this from the staff Send button.

## Production URL

`https://guestflow.thebrowns.co.za/api/bridge/jobs`
