# VERIFY-PACK: GuestFlow Sprint 5

**Feature**: Lean inbox + WhatsApp composer + journey 4a–4g + timed Guest Portal  
**Repo path**: `apps/guestflow`  
**Spec**: `specs/033-sprint5-inbox-portal/spec.md`  
**Grant CLEAR**: 26 Sep 2026 ~11:37 CT (GFM)

## Operator job

Staff can triage a lean inbox and reply in a WhatsApp-style thread without clipped CTAs or Staff-mislabelled guest contacts; guests get a gated preferred-channel journey and a room-specific Guest Portal (security timed open/rescind) that replaces legacy thebrowns.co.za/checkin + /info URLs.

## Saleable DoD S1–S10

| ID | Check | Evidence |
|----|--------|----------|
| S1 | Y — operator job named | This pack + spec.md |
| S2 | (1) Guest phone/email + Save. (2) One history scroll + overlay composer; pending tap; no Template&Care. (3) No list chip row; header Day-of / Window closed / Details. (4) 4a–4g named + SAST + portal links; draft→Approve&Send. (5) Portal rooms + thebrowns links + local info; security 14:00–12:00; Wolery→Heritage Cottage; SSID The Browns Guests | Preview inbox + portal; `journey-config.ts`; `portal-security.ts` |
| S3 | Unmatched/window-closed composer usable; pre-security copy; missing mapping = staff gap | Fixture unmatched thread; portal pre-window copy; 4c `needs_attention` / `codes: property unresolved` on inbox only — guest `accessCodes.message` stays clock copy |
| S4 | Desktop list\|thread; history primary; CTAs above taskbar | ~1280×800 job-script |
| S5 | Phone ~390 list OR thread; composer usable; portal readable | ~390 job-script |
| S6 | Redirect ON; human Approve&Send; no auto-send; From +27600200825; no invent PII/codes; no +2783 convert | Locks below |
| S7 | Staff copy = state + next action; no sermons in list/transcript | List preview / arrival draft labels |
| S8 | Focus expands composer; chip/header labels; portal headings | `ThreadComposer` + portal `h2` |
| S9 | Design Y (#2+#3); QA job-script Y after tip | Design ACCEPT rows below |
| S10 | Desktop + phone + portal pre/during/post | Job-script |

## Standing locks

- Redirect **ON** (do not flip).
- **Approve&Send** human + confirmToken. No auto-send. Cron does not send.
- WhatsApp Cloud From **+27600200825**. Personal +2783… observe-only.
- Do not invent PII, rates, or access codes. Do not hardcode the Wi‑Fi password.
- No new Meta template submit.
- **MERGE HOLD** — Coding/GFM merge after GFM Preview ACCEPT.

## Re-run steps

```bash
cd apps/guestflow
npx vitest run src/lib/__tests__/portal-security.test.ts src/lib/__tests__/header-chips.test.ts src/lib/__tests__/room-catalog.test.ts src/lib/__tests__/journey-config.test.ts src/lib/__tests__/arrival-drafts.test.ts src/lib/__tests__/portal-clock-fixture.test.ts __tests__/sprint5-inbox-ui.test.ts
npx tsc --noEmit
```

Inbox: open Preview `/?fixture=1` then a live `/?thread=`.  
Portal clock fixtures (no Turso token; no invented codes/password). Preview host `https://browns-guestflow-git-cursor-gue-2909b8-grants-projects-db46fb3a.vercel.app`:

| Clock | Path | Expect |
|-------|------|--------|
| Step 7 pre-window | `/guest/fixture-pre` | Rooms + thebrowns.co.za link + local info; “Access codes appear on check-in day from 14:00.”; no SSID password |
| Step 8 in-window | `/guest/fixture-in` | SSID **The Browns Guests**; password row hidden (none stored); no invented gate/lockbox |
| Step 9 post-departure | `/guest/fixture-post` | Security rescinded copy; no password |

Same paths are listed under fixture Details → Guest portal clocks. Guest-facing draft may say wifi is in the portal; staff list/transcript must not say Approve&Send/Redirect.

## Design GFM ACCEPT checklist (from SoR)

**#2**

- [ ] No Template & Care accordion
- [ ] One scrollable history; composer is bottom overlay (not split pane)
- [ ] Pending bubble tap → loads draft in composer
- [ ] Toolbar: channel + templates + attach (icons)
- [ ] Approve&Send + secondary fully clear Windows taskbar (`06` class failure gone)
- [ ] Human Approve&Send only; Redirect sinks unchanged

**#3**

- [ ] List has **no** chip row; lean name / ARRIVING / room·dates / preview
- [ ] Header uses **one** chip language (soft pills + Details ghost)
- [ ] ≤3 status chips + Details; overflow for the rest
- [ ] No dual systems (list chips ≠ header chips)

**Craft**

- [ ] Apple-calm hierarchy; every control earns pixels
- [ ] Montserrat dense UI; navy primary only
- [ ] Transcript remains primary surface

## QA job-script (after tip READY)

| # | Step | Pass |
|---|------|------|
| 1 | Desktop ~1280×800, taskbar visible: open inbox list | No chip row; ARRIVING/IN HOUSE/DEPARTING only |
| 2 | Open a thread with a pending draft | History scrolls; composer overlay; no Template&Care |
| 3 | Tap pending bubble | Draft loads in expanded composer; no second modal |
| 4 | Confirm Approve & Send + Cancel | Fully clickable, ≥12px above taskbar |
| 5 | Open Details | Guest phone/email; Save persists; nothing sent |
| 6 | Phone ~390 | List OR thread; composer usable |
| 7 | Portal pre-window `/guest/fixture-pre` | Rooms + thebrowns link + local info; copy that codes appear check-in day; no password |
| 8 | Portal in-window `/guest/fixture-in` | SSID The Browns Guests; codes only if SoR has them (fixture: none) |
| 9 | Portal post 12:00 departure `/guest/fixture-post` | Security gone |
| 10 | Window-closed / unmatched | Composer still usable; templates icon for WA |

## Staff-copy bar

List and transcript show **state + next action** only (`Arrival draft Day-of`, `Draft ·`, `Window closed`). No Redirect/Approve&Send sermons in those surfaces. Policy stays on the confirm dialog.

## NeedsGrant (do not invent)

- Per-room gate/lockbox matrix if SoR row missing
- Attach upload backend
- Per-room thebrowns.co.za slugs (homepage used)
