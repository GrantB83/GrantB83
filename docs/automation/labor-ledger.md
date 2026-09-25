# Labour ledger

Grant corrects the `actual_hours_before` column after a week of living with a phase. Agents must not invent precision.

| Phase | Ritual removed | Est. hours/week before | Est. hours/week after | Actual before (Grant) | Actual after (Grant) | Live since | Evidence artefact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GuestFlow delivery status + resend | Open Twilio/Resend consoles to guess delivery, then copy-paste the same reply | 1–2 (stay morning) | 0.2 in-thread Resend on Failed/stuck | | | 2026-09-25 coded | `apps/guestflow/docs/DELIVERY-STATUS.md` |
| GuestFlow Sprint 2 mobile inbox | Pinch-zoom / sideways-scroll the stay-morning inbox on a phone | 0.5–1 (stay morning, phone) | 0 — list/thread/approve on phone | | | 2026-09-25 coded | `specs/022-sprint2-mobile-inbox/` |
| GuestFlow staff users + Decision L | Share one staff password; redeploy to flip outbound redirect | 0.3–0.5 + lockout / redeploy | 0 (Users + header toggle) | | | 2026-09-25 coded | `apps/guestflow/docs/STAFF-USERS.md` |
| GuestFlow Sprint 2 data-fixes | Eyeball cancelled/BLOCK rows, guess Cottage vs Main House from suite names, and triage empty Inbox threads | 1–2 (stay morning) | 0.2 scan brief + exceptions | | | 2026-09-25 on main (#221) | Preview `/ops/daily-brief` + `/api/exceptions` |
| GuestFlow S2 contacts | Hunt NB / A&D / stay@ for phone+email; lose multi-room booker thread | 1–2 (stay morning) | 0.2 review missing/relay flags + staff/self-fill | | | 2026-09-25 coded | `apps/guestflow/docs/SPRINT2-CONTACTS.md` |
| GuestFlow UMI v2.1 | Rewrite the same guest reply in WA + Gmail + SMS, then hunt Needs Approval | 3–5 (stay morning) | 0.5 in-thread review + Approve&Send | | | 2026-09-24 coded | `apps/guestflow/docs/UMI-V21.md` |
| GuestFlow Phase 0 | Send because a draft body exists (staff cookie + body) | 0.5–1 risk/recovery | 0 (approve + one-time confirmToken) | | | 2026-09-20 coded | `apps/guestflow/docs/PHASE0-SAFETY.md` |
| GuestFlow P0/P1 | 07:00 copy guest reply into Gmail + paste WhatsApp Web | 3–5 (stay morning) | 0.5 review + confirm Send / clicker | | | 2026-09-20 coded | `apps/guestflow/docs/EMAIL-CONTROL-CENTER.md` |
| 1a | Scan mixed inbox for “what is this?” | 5–8 | 1 review of `Queue/NeedsGrant` | | | | `samples/email-dry-run.md` |
| 1b | Scroll WhatsApp to rebuild orders/quotes | 6–10 | 2 exception handoffs | | | | WA simulate log |
| 1d | Reconstruct SA day every Texas morning | 7–10 | 0.5–1 digest review | | | | `samples/daily-digest.md` |
| 1e | Ad-hoc “who is covering?” | 1 | 0 (rules + auto-ack drafts) | | | | SLA table in STATUS |
| 2 | Hunt for PDFs | 1–2 | 0.25 inbox sweep | | | | `samples/drive-inventory.md` |
| 3 | Categorise bank mail by eye | 2–4 | 0.5 exception list | | | | `samples/recon-exceptions.md` |
| 3b | Remember who owes what | 2–3 | 0.3 approve reminder batch | | | | `samples/aged-ar.md` |
| 3c | Month-end accountant scramble | 3–6 (monthly) | 0.5 pack review | | | | `samples/bookkeeper-pack.md` |
| 4 | Re-type WA/QR into stock/fulfilment | 3–5 | 1 exceptions + cash-up flags | | | | order fixture |
| 4b | Stock-take / returns / royalty from memory | 2 (monthly+) | 0.5 variance + draft royalty | | | | checklists |
| 5 | Write quotes and chase deposits by hand | 4–6 | 1 Liana review | | | | draft quote |
| 5b | HK / extras / OTA copy-paste | 2–4 | 0.5 run-sheet check | | | | stay-day sheet |
| 6 | Type the same quote questions | 2–3 | 0.5 price-card exceptions | | | | HM simulate |
| 6b | Phone the driver and argue volume | 1–2 | 0.3 POD exceptions | | | | POD template |
| 7 | Panic-search CIPC / deeds | 1–3 | 0.3 digest line items | | | | `compliance-register.yaml` |
| 7b | Rebuild forex/attorney packs | 2 per event | 0.5 checklist | | | | forex checklist |
| 8 | Ignore or late-reply to GBP | 0.5 | 0.1 approve drafts | | | | `samples/gbp-drafts.md` |
| 9 | Rebuild a month from chats | 2–3 (monthly) | 0.4 pack approve | | | | monthly template |
| 0-bots | Duplicate / misaligned Grok Bots + “which Google account?” | 1–2 | 0 after amend + all-account link | | | | `GROK-BOT-AMENDMENTS.md` |
| 10a | School/medical/bills in the business inbox | 2–4 | 0 (filters on the mailbox that receives AISD) | | | | `family-filters.yaml` |
| 10b | Read every AISD / portal email | (inside 2–4) | 0.15 family digest | | | | `samples/family-digest.md` |
| 10c | Copy school dates to calendar | 0.5 | 0 after `S11` | | | | Family calendar |
| 10d | Hunt bills / update Budget | 0.5–1 | 0.1 due list | | | | Budget totals |
| 11 | Voice-note staff each morning | 2–4 | 0.3 approve run-sheet | | | | `samples/run-sheet.md` |
| 12 | “I should follow up…” | 1–2 | 0.2 approve stale list | | | | `samples/stale-pipeline.md` |

Sum of **after** columns is the oversight budget. Target: **8–12 hours/week** combined Grant+Liana on owned-business admin once 1a, 1b, 1d, 3, 5, 6, 11 are live. Not a promise — a steering target.
