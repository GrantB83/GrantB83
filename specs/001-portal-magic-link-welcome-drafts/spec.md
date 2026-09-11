# Feature Specification: Portal Magic Link Minting in Welcome Drafts

**Feature Branch**: `cursor/portal-magic-link-welcome-drafts-ef7d`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "GuestFlow portal magic-link mint on welcome drafts. When staff generate/view welcome drafts in Ops Hub, each draft includes a real guest portal magic-link URL ready for Approve&Send, minted from existing portal helpers, sandbox-safe."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Generate Welcome Drafts with Working Portal Links (Priority: P1)

When staff access the Welcome Drafts page in Ops Hub and generate drafts for upcoming check-ins, each draft message automatically includes a working guest portal magic link. Staff can review the message and use the "Approve & Send" button to deliver the complete welcome message with portal access to guests.

**Why this priority**: This is the core value of the feature. Without working portal links in drafts, staff must manually generate and insert links, which is error-prone and blocks the welcome message workflow.

**Independent Test**: Navigate to /ops/welcome-drafts, generate drafts for date range with bookings, verify each draft includes a portal URL matching pattern `https://guestflow.thebrowns.co.za/guest/{token}`, copy a URL and verify it loads the guest portal page successfully.

**Acceptance Scenarios**:

1. **Given** staff is on the Welcome Drafts page with bookings in date range, **When** they click "Refresh Drafts", **Then** each generated draft message includes a portal URL in format `https://guestflow.thebrowns.co.za/guest/{token}` where {token} is a unique 43-character URL-safe string
2. **Given** a welcome draft has been generated with a portal link, **When** staff opens that URL in a browser, **Then** the guest portal page loads successfully showing booking details
3. **Given** multiple drafts are generated for different guests, **When** staff compares portal URLs, **Then** each URL contains a unique token (no duplicate tokens)

---

### User Story 2 - Portal Links Persist and Can Be Re-Used (Priority: P2)

When staff generate welcome drafts multiple times (e.g., refreshing the page or changing date filters), the system reuses existing valid portal tokens for each booking rather than generating new ones every time. This prevents token proliferation and ensures consistency if a link has already been shared.

**Why this priority**: Prevents database clutter with unused tokens and maintains consistency if staff accidentally regenerate drafts after already sending one.

**Independent Test**: Generate drafts for a booking, note the portal URL, refresh drafts again for same booking, verify the portal URL is identical. Create a new draft after the token exists and verify it reuses the same token.

**Acceptance Scenarios**:

1. **Given** a welcome draft has been generated with portal token ABC123, **When** staff refreshes the drafts page without changing filters, **Then** the same booking's draft contains the identical portal token ABC123
2. **Given** a booking already has a valid portal token, **When** staff changes date filters and regenerates drafts that include the same booking, **Then** the system reuses the existing token instead of creating a new one
3. **Given** a booking has an expired or revoked token, **When** staff generates a welcome draft, **Then** the system generates a new valid token and revokes the old one

---

### User Story 3 - Portal Links Removed from Placeholders (Priority: P1)

The system no longer includes `[PORTAL_URL]` placeholder text in draft messages. All portal URLs are actual working links minted during draft generation.

**Why this priority**: This is essential to the feature's purpose - removing manual work. Leaving placeholders defeats the purpose.

**Independent Test**: Generate drafts and search message text for the string "[PORTAL_URL]". Verify zero occurrences. Verify instead that actual URLs matching `https://` pattern appear in the message.

**Acceptance Scenarios**:

1. **Given** staff generates welcome drafts, **When** they review draft message text, **Then** no message contains the text "[PORTAL_URL]"
2. **Given** staff generates welcome drafts, **When** they review draft message text, **Then** each message contains at least one URL beginning with "https://guestflow.thebrowns.co.za/guest/"
3. **Given** legacy welcome pack tools existed with [PORTAL_URL] placeholders, **When** staff uses the new system, **Then** all generated drafts show actual URLs without manual replacement needed

---

### Edge Cases

- What happens when a booking doesn't have all required data (e.g., missing check-out date for token expiry calculation)?
  - System uses reasonable defaults: if check-out date is missing, calculate expiry as check-in date + 14 days
- How does system handle token generation failure (e.g., database write error)?
  - Draft generation continues but marks the draft as having missing portal URL in `missingFields` array, allowing staff to manually generate later
- What happens when staff tries to use a portal link that was revoked?
  - Guest portal page shows friendly error message explaining the link is no longer valid and provides contact information
- What happens if NEXT_PUBLIC_PORTAL_BASE_URL environment variable is not set?
  - System falls back to default `https://guestflow.thebrowns.co.za` as defined in portal-url.ts helper

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a unique cryptographic portal token for each booking when creating welcome drafts, using the existing `generateGuestToken()` function from lib/token.ts
- **FR-002**: System MUST store token hash (not raw token) in `guest_tokens` table with booking_id, token_hash, expires_at, created_at, revoked=0
- **FR-003**: System MUST calculate token expiry as checkout date + 14 days using existing `calculateTokenExpiry()` function
- **FR-004**: System MUST construct full portal URL using existing `getGuestPortalUrl(token)` helper from lib/portal-url.ts
- **FR-005**: System MUST include the generated portal URL in the draft message body, replacing any `[PORTAL_URL]` placeholders
- **FR-006**: System MUST reuse existing valid (not expired, not revoked) tokens for a booking if they exist, rather than creating duplicate tokens
- **FR-007**: System MUST revoke existing tokens before creating a new token for the same booking (when regeneration is needed)
- **FR-008**: Welcome draft API endpoint (/api/welcome-drafts GET) MUST mint tokens during draft generation, not as a separate manual step
- **FR-009**: System MUST populate the `portalUrl` field in WelcomeDraft interface with the minted URL for each draft
- **FR-010**: System MUST handle token generation errors gracefully by marking affected drafts with `missing_portal_url` in missingFields array

### Key Entities

- **WelcomeDraft**: Represents a generated welcome message for a booking. Key attributes: id (booking ID), guestName, checkIn, checkOut, message (with portal URL embedded), portalUrl (extracted URL), missingFields (validation flags)
- **guest_tokens table** (existing): Stores hashed tokens for magic link authentication. Key columns: id, booking_id, token_hash, expires_at, created_at, used_at, last_accessed_at, revoked
- **Booking** (existing): Represents a guest reservation. Key attributes used: id, guest_name, check_in, check_out, guest_phone, room_number, property_id

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When staff generates welcome drafts, 100% of drafts for bookings with complete data (guest name, check-in date) include a working portal URL
- **SC-002**: Portal URLs in draft messages are immediately usable - clicking a URL loads the guest portal page without errors
- **SC-003**: No draft message contains the placeholder text "[PORTAL_URL]" after generation
- **SC-004**: Staff can generate drafts, review portal URLs, and send welcome messages without manual token generation or URL insertion steps
- **SC-005**: Token reuse works correctly - generating drafts twice for the same booking produces identical portal URLs (no token proliferation)

## Assumptions

- Existing `guest_tokens` table schema is sufficient and supports the required operations (INSERT, SELECT with conditions, UPDATE for revocation)
- The `portal-url.ts` helper functions (getGuestPortalUrl, getPortalBaseUrl) work correctly and are tested
- The `token.ts` utility functions (generateGuestToken, hashToken, calculateTokenExpiry) work correctly and are tested
- Database connection (via getDb/getDbAsync) is available and functional in the welcome-drafts API route
- Staff have appropriate database access permissions for INSERT/UPDATE operations on guest_tokens table
- The existing welcome drafts API route is the correct place to add token minting logic (not a separate service or background job)
- Sandbox mode and live mode considerations for WhatsApp sending don't affect token generation (tokens are generated regardless of send mode)
- The current guestflow.thebrowns.co.za domain is correct for portal URLs (no immediate CNAME migration to stay.thebrowns.co.za required for this feature)
