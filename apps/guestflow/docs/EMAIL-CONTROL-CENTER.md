# Email Control Center

Human-gated guest email for Browns Dullstroom GuestFlow. **Never auto-send.** `staff_ops` daily brief stays copy-only.

## Env (already on Vercel Production — do not print values)

| Name | Used for |
| --- | --- |
| `RESEND_API_KEY` | Outbound Send + fetch inbound body |
| `RESEND_FROM_EMAIL` | From identity only (example: `noreply@guestflow.thebrowns.co.za`). Do not invent another From. |
| `CONTACT_RECIPIENT_EMAIL` | Public contact form only |
| `INBOUND_WEBHOOK_SECRET` | Fallback auth for `POST /api/inbound/email` |
| `RESEND_WEBHOOK_SECRET` | Preferred auth for inbound email (`Authorization: Bearer` or `x-webhook-secret`) |
| Turso `DATABASE_URL` + `TURSO_AUTH_TOKEN` | Threads + audit |

Documented empty in `.env.example`. Coding cannot create dashboard secrets.

## How Grant Sends at 07:00 America/Chicago

1. Open [Needs Approval](https://guestflow.thebrowns.co.za/needs-approval) or [Inbound queue](https://guestflow.thebrowns.co.za/ops/inbound-queue).
2. Open a **guest** thread (not Staff Ops Brief).
3. Choose **Email**. Edit To, Subject, Body.
4. Click **Send email** and confirm the dialog. Cancel leaves the draft.
5. Success shows a Resend message id. Failure stays fail-closed (not a WhatsApp/Twilio success).

Approve-only does **not** send. Cron does **not** send.

Morning E2E (Grant): send a test to `grant830318@gmail.com`. Confirm it arrives from the existing From address.

## Inbound path

`POST https://guestflow.thebrowns.co.za/api/inbound/email`

Accepts:

- Resend `email.received` metadata (body fetched via Receiving API), or
- Normalized `{ from, text, timestamp, source: "email", subject, externalMessageId }`

Creates/updates `inbound_threads` with `source: email` (or `email_forward`) and reuses the inbound classifier / draft queue.

## Resend dashboard steps Coding cannot do (NeedsGrant / CoS)

1. Confirm the receiving domain for GuestFlow inbound mail.
2. Add webhook URL: `https://guestflow.thebrowns.co.za/api/inbound/email`
3. Event: `email.received`
4. Send the webhook secret as `Authorization: Bearer $RESEND_WEBHOOK_SECRET` or `x-webhook-secret` (same value as env). Resend’s default Svix signature is optional follow-up; the coded gate is the shared secret header.
5. Point inbound routing at Production only. Do not use Preview.

If the webhook is missing, inbound email is still coded — mail will not appear until CoS/Grant paste the URL.

## Out of scope

- Auto-send
- Changing `staff_ops` to Send
- Twilio / SMS / number buy
