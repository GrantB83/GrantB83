# Contracts: Sprint 2 Contact Details

All write endpoints persist only. None send WhatsApp, email, or SMS.

## POST /api/cron/nightsbridge-ingest

Existing A&D upload. After this package:

- Persists `guest_email` on the booking
- Upserts `guest_contacts` when phone **or** email is present
- Sets `guest_email_kind` to `relay` when the address matches the relay list
- Merges rows that share a Nightsbridge booking id (rooms accumulate; contacts apply once)

Auth: `CRON_SECRET` (unchanged).

## POST /api/cron/nightsbridge-client-import

Client-report gap-fill.

Auth: `CRON_SECRET`.

Body: multipart `file` or JSON `{ fileBase64 }` (same pattern as A&D). Optional `dryRun=1`.

Response:

```json
{
  "success": true,
  "parsed": 0,
  "filled": 0,
  "skippedExisting": 0,
  "unmatched": 0,
  "dryRun": true
}
```

A field is filled only when the booking field is empty (or the stored rank is below `client_report`).

## POST /api/inbound/email

Existing Resend/stay@ inbound. After ingesting the message, if a unique booking match exists, apply sender email as `stay_at` subject to precedence. No new send.

## POST /api/ops/bookings/:id/contacts

Staff entry on the booking.

```json
{ "phone": "+27821234567", "email": "guest@example.com" }
```

Either field optional; at least one required. Validates; provenance `staff`. 400 on invalid. 404 if booking missing.

## POST /api/umi/threads/:id/contacts

Same body and rules. Resolves the thread's `booking_id`. 400 if the thread is not linked to a booking.

## POST /api/guest-portal/:code/contacts

Guest self-fill. Token is the credential (existing portal auth).

```json
{ "phone": "0821234567", "email": "guest@example.com" }
```

Provenance `guest`. Cannot overwrite A&D or staff. 400 on invalid. No send.

## GET /api/ops/arrivals-departures and GET /api/bookings

Include `guestEmail`, `guestEmailKind`, `guestPhoneSource`, `guestEmailSource` when columns exist. Never log raw phones in error handlers (existing rule).
