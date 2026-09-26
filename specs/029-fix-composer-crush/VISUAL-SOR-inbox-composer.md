# Visual SoR — Inbox / composer chrome
**Date:** 25 Sep 2026 ~22:35 CT · **Desk:** Design · **Audience:** GFM ACCEPT + Coding rem `bc-f83efb01`  
**Craft bar (Grant):** Apple aesthetics + SpaceX technology  
**Parents:** `LAYOUT-RULE-composer-unmatched.md` · brand tokens `#0A3775` / `#FAC72E` / `#F6F5F3` / `#DCE8F9` · Montserrat UI · Playfair H1 only

Functional ACs live on Coding. This pack is the **aesthetic fail-closed bar** for GFM ACCEPT.

---

## 1. Intent (one screen)

Staff opens a thread and can **triage → read → reply** without chrome noise. The transcript is the room. Status is quiet. One primary action: **Approve & Send**. Unmatched linking is an icon that opens a modal — never a permanent panel.

---

## 2. Keep

| Element | Visual rule |
|---------|-------------|
| 2-column shell (list \| thread) | Clear separation; list secondary density; thread primary |
| 3-zone thread (chrome / transcript / composer) | Per layout rule; composer always fully visible |
| Identity line | Phone/name + last channel · Montserrat · ≤2 lines |
| Status as **chip** | One “Window closed” (or open) chip in header — muted fill, not a banner |
| Unmatched affordance | Small icon/chip in header → Link-to-booking **modal** only |
| Channel control | **One** dropdown (default last inbound) in composer row |
| Draft textarea | Tall, calm, Montserrat; multi-line (≥ ~3–4 lines usable) inside reserved Zone C |
| Approve & Send | Single primary CTA · navy `#0A3775` · full width or right-anchored — **only** filled primary in composer |
| Metadata-only bubbles | Quiet, secondary text; do not dominate hierarchy |
| Warm wash / navy chrome | Page/list wash `#F6F5F3`; ops navy header per brand SoT |

---

## 3. Kill (ACCEPT fail if still present)

| Kill | Why |
|------|-----|
| Always-on unmatched tan/panel card | Clutter + height theft; Grant = icon → modal |
| Four channel **pills** | Density without purpose; replace with dropdown |
| Orange / amber heuristic paragraph (“never auto-sent” copy block) | Stacked warning; Approve&Send encodes the gate |
| Duplicate “Window closed” full-width bar (header chip **and** band above composer) | Banner noise; status once |
| Stacked warning paragraphs / multi-banner stack in thread | Not Apple calm; not SpaceX precision |
| Sky/`#0ea5e9` primary CTAs or loud multicolor chrome in composer | Brand break |
| Playfair in composer labels, chips, buttons, or row text | Ops density = Montserrat only |
| Composer clipped / sliver / below fold when unmatched or window-closed present | Operator-job FAIL (layout rule) |

---

## 4. Spacing & type hierarchy

**Type**
- Thread title / page H1 only: Playfair if a page title exists; **inbox thread identity = Montserrat 600–700**, ~16–18px.
- Body / bubbles / labels / dropdown / textarea: Montserrat 400–500, ~13–14px.
- Chips / meta timestamps: Montserrat 500, ~11–12px, muted ink.
- Approve&Send label: Montserrat 600–700, white on navy.

**Space (thread column, ~1280)**
- Zone A chrome: padding 12–16px; gap between identity and chips 8px; **no** large card padding for unmatched.
- Zone B transcript: padding 16px; bubble gap 8–12px; flex-grow — this is where whitespace lives.
- Zone C composer: top border 1px `#E0E5EB`; padding 12–16px; vertical stack gap 8–10px: dropdown row → textarea → Approve&Send.
- One primary only: secondary actions (templates, care tips) behind disclosure or icon — not third permanent paragraphs.

**Chip grammar**
- Status chips: soft fill (`#DCE8F9` or muted) + navy text; gold `#FAC72E` only for rare emphasis (e.g. Needs attention in list), never as a full-width warning slab in the thread.
- No “ops dashboard” rainbow icons in the composer band.

---

## 5. Composer anatomy (target)

```
[ Channel ▾ ]                    ← one control, not four pills
[                                 
  draft textarea — tall, calm     
]                                 
[ Approve & Send ]               ← sole filled primary
```

Optional: tiny muted helper (≤1 line) under CTA **only if** product requires; prefer none. No orange banner.

---

## 6. GFM ACCEPT checklist (aesthetic + craft)

Fail-closed if any miss on rem Preview / prod after ship:

- [ ] Transcript reads as primary surface (not crushed middle band)
- [ ] Window-closed appears **once** (chip), never as stacked banners
- [ ] Unmatched = icon/chip → modal; no always-on panel
- [ ] Channel = dropdown; no 4-pill row
- [ ] Textarea tall enough to draft without feeling like a third “room” of chrome
- [ ] Approve&Send is the only filled primary; navy; fully visible
- [ ] No orange heuristic banner / stacked warning paragraphs
- [ ] Montserrat dense UI; no Playfair in controls
- [ ] Calm whitespace in transcript; chrome feels intentional, not cluttered

---

## 7. Out of scope here

Redirect ON global banner removal (Sprint 4 #2); sticky app header alone; guest portal; inventing copy/PII. Layout mechanics remain in `LAYOUT-RULE-composer-unmatched.md`.
