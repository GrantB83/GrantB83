# Research: UMI v2.1

## 1. Thread identity — booking vs sender+source

**Decision**: Extend `inbound_threads` with `booking_id`, `thread_kind` (`booking` | `temp`), `guest_contact_id`, channel activity columns. Unique booking thread: one row per `booking_id` where `thread_kind='booking'`.

**Rationale**: Live threads are `from_number + source`, which splits one stay across WA/email/SMS. A parallel `umi_threads` table would dual-write with tickets, drafts, and send_jobs that already FK `inbound_threads.id`.

**Alternatives considered**: New `umi_threads` + mapping table (rejected: dual SoR). Thread-per-contact across bookings (rejected: SoR says one thread per booking line).

## 2. Matching inbound to a booking

**Decision**: Normalize phone (`normalizeZaE164`) and email (`normalizeEmail`). Match order: (1) existing open temp for that contact, if staff has not linked; (2) unique booking whose booker phone or email matches, preferring current/future stay (`check_in` today-or-later SAST, then most recent `check_in`); (3) else temp. Never pick when two current bookings match the same contact — create/reuse temp and require staff link.

**Rationale**: Fail-closed (Constitution II). Multi-room same booker is two booking lines; if both are current, staff must choose.

**Alternatives considered**: Always newest booking (rejected: can attach to the wrong stay). Always temp until staff links (rejected: too much busywork when the match is unique).

## 3. Arrival sort window

**Decision**: Bucket 1 = `bookings.check_in` date in [today, tomorrow] Africa/Johannesburg. Recorded in spec Clarifications.

**Rationale**: SoR proposal; voice lock “arriving first.”

**Alternatives considered**: Next 7 days (too wide). In-house only (misses tomorrow arrivals).

## 4. Temp hygiene

**Decision**: `expires_at = created + 14d`. Nudge when `now - created >= 48h` and still `thread_kind='temp'` and unlinked. Expiry sets `status='expired'` and `hygiene_status='expired'`; do not delete messages.

**Rationale**: SoR “auto-expiry / nudge”; 48h/14d is operationally visible without inventing guest facts.

**Alternatives considered**: 24h/7d (too aggressive for slow NB ingest). Soft-delete (loses evidence).

## 5. Spam / marketing before auto-draft

**Decision**: Expand heuristic spam/marketing (existing `SPAM_SIGNALS` + marketing phrases, link-only, prize/crypto). If classified spam/marketing OR confidence-as-spam high: persist message, `is_spam=1`, skip `generateDraftReply` and `enqueueDraftJob`. If unsure: persist, skip draft (fail-closed). Staff still see the bubble.

**Rationale**: SoR upgrade; do not burn LLM or clutter drafts. Constitution I+II.

**Alternatives considered**: Drop spam silently (rejected: staff must see it). Draft anyway (rejected: burns worker + clutter).

## 6. WA Web full body + backfill + Cloud dedup

**Decision**: Remove metadata-only overwrite in `POST /api/inbound/webhook` for `source=whatsapp_web`. Store `payload.text` when present; fall back to `[body unavailable]` only if empty (NOT NULL). Backfill: `POST /api/umi/backfill/wa-web` with `{ messages: [...] }` and `backfillWindowDays=14`, idempotent via `external_message_id` then `dedup_key`. Dedup key: `sha256(normalized_phone|normalized_body|bucketed_ts)` where `bucketed_ts` is message time floored to 120s. Also match Cloud `external_message_id` / WA `wamid` when provided in metadata.

**Rationale**: SoR upgrade from metadata-oriented observe. Two-week window is locked. Idempotency prevents dup storms on replay.

**Alternatives considered**: Keep metadata-only (violates SoR). Body-only dedup without time bucket (false merges).

## 7. Email HOLD lift and in-scope inboxes

**Decision**: Keep `POST /api/inbound/email` as the ingest path. Tag bubble with `source=email` + sender. Document in-scope inboxes only: `stay@thebrowns.co.za`, `stay@hospitality.partners`, `grant@hospitality.partners`. Do not invent addresses. `stay@` outbound From flip stays pending. Product HOLD language in EMAIL-CONTROL-CENTER.md is lifted; dashboard webhook paste remains NeedsGrant/CoS.

**Rationale**: Spec Clarifications; STATUS already names those hospitality logins. Coding cannot paste Resend dashboard secrets.

**Alternatives considered**: Invent `inbox@` / extra stay aliases (forbidden). Auto-configure Resend dashboard (out of agent capability).

## 8. SMS day one

**Decision**: Twilio form webhook already maps non-`whatsapp:` From to `twilio_sms`. Normalize channel to `sms`. Outbound SMS uses `TWILIO_SMS_FROM` if set, else same Messaging Service / number family as `TWILIO_WHATSAPP_FROM` with SMS (not `whatsapp:`) From. If neither is usable, inbound still stores; outbound SMS returns a clear error. No number purchase.

**Rationale**: SoR day-one SMS; Constitution IV.

**Alternatives considered**: New Twilio MSIDN (requires CoS/Grant). Hide SMS until number confirmed (violates day-one).

## 9. Needs Approval removal vs staff_ops

**Decision**: Remove from nav and ops primary. Keep `/needs-approval` page for `staff_ops` copy-only so existing copy-only test and H11 path do not regress. Guest welcome / late-check-in / inbound drafts project into the booking thread + needs-attention filter. Daily brief remains copy-only under More Tools.

**Rationale**: SoR drops the guest-approval surface, not the staff WhatsApp copy ritual.

**Alternatives considered**: Delete the page (strands staff_ops). Move staff_ops into chat (wrong: not a guest thread).

## 10. Home / nav slim

**Decision**: Replace staff `/` with the UMI inbox. Move old Today stats behind Ops / More if still useful. Top nav primary: Inbox (`/`), Arrivals & Departures, Bookings, Ops. Secondary: Exceptions, Inbound queue, Access codes, Daily brief, other packs under More on `/ops`. `/comms` redirects to `/`.

**Rationale**: Chat-first + Phase-2 slim in the same PR.

**Alternatives considered**: Keep Today as `/` and put inbox at `/comms` (violates “staff land on chat inbox”).

## 11. Schema migration style

**Decision**: `ensureUmiSchema(db)` additive ALTERs + indexes, called from inbox/ingest/send (Phase 0 pattern) plus `scripts/migrate-umi-v21.js` for explicit Turso apply after `APPROVE APPLY MIGRATION`.

**Rationale**: Preview/dev self-heals; Production apply stays gated.

**Alternatives considered**: Manual-only SQL (Preview would 500 until Grant). Destructive rebuild (regresses live threads).
