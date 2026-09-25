# UMI Inbox Debug Diagnostics

## Overview

The `/api/umi/inbox` endpoint supports optional debug diagnostics to investigate discrepancies between raw database state and the filtered inbox results.

## Usage

Add `?debug=1` query parameter to the UMI inbox request:

```
GET /api/umi/inbox?debug=1
GET /api/umi/inbox?filter=needs-attention&debug=1
GET /api/umi/inbox?q=search&debug=1
```

## Debug Response Fields

When `debug=1` is present, the response includes a `debug` object with the following fields:

```typescript
{
  success: true,
  filter: "all" | "needs-attention",
  timestamp: string,  // ISO 8601
  debug: {
    // Raw database counts (before any filtering)
    tenantId: number,
    rawMaxId: number | null,     // MAX(id) FROM inbound_threads WHERE tenant_id = ?
    rawCount: number,             // COUNT(*) FROM inbound_threads WHERE tenant_id = ?
    
    // Post-filter results
    listMaxId: number | null,     // Highest thread ID in the returned list
    listCount: number,            // Number of threads in the returned list
    
    // Specific ID presence check
    idsPresentFor48_49_50: {
      "48": boolean,              // Is thread ID 48 in the list?
      "49": boolean,              // Is thread ID 49 in the list?
      "50": boolean               // Is thread ID 50 in the list?
    }
  },
  threads: InboxThread[]
}
```

## Purpose

This diagnostic helps distinguish between:

1. **SQL query filtering** - If `rawMaxId` doesn't match expected max, threads are excluded by the SQL query
2. **Post-processing filtering** - If `rawMaxId` matches expected but `listMaxId` doesn't, threads are filtered in post-processing
3. **Specific thread issues** - The `idsPresentFor48_49_50` map shows whether specific problematic threads made it through

## Example Investigation

```bash
# Check raw database state
curl https://guestflow.thebrowns.co.za/api/umi/inbox?debug=1

# If response shows:
{
  "debug": {
    "rawMaxId": 50,
    "rawCount": 50,
    "listMaxId": 47,
    "listCount": 47,
    "idsPresentFor48_49_50": {"48": false, "49": false, "50": false}
  }
}

# This indicates threads 48-50 exist in the database but are filtered out
# somewhere in the listInboxThreads processing logic.
```

## Implementation

The diagnostics are added in `/api/umi/inbox/route.ts`:

1. Query raw MAX(id) and COUNT(*) before calling `listInboxThreads`
2. Call `listInboxThreads` with existing filter/query logic
3. Compute list-level stats (max ID, count, specific ID presence)
4. Include `debug` object in response only when `?debug=1`

The feature is always available (no additional authentication required beyond staff session) but must be explicitly requested via query parameter to avoid impacting normal inbox performance.

## Cache Control

Both `/api/umi/inbox` and `/api/umi/threads/[id]` now use `staffApiResponseInit()` to set:

```
Cache-Control: no-store, no-cache, must-revalidate
```

This ensures staff operations always read fresh data and never serve stale cached responses.
