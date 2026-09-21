# Quickstart: GuestFlow WiFi Source of Record

**Feature**: GuestFlow WiFi SoR | **Date**: 2026-09-21

## Purpose

This quickstart provides step-by-step validation scenarios to verify the WiFi SoR feature works end-to-end. Use these scenarios after implementation to confirm the feature meets all acceptance criteria.

## Prerequisites

- Local development environment with `apps/guestflow` running
- SQLite database initialized with `property_access_codes` and `access_code_audit_log` tables
- Staff authentication credentials
- Test tenant ID and property data

## Validation Scenarios

### Scenario 1: Staff Edit WiFi Credentials

**Goal**: Verify staff can edit WiFi network and password via `/ops/access-codes` UI

**Steps**:
1. Navigate to `http://localhost:3000/ops/access-codes` (or Vercel Preview URL)
2. Authenticate as staff user
3. Locate WiFi section for cottage property
4. Edit WiFi network name: `CottageTestNet`
5. Edit WiFi password: `TestPass123` (masked by default)
6. Click reveal toggle to verify password is correct
7. Click Save
8. Verify success message appears
9. Refresh page
10. Verify new WiFi credentials are displayed (network plaintext, password masked)

**Expected Outcome**:
- WiFi network and password saved to database
- Audit log entry created with staff ID and timestamp
- No plaintext password in server logs or console

**Acceptance Criteria Met**: FR-002, FR-003, SC-001

---

### Scenario 2: Audit Log Verification

**Goal**: Verify WiFi changes are logged with metadata only (no passwords)

**Steps**:
1. Navigate to `http://localhost:3000/ops/access-codes`
2. Scroll to Audit Log section
3. Verify entry exists for WiFi password change (from Scenario 1)
4. Check entry contains:
   - Property: `cottage`
   - Code type: `wifi_password`
   - Changed at: timestamp
   - Changed by: staff ID
   - Action: `update`
5. Verify entry does NOT contain plaintext password

**Expected Outcome**:
- Audit log shows metadata only
- No plaintext passwords logged

**Acceptance Criteria Met**: FR-003, SC-003

---

### Scenario 3: Guest Portal WiFi - DB Value

**Goal**: Verify guest portal uses WiFi from database (SoR)

**Steps**:
1. Query database to verify cottage has WiFi credentials:
   ```sql
   SELECT code_type, code_value FROM property_access_codes 
   WHERE property='cottage' AND code_type IN ('wifi_network', 'wifi_password');
   ```
2. Create test booking with magic token for cottage
3. GET `/api/guest-portal/{token}`
4. Verify response includes:
   ```json
   {
     "stayPacket": {
       "wifi": {
         "network": "CottageTestNet",
         "password": "TestPass123"
       }
     }
   }
   ```

**Expected Outcome**:
- Guest portal returns DB WiFi credentials
- Env vars are ignored (DB-first wins)

**Acceptance Criteria Met**: FR-004, FR-005, SC-002

---

### Scenario 4: Guest Portal WiFi - Env Fallback

**Goal**: Verify guest portal falls back to env vars when NO DB row exists

**Steps**:
1. Delete WiFi rows from database for main-house:
   ```sql
   DELETE FROM property_access_codes 
   WHERE property='main-house' AND code_type IN ('wifi_network', 'wifi_password');
   ```
2. Set environment variables:
   ```bash
   export WIFI_NETWORK=EnvFallbackNet
   export WIFI_PASSWORD=EnvFallback123
   ```
3. Create test booking for main-house
4. GET `/api/guest-portal/{token}`
5. Verify response includes:
   ```json
   {
     "stayPacket": {
       "wifi": {
         "network": "EnvFallbackNet",
         "password": "EnvFallback123"
       }
     }
   }
   ```

**Expected Outcome**:
- Guest portal returns env var values when NO DB row exists
- Fallback is seamless

**Acceptance Criteria Met**: FR-004, FR-005, SC-002

---

### Scenario 5: Guest Portal WiFi - Fail-Closed

**Goal**: Verify system returns placeholder when both DB and env are empty

**Steps**:
1. Delete WiFi rows from database for cottage:
   ```sql
   DELETE FROM property_access_codes 
   WHERE property='cottage' AND code_type IN ('wifi_network', 'wifi_password');
   ```
2. Unset environment variables:
   ```bash
   unset WIFI_NETWORK
   unset WIFI_PASSWORD
   ```
3. GET `/api/guest-portal/{token}` for cottage booking
4. Verify response includes:
   ```json
   {
     "stayPacket": {
       "wifi": {
         "network": "[ASK STAFF]",
         "password": "[ASK STAFF]"
       }
     }
   }
   ```

**Expected Outcome**:
- System returns `[ASK STAFF]` placeholder
- No invented credentials
- No error thrown

**Acceptance Criteria Met**: FR-004, FR-005, SC-004

---

### Scenario 6: Welcome Draft WiFi Line

**Goal**: Verify welcome drafts use WiFi SoR

**Steps**:
1. Populate cottage WiFi in database (from Scenario 1)
2. POST `/api/welcome-drafts` with cottage booking data
3. Verify draft response includes WiFi line:
   ```
   WiFi Network: CottageTestNet
   Password: TestPass123
   ```
4. Delete cottage WiFi from DB and set env vars
5. POST `/api/welcome-drafts` again
6. Verify draft uses env fallback values
7. Clear env vars
8. POST `/api/welcome-drafts` again
9. Verify draft shows placeholder:
   ```
   WiFi: [ASK STAFF]
   ```

**Expected Outcome**:
- Welcome drafts use same SoR resolution as guest portal
- Fail-closed to placeholder when empty

**Acceptance Criteria Met**: FR-006, SC-002

---

### Scenario 7: Late Check-In Pack WiFi

**Goal**: Verify late check-in packs use WiFi SoR

**Steps**:
1. Generate late check-in pack for cottage booking
2. Verify pack includes WiFi credentials from DB (if populated)
3. Test with empty DB and env fallback
4. Test with both empty (should show placeholder)

**Expected Outcome**:
- Late check-in packs use same SoR resolution
- Consistent behavior across all WiFi consumers

**Acceptance Criteria Met**: FR-007, SC-002

---

### Scenario 8: Password Redaction in Tests

**Goal**: Verify unit tests never print plaintext WiFi passwords

**Steps**:
1. Run test suite:
   ```bash
   cd apps/guestflow && npm test
   ```
2. Grep test output for password patterns:
   ```bash
   npm test 2>&1 | grep -i "password" | grep -v "\[REDACTED\]\|****"
   ```
3. Verify no plaintext passwords found

**Expected Outcome**:
- All test fixtures use `[REDACTED]` or `****` for passwords
- No live credentials in test output

**Acceptance Criteria Met**: FR-008, SC-003

---

### Scenario 9: DB Row Empty → Placeholder

**Goal**: Verify empty DB row (staff cleared value) returns placeholder, not env fallback

**Steps**:
1. Insert empty WiFi password in database:
   ```sql
   INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
   VALUES (1, 'cottage', 'wifi_password', '', '', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z')
   ON CONFLICT(tenant_id, property, code_type, suite) DO UPDATE SET code_value = '';
   ```
2. Set env var:
   ```bash
   export WIFI_PASSWORD=EnvShouldBeIgnored
   ```
3. GET `/api/guest-portal/{token}` for cottage
4. Verify password is `[ASK STAFF]`, NOT `EnvShouldBeIgnored`

**Expected Outcome**:
- Empty DB row means staff explicitly cleared value
- Env fallback is NOT used (DB-first always wins when row exists)
- System returns placeholder

**Acceptance Criteria Met**: FR-004, SC-004

---

### Scenario 10: Multiple Properties Independent

**Goal**: Verify cottage and main-house WiFi credentials are independent

**Steps**:
1. Set cottage WiFi to `CottageNet` / `CottagePass`
2. Set main-house WiFi to `MainHouseNet` / `MainHousePass`
3. GET `/api/guest-portal/{cottage-token}`
4. Verify returns cottage WiFi
5. GET `/api/guest-portal/{main-house-token}`
6. Verify returns main-house WiFi
7. Verify no cross-property bleed

**Expected Outcome**:
- Each property has independent WiFi credentials
- No cross-contamination

**Acceptance Criteria Met**: FR-001, FR-004, SC-002

---

## Manual Testing Checklist

- [ ] Staff can edit WiFi network name per property
- [ ] Staff can edit WiFi password per property (masked by default, reveal toggle works)
- [ ] Audit log shows WiFi changes with metadata only (no passwords)
- [ ] Guest portal uses DB WiFi when available
- [ ] Guest portal falls back to env vars when NO DB row exists
- [ ] Guest portal shows `[ASK STAFF]` when both DB and env are empty
- [ ] Welcome drafts use WiFi SoR
- [ ] Late check-in packs use WiFi SoR
- [ ] Empty DB row (staff cleared) returns placeholder, NOT env fallback
- [ ] Unit tests never print plaintext passwords
- [ ] Cottage and main-house WiFi credentials are independent

## Rollback Procedure

If WiFi SoR implementation has critical issues in production:

1. **Immediate rollback**: Revert PR, redeploy previous version
2. **Database state**: WiFi rows in `property_access_codes` are safe to leave (no harm, just unused)
3. **Env vars**: Ensure `WIFI_NETWORK` and `WIFI_PASSWORD` env vars are still set (guests will use fallback)
4. **Guest impact**: Zero if env vars are set (fallback path maintained)

## Known Limitations (Out of Scope)

- No suite-specific WiFi credentials (property-wide only)
- No WiFi password strength validation
- No WiFi QR code generation
- No automatic rotation or expiration
- No real-time sync with router APIs
