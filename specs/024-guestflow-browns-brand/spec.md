# Feature Specification: GuestFlow Browns Brand Visual Alignment

**Feature Branch**: `cursor/guestflow-browns-brand-9bcf`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Align GuestFlow staff UI and guest portal (guestflow.thebrowns.co.za) with The Browns guesthouse brand so the ops product and guest experience feel like the same brand as thebrowns.co.za main site. Visual restyle only — no feature invention, no workflow changes, no API changes. AMENDMENT: Guest portal now included (was previously out of scope)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff sees Browns brand throughout ops interface (Priority: P1)

Staff members (Grant, Liana, future ops team) use GuestFlow daily for arrivals/departures, inbox, approvals, and access codes. Currently the interface uses generic SaaS colors (sky blue, cool gray, Inter font) that don't match The Browns' luxury guesthouse brand (navy #0A3775, gold #FAC72E, Playfair Display + Montserrat). Staff should immediately recognize the Browns brand when they log in and work through daily tasks.

**Why this priority**: Staff are primary daily users; brand continuity from main site (thebrowns.co.za) to ops tool builds trust and reinforces brand identity. This is the core of the rebrand.

**Independent Test**: Staff can log in via email+password, see the Browns heritage logo and navy/gold color scheme on login screen, navigate to /ops hub and see warm muted backgrounds with navy headers, and complete arrivals/departures review with consistent Browns visual language throughout.

**Acceptance Scenarios**:

1. **Given** staff member visits staff-login page, **When** they view the login form, **Then** they see:
   - The Browns heritage logo (navy/gold CI mark) instead of generic white "B" square
   - Navy (#0A3775) primary colors replacing sky blue defaults
   - Playfair Display font on the page heading "Staff login"
   - Montserrat font on form labels "Email" and "Password" and button "Access Ops Console"
   - Warm muted (#F6F5F3) background replacing cool gray
   - Gold (#FAC72E) secondary accents

2. **Given** staff logs in successfully, **When** they view the Ops hub (/ops), **Then** they see:
   - Navy header sections with white text
   - Gold "Review queue" button emphasis
   - Warm muted wash (#F6F5F3) page background
   - Montserrat font in all UI elements (cards, buttons, filters)
   - Browns color palette throughout (no sky blue or cool gray from old palette)

3. **Given** staff navigates to Arrivals & Departures, **When** they view the table, **Then** they see:
   - Navy header row
   - Montserrat font in all table cells (no Playfair in dense data)
   - Muted row backgrounds (#F6F5F3)
   - Border color (#E0E5EB) matching Browns palette
   - Readable contrast (AA standard) on all text

4. **Given** staff views Needs Approval queue, **When** they interact with approval actions, **Then** they see:
   - Navy chrome throughout
   - Gold emphasis on "Review queue" button
   - Navy "Approve & Send" primary action (human gate behavior unchanged)
   - Browns color grammar on all status indicators
   - Redirect banner restyled with Browns colors (behavior unchanged)

---

### User Story 2 - Guest sees Browns brand in portal experience (Priority: P1)

Guests receive magic-link access to their guest portal to view booking details, check-in times, and access codes. Currently the guest portal uses the same generic SaaS styling (Inter font, sky blue). Guests should see consistent Browns branding from the main website through to their personal portal view.

**Why this priority**: Guest-facing surfaces directly impact brand perception. Consistency from marketing site → booking → portal builds trust and professionalism. AMENDMENT: This was previously out of scope; now included per Grant's directive.

**Independent Test**: Guest clicks magic link from email, sees Browns-branded portal page with navy/gold colors, Playfair heading, Montserrat UI elements, and Browns heritage logo. All existing portal information (booking details, access codes) remains functionally unchanged, only visual styling updated.

**Acceptance Scenarios**:

1. **Given** guest clicks magic link from confirmation email, **When** guest portal page loads, **Then** they see:
   - Browns heritage logo (navy/gold CI mark)
   - Navy (#0A3775) primary elements replacing sky blue
   - Playfair Display on main page heading
   - Montserrat font for all body text, labels, and data
   - Warm muted (#F6F5F3) backgrounds
   - Gold (#FAC72E) accents on key information

2. **Given** guest views their booking details, **When** they scan the portal page, **Then** they see:
   - All information presented in Browns color palette
   - Typography matches main site (Playfair for H1 only, Montserrat for all UI)
   - Consistent spacing and border treatments (0.5rem radius, #E0E5EB borders)
   - No sky blue or cool gray elements remaining

---

### User Story 3 - Redirect mode indicator styled consistently (Priority: P2)

When OUTBOUND_MODE=redirect is active, staff see a prominent banner/indicator. Currently this uses bright blue and amber colors that don't match Browns palette. The indicator should use Browns colors while maintaining same copy, behavior, and redirect functionality.

**Why this priority**: Visual consistency matters even for operational indicators. Staff see this frequently in redirect mode. Lower priority than primary surfaces but still part of complete rebrand.

**Independent Test**: Staff in redirect mode see styled banner using Browns colors (gold #FAC72E emphasis, navy text, warm muted background). Banner copy, click behavior, and redirect sink targets remain unchanged.

**Acceptance Scenarios**:

1. **Given** OUTBOUND_MODE=redirect is active, **When** staff views any ops page, **Then** they see:
   - Redirect indicator banner styled with Browns colors (gold #FAC72E for emphasis)
   - Banner text unchanged ("Redirect ON" or equivalent existing copy)
   - Banner behavior unchanged (clicking leads to same redirect settings or dismissal)
   - Visual integration with Browns palette (not standalone bright blue/amber)

---

### User Story 4 - WhatsApp channel indicators remain distinct (Priority: P3)

Some UI elements indicate WhatsApp as the communication channel (inbound queue, message status). WhatsApp's official green (#25D366) should remain for channel identification, never replaced by Browns navy/gold. This maintains channel clarity while rest of UI uses Browns colors.

**Why this priority**: Functional color coding (channel identification) should not be overridden by brand palette. This is a constraint/edge case rather than a primary user journey.

**Independent Test**: Staff viewing inbound WhatsApp queue see WhatsApp green (#25D366) for channel-specific chips/badges. Surrounding chrome (headers, backgrounds, nav) uses Browns colors.

**Acceptance Scenarios**:

1. **Given** staff views inbound queue with WhatsApp messages, **When** they see channel indicators, **Then**:
   - WhatsApp green (#25D366) appears only on channel-specific UI elements
   - Browns navy/gold palette used for all other chrome (headers, buttons, backgrounds)
   - Channel identification remains clear and distinct from brand colors

---

### Edge Cases

- What happens when brand colors create insufficient contrast for accessibility? **Browns color palette provides AA contrast ratios; design QA checklist requires contrast validation per phase.**

- How does system handle mixed surfaces (staff + guest) after rebrand? **Both staff and guest surfaces use same token system; no mixed states exist. Sequencing ensures all surfaces ship together in one PR.**

- What if Design provides guest portal mockups mid-implementation? **Implementation aligns to Design mockups when available; if no mockups arrive, 1:1 token remap of existing guest portal follows same constraints as staff surfaces.**

- How are existing CSS/Tailwind defaults prevented from leaking back in? **Phase 0 theme foundation remaps primary colors OFF sky/blue defaults; shared theme tokens prevent palette drift.**

- What happens to dark mode login if implemented? **Existing dark login can remain or convert to navy panel; both approaches valid as long as Phase 0 tokens + CI mark applied.**

## Requirements *(mandatory)*

### Functional Requirements

**Phase 0 — Shared Theme Foundation**

- **FR-001**: System MUST provide shared design tokens matching Browns live site: primary #0A3775 (navy), secondary #FAC72E (gold), muted #F6F5F3 (warm wash), accent #DCE8F9 (soft blue), muted foreground #65758B, foreground #1D2530, border #E0E5EB, radius 0.5rem
- **FR-002**: System MUST load Montserrat font (weights 300-700) for all dense UI elements: form labels, inputs, buttons, table cells, inbox rows, filters, status chips
- **FR-003**: System MUST load Playfair Display font (weights 400-700) for page H1 headings and empty-state titles only (never in table rows, buttons, or form controls)
- **FR-004**: System MUST remap Tailwind primary color scale OFF sky/blue defaults onto navy (#0A3775) palette
- **FR-005**: System MUST define WhatsApp green (#25D366) as channel-only color, never as brand primary

**Phase 1 — Staff Login & Shell Chrome**

- **FR-006**: Staff login page MUST display Browns heritage CI logo (navy/gold mark + script) replacing white "B" square
- **FR-007**: Staff login form MUST retain Email + Password fields and "Access Ops Console" submit button (no field count changes, no workflow changes)
- **FR-008**: Staff login page heading MUST use Playfair Display; form labels and button MUST use Montserrat
- **FR-009**: Staff top navigation shell MUST display Browns heritage CI logo
- **FR-010**: Redirect banner (when OUTBOUND_MODE=redirect) MUST restyle using Browns color tokens; banner copy and click behavior MUST remain unchanged

**Phase 2 — Staff Primary Ops Surfaces**

- **FR-011**: Ops hub (/ops) cards MUST use navy headers, warm muted backgrounds, gold emphasis on "Review queue" button
- **FR-012**: Needs Approval list and detail views MUST use Browns color palette; "Approve & Send" human gate behavior MUST remain unchanged
- **FR-013**: Arrivals & Departures chrome MUST use navy header, Montserrat UI, muted row backgrounds; no Playfair in table cells
- **FR-014**: Inbox shell (/inbox or / root) MUST use Browns header chrome and color grammar; unread accents MUST use Browns accent color

**Phase 3 — Staff Secondary Ops Chrome**

- **FR-015**: Inbound queue page MUST use Browns chrome; WhatsApp green MUST appear only on channel chips, not structural chrome
- **FR-016**: Access codes ops tools MUST use Browns color tokens
- **FR-017**: Draft tools and staff ops utilities MUST use Browns palette

**Phase 2b — Guest Portal Chrome (GFM LOCK via CoS 25 Sep)**

**SCOPE LOCK**: Phase 2b covers exactly six product-sensitive surfaces (visual restyle only):
1. Magic-link entry + expired/invalid states
2. Access codes display (pins/lockbox SoR — NEVER invent codes or values)
3. WiFi SoR / network_ask_staff display
4. Stay summary facts
5. Check-in/arrival chips/CTAs (if present)
6. Contact handoff to +27600200825 / stay@thebrowns.co.za (From/redirect unchanged)

**HARD CONSTRAINT**: Do not change copy logic, gates, or data — restyle chrome/tokens/type/logo only on these six surfaces. Design addendum forthcoming for before/after; until then remap existing UI 1:1 onto Phase 0 tokens.

- **FR-018**: Guest portal page (src/app/guest/[code]/page.tsx) MUST display Browns heritage CI logo
- **FR-019**: Guest portal MUST use Phase 0 Browns token system (navy, gold, muted, accent, Montserrat UI, Playfair H1) on all six GFM-locked surfaces
- **FR-020**: Guest portal MUST preserve existing functionality on all six surfaces: magic-link validation logic, access codes data fetching (no code invention), WiFi display logic, stay summary data, check-in chip logic, contact handoff behavior (From/redirect sinks unchanged)
- **FR-021**: Guest portal layout (src/app/guest/layout.tsx) MUST apply Browns theme tokens without changing authentication gates or access control logic
- **FR-022**: Guest portal expired/invalid magic-link states MUST restyle error messages using Browns color palette (preserve error detection logic)
- **FR-023**: Guest portal access codes (pins, lockbox) MUST display using Browns styling (NEVER invent or modify code values — SoR unchanged)
- **FR-024**: Guest portal WiFi display MUST use Browns chrome (network_ask_staff flag and copy logic unchanged)
- **FR-025**: Guest portal contact handoff links MUST preserve From identity (+27600200825) and redirect behavior (restyle link appearance only)

### Key Entities *(include if feature involves data)*

- **Design Token**: Color values, typography specifications, spacing/radius values extracted from thebrowns.co.za live CSS; source of truth for visual alignment
- **Brand Asset (Logo)**: Browns heritage CI logo (navy/gold monogram + script + "LUXURY GUEST SUITES" tagline); SVG format preferred for quality
- **Surface**: Distinct UI area requiring visual restyle (login, ops hub, needs approval, arrivals/departures, inbox, inbound queue, access codes, guest portal)
- **Phase**: Sequenced implementation unit (Phase 0 = foundation, Phases 1-3 = staff surfaces, Phase 2b = guest portal)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can visually identify Browns brand (navy/gold/Playfair/heritage logo) within 2 seconds of landing on staff-login page
- **SC-002**: 100% of staff-facing surfaces (login, ops hub, needs approval, arrivals/departures, inbox, inbound queue, access codes) display Browns color palette (no sky blue or cool gray from previous palette remaining)
- **SC-003**: 100% of guest-facing portal pages display Browns color palette and heritage logo
- **SC-004**: All text elements meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text) when tested against Browns color palette
- **SC-005**: Dense UI elements (table cells, inbox rows, form controls, buttons) use Montserrat font; page headings use Playfair Display; no Playfair appears in table rows or buttons
- **SC-006**: Staff complete login → inbox → needs approval → arrivals/departures workflow without workflow changes; only visual styling differs
- **SC-007**: Guest clicks magic link → views portal with Browns branding; existing portal data (booking details, access codes) displays correctly with Browns styling
- **SC-008**: Redirect banner appears with Browns styling when OUTBOUND_MODE=redirect; clicking banner produces same behavior as before rebrand
- **SC-009**: WhatsApp channel indicators use WhatsApp green (#25D366) only; no navy/gold on channel chips
- **SC-010**: Design visual QA checklist validates each phase ships; PR body maps Phases 0-3 + 2b surfaces with before/after notes vs token board + mockups

## Assumptions

- Browns heritage logo SVG/PNG assets are available in uploads or can be extracted from thebrowns.co.za live site
- Existing GuestFlow codebase uses Tailwind CSS (observed in tailwind.config.ts); color remapping via Tailwind theme extension is acceptable approach
- Staff workflow logic, API routes, database queries, Approve&Send human gates, OUTBOUND redirect behavior, and guest portal data fetching remain unchanged; only visual layer (CSS/theme/markup structure for styling) is modified
- Guest portal magic-link authentication and access control remain unchanged; rebrand touches only visual presentation after authentication
- Montserrat and Playfair Display fonts are available via Google Fonts or can be self-hosted; no licensing blockers exist
- Design will provide guest portal before/after mockups in /workspace/guestflow-brand/proposal-2026-09-24/ during or before implementation; if mockups arrive mid-run, implementation aligns to mockups; if no mockups arrive, 1:1 token remap of existing guest portal applies same constraints as staff surfaces
- All surfaces ship in one PR; staff-only ship without guest portal is explicitly prohibited per Grant amendment
- No production deployment until Grant CLEAR via Chief of Staff; PR remains open for Design visual QA and GFM product acceptance
- Ads spend remains $0; no changes to guest portal features, rates, PII handling, bank/attorney correspondence, or auth/JWT/payment logic
- Rivendell assets are out of scope; only Browns brand assets apply
- Development environment supports starting dev server (npm run dev) for manual visual testing against Design mockups and token board
- Existing automated tests (__tests__/staff-login-ui.test.ts, __tests__/mobile-inbox-ui.test.ts, etc.) may require snapshot updates due to className/style changes; test logic remains valid
