# API Contract: Daily Brief Enqueue

**Endpoint**: `POST /api/daily-brief/enqueue`

## Request

```http
POST /api/daily-brief/enqueue
Content-Type: application/json

{
  "tenant_id": 1,
  "target_date": "2026-09-18",
  "force": false,
  "actor": "Grant"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| tenant_id | yes | Browns tenant |
| target_date | yes | YYYY-MM-DD brief date |
| force | no | Replace existing pending draft |
| actor | no | Audit actor name |

## Response 201

```json
{
  "success": true,
  "draftId": 42,
  "status": "pending_approval",
  "briefDate": "2026-09-18",
  "existing": false
}
```

When pending already exists and force=false:

```json
{
  "success": true,
  "draftId": 42,
  "status": "pending_approval",
  "briefDate": "2026-09-18",
  "existing": true
}
```

## Errors

| Status | Condition |
|--------|-----------|
| 400 | Missing tenant_id or invalid date |
| 404 | Tenant not found |
| 409 | Empty brief (no operations to report) |
| 503 | `staff_ops_drafts` table not available |

## Hard gates

- **No send** on enqueue
- `draft_content` = server-side `generateWhatsAppBrief()` only
- Idempotent pending per tenant+date unless force
