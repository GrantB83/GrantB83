# Build Fix Complete: Vercel Preview SUCCESS

## New Tip SHA: `6e06952`

**PR #210**: https://github.com/GrantB83/GrantB83/pull/210
**Vercel Preview**: ✅ **SUCCESS**

## Issue Fixed

**Root Cause**: Next.js App Router `route.ts` files can only export:
- Route handlers: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`
- Configuration: `dynamic`, `dynamicParams`, `revalidate`, `fetchCache`, etc.

Exporting `mapNbSectionRow` from `route.ts` caused build error (same class as Phase 0 `isDraftWorkerAuthorized` bug).

## Solution Applied

### Commit 1: `cf2ff0e` - Move Helper to Separate Module

Created: `apps/guestflow/src/lib/nightsbridge-section-parse.ts`
- Exported `mapNbSectionRow` function (71 lines)
- Exported `ParsedBooking` interface
- Pure module, no route handler code

Updated: `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`
- Changed from `export function mapNbSectionRow` to `import { mapNbSectionRow }`
- Route file now only exports `POST`, `GET`, `dynamic` ✓

Updated: `apps/guestflow/src/app/api/cron/nightsbridge-ingest/__tests__/phone-email-mapping.test.ts`
- Changed import from `../route` to `@/lib/nightsbridge-section-parse`

**Result**: Still had build error (missing ParsedBooking type import)

### Commit 2: `6e06952` - Import ParsedBooking Type

Fixed: `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`
```diff
-import { mapNbSectionRow } from '@/lib/nightsbridge-section-parse'
+import { mapNbSectionRow, type ParsedBooking } from '@/lib/nightsbridge-section-parse'
```

route.ts was using `ParsedBooking` type in line 144 (`const parsedBookings: ParsedBooking[] = []`) but the interface was moved to the new module.

**Result**: ✅ Vercel Preview SUCCESS

## File Structure

```
apps/guestflow/src/
├── lib/
│   └── nightsbridge-section-parse.ts  ← NEW: Extracted helper + types
├── app/api/cron/nightsbridge-ingest/
│   ├── route.ts                       ← FIXED: Only exports handlers + config
│   └── __tests__/
│       └── phone-email-mapping.test.ts ← UPDATED: Import from lib
```

## Verification

### Vercel Build Status
```json
{
  "url": "https://github.com/GrantB83/GrantB83/pull/210",
  "isDraft": false,
  "mergeable": "MERGEABLE",
  "vercel": [{
    "name": "Vercel",
    "state": "SUCCESS"
  }]
}
```

### Commit History
```
6e06952 - fix(guestflow): import ParsedBooking type from section-parse module
cf2ff0e - fix(guestflow): move mapNbSectionRow to lib (Next.js route export fix)
b27bd66 - docs: testing implementation complete
3463caf - test(guestflow): add unit tests for NB phone/email mapping
e89c677 - docs: add implementation complete summary  
f64e0f7 - fix(guestflow): map NB phone/email columns to bookings+contacts
```

## Summary

✅ **Build Error Fixed**
✅ **Vercel Preview: SUCCESS**
✅ **Tests: Pass** (245 lines, 9 suites, 19+ cases)
✅ **PR Ready for Review**
✅ **NOT Merged** (per user request)

**New Tip SHA**: `6e06952`
**Preview URL**: https://vercel.com/grants-projects-db46fb3a/browns-guestflow/5JZ2Wse3Xu7B5R2QSSP8w9exNZDT
**PR**: https://github.com/GrantB83/GrantB83/pull/210

## Next Steps

1. ✅ PR marked Ready for Review
2. ✅ Vercel Preview green
3. ⏳ GFM review
4. ⏳ Merge (after approval)
5. ⏳ Production re-ingest

**Status**: Complete and ready for GFM review
