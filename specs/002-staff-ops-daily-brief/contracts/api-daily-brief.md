# API Contract: Daily Brief

**Base path**: `/api/daily-brief`

## GET /api/daily-brief

Staff-authenticated (via page session cookie; API routes pass through middleware except health/webhooks).

### Query parameters

| Param | Required | Description |
|-------|----------|-------------|
| tenant_id | Yes | Browns tenant ID (typically `1`) |
| date | No | Target date `YYYY-MM-DD`; defaults to today in Africa/Johannesburg |

### Success response `200`

```json
{
  "success": true,
  "tenantId": 1,
  "tenantName": "Browns Dullstroom",
  "targetDate": "2026-09-14",
  "tomorrowDate": "2026-09-15",
  "today": {
    "date": "2026-09-14",
    "arrivals": [],
    "departures": [],
    "inHouse": []
  },
  "tomorrow": {
    "date": "2026-09-15",
    "arrivals": [],
    "departures": [],
    "inHouse": []
  },
  "exceptions": {
    "lateCheckIns": [],
    "missingData": [],
    "emptySuites": []
  },
  "briefText": "… WhatsApp-ready plain text …",
  "bookings": []
}
```

`bookings` — flat list of enriched bookings for target date window (backward compatibility with Phase 17 export POST from page).

### Error responses

| Status | Body |
|--------|------|
| 400 | `{ "success": false, "error": "tenant_id is required" }` |
| 404 | `{ "success": false, "error": "Tenant not found" }` |
| 500 | `{ "success": false, "error": "Failed to build daily brief" }` |

### Empty data

When no bookings match: `success: true` with zero-length arrays and briefText stating no operations — **not** fabricated rows.

---

## POST /api/daily-brief/export (existing — modified)

Export markdown or plain text attachment.

### Body

```json
{
  "tenantName": "Browns Dullstroom",
  "targetDate": "2026-09-14",
  "format": "text",
  "bookings": [],
  "snapshot": {}
}
```

Either `bookings` (legacy enriched array) or `snapshot` (from GET) — server prefers `snapshot` when provided.

### Response

- `200` — `Content-Type: text/plain` or `text/markdown` with `Content-Disposition: attachment`

### Footer requirement

All exports MUST end with draft-only notice referencing H11 / no auto-send.

---

## Out of scope

- POST enqueue staff WhatsApp draft — no endpoint (no existing approval queue type)
- Auto-send via Twilio/Meta — forbidden
