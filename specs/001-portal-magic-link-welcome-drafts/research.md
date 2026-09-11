# Research: Portal Magic Link Minting in Welcome Drafts

**Feature**: Portal Magic Link Minting in Welcome Drafts  
**Date**: 2026-09-11  
**Status**: Complete

## Overview

This document consolidates research findings for integrating magic link token generation into the welcome drafts workflow. All technical unknowns from the planning phase have been resolved through codebase investigation.

## Research Tasks

### 1. Token Generation Implementation

**Question**: How are guest portal tokens currently generated and stored?

**Decision**: Use existing `generateGuestToken()` from `lib/token.ts`

**Rationale**:
- Function already exists and is battle-tested in `/api/bookings/[id]/generate-link`
- Generates cryptographically secure 32-byte tokens (base64url encoded)
- Returns both raw token (for URL) and SHA-256 hash (for database storage)
- Follows security best practice of never storing raw tokens

**Alternatives considered**:
- ❌ Create new token generation function → Unnecessary duplication
- ❌ Use simpler random string → Less secure, no existing hash validation
- ✅ Reuse existing utility → Maintains consistency and security

**Implementation reference**: 
```typescript
// From lib/token.ts
const { token, hash } = generateGuestToken()
const expiresAt = calculateTokenExpiry(booking.checkOut)
```

### 2. Token Reuse Strategy

**Question**: Should we generate new tokens every time or reuse existing valid tokens?

**Decision**: Reuse existing valid tokens when available

**Rationale**:
- Prevents token proliferation in database
- Maintains link stability if staff accidentally regenerate drafts
- Matches behavior of existing `/api/bookings/[id]/generate-link` endpoint (revokes old, creates new only when explicitly requested)
- Simpler for guests (same link works across multiple sends)

**Implementation approach**:
```typescript
// Check for existing valid token
const existingToken = db.prepare(`
  SELECT token_hash, expires_at 
  FROM guest_tokens 
  WHERE booking_id = ? 
    AND revoked = 0 
    AND datetime(expires_at) > datetime('now')
  ORDER BY created_at DESC 
  LIMIT 1
`).get(bookingId)

// Reuse if valid, generate new if none exists or expired
```

**Alternatives considered**:
- ❌ Always generate new tokens → Creates database clutter, inconsistent URLs
- ❌ Never generate tokens, use booking ID in URL → Security risk, no expiry control
- ✅ Conditional generation with reuse → Balances stability and freshness

### 3. Database Schema Verification

**Question**: Does the existing `guest_tokens` table support all required operations?

**Decision**: Use existing schema as-is (no migration required)

**Rationale**:
- Table already exists with correct columns: `id`, `booking_id`, `token_hash`, `expires_at`, `created_at`, `used_at`, `last_accessed_at`, `revoked`
- Supports token lookup by booking_id with revoked and expiry filters
- Foreign key relationship to bookings table already established
- Tested and working in production for guest portal access

**Schema validation**:
```sql
CREATE TABLE guest_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT,
  last_accessed_at TEXT,
  revoked INTEGER DEFAULT 0,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
)
```

**Alternatives considered**:
- ❌ Add new columns for draft-specific metadata → Unnecessary, existing schema sufficient
- ❌ Create separate draft_tokens table → Over-engineering, same token works for both use cases
- ✅ Use existing schema → Zero migration risk, proven in production

### 4. Error Handling Strategy

**Question**: What should happen when token generation fails?

**Decision**: Continue draft generation, mark affected drafts with `missing_portal_url` flag

**Rationale**:
- Fails gracefully without blocking entire draft generation
- Staff can see which drafts need manual token generation
- Matches existing pattern for missing guest phone (tracked in `missingFields` array)
- Allows partial success rather than all-or-nothing approach

**Implementation pattern**:
```typescript
try {
  const { token, hash } = generateGuestToken()
  // ... store token and generate URL
  draft.portalUrl = getGuestPortalUrl(token)
} catch (error) {
  console.error(`Token generation failed for booking ${booking.id}:`, error)
  draft.missingFields.push('portal_url')
  draft.portalUrl = null
}
```

**Alternatives considered**:
- ❌ Fail entire request if any token fails → Poor UX, blocks all drafts
- ❌ Skip drafts with failed tokens → Loses visibility of issue
- ✅ Mark and continue → Transparent, allows manual recovery

### 5. Portal URL Construction

**Question**: How should we construct the full guest portal URLs?

**Decision**: Use existing `getGuestPortalUrl(token, requestHost?)` from `lib/portal-url.ts`

**Rationale**:
- Function already handles environment-aware URL construction
- Respects `NEXT_PUBLIC_PORTAL_BASE_URL` for domain split (stay.thebrowns.co.za)
- Falls back gracefully to guestflow.thebrowns.co.za if not configured
- Tested in existing magic link generation endpoint

**URL format**: `https://guestflow.thebrowns.co.za/guest/{token}` where token is 43-character URL-safe string

**Alternatives considered**:
- ❌ Hardcode domain → Breaks environment flexibility, violates existing architecture
- ❌ Build URL manually → Duplicates logic, risk of inconsistency
- ✅ Use existing helper → Maintains consistency across all portal links

### 6. Message Text Integration

**Question**: Where in the draft message should the portal URL appear?

**Decision**: Replace `[PORTAL_URL]` placeholder if present, or append after greeting section

**Rationale**:
- Legacy welcome-draft-pack tool used `[PORTAL_URL]` placeholder convention
- New API-generated drafts already include greeting + basic info structure
- Consistent placement improves staff review workflow
- Matches current message structure in `generateWelcomeMessage()` function

**Implementation location**:
```typescript
// Current message structure:
// # Welcome Message Stub — {name}
// **Check-in:** {date}
// **Property:** {property}
// 
// Hi there,
// Looking forward to welcoming you...
// 
// [INSERT PORTAL SECTION HERE]
// 🔗 Your digital welcome pack:
// {PORTAL_URL}
// 
// Warm regards,
// The GuestFlow Team
```

**Alternatives considered**:
- ❌ Put URL at top of message → Disrupts natural greeting flow
- ❌ Bury at bottom after signature → Low visibility, might be missed
- ✅ After greeting, before signature → Natural flow, prominent placement

## Technology Stack Summary

| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Runtime | Node.js | 20+ | ✅ Existing |
| Framework | Next.js App Router | 14.2 | ✅ Existing |
| Language | TypeScript | 5.5 | ✅ Existing |
| Database | SQLite (better-sqlite3) | 11.0 | ✅ Existing |
| Crypto | Node.js crypto module | Built-in | ✅ Existing |
| Testing | Vitest | 1.0 | ✅ Existing |

## Dependencies

### Existing Utilities (No Changes Required)

- `lib/token.ts`: `generateGuestToken()`, `hashToken()`, `calculateTokenExpiry()`
- `lib/portal-url.ts`: `getGuestPortalUrl()`, `getPortalBaseUrl()`
- `lib/db.ts`: `getDb()`, `getDbAsync()`

### API Endpoint to Modify

- `app/api/welcome-drafts/route.ts`: Add token minting logic to GET handler

### Database Tables (Existing Schema)

- `bookings`: Source of guest reservation data
- `guest_tokens`: Storage for hashed tokens

## Integration Points

### 1. Draft Generation Flow

```
User requests drafts → API filters bookings → For each booking:
  1. Check for existing valid token
  2. Generate new token if needed
  3. Store token hash in guest_tokens
  4. Construct portal URL with getGuestPortalUrl()
  5. Include URL in message text
  6. Return draft with portalUrl field populated
```

### 2. Token Lifecycle

```
Generate → Store (hashed) → Include in draft → Staff approves → Send to guest → Guest clicks → Mark as used → Expire after checkout + 14 days
```

### 3. Error Paths

- Token generation fails → Mark draft with `missing_portal_url` flag
- Database write fails → Log error, mark draft with missing flag
- Existing token expired → Revoke old token, generate new one
- No check-out date → Calculate expiry as check-in + 14 days

## Testing Strategy

### Unit Tests (Vitest)

- ✅ Token generation and storage
- ✅ Token reuse logic (existing valid token)
- ✅ Token regeneration (expired token)
- ✅ Error handling (database failure)
- ✅ URL construction

### Integration Tests

- ✅ Full draft generation with portal URLs
- ✅ Portal URL clicking (guest portal loads)
- ✅ Token persistence across draft regeneration

### Manual Testing (Smoke Tests)

- ✅ Generate drafts in Ops Hub
- ✅ Verify portal URLs in message text
- ✅ Click portal URL, confirm guest portal loads
- ✅ Regenerate drafts, confirm same URLs
- ✅ Test with missing check-out dates
- ✅ Test with database errors (graceful degradation)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token generation slows down draft API | Medium | Add per-booking try-catch, continue on failure |
| Database contention with simultaneous token creation | Low | SQLite handles concurrent writes, small scale (~10 bookings) |
| Raw token exposure in API response | High | NEVER return raw token in draft response, only in dedicated generate-link endpoint |
| Token reuse logic fails, creates duplicates | Medium | Unique constraint on token_hash prevents duplicates, transaction ensures atomicity |
| Portal URL domain misconfiguration | Medium | Use existing getGuestPortalUrl helper, respects env vars, falls back to safe default |

## Open Questions

**None** - All technical unknowns resolved through codebase investigation.

## Next Steps

Proceed to **Phase 1: Design & Contracts** to document:
- Data model changes (if any)
- API contract changes (WelcomeDraft interface)
- Quickstart validation guide
