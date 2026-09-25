# Data Model: Sprint 3 Sticky Header and Mobile Inbox Width

**Feature**: 027-sprint3-sticky-header-mobile
**Date**: September 25, 2026
**Phase**: 1 (Design)

## Overview

No database entities. Runtime layout state only.

---

## OpsChromeStack

The authenticated staff chrome attached to the viewport top.

**Attributes**:
- `visible`: boolean — false on guest routes and `/staff-login`
- `bannerVisible`: boolean — false when Redirect is OFF
- `heightPx`: number ≥ 0 — measured height of `[data-ops-chrome]`
- `attachment`: `fixed-top` — single sticky/fixed stack

**Validation**:
- `heightPx` is the wrapper height, not `nav.bottom + banner.bottom`
- When `bannerVisible` is false, `heightPx` equals nav height only
- Mobile menu open increases `heightPx`; inbox shell `top` follows

**State transitions**:
- Route change to guest/login → stack unmounted, CSS variable cleared or unused
- Redirect OFF → banner omitted, height shrinks
- Resize / menu toggle → remasure

---

## InboxChromeOffset

Input to the #235 shell math.

**Attributes**:
- `chromeOffset`: number — equals `OpsChromeStack.heightPx`
- `keyboardInsetPx`: number — unchanged from #235
- `shellHeight`: `viewportHeight - chromeOffset - keyboardInsetPx`
- `minMessageHeight`: `max(240, round(shellHeight * 0.35))`
- `maxComposerHeight`: `round(shellHeight * 0.50)`

**Validation**:
- `chromeOffset` MUST be applied once (shell `top` only on `/`)
- Inbox `main` padding-top MUST be 0 while inbox-lock is active
- Double-count check: `shell.top === chromeOffset` and `main.paddingTop === 0`

---

## PhonePaneBox

Usable content geometry on `breakpoint === 'phone'`.

**Attributes**:
- `shellWidthPx`: inbox shell client width
- `contentWidthPx`: list preview / thread header / bubble content width
- `gutterPx`: necessary chrome (target 8px per side)
- `ratio`: `contentWidthPx / shellWidthPx` — MUST be ≥ 0.90 at ~390px

**Validation**:
- List header stack and list rows share the same horizontal gutter
- Thread header facts use full content width (badges wrap below, not a stolen column)
- Approve&Send remains in the composer; not collapsed away
