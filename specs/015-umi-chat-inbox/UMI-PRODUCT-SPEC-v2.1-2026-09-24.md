# GuestFlow Unified Messaging Interface — Product Spec (v2.1)
**Date:** 24 Sep 2026  
**Owner:** GuestFlow Manager  
**Build desk:** Coding (after CLEAR)  
**Accountability:** CoS  
**Status:** Draft for Grant CLEAR as build SoR. Definition document only — no Coding until CLEAR.

## 1. Vision
WhatsApp-style chat inbox is staff’s primary home in GuestFlow. One conversation thread per booking is the communications source of record, seeded from Nightsbridge Arrivals & Departures. WhatsApp (Cloud API + personal WA Web observe), email, and SMS all land in that same thread. LLM drafts a reply on every inbound; staff review, edit, and Approve&Send. No auto-send.

## 2. Decisions locked (voice, 24 Sep 2026)

1. Phase-2 home/nav slim folds into this chat-first project (not a separate cleanup).
2. Auto-draft on every inbound, then hold for review / edit / Approve&Send. No auto-send.
3. Contact = booker. One thread per booking, tied to the booker. If one person books multiple rooms, communicate only with that booker about that room/stay.
4. Chat list sort: arriving guests first → pending replies → rest of inbox by most recent activity.
5. Unmatched inbound (unknown number or email): auto-create a temporary thread; staff link it to the correct booking once that booking exists in GuestFlow. Auto-expiry / nudge on stale temp threads (hygiene).
6. WhatsApp Web (personal phone): store full message bodies (not metadata-only). Backfill the last two weeks of pre-existing conversations into GuestFlow.
7. SMS from day one of chat UI launch (guests without WhatsApp or who prefer SMS). Twilio, same account / number family as the existing dedicated Twilio WhatsApp number. Every message shows a channel badge. Outbound defaults to the channel of the last inbound on that thread; staff can override.
8. Resend inbound email webhook: lift HOLD with this project; pull emails into the booking thread immediately. Tag at the top with source (email) and sender address.
9. Drafts live only inside each chat thread. No separate Needs Approval page. Lightweight needs-attention in-chat filter replaces that separate surface.

## 3. Product shape

### Home / navigation
- Chat inbox is the default staff landing.
- Phase-2 slim of busy home + top nav is in scope: Primary tools reachable; secondary / More Tools tucked.
- Remove dedicated Needs Approval route from nav/ops once drafts and needs-attention live in chat.

### Thread model
- One thread per booking (booker contact).
- Thread header: booker, suite/stay dates, booking id, last channel.
- Multi-room under one booker: one thread per booking line about that stay; do not fan out to co-guests unless staff later adds a contact (out of v2.1 launch unless expanded).

### Message timeline
- Single chronological history per thread.
- Every message tagged with channel badge (WhatsApp Cloud, WhatsApp Web observe, email, SMS) and direction (in/out).
- Email inbound: first lines of the bubble = source tag + sender address, then body.
- Drafts appear in-thread as editable, unsent blocks with Approve&Send (and confirmToken where already required).

### Compose / reply
- Default outbound channel = last inbound on that thread; staff may override.
- LLM pre-fills draft on inbound (after spam/marketing filter — see Upgrades); staff may edit fully before send.
- Approve&Send remains human-gated. Standing OUTBOUND_MODE=redirect / kill-switch rules stay until a separate go-live CLEAR.

### Inbox list sort
1. Arriving guests (check-in today / imminently — exact window to-verify; proposal today + tomorrow SAST).
2. Pending replies (inbound newer than last outbound, or open draft awaiting send).
3. Everyone else, most recent activity first.

### Needs-attention filter (in-chat, lightweight)
- In-inbox filter for threads that need staff action (open draft, unmatched temp, pending reply, etc.).
- Not a separate page or shortcut list outside chat.

### Unmatched / temp threads
- Unknown inbound → temp thread keyed by phone or email.
- Staff: “Link to booking” once NB ingest (or manual booking) exists; history merges; temp closes.
- Auto-draft still runs on temps (post spam filter); send still Approve&Send only.
- Auto-expiry / nudge for stale temps (thresholds to-verify in build).

## 4. Channels
- WhatsApp Cloud API From +27600200825: official outbound / inbound (existing).
- WhatsApp Web personal (+27836458313 observe): full bodies + two-week backfill; no Cloud API conversion of that number.
- Email (Resend): inbound webhook ON; pull in immediately; outbound Approve&Send (stay@ From when verified).
- SMS (Twilio): required day one; same Twilio account / number family as WA; channel badge on every message.

## 5. Upgrades (in scope for this build)
- Spam / marketing filter before auto-draft (do not burn LLM or clutter drafts on obvious junk).
- Temp-thread hygiene: auto-expiry and/or nudge when temps go stale without a booking link.
- WA Web / Cloud API dedup so the same guest message is not double-posted when both paths see it.
- Needs-attention in-chat filter replaces the separate Needs Approval page/surface.

## 6. Existing (live) vs to-verify

### EXISTING (live) — keep; do not regress
- Production https://guestflow.thebrowns.co.za (Vercel + Turso).
- Per-guest / per-thread messaging already in GuestFlow Comms.
- WhatsApp From +27600200825 / WABA online; Approve&Send + confirmToken.
- OUTBOUND_MODE=redirect pre-live sinks (WA +15124064300, email grant830318@gmail.com) until separate go-live CLEAR.
- Nightsbridge A&D ingest cadence 05:00 & 19:00 SAST into bookings SoR.
- WA Web observe bridge live (currently metadata-oriented; this spec upgrades to full bodies + backfill).
- Phase 1 Ultra batch draft pilot path (Approve&Send gated; no auto-send).
- Staff auth; ops hub Primary / More Tools (#206).
- Access-codes SoR, Arrivals/Departures ops page, portal magic links.
- Retention 5 years after last stay then delete — CLEARED elsewhere (PROPOSAL-v3); confirm in Coding build brief.

### TO VERIFY before / during build (not invented as done)
- Exact “imminent arrival” window for sort bucket 1 (proposal: today + tomorrow SAST).
- Stale temp-thread expiry / nudge thresholds.
- Spam/marketing filter rules and fail-closed behavior (what still reaches staff without a draft).
- WA Web full-body scrape + durable storage + two-week backfill feasibility and idempotency; WA Web ↔ Cloud API dedup keys.
- Twilio SMS sender number in the same account/family as the dedicated WA number (bots own Twilio Console; confirm MSIDN / messaging service).
- Resend inbound webhook wiring to Production + match into booking threads by sender / guest_contacts; confirm which inboxes are in scope at build time.
- stay@thebrowns.co.za Resend domain verify → outbound From flip (still pending).
- Phase 1 Ultra meter realign (no OPENAI_API_KEY) re-PASS before relying on auto-draft at volume.
- Temp → booking link UX and merge rules (duplicates, contact overwrite).
- Migrate welcome / late-check-in / inbound draft types fully into in-thread drafts + needs-attention filter (no stranded items when Needs Approval page drops).
- Redirect smoke to sinks still open; guest go-live remains a separate CLEAR.
- Confirm retention “5 years after last stay then delete” language in the Coding build brief (already CLEARED on the broader GuestFlow roadmap).

## 7. Non-negotiables (carry forward)
- No auto-send of guest WhatsApp, email, or SMS.
- Never invent guest PII, rates, ETAs, or access codes.
- Do not convert personal +27836458313 to Cloud API; outbound From stays +27600200825.
- Fail-closed: unknown codes / missing data → ask staff, don’t guess.
- Coding builds via Spec Kit / Cloud Agent only after Grant CLEARs this v2.1 as the build brief.
- CoS for fleet conflicts / NeedsGrant; GFM owns product acceptance gates.

## 8. Out of scope for this v2.1 launch
- Autonomous send without human Approve&Send.
- Multi-tenant / retail expansion.
- Replacing Nightsbridge as booking SoR (GF owns booking + comms mirror from NB export).
- Buying new Twilio numbers without CoS / Grant path (reuse existing family first).

## 9. Success criteria (acceptance)
- Staff land on chat inbox; can work a booking end-to-end without a Needs Approval page.
- Sort order: arriving → pending replies → most recent.
- Inbound WA Cloud, WA Web (full body), email (tagged, immediate), and SMS all appear on the correct booking thread (or temp → linkable), with channel badges.
- Spam/marketing filtered before auto-draft; drafts still Approve&Send only; redirect mode respected until go-live CLEAR.
- Temp hygiene (nudge/expiry) and WA Web/Cloud dedup working without dup storms.
- Two-week WA Web history backfilled once.
- Needs-attention in-chat filter covers former Needs Approval cases.
- Phase-2 nav slim shipped with the chat home (not deferred).

## 10. Ask
Reply CLEAR to authorize Coding to build from this as source of record. No Coding until CLEAR.
