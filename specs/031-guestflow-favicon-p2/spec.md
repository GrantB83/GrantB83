# Feature Specification: GuestFlow Favicon P2

**Feature Branch**: `cursor/guestflow-favicon-p2-5165`

**Created**: 2026-09-26

**Status**: Draft

**Input**: Grant CLEAR — staff and guest browser tabs on guestflow.thebrowns.co.za must show the Browns GuestFlow favicon (not broken/default). Prod `GET /favicon.ico` returns 404. **MERGE HOLD until GFM Preview ACCEPT after Design PASS.**

## Operator Job *(mandatory)*

Staff and guests who open GuestFlow in a browser tab see the Browns mark in the tab (favicon / app icon), not a broken or generic icon.

**Operator-job AC**: On staff login and guest portal routes, the browser tab displays the approved Browns emblem. `GET /favicon.ico` returns HTTP 200 with an image content type. No change to redirect, outbound send, or Approve&Send behavior.

## Saleable DoD S1–S10 *(mandatory)*

| ID | Required | This feature |
| --- | --- | --- |
| **S1** | Operator job named | **Y** — tab favicon shows Browns mark on GuestFlow (staff + guest) |
| **S2** | Happy path AC | `GET /favicon.ico` → 200 + image content-type; tab shows mark on staff login + guest portal |
| **S3** | Empty / error AC | **N/A** — static asset; missing file must not 404 |
| **S4** | Desktop layout AC | **N/A** — icon only |
| **S5** | Mobile layout AC | **N/A** — icon only |
| **S6** | Standing locks | Redirect ON; no guest sends; Approve&Send human; WA From `+27600200825` |
| **S7** | Copy bar | **N/A** — no copy change |
| **S8** | A11y / icons | `apple-touch-icon` and `rel=icon` with correct sizes; no new unlabeled primary controls |
| **S9** | Peers | Design **Y** (brand mark) · QA **N** (Coding self-check; GFM Prod spot-check) |
| **S10** | Job evidence | `curl -sI` 200 on `/favicon.ico` + desktop tab evidence for staff login + guest portal |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff sees Browns tab icon on login (Priority: P1)

A staff member opens the GuestFlow staff login page. The browser tab shows the Browns emblem favicon.

**Why this priority**: Staff use GuestFlow daily; broken favicon signals an unfinished product.

**Independent Test**: Open `/staff-login` in a desktop browser; tab icon matches approved Browns emblem.

**Acceptance Scenarios**:

1. **Given** GuestFlow is deployed with favicon assets, **When** staff open `/staff-login`, **Then** the tab displays the Browns emblem (not default/broken)
2. **Given** a client requests `/favicon.ico`, **When** the response completes, **Then** status is 200 and `Content-Type` is an image type (`image/x-icon` or `image/png`)

---

### User Story 2 - Guest sees Browns tab icon on portal (Priority: P1)

A guest opens the GuestFlow guest portal (magic link or public guest route). The browser tab shows the same Browns emblem.

**Why this priority**: Guest-facing chrome should match hospitality brand.

**Independent Test**: Open a guest portal path (e.g. `/guest/login` or tenant guest entry); tab icon matches staff login.

**Acceptance Scenarios**:

1. **Given** favicon metadata is wired in the root layout, **When** a guest portal page loads, **Then** HTML includes icon link tags for favicon and apple-touch where shipped
2. **Given** the guest portal page, **When** viewed in a desktop browser tab, **Then** the favicon matches the Browns emblem

---

### Edge Cases

- Browsers that request `/favicon.ico` directly must be served from `public/favicon.ico` (not app 404)
- Hard refresh / cache: new deploy must still serve 200 for `/favicon.ico`
- No new mark invented; only crop/resize from approved logo sources
- Root layout change is metadata/icons only — no navigation, chrome, or redirect logic changes

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GuestFlow MUST serve `GET /favicon.ico` with HTTP 200 and an image content type
- **FR-002**: Favicon and touch icons MUST be derived from approved brand assets (`thebrowns-logo-live` SVG family / `the-browns-logo.png` raster), not a new mark
- **FR-003**: Root application metadata MUST declare `icons` (favicon + PNG sizes + apple-touch as shipped)
- **FR-004**: Staff login and guest portal routes MUST inherit root icon metadata without layout behavior changes
- **FR-005**: Implementation MUST NOT change redirect rules, outbound send paths, or Approve&Send human gates

### Key Entities

- **Favicon asset set**: `favicon.ico`, optional `icon-16.png`, `icon-32.png`, `apple-touch-icon.png` under `public/`
- **Brand source**: `public/logos/thebrowns-logo-live_079f.svg` (symlink) and `public/logos/the-browns-logo.png`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `curl -sI` against Preview `/favicon.ico` returns `200` and an image `Content-Type`
- **SC-002**: Staff login and guest portal each have documented tab-icon evidence (screenshot or artifact path) on Preview
- **SC-003**: Design peer can confirm Preview tab mark matches Browns emblem before GFM ACCEPT
- **SC-004**: No regression in standing locks (redirect ON, human Approve&Send, WA From unchanged)

## Assumptions

- Square emblem crop from `the-browns-logo.png` matches the circular “B” mark in the live SVG pack
- Next.js 14 serves `public/favicon.ico` at `/favicon.ico` without custom routes
- Preview URL will be recorded in PR for Design PASS

## Out of Scope

- Marketing site `www.thebrowns.co.za`
- Redirect flip, outbound messaging, Sprint 4 inbox UI
- Inventing or redesigning the brand mark
