# Contract: Resend outbound

## Issue token

`POST /api/inbound/confirm-token`

```json
{ "threadId": 12, "purpose": "resend", "messageId": 44 }
```

When `purpose` is `resend`, skip the approved-thread check. Require `messageId` to be an outbound on that thread that is Failed or stuck-Pending.

Existing `{ "threadId": 12 }` behaviour is unchanged.

## Resend

`POST /api/inbound/resend`

```json
{ "messageId": 44, "confirmToken": "<fresh>", "acknowledgeDuplicate": true }
```

`acknowledgeDuplicate` is required when the original is stuck-Pending (possible double delivery). Failed resend does not require it.

### Success

`200`

```json
{
  "success": true,
  "data": {
    "messageId": 45,
    "providerMessageId": "SMxxx",
    "resendOf": 44,
    "resentBy": "Grant",
    "sentToTestSink": true
  }
}
```

### Errors

- `400` missing/invalid/used confirmToken — no send
- `400` message not Failed or stuck
- `409` resend already in flight
- `409` `{ "windowClosed": true, "template": { "name": "stay_packet_link" } | null }` — no send
- `503` provider or redirect misconfigured

## Ports (not HTTP)

```ts
getWindowState(threadId): Promise<{ open: boolean; closesAt?: string | null }>
findApprovedTemplateFor(input: { threadId: number; purpose?: string; body?: string }): Promise<{ name: string; language?: string } | null>
onSendFailed(event: { threadId: number; messageId?: number; channel: string; errorPlain: string; provider?: string }): void
getStaffIdentity(): { actor: string; source: 'legacy-staff' }
```
