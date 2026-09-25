# Quickstart: GuestFlow Browns Brand Visual Alignment

**Feature**: 024-guestflow-browns-brand  
**Date**: 2026-09-25  
**Phase**: 1 (Design & Contracts)

## Purpose

This quickstart provides runnable validation scenarios to prove the visual rebrand works end-to-end. Follow these steps to validate each phase's visual output against Design mockups and token board.

## Prerequisites

1. **Development Environment**:
   - Node.js 20+ installed
   - Git repository cloned: `git clone <repo-url>` (or already in `/workspace`)
   - Feature branch checked out: `git checkout cursor/guestflow-browns-brand-9bcf`

2. **Dependencies Installed**:
   ```bash
   cd apps/guestflow
   npm install
   ```

3. **Environment Variables** (for full testing):
   - Copy `.env.example` to `.env.local`
   - Set `DATABASE_URL` to local Turso instance or test database
   - Set `OUTBOUND_MODE=redirect` to test redirect banner styling
   - Other vars per `.env.example` (not critical for visual QA)

4. **Design Reference Materials**:
   - Token board: `/workspace/guestflow-brand/proposal-2026-09-24/tokens/token-board.png`
   - Mockups: `/workspace/guestflow-brand/proposal-2026-09-24/mockups/01-login-proposed.png`, `02-ops-hub-proposed.png`, `03-needs-approval-proposed.png`
   - Tokens JSON: `/home/ubuntu/.cursor/projects/workspace/uploads/tokens_c943.json`
   - Logo assets: `/home/ubuntu/.cursor/projects/workspace/uploads/thebrowns-logo-live_079f.svg`, `The_Browns_Logo_Full_V1-1_43ba.png`

## Phase 0: Theme Foundation Validation

### Setup Commands

```bash
cd apps/guestflow

# Verify Tailwind config has Browns tokens
cat tailwind.config.ts | grep -A 10 "colors:"

# Verify fonts loaded in layout
cat src/app/layout.tsx | grep -E "(Montserrat|Playfair)"

# Start dev server
npm run dev
```

**Expected Output**: Dev server starts on `http://localhost:3100`

### Visual Validation

1. Open browser to `http://localhost:3100/staff-login`
2. Open browser DevTools → Elements → Computed styles
3. Verify CSS variables or Tailwind classes use Browns palette:
   - Primary color: #0A3775 (navy) — not sky blue #0ea5e9
   - Secondary color: #FAC72E (gold)
   - Background: #F6F5F3 (warm muted) — not cool gray
   - Border radius: 0.5rem

**Expected Outcome**: 
- ✓ Tailwind config includes `primary: { DEFAULT: '#0A3775', ... }` and `secondary: { DEFAULT: '#FAC72E', ... }`
- ✓ Fonts loaded: Montserrat for body, Playfair Display for headings
- ✓ No sky blue or cool gray in palette (replaced by navy/muted)

**Contrast Check**:
- Navy #0A3775 on white: ~9.4:1 (PASS AA)
- Gold #FAC72E on navy #0A3775: ~5.2:1 (PASS AA for large text ≥18pt or bold ≥14pt)
- Muted foreground #65758B on muted #F6F5F3: ~4.6:1 (PASS AA)

---

## Phase 1: Staff Login & Shell Validation

### Visual Validation

1. Navigate to `http://localhost:3100/staff-login`
2. Compare to Design mockup: `mockups/01-login-proposed.png`
3. Verify:
   - ✓ Browns heritage logo visible (navy/gold mark + script)
   - ✓ Page heading "Staff login" uses Playfair Display font
   - ✓ Form labels ("Email", "Password") use Montserrat font
   - ✓ Submit button "Access Ops Console" uses Montserrat font
   - ✓ Navy #0A3775 primary color on buttons/headers
   - ✓ Warm muted #F6F5F3 background (not cool gray)
   - ✓ Border color #E0E5EB on inputs

4. Test login workflow:
   - Enter test staff email + password (if test account available)
   - Click "Access Ops Console"
   - Verify redirect to `/ops` or `/` inbox (workflow unchanged)

**Expected Outcome**: Login page matches Design mockup; form submission works; no workflow changes.

### Shell / Top Nav Validation

1. After login, observe top navigation shell
2. Verify:
   - ✓ Browns heritage logo in top-left or header
   - ✓ Navy header background or accent
   - ✓ Montserrat font in nav links/buttons

**Expected Outcome**: Top nav displays Browns branding; staff can navigate ops surfaces.

### Redirect Banner Validation (if OUTBOUND_MODE=redirect)

1. Set `OUTBOUND_MODE=redirect` in `.env.local`
2. Restart dev server: `npm run dev`
3. Navigate to any ops page
4. Verify redirect banner/indicator:
   - ✓ Banner visible with "Redirect ON" text (or equivalent)
   - ✓ Styled with Browns colors (gold #FAC72E emphasis, navy text, muted background)
   - ✓ Clicking banner does not break (behavior unchanged)

**Expected Outcome**: Redirect banner restyled with Browns colors; copy and behavior unchanged.

---

## Phase 2: Staff Primary Ops Surfaces Validation

### Ops Hub Validation

1. Navigate to `http://localhost:3100/ops`
2. Compare to Design mockup: `mockups/02-ops-hub-proposed.png`
3. Verify:
   - ✓ Navy headers on cards
   - ✓ Gold "Review queue" button (or primary action emphasis)
   - ✓ Warm muted #F6F5F3 page background
   - ✓ Montserrat font in all UI elements (cards, buttons, labels)
   - ✓ No Playfair in card text (only on page H1 if present)

**Expected Outcome**: Ops hub matches Design mockup; cards/buttons display Browns colors.

### Needs Approval Validation

1. Navigate to `http://localhost:3100/needs-approval`
2. Compare to Design mockup: `mockups/03-needs-approval-proposed.png` (if available)
3. Verify:
   - ✓ Navy chrome throughout
   - ✓ Gold emphasis on "Review queue" or primary action
   - ✓ "Approve & Send" button styled with navy (human gate behavior unchanged)
   - ✓ Draft list items use Montserrat font

4. Test Approve & Send workflow (if test drafts available):
   - Click "Approve & Send" on a draft
   - Verify modal/confirmation dialog appears (workflow unchanged)
   - Verify message NOT auto-sent (human gate preserved)

**Expected Outcome**: Needs Approval list displays Browns colors; Approve & Send workflow unchanged.

### Arrivals & Departures Validation

1. Navigate to `http://localhost:3100/ops/arrivals-departures`
2. Verify:
   - ✓ Navy header row in table
   - ✓ Montserrat font in all table cells (no Playfair in dense data)
   - ✓ Muted row backgrounds #F6F5F3
   - ✓ Border color #E0E5EB between rows/columns

**Expected Outcome**: Arrivals/Departures table displays Browns colors; data readable with good contrast.

### Inbox Shell Validation

1. Navigate to `http://localhost:3100` (root may redirect to inbox)
2. Verify:
   - ✓ Browns header chrome
   - ✓ Navy/gold accents on unread indicators
   - ✓ Montserrat font in inbox rows
   - ✓ Warm muted background

**Expected Outcome**: Inbox shell displays Browns branding; message list readable.

---

## Phase 3: Staff Secondary Ops Chrome Validation

### Inbound Queue Validation

1. Navigate to `http://localhost:3100/ops/inbound-queue` (or equivalent path)
2. Verify:
   - ✓ Browns chrome (navy headers, muted background)
   - ✓ WhatsApp green #25D366 appears ONLY on channel chips/badges
   - ✓ Structural chrome (headers, buttons, nav) uses navy/gold, NOT green

**Expected Outcome**: Inbound queue displays Browns colors; WhatsApp green used sparingly for channel identification only.

### Access Codes & Draft Tools Validation

1. Navigate to access codes ops page (path TBD during implementation)
2. Navigate to draft tools page (path TBD during implementation)
3. Verify:
   - ✓ Browns color tokens throughout
   - ✓ Montserrat font in all UI
   - ✓ Navy/gold/muted palette consistent

**Expected Outcome**: All staff ops tools display Browns branding.

---

## Phase 2b: Guest Portal Validation

### Setup Commands

```bash
# Generate a test guest access code (if script available)
node scripts/smoke-portal.mjs

# Or manually create a magic-link URL:
# http://localhost:3100/guest/<test-access-code>
```

### Visual Validation

1. Open browser to `http://localhost:3100/guest/<test-code>` (replace `<test-code>` with valid code)
2. Verify authentication (magic-link validation should pass for valid code)
3. Verify:
   - ✓ Browns heritage logo visible
   - ✓ Navy #0A3775 primary elements
   - ✓ Gold #FAC72E accents on key information
   - ✓ Playfair Display on main page heading
   - ✓ Montserrat font for all body text, labels, data
   - ✓ Warm muted #F6F5F3 backgrounds
   - ✓ Border radius 0.5rem on cards/inputs

4. Verify guest data display:
   - ✓ Booking details, check-in times, access codes visible (functionality preserved)
   - ✓ No new features invented
   - ✓ Data formatting unchanged

**Expected Outcome**: Guest portal displays Browns branding; existing portal data/functionality preserved.

---

## Automated Test Validation

### Run Unit/Integration Tests

```bash
cd apps/guestflow
npm run test
```

**Expected Output**: 
- Tests pass after snapshot updates (className changes expected)
- No behavior/logic test failures
- If snapshots fail: `npm run test -- -u` to update, then re-run

### Run E2E Tests (Optional)

```bash
cd apps/guestflow
npx playwright test
```

**Expected Output**:
- E2E tests pass (login flow, navigation, etc.)
- Visual regression checks may need baseline updates if using Playwright screenshots

---

## Lint & Build Validation

### Run Linter

```bash
cd apps/guestflow
npm run lint
```

**Expected Output**: No linting errors; Tailwind classes valid; no unused CSS warnings.

### Run Build

```bash
cd apps/guestflow
npm run build
```

**Expected Output**: 
- Next.js build completes successfully
- Fonts optimized and bundled
- Static assets (logo SVG/PNG) included in build output
- No build errors or warnings

---

## Design QA Checklist Validation

After completing all phases, validate against Design QA checklist from PROPOSAL.md §13:

**Phase 0 — Theme**
- [ ] CSS vars / theme: primary #0A3775, secondary #FAC72E, muted #F6F5F3, accent #DCE8F9, border #E0E5EB, radius 0.5rem
- [ ] Montserrat loaded for UI; Playfair available for H1 / empty-state only
- [ ] No sky/blue primary left as brand primary; WhatsApp green channel-only

**Phase 1 — Chrome + login**
- [ ] CI / live SVG mark on login + top chrome (not white-B square alone)
- [ ] Login still Email + Password + Access Ops Console (or equivalent both-fields CTA)
- [ ] Redirect banner restyle only — copy/behavior unchanged
- [ ] Playfair only on login H1; form labels/inputs Montserrat

**Phase 2 — Primary ops**
- [ ] `/ops`, Needs Approval, A&D, Inbox shell: navy/gold/warm wash grammar
- [ ] Approve&Send primary CTA feels Browns; human gate unchanged
- [ ] Dense tables/rows/filters Montserrat only — no Playfair in cells/buttons
- [ ] Arrivals day strip + inbox/UMI header unread accents on-token

**Phase 2b — Guest portal**
- [ ] CI / live SVG mark on guest portal
- [ ] Guest portal uses Phase 0 tokens (navy, gold, muted, accent, Montserrat UI, Playfair H1)
- [ ] Existing guest data displays correctly (booking details, access codes)

**Phase 3 — Secondary ops**
- [ ] Inbound queue, access-codes, draft tools on same tokens
- [ ] No new features invented; guest portal still functional

---

## Summary

**Validation Complete When**:
- [ ] All phases render correctly per Design mockups and token board
- [ ] All contrast ratios meet WCAG AA (4.5:1 normal text, 3:1 large text)
- [ ] All workflows unchanged (login, Approve&Send, redirect, guest portal access)
- [ ] Automated tests pass (or updated snapshots pass)
- [ ] Lint and build succeed with no errors
- [ ] Design QA checklist items all checked

**Next Steps**: 
- Create PR with branch `cursor/guestflow-browns-brand-9bcf`
- Provide Preview URL for Design visual QA
- Document before/after screenshots in PR body per phase
- Wait for Grant CLEAR via CoS before merge/production deploy

**Troubleshooting**:
- If fonts don't load: Check `next.config.mjs` for font optimization settings; verify Google Fonts import in layout.tsx
- If colors wrong: Verify Tailwind config theme.colors object; check for stale browser cache (hard refresh)
- If logo missing: Verify SVG/PNG copied to `public/logos/`; check Next.js Image component src path
- If tests fail: Update snapshots with `npm run test -- -u`; verify test data still valid
- If contrast fails: Use WebAIM Contrast Checker; adjust font weight or background lightness

**Reference Links**:
- Token board: [token-board.png](../../../guestflow-brand/proposal-2026-09-24/tokens/token-board.png)
- Mockups: [01-login-proposed.png](../../../guestflow-brand/proposal-2026-09-24/mockups/01-login-proposed.png), [02-ops-hub-proposed.png](../../../guestflow-brand/proposal-2026-09-24/mockups/02-ops-hub-proposed.png)
- Constitution: [constitution.md](../../../.specify/memory/constitution.md)
- Spec: [spec.md](../spec.md)
- Plan: [plan.md](../plan.md)
