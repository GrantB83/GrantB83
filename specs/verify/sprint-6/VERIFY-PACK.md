# VERIFY-PACK: GuestFlow Sprint 6

**Feature**: Inbox first page in seconds · WA Web cheap bodies · composer pop-out/tooltips · denser list chrome  
**Repo path**: `apps/guestflow`  
**Spec**: `specs/034-sprint6-inbox-composer/spec.md`  
**Grant CLEAR**: 26 Sep 2026 (GFM kick Execute Sprint 6)  
**PR**: [#251](https://github.com/GrantB83/GrantB83/pull/251) — MERGE HOLD until GFM Preview ACCEPT  
**Preview tip**: READY `https://browns-guestflow-git-cursor-spr-3c5329-grants-projects-db46fb3a.vercel.app` (SHA `4ffaacd`, `dpl_3tYRD2zCEhbbPMC7HeG2UrhHJK5e`)

## Operator job

Staff open Inbox and load threads in seconds, read real WhatsApp Web guest text on stay threads, and expand/edit drafts in a large composer with clear toolbar hints — without leaving GuestFlow or burning continuous WA vision tokens.

## Saleable DoD S1–S10

| ID | Check | Evidence pointer |
|----|--------|------------------|
| S1 | Operator job named | This pack + spec.md |
| S2 | Happy path: first page ≤3s warm; `limit` honored; thread 46-class sentinels readable after one-shot/on-demand; pop-out preserves draft; SoR tooltips; denser header + search clear of icon | Preview Inbox + `GET /api/umi/inbox?limit=10` vs `25`; thread 46; `/?fixture=1` pop-out |
| S3 | Skeleton then page; refresh failure leaves sentinel + next action; Esc restores compact | UI skeleton; POST refresh-bodies empty body |
| S4 | Desktop compact default; pop-out overlay; denser list; Approve&Send human-only in overlay | Preview ~1280×800 |
| S5 | Mobile sheet OK; denser list; tooltips via focus/`title`; inbox usable | Preview ~390 |
| S6 | Redirect ON; Approve&Send human; no auto-send; From +27600200825; no invent; no Cloud convert +27836458313 | Header banner + send path unchanged |
| S7 | Staff copy = state + next action; no sermons in list/transcript | Refresh bodies note; lean cards |
| S8 | Tooltip/title on four toolbar controls; pop-out focus trap + Esc; search not obscured | Composer hover/focus; `pl-10` / `padding-left: 40px` |
| S9 | Design #2–#4 + QA job-script before GFM ACCEPT | Rows below |
| S10 | Job evidence paths desktop ± phone under `sprint6-*` | QA fills `/workspace/guestflow-qa/2026-09-26/sprint6-*` |

## Standing locks

- Redirect **ON** (do not flip).
- Approve&Send **human**; confirmToken unchanged; **no auto-send**.
- WhatsApp From **+27600200825**.
- Do not invent PII / rates / codes / message bodies.
- Do not Cloud-convert personal **+27836458313**.
- CA does **not** drive WhatsApp Web Chrome.
- No `@every 5m` full vision cron.
- Template & Care accordion does **not** return.
- List chip-row does **not** return.

## Design GFM ACCEPT checklist (SoR #2–#4)

Fail-closed on Preview tip:

**#2 Pop-out**
- [ ] Pop-out = whole edit section in large overlay/sheet
- [ ] Same draft state round-trip (Esc/close)
- [ ] Approve&Send human-only visible in pop-out
- [ ] No Template & Care
- [ ] Focus trap + return focus
- [ ] CTAs clear; navy primary

**#3 Tooltips**
- [ ] Hover **and** focus show: Send channel / Templates / Attach file / Expand editor
- [ ] Attach title/tooltip is exactly **Attach file**
- [ ] NeedsGrant / no-upload is `aria-describedby` (or equivalent), **not** title/tooltip
- [ ] Attach remains focusable (`aria-disabled`, not native `disabled`) so keyboard focus shows **Attach file**
- [ ] No mystery icons on those four controls
- [ ] Copy ≤ ~3 words each

GFM + Design remedia 26 Sep: attach hover had concatenated NeedsGrant into the tooltip. Title/tooltip/aria-label stay **Attach file**. No-upload stays on `aria-describedby`. Focus uses the same four short strings.

**#4 List chrome**
- [ ] Denser list header; more threads above fold vs evidence `03` (desktop ~1280×800)
- [ ] Search text clear of magnifying glass (no clipped **S**)
- [ ] Needs attention kept; no chip-row return

**Craft**
- [ ] Sparse chrome; Montserrat; navy `#0A3775` CTAs
- [ ] No staff sermons in composer/list

## QA job-script (S9)

Run after Preview tip READY. MERGE HOLD until GFM ACCEPT.

| # | Job | Pass |
|---|-----|------|
| Q1 | Time warm `GET /api/umi/inbox?limit=25` (staff session). p95 ≤3s stretch ≤1.5s. Record TTFB + bytes. | [ ] |
| Q2 | Call `limit=10` and `limit=25`. Thread counts differ. `hasMore` / `nextCursor` present when corpus larger. | [ ] |
| Q3 | Inbox UI: skeleton then first page. `?thread=` still deep-links. | [ ] |
| Q4 | `GET /api/umi/wa-web/sentinels` includes thread **46** (or documented residual). last4/bookerName only. | [ ] |
| Q5 | Open `/?thread=46`. If sentinels remain, Refresh bodies → next action, **no invented text**. After CoS/Ship B one-shot, read real WA Web wording; Filtered cleared if booking-linked (msgs 248/252 class). | [ ] |
| Q6 | Composer: type draft, Expand editor, edit, Esc — identical draft/channel/template. Approve&Send visible in overlay. Do not send on Prod unless sinks. | [ ] |
| Q7 | Hover + keyboard focus: Send channel, Templates, **Attach file** only (no NeedsGrant essay), Expand editor. | [ ] |
| Q8 | List header two compact rows; type in search; **S** clear of glass; Needs attention works. | [ ] |
| Q9 | Phone ~390: pop-out is a sheet; list denser; inbox usable. | [ ] |
| Q10 | Redirect ON. No auto-send. From +27600200825. | [ ] |

## Re-run steps

```bash
cd apps/guestflow
npx vitest run __tests__/umi-inbox.test.ts __tests__/umi-wa-web-sentinels.test.ts __tests__/sprint6-inbox-ui.test.ts src/lib/__tests__/umi-threads.test.ts src/lib/__tests__/wa-web-body.test.ts
```

Preview (tip READY):

1. Open staff Inbox on `https://browns-guestflow-git-cursor-spr-3c5329-grants-projects-db46fb3a.vercel.app`. Confirm skeleton → first page in seconds.
2. `GET /api/umi/inbox?limit=10` vs `?limit=25` — counts change.
3. `GET /api/umi/wa-web/sentinels` — thread 46 class listed.
4. `/?thread=46` + Refresh bodies. Read real text only after source-backed pull.
5. `/?fixture=1` for pop-out / tooltips / denser chrome if Prod data is gated.

## Coding / GFM notes

- Ship B persist path remains `POST /api/umi/backfill/wa-web` (secret) and staff `POST /api/umi/threads/:id/refresh-bodies`.
- Residual scrolled-off WhatsApp Web history is acceptable when documented.
- Attach is `aria-disabled` (no upload SoR) and stays keyboard-focusable. Hover/focus/title/aria-label remain **Attach file** only. NeedsGrant lives on `aria-describedby`, not the tooltip.
- Do **not** merge this PR until GFM Preview ACCEPT.
