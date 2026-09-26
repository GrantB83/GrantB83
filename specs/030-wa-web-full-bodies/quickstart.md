# Quickstart: WA Web full bodies (Ship B)

## Prerequisites

- `apps/guestflow` Vitest
- No Production Turso writes from this package
- Locks stay: Redirect ON, Approve&Send human, From `+27600200825`

## Automated proof

```bash
cd apps/guestflow
npx vitest run src/lib/__tests__/wa-web-body.test.ts src/lib/__tests__/umi-threads.test.ts __tests__/inbound-webhook-whatsapp-web.test.ts __tests__/umi-wa-web-backfill.test.ts
```

Expected:

- Sentinel / empty WhatsApp Web observe does **not** insert `[metadata-only]` or `[body unavailable]`
- Backfill of a sentinel row updates that row in place; second pass is duplicate / replaced=0 new inserts
- Temp thread `guest_name` / inbox `bookerName` is the source display name when present
- Cloud + Web same guest line stays one row
- Phone-like “name” does not overwrite with an invented label

## Staff / QA job-script (S9)

MERGE HOLD until GFM ACCEPT **after** this script.

1. Open staff inbox on Prod (or Preview that shares the **same** Turso / same thread-28 rows).
2. Open `/?thread=28`. Read every inbound line. Record whether bodies are real guest wording or still sentinels (S10 **after**).
3. Open at least one peer WhatsApp Web temp. Read real text. Confirm unmatched title is the WhatsApp contact / push / chat name when the source has one; otherwise the number.
4. Inbox scan: count `whatsapp_web` inbound rows whose body is exactly `[metadata-only]` or `[body unavailable]` (S10 count). Record the number.
5. Phone (~390): same thread-28 / peer bodies readable in the thread view (no new chrome).
6. Confirm Redirect ON. Do not Approve&Send unless testing sinks.

## S10 evidence pack (required)

READY refuse if either capture is missing:

| Capture | What to attach |
| --- | --- |
| Thread 28 **before** | Prod `?thread=28` (or Preview of the same rows) showing sentinel bodies — kick 25 Sep: all `[metadata-only]` |
| Thread 28 **after** | Same URL after source-backed backfill / observe — real guest wording, or documented residual (no invent) |
| Inbox scan | Count of `whatsapp_web` messages whose `message_text` is exactly `[metadata-only]` or `[body unavailable]` |

## Residual (S3)

If WhatsApp Web has scrolled the bubble off history, GuestFlow leaves the row unrestored and documents it. Do not invent text.

## Ritual removed

Opening WhatsApp Web on the phone to learn what the guest actually said because the soft inbox only showed a sentinel.
