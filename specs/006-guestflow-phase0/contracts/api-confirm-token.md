# Contract: POST /api/inbound/confirm-token

Staff cookie required. Issues one-time token after UI confirm.

## Request

```json
{ "threadId": 1 }
```

## Success (200)

```json
{
  "success": true,
  "confirmToken": "<raw>",
  "expiresAt": "ISO-8601",
  "threadId": 1
}
```

Requires thread or latest message status ∈ `{approved, ready}`.

## Fail (400)

Not approved/ready, missing thread, or thread not found.

TTL: 15 minutes. Hash stored; raw token returned once.
