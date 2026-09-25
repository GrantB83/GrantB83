# Contracts: GuestFlow Browns Brand Visual Alignment

**Feature**: 024-guestflow-browns-brand  
**Date**: 2026-09-25  
**Phase**: 1 (Design & Contracts)

## Overview

This visual restyle feature does NOT introduce new public APIs, CLI commands, or external interface contracts. All existing GuestFlow API routes, authentication flows, webhook handlers, and guest portal magic-link behavior remain unchanged.

## Existing Contracts (Preserved, Not Modified)

The following existing GuestFlow contracts are **preserved** without modification:

### 1. Staff Authentication Flow

**Route**: `POST /api/auth/staff-login` (inferred from staff-login page behavior)

**Contract**: Staff provides email + password; system validates credentials; returns session token or error.

**Change**: None. Login form UI is restyled (Browns colors, logo, fonts) but form submission behavior, validation logic, and API contract are unchanged.

### 2. Guest Portal Magic-Link Access

**Route**: `GET /guest/[code]` where `[code]` is access token

**Contract**: Guest clicks magic link from email; system validates token; displays booking details, access codes, and check-in info.

**Change**: None. Portal page UI is restyled (Browns colors, logo, fonts) but magic-link validation, data fetching, and access control are unchanged.

### 3. Approve & Send Human Gate

**Route**: `POST /api/approvals/send` (inferred from Needs Approval workflow)

**Contract**: Staff reviews draft message; clicks "Approve & Send"; system validates human approval; sends message to guest via configured channel (WhatsApp, email, SMS).

**Change**: None. Approve & Send button UI is restyled (Browns colors) but human gate logic, API contract, and outbound send behavior are unchanged per constitution.

### 4. OUTBOUND Redirect Mode

**Configuration**: `OUTBOUND_MODE=redirect` environment variable

**Contract**: When redirect mode active, outbound messages route to redirect sinks (grant830318@gmail.com, +15124064300) instead of guest channels. Staff see redirect indicator banner.

**Change**: None. Redirect banner UI is restyled (Browns colors) but redirect logic, sink configuration, and banner behavior are unchanged.

## UI Component Contracts (Internal)

The following UI component interfaces are **internal** to the GuestFlow codebase and do NOT constitute external contracts. These are documented here for implementation reference only.

### ThemeProvider (if created)

**Purpose**: Centralized theme context for Browns design tokens (optional; may use Tailwind only)

**Interface** (if implemented):
```typescript
interface BrownsTheme {
  colors: {
    primary: string;       // #0A3775
    secondary: string;     // #FAC72E
    muted: string;         // #F6F5F3
    accent: string;        // #DCE8F9
    border: string;        // #E0E5EB
    foreground: string;    // #1D2530
    mutedForeground: string; // #65758B
    whatsapp: string;      // #25D366
  };
  fonts: {
    sans: string;          // Montserrat
    serif: string;         // Playfair Display
  };
  radius: string;          // 0.5rem
}
```

**Note**: This may be implemented as Tailwind config only (no React context). If a ThemeProvider component is created, it should expose these values for rare cases where inline styles are needed.

### Logo Component (if created)

**Purpose**: Reusable Browns heritage logo component for consistent sizing/placement

**Interface** (if implemented):
```typescript
interface LogoProps {
  variant?: 'full' | 'mark-only';  // Full logo with tagline or mark only
  size?: 'sm' | 'md' | 'lg';       // Predefined sizes
  className?: string;               // Additional Tailwind classes
}
```

**Note**: May be simple `<Image>` tag instead of dedicated component. No external contract; internal convenience only.

## Summary

This feature introduces **zero new external contracts**. All existing API routes, authentication flows, webhook handlers, and magic-link behavior are preserved. The "contracts" for this feature are:

1. **Design QA Contract**: Each phase's visual output must match Design mockups and token board (validated via Design QA checklist)
2. **Behavioral Preservation Contract**: All user workflows (login, Approve&Send, redirect, guest portal access) must function identically pre- and post-restyle
3. **Accessibility Contract**: All text/background combinations must meet WCAG AA contrast ratios

No formal API documentation updates or versioning required. No breaking changes to existing integrations (Nightsbridge sync, WhatsApp Cloud API, Twilio, email providers) because this feature does not touch those systems.

If future phases extend this work (e.g., guest-facing API, public webhooks), contracts will be documented at that time. For this visual restyle, no public contract changes exist.
