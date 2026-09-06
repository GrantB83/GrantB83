# Vercel Deployment Investigation Report
## GuestFlow Deployment Failures Since e709339

**Date:** 2026-09-06  
**Agent:** Cursor Cloud Agent  
**Status:** ⚠️ ROOT CAUSE NOT FULLY IDENTIFIED

---

## Executive Summary

GuestFlow deployments to Vercel have failed consistently since commit **e709339** (Nightsbridge autonomous ingest feature). Multiple fix attempts addressing Edge Runtime incompatibilities, middleware configuration, and Next.js build settings have **NOT resolved the deployment failures**.

**Key Finding:** Local `npm run build` passes cleanly, but Vercel deployments fail immediately after successful builds, suggesting a **deployment configuration or runtime initialization issue** rather than a code/build problem.

---

## Investigation Timeline

### Commit History

| Commit | Description | Vercel Status |
|--------|-------------|---------------|
| e709339 | Nightsbridge ingest + dual crons | ❌ **FIRST FAILURE** |
| #167 (44f5adb) | Fix JSX, TS, reduce crons to 1 | ❌ Still fails |
| #168 (66b7a5e) | Add dynamic='force-dynamic' | ❌ Still fails |
| #169 (4311d3f) | Buffer→btoa for Edge Runtime | ❌ Still fails |
| #170 (6631188) | Node.js runtime + remove standalone | ❌ **Still fails** |

### Deployment IDs Investigated

- `dpl_96QBVdwEwfnNDMf5e7QhYVtV9nVb` (main 66b7a5e)
- `dpl_GWHJDHWMAPK6iMuhStqUFJWBd3HH` (main 302831c - after PR #169 merge)
- `dpl_6d66iszYn5arntAqKHZuzQwhLsd2` (PR #169 attempt 1)
- `dpl_3yfXe5656nXNALKhATutCyYguooz` (PR #169 attempt 2)
- `dpl_3mLDkrZ6JyHgrmxfQDf2HmW8crxu` (PR #169 attempt 3)
- `dpl_6eviwsL6cbBckAaTdf3mr3f8kwkN` (PR #170)

**All deployments show identical error:**
```
Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_<ID> --logs
```

---

## Root Cause Analysis

### ✅ Confirmed Issues (Fixed but didn't resolve deployment)

#### 1. Edge Runtime Buffer API Limitation
**Problem:** `Buffer.from()` used in middleware.ts is unavailable in Edge Runtime  
**Fixed in:** PR #169 (commit 4311d3f)  
**Resolution:** Replaced with `btoa()` (Web API)  
**Result:** ❌ Deployment still fails

#### 2. Edge Runtime Environment Variable Limitation  
**Problem:** Non-`NEXT_PUBLIC_` env vars from .env files unavailable in Edge Runtime  
**Reference:** [Next.js Issue #67296](https://github.com/vercel/next.js/issues/67296)  
**Fixed in:** PR #170 (commit ddddc58)  
**Resolution:** Switched middleware to `export const runtime = 'nodejs'`  
**Result:** ❌ Deployment still fails

#### 3. Standalone Output Mode  
**Problem:** `output: 'standalone'` designed for Docker, may conflict with Vercel pipeline  
**Fixed in:** PR #170 (commit 6631188)  
**Resolution:** Removed standalone mode  
**Result:** ❌ Deployment still fails

### ❓ Remaining Hypotheses (Require Vercel Access to Diagnose)

#### Hypothesis A: Vercel Project Configuration

**Missing/Incorrect Settings:**
1. **Root Directory** not set to `apps/guestflow`
2. **Framework Preset** not set to "Next.js"
3. **Node.js Version** mismatch (local uses v22.14.0)
4. **Environment Variables** not configured in Vercel project settings:
   - `STAFF_PASSWORD`
   - `CRON_SECRET`
   - `NODE_ENV`
   - Database-related vars

**Verification Steps:**
```bash
# Check Vercel project settings:
1. Navigate to Vercel project dashboard
2. Settings → General → Root Directory (should be: apps/guestflow)
3. Settings → General → Framework Preset (should be: Next.js)
4. Settings → General → Node.js Version (recommend: 20.x or 22.x)
5. Settings → Environment Variables → Verify all required vars present
```

#### Hypothesis B: better-sqlite3 Incompatibility

**Problem:** better-sqlite3 is a native Node.js module requiring compilation. Vercel's serverless environment may not support it, or file system access patterns may be incompatible.

**Evidence:**
- GuestFlow uses better-sqlite3 for local database
- Vercel Functions have limited file system access
- Native modules often require platform-specific builds

**Potential Solutions:**
1. Migrate to Vercel Postgres (`@vercel/postgres`)
2. Use Turso (libSQL) with `@libsql/client` (already in dependencies!)
3. Switch to Neon Postgres or Supabase
4. Use Vercel KV for simple data

**Investigation:**
```bash
# Check if better-sqlite3 is causing issues:
npx vercel inspect dpl_<ID> --logs | grep -i "sqlite\|native\|enoent\|fs"
```

#### Hypothesis C: Vercel Hobby Tier Limitations

**Potential Restrictions:**
- Middleware with Node.js runtime unsupported
- Single cron job limit (already addressed in PR #167)
- Native module compilation disabled
- File system restrictions for SQLite

**Verification:**
- Check Vercel Hobby plan documentation
- Consider upgrading to Pro tier for testing

#### Hypothesis D: Monorepo Build Context Issues

**Problem:** Vercel may not correctly resolve the build context when root directory is `apps/guestflow` within a monorepo.

**Evidence:**
- Repository root contains multiple apps (`apps/guestflow/`)
- No monorepo configuration file (pnpm-workspace.yaml, lerna.json, etc.)

**Potential Solutions:**
1. Add `.vercelignore` to exclude non-guestflow directories
2. Configure build command explicitly in vercel.json
3. Use Vercel's monorepo support features

---

## Verified Working Locally

### Build Test Results

**Environment:**
- Node.js: v22.14.0
- npm: 10.9.7
- Next.js: 14.2.35

**Command:**
```bash
cd apps/guestflow && npm run build
```

**Output:**
```
✓ Compiled successfully
✓ Generating static pages (38/38)
ƒ Middleware 26.7 kB (Node.js runtime)

Exit code: 0
```

**All routes properly configured:**
- ƒ (Dynamic): 38 API routes + middleware
- ○ (Static): 15 pages pre-rendered
- No build errors or warnings (except lint warnings)

---

## Files Modified Across Fix Attempts

### `apps/guestflow/src/middleware.ts`
```typescript
// FINAL STATE (PR #170):
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Use Node.js runtime for full env var + Buffer access
export const runtime = 'nodejs'

export function middleware(request: NextRequest) {
  // ... auth logic using Buffer.from() (safe in Node.js runtime)
}
```

### `apps/guestflow/src/app/api/staff-auth/route.ts`
```typescript
// Added base64Encode helper for consistency
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64')
}
```

### `apps/guestflow/next.config.mjs`
```typescript
// Removed standalone output mode
const nextConfig = {
  // output: 'standalone',  // Commented out for Vercel standard deployment
}
```

---

## Required Next Steps

### Priority 1: Access Vercel Deployment Logs

**Command:**
```bash
npx vercel inspect dpl_6eviwsL6cbBckAaTdf3mr3f8kwkN --logs
```

This will reveal the ACTUAL runtime error causing deployment failures.

### Priority 2: Verify Vercel Project Configuration

1. **Root Directory:** `apps/guestflow`
2. **Framework:** Next.js
3. **Build Command:** Auto-detected or `npm run build`
4. **Output Directory:** Auto-detected (`.next`)
5. **Install Command:** Auto-detected or `npm install`
6. **Node.js Version:** 20.x or 22.x (explicit)

### Priority 3: Check Environment Variables

Required variables in Vercel project settings:
- `STAFF_PASSWORD` (for auth middleware)
- `CRON_SECRET` (for Nightsbridge ingest)
- `NODE_ENV=production` (if not auto-set)
- Any database connection vars

### Priority 4: Evaluate better-sqlite3 Compatibility

If logs show SQLite/native module errors:
- Migrate to `@libsql/client` (Turso) - already in dependencies
- Or use Vercel Postgres
- Or use Neon/Supabase

---

## Pull Requests Summary

### PR #167: Build Error Fixes ✅
**Merged:** Yes  
**Fixed:**
- JSX syntax error in inbound-queue page
- TypeScript type errors in Nightsbridge routes
- Vercel Hobby cron limit (reduced from 2 to 1)

**Impact:** Build no longer fails, but deployment still fails

### PR #168: Dynamic Route Configuration ✅
**Merged:** Yes  
**Fixed:**
- Added `export const dynamic = 'force-dynamic'` to 8 API routes
- Prevents unnecessary static generation attempts

**Impact:** Build cleaner, but deployment still fails

### PR #169: Edge Runtime Buffer Fix ✅
**Merged:** Yes (by user GrantB83)  
**Fixed:**
- Replaced `Buffer.from()` with `btoa()` in middleware
- Edge Runtime compatible base64 encoding

**Impact:** ❌ Deployment still fails

### PR #170: Node.js Runtime + Standalone Removal
**Status:** Open (awaiting review)  
**Fixes:**
- Explicit Node.js runtime for middleware (full env + Buffer access)
- Removed standalone output mode
- Simplified env var handling

**Expected Impact:** Should resolve env var access issues, but deployment STILL fails

---

## Conclusion

**After 4 fix attempts addressing:**
- ✅ JSX/TypeScript errors
- ✅ Build configuration
- ✅ Dynamic route exports
- ✅ Edge Runtime API limitations
- ✅ Environment variable access
- ✅ Next.js output mode

**Deployments continue to fail with NO additional error details beyond:**
> "Deployment has failed — run this Vercel CLI command: npx vercel inspect..."

**This strongly suggests the issue is NOT in the application code, but in:**
1. Vercel project configuration
2. Platform/environment compatibility (better-sqlite3)
3. Missing required environment variables
4. Hobby tier restrictions
5. Monorepo build context

**Without access to Vercel deployment logs, further code-level fixes are speculative.**

---

## Recommendations

### Immediate Actions
1. Run `npx vercel inspect dpl_6eviwsL6cbBckAaTdf3mr3f8kwkN --logs` to see actual error
2. Review Vercel project settings (root dir, framework, env vars)
3. Check if STAFF_PASSWORD and CRON_SECRET are set in Vercel dashboard

### If SQLite is the Issue
1. Migrate to Turso using existing `@libsql/client` dependency
2. Or switch to Vercel Postgres for simplicity

### If Configuration is the Issue
1. Verify root directory is set to `apps/guestflow`
2. Add explicit build command in vercel.json if needed
3. Consider upgrading to Pro tier to rule out Hobby limitations

---

## Contact

For further investigation, provide:
- Complete Vercel deployment logs from `npx vercel inspect`
- Screenshot of Vercel project settings (General + Environment Variables)
- Confirmation of Vercel plan tier (Hobby/Pro)
