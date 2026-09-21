# API Contract: Nightsbridge Ingest (Enhanced)

**Endpoint**: `POST /api/cron/nightsbridge-ingest`

**Purpose**: Accept Nightsbridge booking exports and perform incremental updates with soft-cancel.

**Changes from Current**: 
- Returns enhanced summary with `{parsed, inserted, updated, cancelled, unchanged, errors}`
- Implements UPSERT instead of INSERT OR REPLACE
- Soft-cancels bookings missing from import window

## Request

### Authentication

**Header**: `x-cron-secret: <CRON_SECRET>`

**OR**

**Query Parameter**: `?secret=<CRON_SECRET>`

### Body (multipart/form-data)

```
Content-Type: multipart/form-data

file: <arr_and_dep.xlsx binary>
```

### Body (JSON with fileUrl)

```json
{
  "fileUrl": "https://example.com/arr_and_dep.xlsx"
}
```

### Body (JSON with base64)

```json
{
  "fileBase64": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQABgAIA..."
}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `secret` | string | No* | Alternative to `x-cron-secret` header |
| `date` | string | No | Target date for status derivation (YYYY-MM-DD). Default: today |

*Required if `x-cron-secret` header is not provided.

## Response (Success)

**Status**: 200 OK

**Body**:

```json
{
  "success": true,
  "targetDate": "2026-09-20",
  "parsed": 12,
  "inserted": 5,
  "updated": 4,
  "cancelled": 1,
  "unchanged": 2,
  "message": "Successfully imported 12 of 12 bookings",
  "summary": {
    "importBatchId": "550e8400-e29b-41d4-a716-446655440000",
    "importWindow": {
      "minDate": "2026-09-20",
      "maxDate": "2026-09-25"
    }
  },
  "p1AutoEnqueue": {
    "welcomeDrafts": 3,
    "lateDrafts": 1,
    "note": "Drafts queued in Needs Approval page (never auto-send)"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` on success |
| `targetDate` | string | The date used for status derivation (YYYY-MM-DD) |
| `parsed` | number | Total bookings parsed from file |
| `inserted` | number | **NEW**: Number of new bookings inserted |
| `updated` | number | **NEW**: Number of existing bookings updated |
| `cancelled` | number | **NEW**: Number of bookings soft-cancelled (missing from import window) |
| `unchanged` | number | **NEW**: Number of bookings that matched existing data exactly (no changes) |
| `message` | string | Human-readable summary |
| `summary` | object | **NEW**: Additional metadata about the import |
| `summary.importBatchId` | string | UUID of this import batch |
| `summary.importWindow` | object | Date range covered by this import (min/max check-in/check-out) |
| `p1AutoEnqueue` | object | Auto-draft counts (existing P1 feature) |

## Response (Success with Warnings)

**Status**: 200 OK

**Body**:

```json
{
  "success": true,
  "targetDate": "2026-09-20",
  "parsed": 12,
  "inserted": 5,
  "updated": 3,
  "cancelled": 1,
  "unchanged": 2,
  "errors": [
    "Row 7: Missing guest_phone (booking created but marked as blocked)"
  ],
  "missingFields": [
    { "guest": "Emma Thompson", "field": "guestPhone" }
  ],
  "message": "Successfully imported 11 of 12 bookings (1 warning)",
  "summary": {
    "importBatchId": "550e8400-e29b-41d4-a716-446655440000",
    "importWindow": {
      "minDate": "2026-09-20",
      "maxDate": "2026-09-25"
    }
  }
}
```

### Warning Fields

| Field | Type | Description |
|-------|------|-------------|
| `errors` | string[] | List of non-fatal warnings (e.g., missing optional fields) |
| `missingFields` | object[] | Structured list of missing fields per booking |

## Response (Error)

### Authentication Error

**Status**: 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing CRON_SECRET"
}
```

### Missing File

**Status**: 400 Bad Request

```json
{
  "error": "No file provided",
  "message": "Upload file as multipart/form-data with field name \"file\""
}
```

### Invalid File Format

**Status**: 400 Bad Request

```json
{
  "error": "Invalid file format",
  "message": "File must be a valid .xlsx file with headers and data rows"
}
```

### File Fetch Error

**Status**: 400 Bad Request

```json
{
  "error": "Failed to fetch file from URL",
  "url": "https://example.com/missing.xlsx"
}
```

### Internal Error

**Status**: 500 Internal Server Error

```json
{
  "error": "Ingest failed",
  "message": "UNIQUE constraint failed: bookings.tenant_id, bookings.nightsbridge_booking_id",
  "details": "[stack trace]"
}
```

## Behavior Changes (vs Current)

### Current Behavior (INSERT OR REPLACE)

1. Parse file
2. For each booking: `INSERT OR REPLACE INTO bookings (...)`
3. AUTOINCREMENT id changes every time → new row
4. Bookings count grows forever (12 → 24 → 36 ...)
5. No tracking of disappeared bookings
6. Returns `{success, parsed, inserted, message}`

### New Behavior (UPSERT + Soft-Cancel)

1. Parse file
2. Determine import window (min/max dates from parsed bookings)
3. For each booking:
   - Try to match on `nightsbridge_booking_id` (if present)
   - Fallback to natural key `(tenant, guest_name_norm, check_in, check_out, suite_norm)`
   - If match found: UPDATE mutable fields (phone, status, adults, children, notes, late_check_in)
   - If no match: INSERT new row
4. For bookings in DB with dates in import window but missing from file:
   - Set `status = 'cancelled'`
   - Set `last_seen_import_at = <previous last_import_at>`
5. Returns `{success, parsed, inserted, updated, cancelled, unchanged, message, summary}`

### Stable Booking Count Example

**First Import** (Sept 20):
- File has 12 bookings
- Result: `{inserted: 12, updated: 0, cancelled: 0, unchanged: 0}`
- DB count: 12

**Second Import** (Sept 20, same file):
- File has same 12 bookings
- Result: `{inserted: 0, updated: 0, cancelled: 0, unchanged: 12}`
- DB count: 12 (stable!)

**Third Import** (Sept 20, 1 booking changed, 1 disappeared):
- File has 11 bookings (1 updated notes, 1 missing)
- Result: `{inserted: 0, updated: 1, cancelled: 1, unchanged: 10}`
- DB count: 12 (1 marked cancelled, still in DB)

## Backwards Compatibility

### Breaking Changes

None. The response adds new fields but existing fields remain unchanged.

### Migration Path

1. Deploy migration script (add columns, indexes, backfill)
2. Deploy new route code (UPSERT logic)
3. First import after deploy will show `{inserted: 0, updated: N, ...}` where N = existing bookings

## Examples

### Example 1: First Import

**Request**:
```bash
curl -X POST \
  -H "x-cron-secret: abc123" \
  -F "file=@arr_and_dep.xlsx" \
  "https://guestflow.thebrowns.co.za/api/cron/nightsbridge-ingest?date=2026-09-20"
```

**Response**:
```json
{
  "success": true,
  "targetDate": "2026-09-20",
  "parsed": 12,
  "inserted": 12,
  "updated": 0,
  "cancelled": 0,
  "unchanged": 0,
  "message": "Successfully imported 12 of 12 bookings",
  "summary": {
    "importBatchId": "550e8400-e29b-41d4-a716-446655440000",
    "importWindow": {
      "minDate": "2026-09-20",
      "maxDate": "2026-09-25"
    }
  }
}
```

### Example 2: Update Existing Booking

**Request**: Same file but with "Sarah Henderson" notes changed from "" to "Late arrival ~19:00"

**Response**:
```json
{
  "success": true,
  "targetDate": "2026-09-20",
  "parsed": 12,
  "inserted": 0,
  "updated": 1,
  "cancelled": 0,
  "unchanged": 11,
  "message": "Successfully imported 12 of 12 bookings"
}
```

### Example 3: Soft-Cancel

**Request**: File with 11 bookings (Emma Thompson missing, check-in 2026-09-21 is within window)

**Response**:
```json
{
  "success": true,
  "targetDate": "2026-09-20",
  "parsed": 11,
  "inserted": 0,
  "updated": 0,
  "cancelled": 1,
  "unchanged": 11,
  "message": "Successfully imported 11 of 11 bookings (1 booking cancelled)"
}
```

**Database State**:
```sql
SELECT * FROM bookings WHERE guest_name = 'Emma Thompson';
-- status = 'cancelled'
-- last_seen_import_at = '2026-09-20 05:00:00' (previous import)
```
