# Contract: POST /api/inbound/send

Staff cookie required (existing middleware). Never auto-send.

## Request

```json
{
  "threadId": 1,
  "confirmToken": "base64url-token",
  "channel": "whatsapp | email | whatsapp_web",
  "to": "optional",
  "subject": "optional",
  "body": "optional override"
}
```

`confirmToken` is **required**. `threadId` number required.

## Success (200)

Unchanged channel payloads, plus send only after:

1. Thread or latest message `status` ∈ `{approved, ready}`
2. `confirmToken` hashes to unconsumed, unexpired row for `threadId`
3. Token marked consumed

## Fail closed (400)

| Condition | `error` contains |
| --- | --- |
| missing/invalid token | `confirmToken` |
| token reused or expired | `confirmToken` |
| not approved/ready | `approved` or `not approved` |
| missing threadId | `threadId` |
| no draft body | `no draft reply` |

No provider call and no `send_jobs` insert on 400.

## Cron / draft-worker secrets

Must **not** authorize this route.
