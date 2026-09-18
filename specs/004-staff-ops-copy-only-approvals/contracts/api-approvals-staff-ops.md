# API Contract: Approvals Staff Ops

## GET /api/approvals — staff_ops items

Additional union from `staff_ops_drafts`:

| Field | Value |
|-------|-------|
| type | `staff_ops` |
| guest | `Daily brief YYYY-MM-DD` |
| guest_phone | `null` |
| draft_content | brief text |
| metadata.copy_only | `true` |
| metadata.brief_date | ISO date |

Only rows with `status = 'pending_approval'` appear in queue.

## PATCH /api/approvals — staff_ops actions

```http
PATCH /api/approvals
Content-Type: application/json

{
  "itemId": 42,
  "type": "staff_ops",
  "action": "approve",
  "actor": "Grant"
}
```

### Response (approve)

```json
{
  "success": true,
  "status": "approved",
  "copyContent": "... WhatsApp brief text ...",
  "copyOnly": true
}
```

### Response (reject)

```json
{
  "success": true,
  "status": "rejected"
}
```

## Hard gates

- PATCH for `staff_ops` MUST NOT call `/api/whatsapp/send`
- Send UI MUST NOT appear for `copy_only` items
- Guest types unchanged — still require guest_phone for Send
