# GuestFlow Lead Actions - Enquiry to Booking Friction Reduction

## Overview

This feature reduces staff friction from inbound enquiry to bookable next step by providing quick actions on lead detail pages.

**Target users:** Browns staff managing guest inquiries  
**Scope:** Internal Browns Dullstroom operations only (not retail SaaS)

## Features

### 1. Enhanced Contact Form Storage
- Contact form submissions at `/api/public/contact` are now stored in the database as leads
- Staff can review and act on all web inquiries from the CRM interface

### 2. Lead Detail Page (`/crm/[id]`)

A comprehensive lead detail page with:

#### Contact Information Section
- Guest name, email, phone
- Inquiry source/channel
- Submission timestamp

#### Inquiry Details Section
- Property name
- Check-in/check-out dates (if provided)
- Subject and message content

#### Quick Actions Toolbar

Four one-click actions to reduce booking friction:

##### a) Copy WEBDIRECT Link
- **Purpose:** Instantly copy the Nightsbridge booking URL to clipboard
- **URL:** `https://book.nightsbridge.com/24299?promocode=WEBDIRECT`
- **Use case:** Paste into email replies, WhatsApp messages, or other communication channels
- **Feedback:** Button changes to "Copied!" for 2 seconds

##### b) Open Nightsbridge Portal
- **Purpose:** Deep link directly to Nightsbridge property 24299 dashboard
- **URL:** `https://app.nightsbridge.com/property/24299`
- **Use case:** Check availability, manage bookings, view calendar
- **Behavior:** Opens in new browser tab

##### c) Draft WhatsApp Message
- **Purpose:** Generate human-gated WhatsApp draft with guest details
- **Content includes:**
  - Personalized greeting with guest's first name
  - Check-in/check-out dates (if available)
  - WEBDIRECT booking link
  - Professional signature
- **Hard rules enforced:**
  - ✅ Name + dates + link ONLY
  - ❌ NO rates or pricing
  - ❌ NO inventory promises
  - ❌ NO auto-send (always draft/human-gated)
- **Use case:** Copy draft and paste into WhatsApp Web/app for manual review and sending

##### d) Status Update Dropdown
- **Purpose:** Track lead progress through sales funnel
- **Available statuses:**
  - `new` - Initial inquiry, not yet contacted
  - `contacted` - Staff has reached out to guest
  - `qualified` - Guest has confirmed interest and dates
  - `won` - Booking confirmed
  - `lost` - Guest declined or went elsewhere
  - `converted` - Guest completed booking via WEBDIRECT
- **Behavior:** Auto-saves on selection

#### Notes Section
- Add timestamped internal notes about guest communications
- View history of all staff notes on this lead
- Use case: Track follow-ups, special requests, conversation history

### 3. Enhanced CRM Table
- All rows in `/crm` are now clickable
- Click any lead to jump to detail page
- Visual hover states for better UX

## Technical Implementation

### Database Changes

Migration script: `scripts/migrate-add-lead-dates.js`

Added columns to `waitlist` table:
- `check_in` (DATE) - Guest's requested check-in date
- `check_out` (DATE) - Guest's requested check-out date
- `message` (TEXT) - Full inquiry message body
- `subject` (TEXT) - Email subject line

Run migration:
```bash
npm run db:migrate:lead-dates
```

### API Endpoints

#### `GET /api/leads/[id]/whatsapp-draft`
Generates human-gated WhatsApp draft message.

**Response:**
```json
{
  "draft": "Hi Sarah,\n\nThank you for your inquiry about The Browns Dullstroom.\n\n📅 Dates: 15 Dec 2026 - 17 Dec 2026\n\nYou can check availability and book directly here:\nhttps://book.nightsbridge.com/24299?promocode=WEBDIRECT\n\nPlease let me know if you have any questions!\n\nBest regards,\nThe Browns Team"
}
```

**Rules:**
- NO rates or amounts (never invented)
- Dates formatted as "DD Mon YYYY" in South African locale
- Always includes WEBDIRECT link
- Friendly, professional tone
- No promises about availability (link is for guest to check themselves)

#### `PATCH /api/leads/[id]`
Update lead status (existing endpoint, no changes).

#### `POST /api/leads/notes`
Add note to lead (existing endpoint, no changes).

#### `GET /api/leads/notes?lead_id={id}&tenant_id={tid}`
Fetch notes for lead (existing endpoint, no changes).

### Pages

#### `/crm` - Lead List (Enhanced)
- Shows all leads from `waitlist` table
- Click row to navigate to detail page
- Displays: name, email, property, check-in date, submission date, status

#### `/crm/[id]` - Lead Detail (New)
- Full lead information with all fields
- Quick actions toolbar
- Notes management
- Status updates

## Usage Workflow

### Typical Staff Flow:

1. **Guest submits contact form** on www.thebrowns.co.za
   - Form posts to `/api/public/contact`
   - Email notification sent via Resend
   - Lead stored in database

2. **Staff opens CRM** at `/crm`
   - Views list of all inquiries
   - Identifies new leads by status badge

3. **Staff clicks on lead** to open detail page
   - Reviews guest information and message
   - Checks requested dates (if provided)

4. **Staff takes action:**

   **Option A: Send WhatsApp Response**
   - Click "Draft WhatsApp"
   - Review generated message
   - Click "Copy Draft"
   - Open WhatsApp Web/app
   - Paste and send after human review

   **Option B: Send Email Response**
   - Click "Copy WEBDIRECT Link"
   - Compose email manually
   - Paste link in email body
   - Send

   **Option C: Check Nightsbridge Availability**
   - Click "Open Nightsbridge"
   - Check calendar for requested dates
   - Return to lead page
   - Proceed with Option A or B

5. **Staff updates status** to "Contacted"
   - Select from dropdown
   - Auto-saves

6. **Staff adds follow-up note** (optional)
   - Example: "WhatsApp sent, awaiting guest response"
   - Click "Save Note"

7. **Guest books via WEBDIRECT link**
   - Staff updates status to "Converted"

## Hard Rules & Safety Gates

### Never Auto-Send
- All WhatsApp drafts are **draft only**
- Staff must manually copy, review, and send
- No automated messaging to guests

### Never Invent Data
- No rates or pricing in drafts (rates come from Nightsbridge)
- No availability promises (link directs guest to check themselves)
- No phone numbers or ETAs invented

### Human-Gated Only
- All guest communications require staff review
- Status updates are manual only
- Notes are internal and never sent to guests

### Browns Internal Only
- Single-tenant scope (tenant_id=1, The Browns)
- Not a retail SaaS product
- Dullstroom operations only

## Testing

### Manual Testing Checklist

1. ✅ Contact form submission creates lead in database
2. ✅ Lead appears in CRM table
3. ✅ Clicking lead opens detail page
4. ✅ "Copy WEBDIRECT Link" copies correct URL to clipboard
5. ✅ "Open Nightsbridge" opens property 24299 portal in new tab
6. ✅ "Draft WhatsApp" generates message with:
   - ✅ Guest first name
   - ✅ Dates (if available)
   - ✅ WEBDIRECT link
   - ✅ NO rates
7. ✅ Status dropdown updates and saves
8. ✅ Notes can be added and appear with timestamps
9. ✅ All dates display in correct format

### Automated Tests

Run existing tests:
```bash
npm test
```

To add: Unit tests for WhatsApp draft generation logic.

## Success Metrics

**Goal:** Measurably shorten staff path from inbound enquiry to bookable next step

**Metrics to track:**
- Average time from inquiry submission to first response (target: < 2 hours)
- Number of WEBDIRECT links copied per day
- Conversion rate from "Contacted" to "Converted" status
- Staff feedback on time saved per inquiry

## Future Enhancements (Out of Scope for This PR)

- Email template generation (similar to WhatsApp drafts)
- Bulk status updates for multiple leads
- Integration with existing inquiry-quote-pipeline packs
- SMS draft generation
- Automatic status updates based on booking creation

## Related Files

- `/apps/guestflow/src/app/crm/[id]/page.tsx` - Lead detail page component
- `/apps/guestflow/src/app/api/leads/[id]/whatsapp-draft/route.ts` - WhatsApp draft generator
- `/apps/guestflow/src/app/api/public/contact/route.ts` - Contact form handler (updated)
- `/apps/guestflow/scripts/migrate-add-lead-dates.js` - Database migration
- `/apps/guestflow/docs/LEAD-ACTIONS.md` - This documentation

## References

- AGENTS.md hard rules (no invented rates, human-gated messaging)
- BUSINESS-REQUIREMENTS.md §3.2 (hospitality friction reduction)
- Nightsbridge property 24299 (The Browns Dullstroom)
- PR #2 (WhatsApp Cloud API, knowledge-grounded messaging patterns)
