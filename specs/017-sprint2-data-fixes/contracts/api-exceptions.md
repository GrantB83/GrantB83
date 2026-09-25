# Contract: Exceptions (live columns)

## `GET /api/exceptions?tenant_id=&status=`

Select only columns that exist on `guest_tickets` in `lib/db.ts`. Response shape unchanged for the page:

```json
{
  "success": true,
  "exceptions": [{
    "id": 1,
    "category": "timeout",
    "priority": "medium",
    "guest": "…",
    "whatAsked": "from subject/description",
    "whatAiFound": "from staff_brief",
    "whyStopped": "from staff_brief or description",
    "nextStep": "from staff_brief",
    "status": "new",
    "createdAt": "…",
    "metadata": {}
  }]
}
```

## `PATCH /api/exceptions`

- Updates `status`.
- `audit_log` insert is try/catch; missing table does not 500.

## Inbound webhook ticket inserts

Timeout and missing-rate-card paths insert `subject`, `description`, `staff_brief` only among the former P0/P1 fields. Do not insert missing columns.

## `GET /api/today-stats`

Removed. Expect 404. Do not restore.
