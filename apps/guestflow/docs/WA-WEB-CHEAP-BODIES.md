# WhatsApp Web cheap bodies (Sprint 6)

**Ritual this phase removes:** Opening WhatsApp Web (or waiting on a continuous vision scan) to read stay-thread wording that GuestFlow stored as `[body unavailable]` / `[metadata-only]`.

**Operator job:** Staff open Inbox in seconds, list sentinel stay threads cheaply, Refresh bodies on the current thread, and read real guest text when a one-shot/on-demand pull has source wording — without burning idle-day vision tokens.

## Locks (unchanged)

- Redirect ON
- Approve&Send human — no auto-send
- WhatsApp From `+27600200825`
- Do not invent bodies, names, rates, or codes
- Personal `+27836458313` stays observe-only (no Cloud convert)
- This package owns **API/storage only**. It does not drive WhatsApp Web Chrome.

## What GuestFlow now does

1. **API-first target list** (`GET /api/umi/wa-web/sentinels`): `whatsapp_web` inbound whose body is exactly `[body unavailable]` or `[metadata-only]` (open stays / last 14 days). Returns thread id + last4 / bookerName. **No vision.** `[observe-probe]` is not in this list.
2. **On-demand Refresh bodies** (`POST /api/umi/threads/:id/refresh-bodies`): staff button on the current thread. Persist real text via the existing Ship B (#246) `ingestInboundMessage` update-in-place path. Empty POST re-reads storage and reports remaining sentinels — it never invents text.
3. **Filtered hygiene:** when a body is recovered **and** the thread is booking-linked, clear Filtered unless the recovered text independently matches spam/marketing phrases (Anneri / thread 46 path).
4. **Going-forward hybrid (CoS observe hook):** daytime observe stays metadata / unread fingerprint. Capture **body only** when (a) an allowlisted chat shows unread, or (b) the sentinel list includes that chat. Do **not** run continuous `@every 5m` full 18–22 chat vision.

## Staff next actions

| State | Next action |
|-------|-------------|
| Sentinels remain after Refresh | Ask CoS for a one-shot observe on this chat. Do not invent text. |
| Bodies updated | Read the thread. Residual scrolled-off history may remain unrestored. |
| Refresh failed | Retry. If it fails again, CoS one-shot. Leave the sentinel. |

## Cap

On-demand persist accepts at most 10 source messages / extra thread ids per call.
