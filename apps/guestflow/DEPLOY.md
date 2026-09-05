# GuestFlow Deployment Guide

## Production Host: guestflow.thebrowns.co.za

This is a **staff-only internal operations console**. Not a public site.

---

## Staff Runbook: Turso Database Setup (Grant - One Time)

**Context:** Vercel Hobby plan uses ephemeral storage. Turso provides free durable SQLite for production.

### Quick Setup (5 minutes)

1. **Install Turso CLI:**
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Sign up (free, no credit card):**
   ```bash
   turso auth signup
   # Or if you already have an account: turso auth login
   ```

3. **Create database:**
   ```bash
   turso db create browns-guestflow
   ```

4. **Get credentials:**
   ```bash
   # Get database URL
   turso db show browns-guestflow --url
   # Copy the output: libsql://browns-guestflow-[username].turso.io
   
   # Get auth token
   turso db tokens create browns-guestflow
   # Copy the output: eyJhbGc...
   ```

5. **Set Vercel environment variables:**
   ```bash
   vercel env add DATABASE_URL
   # Paste the database URL from step 4
   
   vercel env add TURSO_AUTH_TOKEN
   # Paste the auth token from step 4
   
   # Redeploy to apply
   vercel --prod
   ```

6. **Verify:**
   - Visit `https://guestflow.thebrowns.co.za/api/health`
   - Should show `"database":"turso"` instead of `"sqlite"`

**That's it!** The schema will initialize automatically on first request.

**Fallback:** If Turso setup fails, the app will still work locally with SQLite file. Rate cards and data will need to be re-entered after each Vercel deploy (not recommended for production).

---

## Quick Deploy Checklist

### 1. Choose Deployment Platform

**Option A: Vercel (Recommended - Easiest)**
- ✅ Zero config for Next.js 14
- ⚠️ SQLite not supported on serverless (use Turso DB instead)
- ✅ Easy environment variables
- ✅ Automatic HTTPS

**Option B: Fly.io (Best for SQLite)**
- ✅ Persistent volumes for SQLite
- ✅ Full control over runtime
- ⚠️ Requires Dockerfile
- ✅ Good for single-tenant apps

**Option C: Cloudflare Pages + D1**
- ✅ D1 database (SQLite-compatible)
- ✅ Free tier generous
- ⚠️ Requires D1 setup

---

## Option A: Vercel Deployment (with Turso DB)

### ⚠️ CRITICAL: Vercel Project Configuration

**This monorepo requires the Root Directory setting in Vercel to work correctly.**

When creating or configuring the Vercel project, you MUST set:

- **Root Directory:** `apps/guestflow` ← **REQUIRED**
- **Build Command:** (leave default / auto-detect)
- **Install Command:** (leave default / auto-detect)
- **Output Directory:** (leave default / auto-detect)

**Why this matters:**
- The repository root has no `package.json` or Next.js app
- Without Root Directory set, Vercel will try to build from root and fail
- Path aliases (`@/components/*`, `@/lib/*`) only work when building from `apps/guestflow`

**To configure in Vercel dashboard:**
1. Go to Project Settings → General → Build & Development Settings
2. Find "Root Directory" field
3. Enter: `apps/guestflow`
4. Save and trigger a new deployment

### Step 1: Set Up Turso Database (Free Tier)

Turso provides a free tier with 9GB storage and 500 databases - perfect for GuestFlow:

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up for free Turso account (first time only)
turso auth signup

# Or login if you already have an account
turso auth login

# Create Browns database on free tier
turso db create browns-guestflow

# Get connection URL
turso db show browns-guestflow --url
# Copy this URL - it will look like: libsql://browns-guestflow-[username].turso.io

# Create auth token
turso db tokens create browns-guestflow
# Copy this token - it will look like: eyJhbGc...

# Initialize schema (creates all tables)
turso db shell browns-guestflow < apps/guestflow/scripts/init-db.sql
# Note: This requires converting init-db.js to SQL, or use the schema from src/lib/db.ts
```

**Turso Free Tier Limits:**
- 9 GB total storage
- 500 databases per account
- 1 billion row reads/month
- Good for Browns single-tenant ops (low volume)
- No credit card required

**Save these for Step 2:**
- DATABASE_URL: `libsql://browns-guestflow-[username].turso.io`
- TURSO_AUTH_TOKEN: `eyJhbGc...`

### Step 2: Deploy to Vercel

```bash
# From workspace root
cd apps/guestflow

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add STAFF_PASSWORD
# Enter: your-secure-password (save this!)

vercel env add DATABASE_URL
# Paste Turso connection URL from step 1

vercel env add NODE_ENV
# Enter: production

# Redeploy with env vars
vercel --prod
```

### Step 3: Point DNS (Grant does this once)

In DNS provider (Cloudflare/Namecheap/etc):

```
Type: CNAME
Name: guestflow
Target: <your-vercel-url>.vercel.app
TTL: Auto
```

**Example:**
- Name: `guestflow`
- Target: `browns-guestflow-abc123.vercel.app`
- Result: `guestflow.thebrowns.co.za` → Vercel app

### Step 4: Add Custom Domain in Vercel

1. Go to Vercel project settings → Domains
2. Add `guestflow.thebrowns.co.za`
3. Vercel will verify DNS and provision SSL
4. Wait 5-10 minutes for propagation

---

## Option B: Fly.io Deployment (with SQLite)

### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Step 2: Create fly.toml

```toml
# apps/guestflow/fly.toml
app = "browns-guestflow"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[mounts]]
  source = "browns_data"
  destination = "/app/data"
  initial_size = "1gb"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### Step 3: Create Dockerfile

```dockerfile
# apps/guestflow/Dockerfile
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy app files
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

### Step 4: Deploy

```bash
cd apps/guestflow

# Create volume for SQLite persistence
fly volumes create browns_data --region iad --size 1

# Set secrets
fly secrets set STAFF_PASSWORD=your-secure-password
fly secrets set NODE_ENV=production

# Deploy
fly deploy

# Get app URL
fly status
# Note the hostname, e.g., browns-guestflow.fly.dev
```

### Step 5: Point DNS (Grant does this once)

In DNS provider:

```
Type: CNAME
Name: guestflow
Target: browns-guestflow.fly.dev
TTL: Auto
```

---

## Option C: Cloudflare Pages + D1

### Step 1: Create D1 Database

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create browns-guestflow

# Note the database_id in output
```

### Step 2: Create wrangler.toml

```toml
# apps/guestflow/wrangler.toml
name = "browns-guestflow"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "browns-guestflow"
database_id = "<your-database-id-from-step-1>"

[vars]
NODE_ENV = "production"
```

### Step 3: Deploy to Cloudflare Pages

```bash
cd apps/guestflow

# Build
npm run build

# Deploy via Cloudflare dashboard or CLI
wrangler pages deploy .next/static

# Set environment variables in Cloudflare dashboard
# STAFF_PASSWORD = your-secure-password
```

### Step 4: Point DNS (Grant does this once)

In Cloudflare DNS:

```
Type: CNAME
Name: guestflow
Target: <your-pages-url>.pages.dev
TTL: Auto
```

---

## Seed Browns Data (M2)

### Local Development

After initializing the database, seed Browns Dullstroom rate cards and property facts:

```bash
cd apps/guestflow

# Initialize database schema
npm run db:init

# Seed Browns data from authoritative sources
npm run seed:browns
```

**What gets seeded:**
- Rate cards from `tools/browns-ota-rate-pipeline-pack/fixtures/sample-rates.csv`
- Property facts from `tools/browns-guest-facts-pack/fixtures/the-browns-like.md`
- Browns tenant and properties (Luxury Suite 1, Garden Suite, Family Suite)

**Hard Gates:**
- ✅ Never invents rates, phone numbers, Wi-Fi codes, or contact details
- ✅ Uses `[MISSING RATE]` placeholders for unavailable data
- ✅ Only seeds Browns Dullstroom properties (tenant-scoped)

### Vercel/Production

**Option A: Turso (Recommended for Vercel)**

Turso provides a free tier SQLite-compatible database that works on serverless:

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create Browns database
turso db create browns-guestflow

# Get connection URL and auth token
turso db show browns-guestflow --url
turso db tokens create browns-guestflow

# Add to Vercel environment variables:
# DATABASE_URL=libsql://browns-guestflow-[...].turso.io
# TURSO_AUTH_TOKEN=[token from above]

# Initialize schema and seed data via Turso shell
turso db shell browns-guestflow < scripts/schema.sql

# Or seed via local script pointing to Turso:
# (requires libsql client library - see Turso docs)
```

**Option B: Local Seed + Manual Upload**

If Turso signup is not possible:

1. Run seed script locally (creates `data/guestflow.db`)
2. Export data to JSON/CSV
3. Import via `/ops/rate-cards` upload page after deployment
4. App degrades gracefully without `DATABASE_URL` (rate cards required per-session)

**Option C: Seed Script in Vercel Build**

Not recommended (better-sqlite3 doesn't work on Vercel serverless). Use Turso or manual upload.

---

## Post-Deployment Verification

### 1. Test Health Endpoint

```bash
curl https://guestflow.thebrowns.co.za/api/health
# Expected: {"status":"ok","service":"guestflow","tenant":"Browns Dullstroom",...}
```

### 2. Test Staff Login

1. Visit `https://guestflow.thebrowns.co.za`
2. Should redirect to `/staff-login`
3. Enter `STAFF_PASSWORD` from deployment
4. Should redirect to Browns ops hub

### 3. Test Database Connection

1. Login as staff
2. Visit `/ops/inquiry-intake`
3. Submit a test inquiry
4. Verify it saves (or shows graceful error if no DATABASE_URL)

### 4. Test Rate Cards

1. Visit `/ops/rate-cards`
2. Verify seeded Browns rate cards appear
3. Or upload rate cards manually if DATABASE_URL not set

### 5. Run Smoke Tests

Run full smoke test suite:

```bash
cd apps/guestflow

# Start dev server (if not running)
npm run dev

# In another terminal, run smoke tests
npm run smoke:ops
```

Expected output:
```
✅ All M2 ops console tests passed!
GuestFlow ops console is ready for Browns Dullstroom.
```

### 6. Test CLI Export

1. Visit `/ops/daily-brief`
2. Click export
3. Verify markdown/HTML download works

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `STAFF_PASSWORD` | Yes (prod) | Password for staff access | `your-secure-password-here` |
| `DATABASE_URL` | Vercel only | Turso/Postgres connection string | `libsql://browns-guestflow-...` |
| `TURSO_AUTH_TOKEN` | Vercel + Turso | Turso authentication token | `eyJh...` |
| `WHATSAPP_TOKEN` | Optional | Meta WhatsApp Cloud API access token | `EAAl...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | WhatsApp Business phone number ID | `123456789012345` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Optional | WhatsApp Business account ID | `987654321098765` |
| `NODE_ENV` | Yes | Environment mode | `production` |

**Note on DATABASE_URL:**
- **Local dev:** Not required (uses `data/guestflow.db` SQLite file automatically)
- **Vercel:** Required if using Turso (or other remote DB)
- **Without DATABASE_URL on Vercel:** App will show graceful error; rate cards must be uploaded per-session via `/ops/rate-cards` page

**Note on WhatsApp Configuration:**
- **Optional:** WhatsApp send functionality is disabled until these env vars are configured
- **When missing:** UI shows clear "WhatsApp not configured" message with disabled send buttons
- **Setup required:** Meta Business Manager account, WhatsApp Business API approval, phone number registration
- **See:** WhatsApp Setup section below for full configuration instructions

---

## WhatsApp Cloud API Setup (Optional)

### Overview

GuestFlow includes **human-approved WhatsApp send functionality** for welcome messages and guest communications. This feature is:

- ✅ **Optional** — App works without WhatsApp configuration (send buttons disabled)
- ✅ **NEVER auto-sends** — Requires explicit "Approve & Send (WhatsApp)" button click + confirmation dialog
- ✅ **Gracefully degraded** — Clear UI messaging when not configured
- ✅ **Production-ready** — Uses Meta WhatsApp Cloud API (official, no third-party)

### Prerequisites

Before configuring WhatsApp in GuestFlow, you need:

1. **Meta Business Manager Account** ([business.facebook.com](https://business.facebook.com))
2. **WhatsApp Business Account** (created within Meta Business Manager)
3. **WhatsApp Business Phone Number** (new number or migrate existing)
4. **WhatsApp Cloud API Access** (approved by Meta)

**⚠️ CRITICAL:** The Browns' Dullstroom has a **new WhatsApp Business number** (not +27836458313). Contact Grant for:
- Display name: **The Browns' Dullstroom**
- Meta legal entity: **TheBrowns Group (Pty) Ltd**
- Old number: Entry point only (do not register as Cloud API line)

### Step 1: Access Meta Business Manager

1. Go to [business.facebook.com](https://business.facebook.com)
2. Login with TheBrowns Group account credentials
3. Navigate to **Business Settings** → **Accounts** → **WhatsApp Business Accounts**

### Step 2: Create or Select WhatsApp Business Account

```
Business Settings → WhatsApp Business Accounts → Add or Select
```

- **Account Name:** The Browns' Dullstroom
- **Business Name:** TheBrowns Group (Pty) Ltd
- **Time Zone:** Africa/Johannesburg

### Step 3: Add Phone Number to WhatsApp Business

```
WhatsApp Business Account → Phone Numbers → Add Phone Number
```

**Options:**

- **Option A: Get New Number** (Recommended if not purchased yet)
  - Select South Africa (+27) country code
  - Choose area code (e.g., Mpumalanga/Dullstroom region)
  - Complete verification via SMS/call

- **Option B: Use Existing Number** (If already have WhatsApp Business number)
  - Enter existing number
  - Verify ownership via SMS/call
  - ⚠️ **WARNING:** Do NOT migrate old entrypoint number (+27836458313) to Cloud API

### Step 4: Get API Credentials

Once phone number is verified:

1. Go to **WhatsApp Manager** → **API Setup**
2. Copy these values:

```bash
# 1. Phone Number ID (shown in API Setup → Phone Numbers)
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# 2. Business Account ID (shown in account header)
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765

# 3. Access Token (initially temporary, replace with permanent token)
WHATSAPP_TOKEN=EAAl...
```

### Step 5: Generate Permanent Access Token

Temporary tokens expire in 24 hours. Create a **System User** for permanent access:

```
Business Settings → Users → System Users → Add → Create System User
```

- **Name:** GuestFlow WhatsApp Bot
- **Role:** Admin
- **Assign Assets:** Select WhatsApp Business Account

Generate token:

```
System Users → GuestFlow WhatsApp Bot → Generate New Token
```

- **Permissions:** `whatsapp_business_messaging`, `whatsapp_business_management`
- **Expiration:** Never (or 60 days, requires rotation)
- **Copy token** → This is your permanent `WHATSAPP_TOKEN`

### Step 6: Configure Webhook (Optional for Inbound)

If you want to receive inbound messages (not required for send-only):

```
WhatsApp Manager → Configuration → Webhook
```

- **Callback URL:** `https://guestflow.thebrowns.co.za/api/whatsapp/webhook`
- **Verify Token:** Generate secure random string, save in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Subscribe to:** messages, message_status

**Note:** Current implementation is **send-only**. Webhook support can be added later.

### Step 7: Add Environment Variables

#### Vercel

```bash
vercel env add WHATSAPP_TOKEN
# Paste permanent access token from Step 5

vercel env add WHATSAPP_PHONE_NUMBER_ID
# Paste phone number ID from Step 4

vercel env add WHATSAPP_BUSINESS_ACCOUNT_ID
# Paste business account ID from Step 4

# Redeploy
vercel --prod
```

#### Fly.io

```bash
fly secrets set WHATSAPP_TOKEN=EAAl...
fly secrets set WHATSAPP_PHONE_NUMBER_ID=123456789012345
fly secrets set WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765

# Restart app
fly deploy
```

#### Local Development

```bash
# Add to apps/guestflow/.env.local
WHATSAPP_TOKEN=EAAl...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
```

### Step 8: Verify Configuration

1. Visit `https://guestflow.thebrowns.co.za/ops/welcome-drafts`
2. Check WhatsApp status banner:
   - ✅ Green = Configured and ready
   - ⚠️ Amber = Not configured (env vars missing)
3. If configured, "Approve & Send (WhatsApp)" buttons will be enabled

### Message Templates (Meta Approval Required)

Meta requires **approved Message Templates** for messages sent **outside the 24-hour customer service window**.

**For The Browns' Dullstroom, submit these templates for approval:**

#### 1. Welcome Message (same-day check-in)

```
Name: welcome_same_day
Category: Utility
Language: English

Body:
Hi {{1}}, looking forward to welcoming you to {{2}} today!

Check-in from {{3}}. If you have any questions, just reply.

Warm regards,
The Browns Team
```

#### 2. Stay Packet Link

```
Name: stay_packet_link
Category: Utility
Language: English

Body:
Hi {{1}}, your booking at {{2}} is confirmed.

Access your stay packet and details: {{3}}

See you soon!
```

#### 3. Custom Message (within 24h window)

No template required — free-form text allowed within 24 hours of customer contact.

**Submit templates for approval:**

1. Go to **WhatsApp Manager** → **Message Templates**
2. Click **Create Template**
3. Fill in template details
4. Submit for Meta review (usually approved in 24-48 hours)

**Until templates are approved:** GuestFlow sends free-form text (works within 24h window only).

### Testing

#### Test Send (Sandbox)

Meta provides a **test phone number** for sandbox testing:

```bash
# In Meta WhatsApp Manager → API Setup → Test Number
Test recipient: +1 555 0100 (provided by Meta)
```

1. Go to `/ops/welcome-drafts`
2. Click "Approve & Send (WhatsApp)" on any draft
3. Enter test phone number when prompted
4. Confirm send
5. Check Meta dashboard for delivery status

#### Test with Real Number

Once templates are approved:

1. Use Grant's or staff member's real WhatsApp number
2. Test same-day welcome message flow
3. Verify:
   - Message received
   - Portal link works (if included)
   - Formatting correct

### Monitoring & Logs

#### View Send Logs

Send attempts are logged in `whatsapp_send_log` table (SQLite/Turso):

```sql
SELECT * FROM whatsapp_send_log 
ORDER BY sent_at DESC 
LIMIT 20;
```

**Logged fields:**
- `draft_id`, `guest_phone`, `send_status`, `message_id`, `error_message`, `sent_at`, `has_portal_link`

**NOT logged:**
- Message body (privacy + hard gate compliance)

#### Meta Analytics

View delivery stats in Meta Business Manager:

```
WhatsApp Manager → Analytics → Message Analytics
```

Metrics: Sent, Delivered, Read, Failed

### Troubleshooting

#### "WhatsApp not configured" in UI

- Verify all 3 env vars are set (see Step 7)
- Check for typos in env var names
- Redeploy after adding env vars

#### "Invalid access token" error

- Token may have expired (if using temporary token)
- Generate permanent token via System User (Step 5)
- Update `WHATSAPP_TOKEN` env var

#### "Phone number not registered" error

- Verify phone number is registered in Meta Business Manager
- Check `WHATSAPP_PHONE_NUMBER_ID` matches the ID in Meta dashboard
- Ensure phone number is verified (green checkmark in Meta)

#### Message not delivered

- Check if template is approved (for out-of-window messages)
- Verify recipient number is in international format (+27...)
- Check Meta Analytics for delivery status
- Ensure recipient has WhatsApp installed

#### "Business account not found" error

- Verify `WHATSAPP_BUSINESS_ACCOUNT_ID` is correct
- Check System User has access to WhatsApp Business Account
- Regenerate access token if needed

### Hard Gates (Always Enforced)

✅ **NEVER auto-send** — Requires explicit button click + confirmation  
✅ **Disabled when not configured** — Clear UI messaging, no fake sends  
✅ **Logs without message bodies** — Privacy compliant  
✅ **Portal links included automatically** — When booking has portal URL  
✅ **Phone format validated** — Must be international format (+27...)

### Cost Notes

- **WhatsApp Cloud API Pricing:** See [Meta pricing page](https://developers.facebook.com/docs/whatsapp/pricing)
- **Free tier:** 1,000 conversations/month (as of 2024)
- **Conversation window:** 24 hours from last customer message
- **Out-of-window messages:** Require approved templates + may incur charges

**For Browns' volume (estimated 20-50 messages/month):** Should stay within free tier.

---

## Database Migration (If Needed)

### Turso (Vercel)

```bash
# Connect to Turso shell
turso db shell browns-guestflow

# Run schema from init-db.js manually or:
# Copy schema SQL and paste into shell
```

### Fly.io (SQLite)

```bash
# SSH into Fly machine
fly ssh console

# Run init script
cd /app
node scripts/init-db.js
```

### Cloudflare D1

```bash
# Run migrations via wrangler
wrangler d1 execute browns-guestflow --file=./scripts/schema.sql
```

---

## Monitoring & Logs

### Vercel

```bash
vercel logs --prod
```

### Fly.io

```bash
fly logs
```

### Cloudflare Pages

View logs in Cloudflare dashboard → Pages → Logs

---

## Troubleshooting

### "Invalid password" on login

- Verify `STAFF_PASSWORD` env var is set correctly
- Check for trailing spaces in password
- Redeploy after env var changes

### Database connection errors (Vercel + Turso)

- Verify `DATABASE_URL` includes protocol (`libsql://`)
- Check Turso auth token is valid
- Ensure Turso database is not hibernated

### SQLite file not found (Fly.io)

- Verify volume is mounted to `/app/data`
- SSH into machine and check `ls /app/data`
- Run `node scripts/init-db.js` if needed

### Build failures

- Verify Node version is 18+
- Check `npm run build` succeeds locally
- Review build logs for specific errors

---

## Security Notes

1. **Staff password** should be strong and shared only with Browns staff
2. **HTTPS only** — both Vercel and Fly enforce this automatically
3. **No public signup** — staff-login page is the only entry point
4. **No CORS** — API routes are same-origin only
5. **Cookie-based auth** — 7-day expiry, httpOnly, secure

---

## Cost Estimates (as of 2026)

| Platform | Free Tier | Paid Estimate |
|----------|-----------|---------------|
| Vercel + Turso | Yes | ~$0-5/mo (low traffic) |
| Fly.io | $5/mo credit | ~$5-10/mo (1 machine + volume) |
| Cloudflare Pages + D1 | Yes (generous) | ~$0-5/mo |

**Recommendation:** Start with Vercel + Turso for easiest setup, or Fly.io if SQLite file persistence is preferred.

---

## Data Backup & Persistence

### ⚠️ CRITICAL: Platform Storage Characteristics

| Platform | Filesystem | Data Persistence | Backup Strategy |
|----------|-----------|------------------|-----------------|
| **Vercel** | Ephemeral (serverless) | ❌ Lost on every deploy | Use Turso DB + export regularly |
| **Fly.io** | Persistent volumes | ✅ Survives deploys | SQLite on volume + export regularly |
| **Local Dev** | Normal filesystem | ✅ Persistent | data/guestflow.db + git (private only) |

### Backup Methods

#### 1. Local Development (SQLite)

```bash
# Export to JSON
cd apps/guestflow
npm run db:export > backups/backup-$(date +%Y%m%d).json

# Or specify output file
node scripts/export-data.js backups/backup-$(date +%Y%m%d).json
```

**What gets exported:**
- Tenants (properties, locations)
- Rate cards (pricing data)
- Inquiries (leads, guest requests)
- Bookings (confirmed reservations)
- Waitlist (if any)
- Invite codes (staff access)

**⚠️ NEVER commit actual guest data to public repos**

#### 2. Turso (Vercel Production)

```bash
# Dump entire database
turso db shell browns-guestflow .dump > backup-$(date +%Y%m%d).sql

# Export specific table
turso db shell browns-guestflow "SELECT * FROM rate_cards"

# Create snapshot (Turso paid tier)
turso db snapshot browns-guestflow
```

**Turso Free Tier Limits:**
- 9 GB total storage
- 1 database
- Backups: manual only (no automatic snapshots on free tier)

**Recommendation:** Export weekly to JSON using the export script

#### 3. Fly.io (SQLite on Volume)

```bash
# SSH into machine
fly ssh console

# Copy database file
cd /app/data
cat guestflow.db > /tmp/backup.db
fly ssh sftp get /tmp/backup.db ./backup-$(date +%Y%m%d).db

# Or run export script on the machine
fly ssh console
cd /app
node scripts/export-data.js > /tmp/backup.json
exit
fly ssh sftp get /tmp/backup.json ./backup-$(date +%Y%m%d).json
```

### Backup Schedule (Recommendation)

| Frequency | Method | Reason |
|-----------|--------|--------|
| **Weekly** | JSON export via script | Quick restore, human-readable |
| **Before deploy** | Full dump (Turso/SQLite) | Rollback safety |
| **Before rate changes** | Manual export | Audit trail |
| **Monthly** | Archive to secure storage | Long-term retention |

### Restore from Backup

#### From JSON Export

```bash
# 1. Initialize fresh database
npm run db:init

# 2. Manually insert data from JSON
# (No automatic restore script yet - restore manually via SQL or API)
```

#### From Turso Dump

```bash
turso db shell browns-guestflow < backup-20261205.sql
```

#### From SQLite File

```bash
# Replace current database
cp backup-20261205.db data/guestflow.db
```

### Data You Should Backup

✅ **Always backup:**
- Rate cards (pricing is business logic)
- Tenant/property configuration
- Booking history (for records)

⚠️ **Backup with care (contains PII):**
- Guest names, emails, phone numbers
- Inquiry details, special requests
- Store encrypted in private location only

❌ **Do NOT backup to public repos:**
- Any file containing actual guest data
- Staff passwords
- API keys or secrets

### Automated Backup (Optional)

Add to cron (localhost or Fly.io):

```bash
# Daily export at 2am SAST
0 2 * * * cd /path/to/apps/guestflow && npm run db:export > backups/auto-$(date +\%Y\%m\%d).json
```

---

## Grant's One-Time DNS Checklist

- [ ] Choose deployment platform (recommend Vercel + Turso)
- [ ] Deploy app and note final URL
- [ ] Add CNAME record: `guestflow` → deployment URL
- [ ] Wait 5-10 minutes for DNS propagation
- [ ] Verify `https://guestflow.thebrowns.co.za` loads
- [ ] Test staff login with `STAFF_PASSWORD`
- [ ] Share password with SA Ops team securely
- [ ] Document password in Browns password manager

---

---

## M3: SA Ops Runbook - One-Click Packs for CLI Tools

### Overview

GuestFlow M3 adds **"Generate Pack"** buttons to ops pages that produce downloadable packs for running browns-* CLI tools offline.

Each pack includes:
- All input files (JSON/CSV/text)
- Exact CLI command (copy-paste ready)
- APPROVAL.md with hard gate checklist
- RUN.sh script for terminal execution

### Quick Start (SA Ops)

1. **Visit ops page**: `https://guestflow.thebrowns.co.za/ops/inquiry-intake`
2. **Fill data or load fixture**
3. **Click "Generate Pack"**
4. **Click "Download Pack"** - saves multiple files prefixed with pack name
5. **Review APPROVAL.md** for hard gates (H7/H11/N7)
6. **Run CLI command** from `RUN.sh` or copy from UI

### Available Packs

| Ops Page | Pack Name Pattern | CLI Tool | Purpose |
|----------|-------------------|----------|---------|
| Inquiry Intake | `browns-inquiry-intake-*` | `tools/browns-inquiry-intake` | Extract structured data from inquiry text |
| Quote Draft | `browns-inquiry-quote-pipeline-*` | `tools/browns-inquiry-quote-pipeline-pack` | Orchestrate inquiry → quote pipeline |
| Welcome Drafts | `browns-welcome-late-pipeline-*` | `tools/browns-welcome-late-pipeline-pack` | Welcome messages + late check-in queue |
| CT Pack | `browns-ct-pack-pipeline-*` | `tools/browns-ct-pack-pipeline-pack` | Communication pack orchestrator |

### File Organization

Downloaded files use `packname__filename` format for easy organization:

```bash
# Downloaded files (example)
browns-inquiry-intake-20260905-143022__booking.json
browns-inquiry-intake-20260905-143022__quote.json
browns-inquiry-intake-20260905-143022__APPROVAL.md
browns-inquiry-intake-20260905-143022__manifest.json
browns-inquiry-intake-20260905-143022__README.md
browns-inquiry-intake-20260905-143022__RUN.sh

# Organize into folder
mkdir browns-inquiry-intake-20260905-143022
mv browns-inquiry-intake-20260905-143022__*.* browns-inquiry-intake-20260905-143022/

# Run CLI
cd tools/browns-inquiry-intake
npm run build
bash ../../browns-inquiry-intake-20260905-143022/RUN.sh
```

### CLI Commands Reference

All CLI tools are under `tools/browns-*` in the repository:

```bash
# 1. Inquiry Intake
cd tools/browns-inquiry-intake
npm run build
npm run intake -- --text inquiry.txt --outdir out/

# 2. Inquiry → Quote Pipeline
cd tools/browns-inquiry-quote-pipeline-pack
npm run build
npm run pack -- --inquiry intake-booking.json --outdir out/

# 3. Welcome & Late Check-In
cd tools/browns-welcome-late-pipeline-pack
npm run build
npm run pack -- --bookings bookings.json --day 2026-09-20 --outdir out/

# 4. CT Pack Pipeline
cd tools/browns-ct-pack-pipeline-pack
npm run build
npm run pipeline -- --date 2026-09-20 --pack pack/ --outdir out/
```

### Hard Gates (Always Respected)

Every pack includes `APPROVAL.md` with gate checklist:

- **H7 Gate** - `APPROVE SEND <thread-or-wa-id>` required for quote send
- **H11 Gate** - `APPROVE RUN SHEET <date>` required for staff WhatsApp
- **N7 Rule** - Never invent rates, phone numbers, Wi-Fi codes, or ETAs

**All output is DRAFT-ONLY** - Never auto-sends to guests.

### Workflow Example: Process Inquiry

```bash
# 1. SA Ops receives WhatsApp inquiry
# 2. Visit https://guestflow.thebrowns.co.za/ops/inquiry-intake
# 3. Paste inquiry text
# 4. Click "Generate Pack"
# 5. Click "Download Pack"
# 6. Review APPROVAL.md:
#    - Check extracted fields are accurate
#    - Verify no rates invented (should show [RATE CARD REQUIRED] if missing)
#    - Confirm H7 gate reminder present
# 7. Optional: Run CLI for advanced processing
#    cd tools/browns-inquiry-intake
#    npm run intake -- --text inquiry.txt --outdir out/
# 8. Use booking.json with downstream tools (welcome drafts, quote generation)
```

### Troubleshooting

**"Pack generation failed"**
- Check browser console for error details
- Verify all required fields are filled
- Try refreshing the page and re-generating

**"CLI command not found"**
- Ensure you're in the repository root
- Run `npm install` in the tool directory first
- Run `npm run build` before executing CLI

**"Missing fields in APPROVAL.md"**
- This is expected - fill manually from approved sources
- Never invent missing data
- Use rate cards for pricing, CoS for Wi-Fi/access details

### Support

For pack generation issues or CLI tool questions:
- Contact: grant@thebrowns.co.za
- Slack: #browns-ops (internal)

---

**Questions?** Contact grant@thebrowns.co.za
