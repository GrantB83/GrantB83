# Component Contracts: Sprint 3 Sticky Header and Mobile Inbox Width

**Feature**: 027-sprint3-sticky-header-mobile
**Date**: September 25, 2026
**Phase**: 1 (Design)

## StaffChrome

**File**: `apps/guestflow/src/components/StaffChrome.tsx`

**Purpose**: Fixed viewport attachment for staff banner + nav.

**Contract**:
- Root has `data-ops-chrome`
- `position: fixed; top: 0; left: 0; right: 0; z-index: 50`
- Sets `--ops-chrome-height` on `document.documentElement` from measured height
- Remeasures on resize and child size changes (banner hide, mobile menu)
- Children: `OutboundRedirectBanner` then `Navigation`
- Not rendered on guest routes or `/staff-login`

## useInboxChromeOffset

**File**: `apps/guestflow/src/components/inbox/useInboxChromeOffset.ts`

**Contract**:
- Prefer `[data-ops-chrome]` height
- Fallback: max bottom of `nav` and `[data-outbound-banner]` only if wrapper is absent
- Return value is the single chrome offset used by `InboxLayoutShell` and `useShellDimensions`
- MUST NOT add nav height on top of wrapper height

## InboxLayoutShell

**File**: `apps/guestflow/src/components/inbox/InboxLayoutShell.tsx`

**Unchanged props** from #235. Additional behaviour:
- `style.top === chromeOffset`
- Phone panes remain `absolute inset-0` and `width: 100%` of the shell
- No extra horizontal max-width on phone

## ThreadLayoutShell

**File**: `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx`

**Additional behaviour**:
- Phone: thread header facts/title occupy full content width; badges wrap
- Phone: horizontal padding uses the phone gutter token (0.5rem)
- Messages area keeps `flex-1 overflow-y-auto min-h-0` and `minMessageHeight`
- Composer keeps Approve&Send; `maxComposerHeight` still applied off-phone

## Inbox page lock

**File**: `apps/guestflow/src/app/page.tsx`

**Contract**:
- While mounted, `html` and `body` receive `inbox-lock` and `overflow: hidden`
- `LIST_SCROLL_KEY` remember/restore unchanged
- Approve&Send + `confirmToken` sequence unchanged
- Phone list header/rows use the phone gutter classes

## CSS tokens

**File**: `apps/guestflow/src/app/globals.css`

| Token / class | Rule |
| --- | --- |
| `.ops-chrome` | fixed top stack |
| `--ops-chrome-height` | measured px |
| `.staff-main` | `padding-top: var(--ops-chrome-height)` |
| `html.inbox-lock .staff-main` | `padding-top: 0; min-height: 0` |
| phone pane gutters | 0.5rem when `data-inbox-breakpoint="phone"` |

## Non-contracts (must not change)

- `POST /api/inbound/send` + confirmToken
- `OUTBOUND_MODE` / Redirect go-live
- WhatsApp From `+27600200825`
- Ultra batch worker / `OPENAI_API_KEY`
- `RESEND_FROM_EMAIL` / stay@
