# Research: Sprint 3 Sticky Header and Mobile Inbox Width

**Feature**: 027-sprint3-sticky-header-mobile
**Date**: September 25, 2026
**Phase**: 0 (Outline & Research)

## Overview

Resolve why staff chrome still scrolls away after #235, and why phone inbox content stays cramped, without regressing height floors or introducing a second scroll container.

---

## R1: Why the header still scrolls away

**Decision**: Pin banner + nav as one `position: fixed` stack (`[data-ops-chrome]`) at the viewport top. Stop treating nav as in-flow `sticky` while the banner remains in document flow.

**Rationale**:
- Current layout is `OutboundRedirectBanner` (in flow) then `Navigation` (`sticky top-0`) then `main.min-h-screen`. Inbox shell is `position: fixed` with `top: chromeOffset`.
- `main.min-h-screen` plus in-flow chrome makes the document taller than the viewport. On browsers that still allow root scroll (especially iOS), the banner leaves first; nav may stick; chrome offset is not remasured on scroll.
- `useInboxChromeOffset` uses `getBoundingClientRect().bottom` of `nav` and `[data-outbound-banner]` on resize/mutations only. If the page scrolls, bottoms change but the hook does not listen to scroll, so the fixed shell and the moving chrome disagree.
- A single fixed stack has a stable height. Measuring `offsetHeight` / `getBoundingClientRect().height` of that stack is the chrome offset. Inbox shell `top` equals that height once.

**Alternatives considered**:
- **Make banner `sticky top-0` and nav `sticky` below it**: Nested sticky is fragile; banner height varies (hidden when Redirect OFF); mobile menu expansion is messy.
- **Listen to scroll and update chromeOffset**: Treats the symptom. Outer scroll should not exist on `/`.
- **Put header inside `.inbox-shell`**: Couples ops chrome to inbox-only; other staff pages would lose the stack or need a fork.

**Best practices**:
- One attachment point (`position: fixed; top: 0; left: 0; right: 0; z-index: 50`).
- Measure the wrapper, not the sum of independently positioned children.
- Lock `html`/`body` overflow on the inbox route so panes are the only scrollers.

---

## R2: Do not double-count chrome height

**Decision**: Chrome height is applied only as `.inbox-shell { top: chromeOffset }`. Under inbox-lock, `main` MUST have `padding-top: 0`. Non-inbox staff pages use `padding-top: var(--ops-chrome-height)` so content is not hidden under the fixed stack.

**Rationale**:
- #235 `useShellDimensions` already does `shellHeight = viewport - chromeOffset - keyboardInset`.
- If `main` also gets padding equal to chrome height *and* the shell is inside main without being fixed, height is stolen twice and the 240px / 35% floor fails.
- The shell is already `position: fixed`, so main padding does not move it — but it can create extra document height and a new outer scroll. Inbox-lock removes that padding and `min-height: 100vh`.

**Alternatives considered**:
- **CSS `scroll-padding-top` only**: Does not keep chrome visible; only changes scroll snap.
- **Duplicate offset in `useShellDimensions`**: Explicitly forbidden by FR-002.

---

## R3: Phone usable width

**Decision**: Prefer CSS shell fixes. On `data-inbox-breakpoint="phone"`, reduce horizontal pane padding to 0.5rem and stack thread-header badges under the title/facts so the “box above” is full width. Keep desktop/tablet padding.

**Rationale**:
- Phone panes are already `absolute inset-0` inside a full-viewport shell. The cramped preview comes from inner padding (`p-3` / `px-4`) plus a shrink-0 badge column beside title/facts.
- Target: usable content ≥ 90% of shell width at 390px → ≥ 351px. 8px gutters each side = 374px (95.9%).
- Do not hide Approve&Send. Do not invent a new navigation pattern.

**Alternatives considered**:
- **Collapse composer chrome to free width**: Not needed for width; keep #235 keyboard collapse for height only.
- **Remove all padding**: Hurts tap targets and edge readability; 8px is necessary chrome.
- **Horizontal overflow / smaller type**: Violates the 16px / 44px Sprint 2 mobile contract.

---

## R4: Preserve #235 contracts

**Decision**: Keep `LIST_SCROLL_KEY`, independent pane overflow, `useShellDimensions` floors, and phone Back → `router.back()` + restore. Add tests that encode sticky measurement and phone width; do not rewrite #235 tests except where they assume in-flow sticky nav.

**Rationale**: Sprint 3 brief: #235 did height/scroll only. T/U must not treat that PR as done, and must not regress it.

**Alternatives considered**:
- **Recalculate floors against viewport instead of shell**: Would ignore chrome and look “taller” while overlapping the header.

---

## R5: Out of scope locks

**Decision**: No changes to outbound send, Redirect go-live, Ultra meter, `RESEND_FROM_EMAIL`, or WhatsApp From. No brand token restyle beyond sticky/width.

**Rationale**: Sprint 3 R and S are separate packages. Constitution IV freezes `+27600200825`.
