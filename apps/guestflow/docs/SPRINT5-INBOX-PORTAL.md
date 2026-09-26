# Sprint 5 — Lean inbox, WhatsApp composer, journey, Guest Portal

**Ritual removed**: Chip-rainbow triage, Template&Care split composer that hid Approve&Send under the Windows taskbar, Staff-mislabelled guest contacts, and sending guests to thebrowns.co.za/checkin + /info for codes that were never in those PDFs.

**Artefact this week**: Preview `/?fixture=1` plus a live thread; Guest Portal clock fixtures `/guest/fixture-pre`, `/guest/fixture-in`, `/guest/fixture-post` (Preview/local only — Production 404).

## Staff inbox

- Booking & Contact: **Guest phone / Guest email**. Save `{ phone, email }`.
- List: name, ARRIVING|IN HOUSE|DEPARTING, room·dates, `Draft ·` preview. No chip row.
- Thread: Zone B history scroll; Zone C overlay composer (channel / templates / attach icons). Pending bubble tap loads the draft. Human Approve&Send only.
- Header: ≤3 soft chips + Details. Closed window = `Window closed`.

## Journey

Drafts only. See `docs/ARRIVAL-DRAFTS.md` and `src/lib/journey-config.ts`.

## Portal

- Rooms + https://www.thebrowns.co.za/ links. Wolery displays as Heritage Cottage.
- Local info from legacy welcome structure (no invented restaurant lists).
- Security (gate / lockbox / Wi‑Fi password) 14:00 SAST check-in day until 12:00 SAST departure.
- SSID in-window: **The Browns Guests**. Password from access-codes SoR only — never hardcoded.
- Missing mapping = staff gap (`codes: property unresolved` / code missing, ask staff).

## Locks

Redirect ON. No auto-send. From +27600200825. No +2783 convert. MERGE HOLD until GFM Preview ACCEPT.
