# GuestFlow Staff Runbook — SA Ops

**Version:** M4 (2026-12)  
**Audience:** Browns Dullstroom operations staff  
**Purpose:** Daily operational guide for the internal ops console

---

## 🔐 Access & Login

### Production URL

**Live site:** https://browns-guestflow.vercel.app/  
**Custom domain (when DNS ready):** https://guestflow.thebrowns.co.za

### Staff Login

1. Visit the URL above
2. You'll be automatically redirected to `/staff-login`
3. Enter the staff password (contact Grant for access)
4. Click **Login**
5. You're now at the Browns Ops Hub

**Password Notes:**
- Staff password is shared among Browns SA Ops team only
- Never share publicly or post in unsecure channels
- Contact Grant if you need the password reset

### Subdomain DNS (Grant-Only Task)

⚠️ **Grant must configure this once in Afrihost DNS:**

```
Type: CNAME
Name: guestflow
Value: de076327b256488a.vercel-dns-017.com
TTL: 3600 (or Auto)
```

**Result:** `guestflow.thebrowns.co.za` will point to the live app

**Status:** Pending as of M4 — Grant has the CNAME value documented

---

## 🏠 Ops Hub Overview

After login, you land on the **Browns Ops Hub** — your daily dashboard.

### Quick Access Pages

| Page | Purpose | CLI Tool Integration |
|------|---------|---------------------|
| **Inquiry Intake** | Extract booking fields from email/WhatsApp | `browns-inquiry-intake` |
| **Quote Draft** | Generate quotes from inquiries + rate cards | `browns-quote-invoice-draft` |
| **Welcome Drafts** | Draft welcome messages for arrivals | `browns-welcome-draft-pack` |
| **Late Check-In Queue** | Track after-hours arrivals | `browns-late-checkin-queue` |
| **Daily Brief** | Morning ops brief (RED/AMBER/GREEN) | `browns-daily-ops-brief` |
| **NightsBridge Import** | Parse NightsBridge CSV bookings | `browns-nightsbridge-bookings-adapter` |
| **Booking Change Check** | Detect last-minute booking changes | `browns-booking-change-check` |
| **CT Pack** | Communication pack for upcoming stays | `browns-ct-pack` |
| **Rate Card Upload** | Manage property pricing | (internal only) |

---

## 📋 Daily Workflow

### Morning Routine

1. **Login** to Browns Ops Hub
2. Visit **Daily Brief** (`/ops/daily-brief`)
   - Review **RED** items first (urgent, SLA broken)
   - Then **AMBER** (needs action today)
   - **GREEN** items are on track
3. Check **Late Check-In Queue** for after-hours arrivals
4. Process new inquiries via **Inquiry Intake**

### Processing an Inquiry

1. Copy inquiry text from email or WhatsApp
2. Go to **Inquiry Intake** page (`/ops/inquiry-intake`)
3. Paste inquiry text
4. Click **Extract Data**
5. Review extracted fields (dates, guests, property)
6. Click **Export Pack** to download JSON
7. Save inquiry to database

### Generating a Quote

1. Go to **Quote Draft** page (`/ops/quote-draft`)
2. Select saved inquiry or enter booking details
3. Ensure rate cards are uploaded (`/ops/rate-cards`)
4. Click **Generate Quote**
5. Review draft output (HTML or markdown)
6. Click **Export** to download
7. **APPROVE MANUALLY** before sending to guest

### Welcome Messages (Same-Day Arrivals)

1. Go to **Welcome Drafts** page (`/ops/welcome-drafts`)
2. System shows upcoming arrivals (today/tomorrow)
3. Click **Generate Pack**
4. Download welcome message drafts
5. **APPROVE MANUALLY** before posting to WhatsApp

---

## 🔧 CLI Tool Integration

Each ops page exports **packs** (JSON/markdown files) that match CLI tool formats.

### If browns-* CLI Tools Exist

When a CLI tool is available (e.g., `tools/browns-inquiry-intake/`):

```bash
# Example: Run inquiry intake
node tools/browns-inquiry-intake/dist/index.js --input inquiry.json

# Example: Generate quote
node tools/browns-quote-invoice-draft/dist/index.js --booking booking.json --rates rates.csv

# Example: Daily brief
node tools/browns-daily-ops-brief/dist/index.js --date 2026-12-15
```

### If CLI Tools Don't Exist Yet

The ops pages still export the **expected format** so you can:
1. Download the pack
2. Review it manually
3. Copy/paste relevant parts for guest communication
4. Wait for CLI tools to be built later

---

## ⚠️ Hard Gates — What You MUST NOT Do

### ❌ NEVER Auto-Send

**All output is DRAFT-ONLY**

- GuestFlow does NOT send emails automatically
- GuestFlow does NOT send WhatsApp messages automatically
- Every quote, welcome message, and communication **requires manual approval**

### ❌ NEVER Invent Data

If the system shows:
- `[RATE CARD REQUIRED]` — Do NOT guess a price
- `[PHONE NUMBER MISSING]` — Do NOT make up a number
- `[UNKNOWN ETA]` — Do NOT invent an arrival time

**Action:** Contact Grant or property manager to get the real data

### ❌ NEVER Bypass Approval Banners

Every draft export shows an **approval banner** in the UI:

> ⚠️ DRAFT ONLY — Requires approval before sending

**This means:** Review → Approve → Then Send Manually

### ❌ NEVER Share Staff Password Publicly

- Password is for Browns staff only
- Don't post in public channels
- Don't email without encryption
- Use secure password manager or Signal/WhatsApp direct message

### ❌ NEVER Commit Guest Data to Public Repos

- GuestFlow stores data in SQLite locally
- Backups may contain guest names, emails, phone numbers
- Only store backups in **private, secure locations**
- Never push `data/guestflow.db` to GitHub public repos

---

## 💾 Data & Backups

### Where Data Lives

| Environment | Storage | Persistence |
|-------------|---------|-------------|
| **Production (Vercel)** | Turso DB (cloud SQLite) | Permanent until deleted |
| **Local Development** | SQLite file (`data/guestflow.db`) | Permanent on your machine |

### Backing Up Data

**Weekly Backup (Recommended):**

```bash
# From apps/guestflow directory
npm run db:export > backups/backup-$(date +%Y%m%d).json
```

**What gets backed up:**
- Tenants (Browns properties)
- Rate cards (pricing data)
- Inquiries (guest requests)
- Bookings (confirmed reservations)

**Optional:** Grant can set up weekly Turso dumps via CLI (see DEPLOY.md)

---

## 🔍 Troubleshooting

### "Invalid password" on login

- Double-check password (case-sensitive)
- Check for trailing spaces
- Contact Grant if you think password changed

### Page won't load or shows error

- Check internet connection
- Try refreshing (Ctrl+R or Cmd+R)
- Clear browser cache
- Try different browser
- Contact Grant if problem persists

### Data not saving after inquiry intake

- Verify you clicked "Save to Database"
- Check that you're logged in (session may have expired)
- Try logging out and back in

### Rate card missing for quote

- Go to `/ops/rate-cards`
- Upload Browns property rate cards (CSV/JSON)
- Try generating quote again

### Export/download not working

- Check browser popup blocker settings
- Try right-click → "Save Link As"
- Use different browser

---

## 📞 Support & Contact

**Owner:** Grant Brown  
**Email:** grant@thebrowns.co.za  
**Property:** The Browns Luxury Guest Suites, Dullstroom

**For Issues:**
1. Check this runbook first
2. Check DEPLOY.md for technical details
3. Contact Grant via WhatsApp or email

---

## 📚 Additional Resources

- **README.md** — Technical overview and feature list
- **DEPLOY.md** — Deployment guide, backups, DNS setup
- **Ops Hub** — All tools accessible from https://browns-guestflow.vercel.app/ops

---

**Last Updated:** M4 (2026-12) — Final harden phase
