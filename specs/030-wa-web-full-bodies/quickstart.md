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

1. Open staff inbox on Preview (or Prod after Grant-gated backfill).
2. Open `/?thread=28` or a peer WhatsApp Web temp.
3. Transcript: every recovered line is real guest wording — not `[metadata-only]` / `[body unavailable]`.
4. Unmatched title: WhatsApp contact / push / chat name if the source has one; otherwise the number.
5. Phone (~390): same bodies readable in the thread view (no new chrome).
6. Confirm health / header: Redirect ON; do not Approve&Send unless testing sinks.

## Residual (S3)

If WhatsApp Web has scrolled the bubble off history, GuestFlow leaves the row unrestored and documents it. Do not invent text.

## Ritual removed

Opening WhatsApp Web on the phone to learn what the guest actually said because the soft inbox only showed a sentinel.
