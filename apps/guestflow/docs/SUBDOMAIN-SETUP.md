# GuestFlow Subdomain Setup Guide

**For Grant (DNS Configuration in Afrihost)**

This guide documents how to set up custom subdomains for The Browns GuestFlow application.

---

## Recommended Subdomain Strategy

### Option 1: Guest-Facing Portal (Recommended)

**Subdomain:** `stay.thebrowns.co.za`  
**Purpose:** Guest portal access for viewing stay details  
**Example URL:** `https://stay.thebrowns.co.za/guest/12345`

**Why this is recommended:**
- Clean, guest-friendly URL
- Easy to communicate (e.g., "Visit stay.thebrowns.co.za and enter your booking reference")
- Matches hospitality industry standards (stay, reserve, book, etc.)
- Keeps staff ops on default Vercel URL (more secure)

### Option 2: Staff Ops Console

**Subdomain:** `guestflow.thebrowns.co.za`  
**Purpose:** Internal staff operations console  
**Example URL:** `https://guestflow.thebrowns.co.za/ops`

**Note:** This is less critical since staff can use the Vercel URL directly. Guest portal subdomain is higher priority.

---

## DNS Configuration Steps (Afrihost)

### Prerequisites

1. **Vercel Project:** `browns-guestflow` deployed and live
2. **Vercel Deployment URL:** (e.g., `browns-guestflow.vercel.app`)
3. **Domain:** `thebrowns.co.za` managed via Afrihost
4. **Access:** Afrihost account credentials

### Step 1: Get Vercel DNS Target

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Domains**
3. Click "Add Domain"
4. Enter `stay.thebrowns.co.za` (or `guestflow.thebrowns.co.za`)
5. Vercel will show you a DNS verification record

**Example:**
```
Type: CNAME
Name: stay
Value: cname.vercel-dns.com
```

**OR** Vercel may provide a specific target like:
```
Value: de076327b256488a.vercel-dns-017.com
```

### Step 2: Add CNAME Record in Afrihost

1. **Log in to Afrihost Client Zone**
   - URL: https://clientzone.afrihost.com/

2. **Navigate to DNS Management**
   - Find your domain: `thebrowns.co.za`
   - Click "Manage DNS" or "DNS Settings"

3. **Add New CNAME Record**
   ```
   Type: CNAME
   Host/Name: stay
   Points to/Value: cname.vercel-dns.com
   TTL: 3600 (or Auto)
   ```

   **OR** (if Vercel provided a specific target):
   ```
   Type: CNAME
   Host/Name: stay
   Points to/Value: de076327b256488a.vercel-dns-017.com
   TTL: 3600 (or Auto)
   ```

4. **Save Changes**
   - Click "Add Record" or "Save"
   - DNS changes may take 5-60 minutes to propagate

### Step 3: Verify in Vercel

1. Go back to Vercel project → Settings → Domains
2. Click "Verify" next to `stay.thebrowns.co.za`
3. If DNS has propagated, Vercel will confirm the domain is active
4. If not yet propagated, wait 5-10 minutes and try again

### Step 4: Enable HTTPS (Automatic)

Vercel automatically provisions a free SSL certificate (Let's Encrypt) for your custom domain. This usually takes 1-5 minutes after DNS verification.

Once complete:
- ✅ `https://stay.thebrowns.co.za` will work
- ✅ Auto-redirect from `http://` to `https://`

---

## Testing

### DNS Propagation Check

```bash
# Check if DNS has propagated
nslookup stay.thebrowns.co.za

# Expected output:
# stay.thebrowns.co.za
#   canonical name = cname.vercel-dns.com
#   ...
```

Or use online tools:
- https://dnschecker.org/
- https://www.whatsmydns.net/

### Test Guest Portal

1. Create a test booking in GuestFlow
2. Get the booking ID (e.g., `123`)
3. Visit `https://stay.thebrowns.co.za/guest/123`
4. Enter last name and verify portal loads

---

## Multiple Subdomains (Optional)

If you want both guest portal AND staff ops on custom subdomains:

### For Guest Portal:
```
Type: CNAME
Name: stay
Value: cname.vercel-dns.com
TTL: 3600
```

### For Staff Ops:
```
Type: CNAME
Name: guestflow
Value: cname.vercel-dns.com
TTL: 3600
```

Then add both domains in Vercel:
1. `stay.thebrowns.co.za`
2. `guestflow.thebrowns.co.za`

Vercel will handle routing to the same deployment.

---

## Troubleshooting

### "Domain not found" in Vercel

**Cause:** DNS hasn't propagated yet or CNAME is incorrect.

**Solution:**
- Wait 10-30 minutes for DNS propagation
- Verify CNAME record in Afrihost DNS settings
- Use `nslookup` to check DNS resolution

### "Invalid Configuration" in Vercel

**Cause:** CNAME is pointing to wrong target.

**Solution:**
- In Vercel, check the exact value they expect
- Copy-paste the value exactly (no extra spaces or periods)
- Update CNAME in Afrihost to match

### HTTPS Not Working

**Cause:** SSL certificate provisioning in progress.

**Solution:**
- Wait 5-10 minutes after DNS verification
- Vercel provisions SSL automatically
- Check Vercel dashboard for certificate status

### 404 Error After Setup

**Cause:** Domain is live but routes aren't working.

**Solution:**
- Verify deployment is live: `https://browns-guestflow.vercel.app/`
- Check Vercel logs for any routing issues
- Test root URL first: `https://stay.thebrowns.co.za/`
- Then test guest portal: `https://stay.thebrowns.co.za/guest/123`

---

## Maintenance

### Changing the Subdomain Later

If you want to change from `stay` to something else (e.g., `reserve`, `portal`):

1. Add new CNAME record in Afrihost
2. Add new domain in Vercel
3. Test new domain works
4. (Optional) Remove old CNAME record after migration

### Removing a Subdomain

1. Remove domain from Vercel project
2. Delete CNAME record from Afrihost DNS

---

## Summary

**Recommended Setup:**

| What | Subdomain | Example URL |
|------|-----------|-------------|
| **Guest Portal** | `stay.thebrowns.co.za` | `https://stay.thebrowns.co.za/guest/12345` |
| **Staff Ops** | (Use Vercel URL) | `https://browns-guestflow.vercel.app/ops` |

**Staff Ops can stay on Vercel URL** for security (no need for public subdomain).  
**Guest Portal benefits from branded subdomain** (looks more professional).

---

## Support

**Afrihost Support:** https://www.afrihost.com/support  
**Vercel Docs:** https://vercel.com/docs/concepts/projects/domains  
**GuestFlow Owner:** grant@thebrowns.co.za

---

**Next Steps After DNS Setup:**

1. Test guest portal with a real booking
2. Update welcome message templates to include `stay.thebrowns.co.za` URL
3. Print test portal link for guest verification
4. Add URL to property marketing materials (optional)
