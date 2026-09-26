# S10 evidence pack — WA Web full bodies (Ship B)

**MERGE HOLD until GFM ACCEPT after QA job-script.**  
No invent. Same data on Prod or Preview (do not mix different databases).

## Thread 28 before (captured)

| Field | Value |
| --- | --- |
| Surface | Prod `/?thread=28` |
| Date | 2026-09-25 (Grant CLEAR / kick brief) |
| Bodies | **All** inbound lines `[metadata-only]` |
| Inbox preview | `[body unavailable]` on WA Web temps |
| Source | Kick: `KICK-wa-web-full-bodies-replace-metadata.md` + Sprint 4 #4 queued brief |

Do not invent replacement text here.

## Thread 28 after (QA fills)

| Field | Value |
| --- | --- |
| Surface | Prod `/?thread=28` **or** Preview of the **same** Turso rows |
| Date | _pending QA job-script_ |
| Bodies | _real guest wording / residual documented / still sentinel_ |
| Unmatched title | _WA contact/push/chat name, or phone if source has no name_ |
| Residual | _only if WA Web history scrolled off — no invent_ |

## Inbox scan — `whatsapp_web` metadata-only count

Count inbound rows where `channel = 'whatsapp_web'` and `message_text` is exactly `[metadata-only]` or `[body unavailable]`.

| When | Count | How |
| --- | --- | --- |
| Before (kick) | _not counted in kick; thread 28 = all sentinel. Full inbox count pending QA scan_ | Staff inbox / authenticated `GET /api/umi/threads` + thread detail bodies |
| After (QA) | _pending_ | Same scan after source-backed backfill |

**Scan method (read-only, no invent):** staff session → list WhatsApp Web threads → open each (or thread 28 + peers) → tally sentinel bodies. Optional Turso read (Grant): `inbound_messages` where `channel = 'whatsapp_web'` and body in the two sentinels.

## S9 QA job-script (must run before GFM ACCEPT)

1. Open `?thread=28` — read real text (or record residual).
2. Open peer WA Web temps — read real text + names when the source has them.
3. Record the metadata-only count above.
4. Locks: Redirect ON; no Approve&Send unless testing sinks.

## Out of scope

Composer / `#245`; Redirect flip; Cloud API conversion of `+27836458313`.
