# GuestFlow UMI v2.1 — Coding brief

**SoR:** `specs/015-umi-chat-inbox/UMI-PRODUCT-SPEC-v2.1-2026-09-24.md` (Grant CLEAR 24 Sep 2026).

## Retention (CLEARED PROPOSAL-v3)

Guest contacts and comms: **5 years after last stay then delete**. Do not invent a different window.

## Non-negotiables

- No auto-send of guest WhatsApp, email, or SMS.
- `OUTBOUND_MODE=redirect` sinks until a separate go-live CLEAR.
- From stays `+27600200825`. Do not convert personal `+27836458313` to Cloud API.
- Fail-closed. Never invent guest PII, rates, ETAs, or access codes.
- Nightsbridge is booking SoR. UMI is comms SoR mirrored from bookings.
- No multi-tenant / retail. No new Twilio number buy.

## In-scope email inboxes (do not invent)

- `stay@thebrowns.co.za` (PROPERTY_EMAIL / guest ops)
- `stay@hospitality.partners`
- `grant@hospitality.partners`

`stay@thebrowns.co.za` outbound From flip remains pending domain verify. Use existing `RESEND_FROM_EMAIL`.

## Recorded §6 decisions

- Arriving sort window: check-in today or tomorrow SAST.
- Temp hygiene: nudge 48h; expire/close 14d (keep history).
- Spam fail-closed: store message, no auto-draft.
- SMS: same Twilio account/family as dedicated WA; `TWILIO_SMS_FROM` only if already set.

## Ritual this phase removes

Rewriting the same guest reply in WhatsApp + Gmail + SMS, then hunting a separate Needs Approval page.
