# GuestFlow Deployment Guide

## Production Host: guestflow.thebrowns.co.za

This is a **staff-only internal operations console**. Not a public site.

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

### Important: Vercel Project Configuration

When deploying from a monorepo, configure the Vercel project with:

- **Root Directory:** `apps/guestflow`
- **Build Command:** `npm run build` (default, no change needed)
- **Install Command:** `npm install` (default, no change needed)
- **Output Directory:** `.next` (default, no change needed)

The `vercel.json` in `apps/guestflow` already specifies the Next.js framework. If building from the monorepo root is preferred, ensure the build process changes into the app directory first.

### Step 1: Set Up Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create Browns database
turso db create browns-guestflow

# Get connection URL
turso db show browns-guestflow --url
# Copy this URL for VERCEL_DATABASE_URL

# Create auth token
turso db tokens create browns-guestflow
# Copy this token for VERCEL_DATABASE_AUTH_TOKEN
```

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
4. Visit `/crm` to verify it saved

### 4. Test CLI Export

1. Visit `/ops/daily-brief`
2. Click export
3. Verify markdown/HTML download works

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `STAFF_PASSWORD` | Yes (prod) | Password for staff access | `your-secure-password-here` |
| `DATABASE_URL` | Yes (Vercel) | Turso/Postgres connection string | `libsql://browns-guestflow-...` |
| `NODE_ENV` | Yes | Environment mode | `production` |

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

**Questions?** Contact grant@thebrowns.co.za
