# Turso Migration Guide

## Current Status

**Foundation Complete ✅**
- `@libsql/client` installed and configured
- `getDbAsync()` available for async Turso operations  
- `getDb()` keeps synchronous SQLite for local dev
- Health endpoint shows database type (`sqlite` or `turso`)
- Turso setup documented in `DEPLOY.md`
- Environment variables ready: `DATABASE_URL`, `TURSO_AUTH_TOKEN`

**Local Dev Works ✅**
- SQLite fallback when `DATABASE_URL` unset
- All existing features work locally
- No breaking changes to current workflow

**Production Turso Support**: Requires API route migration (see below)

---

## API Route Migration Pattern

To fully support Turso in production, API routes need to be updated from sync to async database calls.

### Before (Sync SQLite):
```typescript
import { getDb, getDefaultTenantId } from '@/lib/db'

export async function GET(request: NextRequest) {
  const db = getDb()  // Sync
  const tenantId = getDefaultTenantId()  // Sync
  
  const results = db.prepare('SELECT * FROM table').all()  // Sync
  
  return NextResponse.json({ results })
}
```

### After (Async Turso-compatible):
```typescript
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'

export async function GET(request: NextRequest) {
  const db = await getDbAsync()  // Async
  const tenantId = await getDefaultTenantIdAsync()  // Async
  
  const stmt = db.prepare('SELECT * FROM table')
  const results = await stmt.all()  // Async
  
  return NextResponse.json({ results })
}
```

### Key Changes:
1. Import `getDbAsync()` instead of `getDb()`
2. Import `getDefaultTenantIdAsync()` instead of `getDefaultTenantId()`  
3. Add `await` before all database calls
4. Update TypeScript types if needed

---

## Routes Requiring Migration

### High Priority (Staff Ops Core):
- [x] `/api/health` - ✅ **MIGRATED**
- [ ] `/api/bookings` - GET/POST for Nightsbridge import
- [ ] `/api/rate-cards` - GET/POST/DELETE for quote drafts
- [ ] `/api/leads` - GET/POST for inquiry intake
- [ ] `/api/properties` - GET/POST for property management
- [ ] `/api/tenants` - GET/POST for tenant management

### Medium Priority (Guest Portal):
- [ ] `/api/guest-portal/[code]` - Guest access by code
- [ ] `/api/welcome-drafts` - Welcome message generation

### Lower Priority (Internal Features):
- [ ] `/api/waitlist` - Waitlist management (if used)
- [ ] `/api/invite-codes` - Invite code generation
- [ ] `/api/demo/seed` - Demo data seeding
- [ ] `/api/whatsapp/send` - WhatsApp logging
- [ ] Various export endpoints

### Transactions (Special Handling):

Routes using `db.transaction()` need different handling:

**Before (SQLite):**
```typescript
const insertMany = db.transaction((items: any[]) => {
  for (const item of items) {
    stmt.run(item.field1, item.field2)
  }
})

insertMany(items)
```

**After (Turso):**
```typescript
// Turso doesn't support the same transaction API
// Use batch execute or sequential inserts
for (const item of items) {
  await stmt.run(item.field1, item.field2)
}
```

**Routes with transactions:**
- `/api/rate-cards` (POST) - Batch rate card upload
- Any other routes using `db.transaction()`

---

## Testing Checklist

After migrating each route:

1. ✅ **Local dev** - Test with SQLite (no `DATABASE_URL` set)
2. ✅ **Turso** - Test with Turso credentials set
3. ✅ **Build** - Verify `npm run build` passes
4. ✅ **Smoke tests** - Run existing smoke tests

---

## Gradual Migration Path

**Option A: Big Bang (All at Once)**
- Migrate all routes in one PR
- Requires extensive testing
- Downtime risk if issues found

**Option B: Incremental (Recommended)**
1. Migrate high-priority routes first
2. Test each route individually
3. Deploy incrementally
4. Monitor for issues

**Option C: Hybrid Mode**
- Keep both `getDb()` and `getDbAsync()` available
- Migrate routes one by one over time
- Eventually deprecate `getDb()` when all routes migrated

---

## Environment Setup

### Local Development (SQLite)
```bash
# No DATABASE_URL = automatic SQLite fallback
cd apps/guestflow
npm run dev
# Uses data/guestflow.db
```

### Production (Turso)
```bash
# Set Vercel environment variables
vercel env add DATABASE_URL
# Paste: libsql://browns-guestflow-[username].turso.io

vercel env add TURSO_AUTH_TOKEN
# Paste: eyJhbGc...

vercel --prod
# Routes will use Turso
```

---

## Migration Timeline (Estimated)

| Phase | Routes | Effort | Status |
|-------|--------|--------|--------|
| Foundation | `src/lib/db.ts`, health endpoint | 2-3h | ✅ Complete |
| Phase 1 | Core staff ops (bookings, rate-cards, leads) | 4-6h | ⏳ Pending |
| Phase 2 | Guest portal, properties, tenants | 2-3h | ⏳ Pending |
| Phase 3 | Remaining routes, exports, utilities | 3-4h | ⏳ Pending |
| Testing | Smoke tests, manual verification | 2-3h | ⏳ Pending |

**Total:** ~13-19 hours

---

## Questions?

Contact: grant@thebrowns.co.za

## References

- Turso Docs: https://docs.turso.tech/
- LibSQL Client: https://github.com/tursodatabase/libsql-client-ts
- GuestFlow DEPLOY.md (Turso setup)
