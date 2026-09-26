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

S10 **must** include all three. READY refuse if any is missing.

| Capture | Required |
| --- | --- |
| **Before** | Prod `/?thread=28` (or Preview of the **same** rows). Kick 25 Sep: all `[metadata-only]` |
| **After** | Same URL after source-backed backfill / observe — real guest wording, or documented residual (no invent) |
| **Inbox scan** | Count of `whatsapp_web` inbound whose body is exactly `[metadata-only]` or `[body unavailable]` |

Pack: `specs/030-wa-web-full-bodies/EVIDENCE.md`.

**Residual (S3):** If a bubble has scrolled off WhatsApp Web history, GuestFlow leaves the row unrestored and does not invent text. CoS Chrome may still be the observe reader; GuestFlow owns storage.

## QA job-script (S9)

**MERGE HOLD until GFM ACCEPT after this script.**

1. Open Prod (or Preview with the **same** data) `/?thread=28`. Read every inbound line.
2. Open peer WhatsApp Web temps. Read real text. Confirm unmatched titles = WhatsApp name when the source has one.
3. Record the `whatsapp_web` metadata-only inbox count into the evidence pack.
4. Phone thread view: same bodies readable. Redirect ON. Do not Approve&Send unless testing sinks.
