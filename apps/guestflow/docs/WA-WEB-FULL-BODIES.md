# WhatsApp Web full bodies + source names (Ship B)

**Ritual this phase removes:** Opening WhatsApp Web on the phone to learn what the guest actually said because the soft inbox only showed `[metadata-only]` / `[body unavailable]`.

**Operator job:** Open any WhatsApp Web thread (Prod `/?thread=28` or a peer temp) and read the real guest wording plus a real contact/display name on unmatched threads.

## Locks (unchanged)

- Redirect ON
- Approve&Send human — no auto-send
- WhatsApp From `+27600200825`
- Do not invent bodies or names
- Personal `+27836458313` stays observe-only

## What GuestFlow now does

1. Going-forward observe (`POST /api/inbound/webhook` `source=whatsapp_web`) stores the real `text` or **skips** the row. It does not write sentinels.
2. One-shot backfill (`POST /api/umi/backfill/wa-web`) updates existing WhatsApp Web sentinels **in place** when the source supplies real text. Replay does not duplicate.
3. Unmatched / temp title uses WhatsApp contact, push, or chat title when the source has one. Phone is the fallback only when the source has no name.
4. Cloud and Web copies of the same guest line stay one row.

## How to verify thread 28 (S10)

1. Staff session on Preview (or Prod after a Grant-gated source-backed backfill).
2. Open `/?thread=28`.
3. Transcript bodies are guest wording — not `[metadata-only]` / `[body unavailable]`.
4. If the thread is unmatched and WhatsApp Web shows a name, the title is that name.
5. Phone thread view: same bodies readable (no new chrome).
6. `/api/health`: Redirect still ON.

**Residual (S3):** If a bubble has scrolled off WhatsApp Web history, GuestFlow leaves it unrestored and does not invent text. CoS Chrome may still be the observe reader; GuestFlow owns storage.

## QA job-script (S9)

Open WhatsApp Web temps → read real bodies → confirm unmatched titles when a source name exists → do not Approve&Send unless testing sinks.
