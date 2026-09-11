# Data Model: Portal Magic Link Minting in Welcome Drafts

**Feature**: Portal Magic Link Minting in Welcome Drafts  
**Date**: 2026-09-11

## Overview

This feature introduces minimal data model changes - primarily extending the WelcomeDraft interface to include populated portal URL fields. The underlying database schema (`bookings`, `guest_tokens`) remains unchanged.

## Entities

### WelcomeDraft (TypeScript Interface)

**Purpose**: Represents a generated welcome message for a booking, returned by the `/api/welcome-drafts` endpoint.

**Location**: `apps/guestflow/src/app/api/welcome-drafts/route.ts` (inline interface)

**Changes**: Add `portalUrl` field and update `message` to include actual URLs

```typescript
interface WelcomeDraft {
  id: number                  // Booking ID
  guestName: string           // Guest full name
  checkIn: string             // ISO date string (YYYY-MM-DD)
  checkOut: string            // ISO date string (YYYY-MM-DD)
  property: string            // Property name
  roomNumber: string | null   // Room/suite number if assigned
  message: string             // Draft message body WITH portal URL included
  missingFields: string[]     // Validation flags (e.g., 'guest_phone', 'portal_url')
  portalUrl?: string          // NEW: Full guest portal URL (https://...guest/{token})
}
```

**Validation Rules**:
- `portalUrl` MUST match pattern `https://{domain}/guest/{token}` where token is 43-char URL-safe string
- `portalUrl` MUST be included in `message` text
- If `portalUrl` is null/undefined, `missingFields` MUST include `'portal_url'`
- `message` MUST NOT contain placeholder text `[PORTAL_URL]`

**State Transitions**:
None (stateless API response, not persisted)

---

### guest_tokens (Database Table)

**Purpose**: Stores hashed magic link tokens for guest portal access

**Location**: SQLite database, table already exists

**Schema**: No changes required

```sql
CREATE TABLE guest_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,      -- SHA-256 hash of raw token
  expires_at TEXT NOT NULL,             -- ISO datetime string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT,                         -- First portal access timestamp
  last_accessed_at TEXT,                -- Most recent portal access
  revoked INTEGER DEFAULT 0,            -- 0=active, 1=revoked
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE INDEX idx_guest_tokens_booking ON guest_tokens(booking_id);
CREATE INDEX idx_guest_tokens_hash ON guest_tokens(token_hash);
```

**Validation Rules**:
- `booking_id` MUST reference valid booking
- `token_hash` MUST be unique (enforced by database)
- `expires_at` MUST be future datetime at creation
- `revoked` MUST be 0 or 1
- Only one non-revoked, non-expired token should exist per booking (enforced by application logic)

**State Transitions**:
```
[Created] 
  → used_at = NULL, revoked = 0
[First Access] 
  → used_at = timestamp, last_accessed_at = timestamp
[Subsequent Access] 
  → last_accessed_at = timestamp (updated)
[Revoked] 
  → revoked = 1 (permanent, cannot un-revoke)
[Expired] 
  → datetime('now') > datetime(expires_at) (time-based, automatic)
```

---

### bookings (Database Table)

**Purpose**: Stores guest reservation details

**Location**: SQLite database, table already exists

**Schema**: No changes required (read-only for this feature)

```sql
-- Relevant columns for this feature:
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  check_in TEXT NOT NULL,           -- ISO date string
  check_out TEXT NOT NULL,          -- ISO date string (used for token expiry)
  room_number TEXT,
  status TEXT,
  property_id INTEGER,
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
```

**Usage in Feature**:
- **Read**: Fetch booking details during draft generation
- **Write**: None (bookings table not modified by this feature)

---

## Relationships

```
bookings (1) ─────< (N) guest_tokens
   │
   │ (read during draft generation)
   ↓
WelcomeDraft (ephemeral response)
   └─ portalUrl: constructed from guest_tokens.token_hash lookup
```

**Cardinality**:
- One booking → Many guest_tokens (historical tokens, but only one active at a time)
- One booking → One WelcomeDraft (ephemeral, generated on demand)
- One guest_token → One booking (foreign key constraint)

---

## Data Flow

### Draft Generation with Token Minting

```
1. API receives GET /api/welcome-drafts?tenant_id=1&as_of=2026-09-15
2. Query bookings table for matching check-ins
3. For each booking:
   a. Query guest_tokens for existing valid token (booking_id, not revoked, not expired)
   b. IF valid token exists:
      - Reuse token_hash (no new database write)
      - Reconstruct portal URL from stored hash? NO - cannot reverse hash
      - Store raw token temporarily? NO - security risk
      - Solution: Store raw token transiently during draft generation only
   c. ELSE:
      - Generate new token with generateGuestToken()
      - Calculate expiry with calculateTokenExpiry(booking.check_out)
      - INSERT INTO guest_tokens (booking_id, token_hash, expires_at)
      - Keep raw token in memory for URL construction
   d. Construct URL: getGuestPortalUrl(rawToken)
   e. Build draft message with URL embedded
   f. Return WelcomeDraft with portalUrl field populated
```

### Token Reuse Challenge

**Problem**: We store `token_hash` (SHA-256) in database, but need raw token to construct URL.

**Solution**: When reusing existing token, we cannot reconstruct the raw token from hash. Therefore:

**Option A** (CHOSEN): Always generate new token during draft generation, revoke old
- ✅ Simpler implementation
- ✅ No need to store raw tokens
- ❌ Creates new token on every draft refresh (minor concern)

**Option B**: Store raw token temporarily in cache/session
- ❌ Security risk (raw tokens in memory/cache)
- ❌ Adds complexity (cache invalidation, key management)

**Implementation Decision**: Use Option A - generate fresh tokens during draft generation. This matches the behavior of the explicit "Generate Link" button and ensures staff always have a working URL without security tradeoffs.

**Revised Flow**:
```
3. For each booking:
   a. Check if any active tokens exist (for logging/awareness only)
   b. Revoke any existing active tokens for this booking
   c. Generate new token with generateGuestToken()
   d. INSERT INTO guest_tokens (booking_id, token_hash, expires_at, revoked=0)
   e. Construct URL: getGuestPortalUrl(rawToken)
   f. Include URL in draft message
```

This approach:
- ✅ Never stores raw tokens
- ✅ Always provides fresh, working URLs in drafts
- ✅ Maintains security (only hashes in database)
- ✅ Simpler implementation (no cache/session management)
- ❌ Creates token churn (acceptable tradeoff for security + simplicity)

---

## Migration Requirements

**None** - All required database tables and columns already exist.

---

## Data Validation

### At Draft Generation Time

- ✅ Booking has `guest_name` (required - already filtered)
- ✅ Booking has `check_in` date (required - already validated)
- ⚠️ Booking may lack `check_out` date → Default to check_in + 14 days for expiry
- ⚠️ Token generation may fail → Mark draft with `'portal_url'` in missingFields

### At Token Storage Time

- ✅ `token_hash` is unique (database constraint)
- ✅ `booking_id` references valid booking (foreign key)
- ✅ `expires_at` is valid ISO datetime string
- ✅ `revoked` is 0 at creation

### At URL Construction Time

- ✅ Raw token is 43-character URL-safe base64 string
- ✅ Constructed URL matches pattern `https://{domain}/guest/{token}`
- ✅ Domain respects NEXT_PUBLIC_PORTAL_BASE_URL or falls back to guestflow.thebrowns.co.za

---

## Indexes & Performance

**Existing Indexes**:
- `idx_guest_tokens_booking` on `guest_tokens(booking_id)` → Efficient token lookup by booking
- `idx_guest_tokens_hash` on `guest_tokens(token_hash)` → Fast guest portal auth lookup

**Query Performance**:
- Token lookup: O(1) with index on booking_id
- Draft generation: O(N) where N = number of bookings in date window (typically 1-10)
- Token insert: O(1) with automatic index updates

**No performance concerns** for expected scale (~10-50 bookings per week, 1-5 concurrent drafts).

---

## Security Considerations

- ✅ **Never store raw tokens** in database (only SHA-256 hashes)
- ✅ **Never return raw tokens** in WelcomeDraft API response (only final URL)
- ✅ **Tokens are cryptographically random** (32 bytes from crypto.randomBytes)
- ✅ **Tokens expire automatically** based on checkout date + 14 days
- ✅ **Revoked tokens cannot be reused** (database flag prevents resurrection)
- ✅ **One-way hashing** prevents rainbow table attacks (SHA-256)

---

## Open Questions

**None** - Data model design complete and validated against existing schema.
