# Turso (libSQL) Setup for GuestFlow

**Optional:** GuestFlow works with local SQLite by default. Use Turso for durable cloud storage on Vercel/serverless deployments.

---

## What is Turso?

Turso is a distributed SQLite database (libSQL) that works seamlessly with serverless platforms like Vercel. It provides:

- ✅ SQLite compatibility (same schema, same queries)
- ✅ Durable cloud storage (data persists across deployments)
- ✅ Global edge replication (low latency)
- ✅ Generous free tier (9 GB storage, 1 billion row reads/month)

**Official site:** https://turso.tech

---

## When to Use Turso

### Use Turso if:
- Deploying to **Vercel** (serverless functions)
- Need **persistent data** across deployments
- Want **multi-region** low-latency access
- Running **production** GuestFlow instance

### Use Local SQLite if:
- Running on **localhost** for development
- Deploying to **Fly.io** or **Cloudflare** with persistent volumes
- Testing/prototyping locally
- Don't need cloud persistence

---

## Setup Instructions

### Step 1: Create Turso Account

1. Sign up at https://turso.tech
2. Install Turso CLI:
   ```bash
   # macOS/Linux
   curl -sSfL https://get.tur.so/install.sh | bash

   # Or via Homebrew
   brew install tursodatabase/tap/turso
   ```

3. Authenticate:
   ```bash
   turso auth login
   ```

### Step 2: Create Database

```bash
# Create database
turso db create guestflow-browns

# Get connection URL
turso db show guestflow-browns --url

# Create auth token
turso db tokens create guestflow-browns
```

**Output example:**
```
Database URL: libsql://guestflow-browns-[username].turso.io
Auth Token: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### Step 3: Configure Environment Variables

Add to your Vercel project (or `.env.local` for development):

```bash
DATABASE_URL=libsql://guestflow-browns-[username].turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add `DATABASE_URL` with your Turso connection URL
3. Add `TURSO_AUTH_TOKEN` with your auth token
4. Set both to **Production**, **Preview**, and **Development** environments
5. Redeploy your app

### Step 4: Install libSQL Client (Future)

**Note:** As of this implementation, GuestFlow uses `better-sqlite3` which does NOT support Turso/libSQL protocol. To use Turso, you need to migrate to `@libsql/client`.

```bash
npm install @libsql/client
```

Update `src/lib/db.ts` to use `@libsql/client` instead of `better-sqlite3` when `DATABASE_URL` is set.

**Example (future implementation):**

```typescript
import { createClient } from '@libsql/client'

if (process.env.DATABASE_URL) {
  // Turso/libSQL
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  // Use client.execute() instead of db.prepare()
} else {
  // Local SQLite (existing code)
  // ... better-sqlite3 code
}
```

---

## Graceful Degradation (Current Implementation)

**As of now, GuestFlow gracefully degrades when `DATABASE_URL` is set:**

```typescript
// src/lib/db.ts (current behavior)

if (process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is set but @libsql/client is not configured. ' +
    'Either: (1) Install @libsql/client for Turso support, or ' +
    '(2) Remove DATABASE_URL to use local SQLite file'
  )
}
```

**Options:**

1. **Option A:** Remove `DATABASE_URL` from environment → Use local SQLite file (works on Fly.io with persistent volumes)
2. **Option B:** Install `@libsql/client` and update `src/lib/db.ts` to support Turso
3. **Option C:** Deploy to Fly.io/Cloudflare with persistent storage instead of Vercel

---

## Migration Path: SQLite → Turso

### Step 1: Export Local Data

```bash
cd apps/guestflow
npm run db:export > backup.json
```

### Step 2: Initialize Turso Schema

```bash
# Connect to Turso shell
turso db shell guestflow-browns

# Run schema (from src/lib/db.ts initializeDb function)
CREATE TABLE tenants (...);
CREATE TABLE properties (...);
CREATE TABLE bookings (...);
CREATE TABLE rate_cards (...);
-- etc.
```

### Step 3: Import Data

Manually insert data from `backup.json` or write a migration script.

**Example:**
```sql
INSERT INTO tenants (name, location, timezone) VALUES 
  ('The Browns Luxury Guest Suites (Dullstroom)', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg');

INSERT INTO bookings (tenant_id, guest_name, check_in, check_out, suite_or_unit, adults, children, notes) VALUES
  (1, 'Sarah Henderson', '2026-09-20', '2026-09-22', 'Luxury Suite 1', 2, 0, 'Anniversary');
```

---

## Turso Free Tier Limits

| Resource | Free Tier | Paid Plans |
|----------|-----------|------------|
| Databases | 500 | Unlimited |
| Storage | 9 GB | Pay-as-you-go |
| Row Reads | 1 billion/month | Unlimited |
| Row Writes | 25 million/month | Unlimited |
| Locations | 3 | Global |

**For Browns Dullstroom:** Free tier is more than sufficient for internal ops use.

---

## Deployment Comparison

| Platform | Database Option | Persistence | Cost |
|----------|----------------|-------------|------|
| **Localhost** | SQLite file | Yes (local disk) | Free |
| **Fly.io** | SQLite file | Yes (volume mount) | ~$2-5/month (volume) |
| **Vercel** | Must use Turso | Yes (cloud) | Free tier OK |
| **Cloudflare** | SQLite file (D1) | Yes (Cloudflare D1) | Free tier OK |

---

## Troubleshooting

### "DATABASE_URL is set but @libsql/client is not configured"

**Cause:** You set `DATABASE_URL` but GuestFlow hasn't been updated to use `@libsql/client` yet.

**Solution:**
- **Option A:** Remove `DATABASE_URL` environment variable (use local SQLite)
- **Option B:** Install `@libsql/client` and update `src/lib/db.ts`

### "Failed to connect to Turso"

**Cause:** Invalid `DATABASE_URL` or `TURSO_AUTH_TOKEN`.

**Solution:**
- Verify URL format: `libsql://[db-name]-[username].turso.io`
- Regenerate auth token: `turso db tokens create guestflow-browns`
- Ensure both env vars are set in Vercel/deployment platform

### "Database not found"

**Cause:** Database was deleted or name is wrong.

**Solution:**
- List databases: `turso db list`
- Recreate if needed: `turso db create guestflow-browns`

---

## Best Practices

1. **Development:** Use local SQLite (`data/guestflow.db`)
2. **Production:** Use Turso for Vercel deployments
3. **Backups:** Export data regularly with `npm run db:export`
4. **Secrets:** Never commit `TURSO_AUTH_TOKEN` to git
5. **Testing:** Test migrations on a separate Turso database first

---

## Future Enhancements

- [ ] Migrate `src/lib/db.ts` to support both `better-sqlite3` and `@libsql/client`
- [ ] Add automatic schema migrations
- [ ] Add data seeding script for Turso
- [ ] Add backup/restore scripts for Turso
- [ ] Add multi-region replication configuration

---

## Support

**Turso Docs:** https://docs.turso.tech  
**Turso Discord:** https://discord.gg/turso  
**GuestFlow Owner:** grant@thebrowns.co.za

---

**Remember:** Turso is optional. GuestFlow works perfectly with local SQLite for development and Fly.io deployments with persistent volumes.
