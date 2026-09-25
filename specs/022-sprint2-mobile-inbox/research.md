# Research: Sprint 2 Mobile-Friendly Inbox

## 1. Phone single-pane vs CSS-only hide

**Decision**: Drive phone single-pane from a JS breakpoint hook (`matchMedia`) plus CSS, and keep list/thread both mounted when possible so scroll position can be restored without remounting the list.

**Rationale**: Pure CSS `hidden md:flex` hides the list but can reset overflow scroll when the node is `display: none`. Keeping the list in the tree (off-screen or `invisible`/`absolute` with preserved overflow) plus an explicit `pane` state matches FR-003.

**Alternatives considered**:
- Unmount the list on thread open — simpler, but scroll restore is fragile
- Separate `/inbox/[id]` routes — behaviour change and more rebase surface for parallel PRs

## 2. Browser back and deep link

**Decision**: Represent the open phone thread as `?thread=<id>` via the Next.js App Router. Phone back = `router.back()` when history has an inbox list entry, otherwise clear the query. Desktop/tablet may keep the query for shareability but still show two panes.

**Rationale**: Native `popstate` then works. Playwright can open a thread with a query. No new API.

**Alternatives considered**:
- `history.pushState` without the router — works, but fights Next.js
- Hash `#thread-id` — weaker sharing, same complexity

## 3. Keyboard-safe composer

**Decision**: Size the inbox shell with `dvh` and subtract `window.visualViewport` offset + `env(safe-area-inset-*)`. Expose `--inbox-keyboard-inset` so Playwright can simulate a keyboard without a real IME.

**Rationale**: iOS Safari shrinks the visual viewport when the keyboard opens; `100vh` does not. The brief names `dvh` / `visualViewport` and safe areas.

**Alternatives considered**:
- `100svh` only — misses keyboard
- `interactive-widget=resizes-content` alone — not enough on older iOS WebViews

## 4. Confirm prompt

**Decision**: Replace `window.confirm` with an in-app dialog that keeps the same copy intent and the same approve → confirmToken → send sequence. `window.confirm` cannot be screenshot-fitted or 44px-targeted on phone.

**Rationale**: UI-only. Send behaviour unchanged. Required for SC-008 confirm shots and FR-016.

**Alternatives considered**:
- Keep `window.confirm` — fails phone-fit and screenshot acceptance

## 5. Slots for parallel PRs

**Decision**: Add empty, named DOM slots on the thread shell (`data-inbox-slot="header-badge" | "header-actions" | "bubble-status"`) and matching React props. Do not implement badge, delivery status, or redirect toggle.

**Rationale**: Brief: later PRs rebase into the same thread UI. Empty slots with zero height when unused avoid layout shift.

**Alternatives considered**:
- Comment markers only — easy to miss in rebase
- Implement stub badges — out of scope and fights those PRs

## 6. Screenshot / a11y data

**Decision**: Client fixture behind `?fixture=1` using invented staff-safe names (`Alex Guest`, `Jordan Booker`). Playwright intercepts are a backup. Never load production guest rows into committed screenshots.

**Rationale**: FR-019. Preview/API may be empty or contain real PII.

## 7. TypeScript build

**Decision**: Leave `typescript.ignoreBuildErrors` unset/false. Fix any type errors this change introduces.

**Rationale**: Preview MUST be READY without ignoring TS.

## 8. Playwright + Lighthouse placement

**Decision**: Add Playwright as a GuestFlow **devDependency** with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` safe for Vercel. Commit screenshots under `specs/022-sprint2-mobile-inbox/screenshots/`. Run Lighthouse locally against `/?fixture=1`. Do not run Playwright during `next build`.

**Rationale**: Vercel must not download browsers. Evidence must live in the spec dir for the PR.
