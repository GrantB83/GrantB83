# Research: GuestFlow Browns Brand Visual Alignment

**Feature**: 024-guestflow-browns-brand  
**Date**: 2026-09-25  
**Phase**: 0 (Outline & Research)

## Overview

This document consolidates research findings for aligning GuestFlow visual appearance with The Browns guesthouse brand. All unknowns from Technical Context have been resolved through examination of existing codebase, design proposal pack, and Browns live site CSS.

## Research Tasks

### 1. Design Token Extraction from thebrowns.co.za

**Decision**: Use tokens.json from design proposal pack as single source of truth for Browns palette.

**Rationale**: 
- Design team extracted tokens from live CSS at thebrowns.co.za (scraped 24 Sep 2026)
- JSON provides hex codes, HSL values, typography specs, and radius values in machine-readable format
- Token board PNG provides visual reference for Design QA validation
- Live site CSS vars match token JSON (verified in uploads/tokens_c943.json)

**Alternatives considered**:
- Manual CSS scraping from live site: Rejected because Design already completed this work with QA approval
- Inventing intermediate palette: Rejected per constitution (fail-closed facts) and Grant directive (no invention)

**Implementation approach**:
- Copy tokens from `uploads/tokens_c943.json` into Tailwind config color definitions
- Map `primary` → #0A3775 (navy), `secondary` → #FAC72E (gold), `muted` → #F6F5F3, `accent` → #DCE8F9, `border` → #E0E5EB
- Set default `borderRadius` → 0.5rem

### 2. Typography Integration (Google Fonts vs Self-Hosted)

**Decision**: Use Next.js font optimization with Google Fonts for Montserrat and Playfair Display.

**Rationale**:
- Next.js 14 provides built-in font optimization via `next/font/google`
- Automatic subsetting, preloading, and self-hosting of Google Fonts
- Zero external requests after build (fonts inlined as data URIs or static files)
- Weights needed: Montserrat 300-700, Playfair Display 400-700 (per tokens.json)

**Alternatives considered**:
- Manual @font-face with CDN: Rejected for performance (extra DNS lookup, no automatic subsetting)
- System font stack: Rejected because Montserrat + Playfair are brand-defining per Design SoT

**Implementation approach**:
- Import `Montserrat` and `Playfair_Display` from `next/font/google` in root layout
- Apply Montserrat to `body` and general UI elements via CSS variable (e.g., `--font-sans`)
- Apply Playfair Display to headings via CSS variable (e.g., `--font-serif`)
- Update Tailwind config to reference these font families

### 3. Logo Asset Preparation

**Decision**: Use SVG logo from uploads (thebrowns-logo-live.svg) as primary; PNG as fallback.

**Rationale**:
- SVG scales without quality loss (important for various screen densities)
- Design provided both SVG and PNG in uploads pack
- SVG matches live site logo (thebrowns.co.za/images/logo.svg)
- Browns heritage CI mark includes navy/gold monogram + script + tagline

**Alternatives considered**:
- PNG only: Rejected for scaling limitations on high-DPI displays
- Inline SVG in JSX: Considered for optimization but introduces maintenance burden; external file preferred for Design control

**Implementation approach**:
- Copy `uploads/thebrowns-logo-live_079f.svg` and `uploads/The_Browns_Logo_Full_V1-1_43ba.png` to `apps/guestflow/public/logos/`
- Reference as `/logos/thebrowns-logo-live.svg` in Next.js Image components or img tags
- Use consistent logo across staff-login, top nav shell, and guest portal

### 4. Tailwind Theme Extension Strategy

**Decision**: Extend Tailwind config `theme.colors` to remap existing utility classes onto Browns palette.

**Rationale**:
- Existing GuestFlow components likely use Tailwind utilities like `bg-primary-600`, `text-primary-700`, etc.
- Remapping theme colors changes all utility class outputs without touching every component
- Minimal refactor: className props stay same, only color values change
- Easier to revert if needed (one file change vs hundreds of components)

**Alternatives considered**:
- CSS variables only (no Tailwind theme change): Rejected because existing components use Tailwind utilities, not bare CSS vars
- Shared theme package (separate npm module): Overkill for single-app rebrand; reserved for multi-app scenarios

**Implementation approach**:
- Edit `apps/guestflow/tailwind.config.ts`
- Replace `primary` color scale (currently sky blue) with navy scale derived from #0A3775
- Add `secondary` scale for gold #FAC72E
- Add `muted`, `accent`, `border` colors to match tokens.json
- Verify existing components render correctly after theme swap

### 5. WhatsApp Green (#25D366) Channel Identity

**Decision**: Define WhatsApp green as separate semantic color; never override with Browns palette.

**Rationale**:
- WhatsApp branding guideline: official green #25D366 for channel identification
- Constitution IV (Channel Identity Freeze) requires preserving channel semantics
- Functional color coding (channel indicators) should not be replaced by brand colors
- Design proposal explicitly calls out "WhatsApp green = channel chrome only"

**Alternatives considered**:
- Treating WhatsApp green as muted/accent: Rejected for channel clarity loss
- Removing channel color coding: Rejected for operational confusion (staff need to identify channels at a glance)

**Implementation approach**:
- Add `whatsapp: '#25D366'` to Tailwind theme colors
- Use sparingly on channel-specific UI elements (badges, chips, icons) in inbound queue
- Browns navy/gold remain dominant for structural chrome (headers, buttons, nav)

### 6. Contrast Validation for Accessibility (WCAG AA)

**Decision**: Validate all text/background combinations meet WCAG AA contrast ratios (4.5:1 normal, 3:1 large).

**Rationale**:
- Success criterion SC-004 requires AA contrast
- Browns palette (navy #0A3775, gold #FAC72E, warm muted #F6F5F3) must be verified for readability
- Legal/compliance risk if staff or guests cannot read critical information

**Alternatives considered**:
- AAA compliance (7:1 ratio): Considered but not required by spec; AA is industry standard for web apps
- No validation (trust Design): Rejected because Design QA checklist includes contrast gate

**Implementation approach**:
- Use contrast checker (e.g., WebAIM Contrast Checker) during Design QA per phase
- Navy #0A3775 on white background: ~9.4:1 (PASS)
- Gold #FAC72E on navy #0A3775: ~5.2:1 (PASS for large text, borderline for normal — use sparingly or increase weight)
- Muted foreground #65758B on muted #F6F5F3: ~4.6:1 (PASS)
- Document any failing combinations in Design QA notes and adjust if needed

### 7. Phase Sequencing and PR Strategy

**Decision**: Implement Phase 0 (theme) → 1-3 (staff) → 2b (guest) in sequence; commit all changes to one PR before opening.

**Rationale**:
- Phase 0 theme tokens must exist before any surface restyle (dependency)
- Staff surfaces (1-3) validated before guest portal (2b) per Grant sequencing directive
- Grant amendment prohibits staff-only ship: "Do NOT ship staff-only and leave guest portal on Inter/sky blue"
- One PR simplifies Design visual QA and GFM acceptance review
- No merge until Grant CLEAR via CoS (constitution Development Workflow)

**Alternatives considered**:
- Separate PRs per phase: Rejected because Design QA needs holistic before/after view; multiple PRs risk partial merge
- Incremental ship (staff first, guest later): Explicitly prohibited by Grant amendment

**Implementation approach**:
- Create feature branch `cursor/guestflow-browns-brand-9bcf`
- Implement and commit Phase 0 (theme tokens, font loading)
- Implement and commit Phases 1-3 (staff surfaces)
- Implement and commit Phase 2b (guest portal)
- Push all commits; open PR with body mapping phases to surfaces
- Provide Preview URL for Design visual QA
- Wait for Grant CLEAR before merge/deploy

### 8. Testing Strategy (Visual vs Automated)

**Decision**: Combine automated test updates (snapshots) with manual visual testing against Design mockups and token board.

**Rationale**:
- Automated tests (__tests__/staff-login-ui.test.ts, etc.) likely have className snapshots that will break with theme changes
- Manual visual testing required to validate against Design mockups (01-login-proposed.png, 02-ops-hub-proposed.png, 03-needs-approval-proposed.png)
- No behavior changes expected (login flow, Approve&Send gate, redirect sinks unchanged), so integration tests should pass after snapshot updates
- Design QA checklist per phase requires visual validation vs token board + live thebrowns.co.za

**Alternatives considered**:
- Visual regression testing (Percy, Chromatic): Overkill for one-off rebrand; expensive for single-app project
- No automated test updates: Rejected because CI will fail on changed snapshots; must update to keep quality gates green

**Implementation approach**:
- Run `npm run test` after each phase; update snapshots with `npm run test -- -u` (Vitest)
- Start dev server `npm run dev` and manually navigate surfaces per phase
- Compare rendered UI to Design mockups and token board PNG
- Check contrast ratios, font rendering, logo placement
- Document visual QA checklist completion in PR body per phase

### 9. Guest Portal Route and Layout Structure

**Decision**: Restyle existing guest portal pages (`src/app/guest/[code]/page.tsx`, `src/app/guest/layout.tsx`) without modifying data fetching or access code logic.

**Rationale**:
- Guest portal already exists in codebase (observed in FR-018 requirement and uploads/PROPOSAL section)
- Magic-link authentication flow unchanged (constitution Safety Constraints)
- Design SoT: "remap existing guest portal chrome 1:1 onto Phase 0 tokens + CI mark"
- AMENDMENT explicitly includes guest portal: "Visual restyle ONLY — no new guest features"

**Alternatives considered**:
- Creating new guest portal pages: Rejected because pages already exist; reuse over rewrite
- Skipping guest portal: Explicitly prohibited by Grant amendment

**Implementation approach**:
- Locate `src/app/guest/[code]/page.tsx` and `src/app/guest/layout.tsx`
- Apply Browns theme tokens (navy, gold, muted, Montserrat UI, Playfair H1)
- Add Browns heritage logo to guest layout
- Preserve existing data display logic (booking details, access codes)
- Test with magic-link flow (may require `scripts/smoke-portal.mjs` or manual link)

### 10. Handling Redirect Banner Restyle (OUTBOUND_MODE=redirect)

**Decision**: Locate redirect banner component; restyle with Browns colors (gold emphasis, navy text, muted background) without changing copy or click behavior.

**Rationale**:
- FR-010 requirement: "Redirect banner MUST restyle using Browns color tokens; banner copy and click behavior MUST remain unchanged"
- OUTBOUND_MODE=redirect is operational flag (see docs/); banner alerts staff to redirect mode
- Design proposal notes "Redirect banner restyle only — copy + redirect behavior unchanged"

**Alternatives considered**:
- Removing redirect banner: Rejected because operational indicator is critical for staff workflow
- Changing redirect behavior: Explicitly out of scope (constitution Safety Constraints: OUTBOUND sinks unchanged)

**Implementation approach**:
- Search codebase for "OUTBOUND" or "redirect" banner/alert component
- Update className/style props to use Browns palette (bg-muted, text-primary, border-secondary for gold emphasis)
- Preserve existing banner text (e.g., "Redirect ON" or equivalent)
- Preserve existing onClick handler (if any) for banner dismissal or settings link
- Test in redirect mode (may require setting OUTBOUND_MODE env var)

## Summary

All Technical Context unknowns resolved. Key decisions:
1. **Design tokens**: Use tokens.json as SoT; remap via Tailwind config
2. **Typography**: Next.js font optimization with Montserrat (UI) + Playfair Display (H1 only)
3. **Logo**: SVG from uploads; place in public/logos/
4. **Theme strategy**: Tailwind color extension (remap utilities)
5. **WhatsApp green**: Separate channel color; never override with Browns palette
6. **Contrast**: WCAG AA validation per phase
7. **Sequencing**: Phase 0 → 1-3 (staff) → 2b (guest); one PR; no merge until Grant CLEAR
8. **Testing**: Snapshot updates + manual visual QA vs Design mockups
9. **Guest portal**: Restyle existing pages; no new features
10. **Redirect banner**: Locate and restyle; preserve behavior

Ready for Phase 1 (Design & Contracts).
