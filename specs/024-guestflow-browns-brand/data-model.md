# Data Model: GuestFlow Browns Brand Visual Alignment

**Feature**: 024-guestflow-browns-brand  
**Date**: 2026-09-25  
**Phase**: 1 (Design & Contracts)

## Overview

This visual restyle feature does NOT introduce new data entities, database schema changes, or API contracts. All existing data models (guests, bookings, tickets, messages, staff users, access codes) remain unchanged. This document describes the design-level entities relevant to the visual theming system.

## Theme Entities

### DesignToken

Represents a single design token (color, typography, spacing) from the Browns brand system.

**Purpose**: Source of truth for visual styling values; ensures consistency across staff and guest surfaces.

**Attributes**:
- `name` (string): Token identifier (e.g., "primary", "secondary", "muted", "accent", "border", "radius")
- `hex` (string): Hex color code (e.g., "#0A3775") — for colors only
- `hsl` (string): HSL color value (e.g., "215 84% 25%") — for colors only
- `value` (string): Generic value for non-color tokens (e.g., "0.5rem" for radius, "Montserrat" for font family)
- `role` (string): Semantic role description (e.g., "Primary brand navy for headers and CTAs")

**Validation Rules**:
- Hex codes must be valid 6-digit hex colors (e.g., #RRGGBB)
- HSL values must parse correctly for Tailwind CSS
- Radius values must use valid CSS units (rem, px, em)
- Font family names must match loaded fonts (Montserrat, Playfair Display)

**State Transitions**: N/A (tokens are static configuration, not runtime state)

**Source**: Extracted from thebrowns.co.za live CSS and provided in tokens.json by Design team

**Storage**: Defined in `tailwind.config.ts` (Tailwind theme object) and optionally in CSS variables in `globals.css`

### BrandAsset

Represents a brand logo or image asset used across GuestFlow surfaces.

**Purpose**: Centralized reference to Browns heritage logo for consistent application.

**Attributes**:
- `filename` (string): Asset filename (e.g., "thebrowns-logo-live.svg")
- `path` (string): Public path for Next.js (e.g., "/logos/thebrowns-logo-live.svg")
- `format` (string): File format ("svg" or "png")
- `usage` (array of strings): Surfaces where logo appears (e.g., ["staff-login", "top-nav", "guest-portal"])

**Validation Rules**:
- SVG files must be valid XML with viewBox attribute for responsive sizing
- PNG files should be high-resolution (2x or 3x for Retina displays)
- Paths must exist in `public/` directory

**State Transitions**: N/A (assets are static files)

**Source**: Provided by Design team in uploads pack; extracted from thebrowns.co.za

**Storage**: Static files in `apps/guestflow/public/logos/`

### Surface

Represents a distinct UI area/page requiring visual restyle as part of this feature.

**Purpose**: Track which surfaces have been restyled and validated per phase; ensure complete coverage.

**Attributes**:
- `name` (string): Surface identifier (e.g., "staff-login", "ops-hub", "guest-portal")
- `route` (string): Next.js route path (e.g., "/staff-login", "/ops", "/guest/[code]")
- `phase` (string): Implementation phase ("Phase 1", "Phase 2", "Phase 3", "Phase 2b")
- `components` (array of strings): React component file paths (e.g., ["src/app/staff-login/page.tsx"])
- `qa_status` (string): Design QA validation status ("pending", "pass", "fail")

**Validation Rules**:
- Route must match existing GuestFlow route structure
- Phase must be one of: "Phase 0", "Phase 1", "Phase 2", "Phase 3", "Phase 2b"
- Components must exist in codebase

**State Transitions**:
- `pending` → `pass`: Design visual QA validates surface matches mockups and token board
- `pending` → `fail`: Design visual QA identifies issues (contrast, font usage, color mismatch)
- `fail` → `pending`: Issues remediated; awaiting re-QA
- `fail` → `pass`: Issues remediated and validated

**Source**: Defined in spec.md functional requirements (FR-006 through FR-021)

**Storage**: Tracked in PR body checklist and Design QA notes (not persisted in database)

## Relationships

```
DesignToken --* BrandAsset : provides_colors_for_logo
DesignToken --* Surface : applied_to
BrandAsset --* Surface : displayed_on
```

- Multiple design tokens (primary navy, secondary gold, etc.) define the color palette for the Browns logo
- Each design token is applied to one or more surfaces (e.g., primary navy used on login, ops hub, guest portal)
- Each brand asset (logo) is displayed on multiple surfaces (login, nav shell, guest portal)

## Non-Entities (Out of Scope)

The following existing GuestFlow entities are **NOT modified** by this feature:

- Guest (PII, contact details, booking info) — no schema changes
- Booking (rates, stay dates, room details) — no schema changes
- Ticket (inbound messages, status, channel) — no schema changes
- Message (outbound WhatsApp/email/SMS) — no schema changes; Approve&Send logic unchanged
- StaffUser (auth, roles, permissions) — no schema changes; login flow unchanged
- AccessCode (codes, assignment, validity) — no schema changes; display only restyled
- Property (nightsbridge sync, configuration) — no schema changes

## Data Flow

This feature introduces NO new data flows. Existing data flows (guest booking sync, inbound message processing, staff authentication, Approve&Send workflow) remain unchanged. Visual theming data flow is build-time only:

```
Design SoT (tokens.json)
    ↓
Tailwind Config (build-time)
    ↓
Generated CSS (static)
    ↓
Next.js Build Output
    ↓
Browser Rendering (runtime)
```

No runtime database queries or API calls are added for theming. Theme tokens are compiled into static CSS at build time.

## Summary

This feature operates at the **presentation layer** only. No database entities, API contracts, or data pipelines are modified. The "data model" for this feature consists of design-time entities (DesignToken, BrandAsset, Surface) used to organize and track the visual restyle work. All GuestFlow business logic and data persistence remain unchanged per constitution and Grant directives.
