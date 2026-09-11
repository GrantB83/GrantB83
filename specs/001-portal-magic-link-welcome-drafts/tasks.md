# Tasks: Portal Magic Link Minting in Welcome Drafts

**Input**: Design documents from `/specs/001-portal-magic-link-welcome-drafts/`

**Prerequisites**: plan.md, spec.md (with user stories P1-P3), research.md, data-model.md, contracts/

**Tests**: Integration tests included per feature requirements (validation tests in quickstart.md)

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js 14 App Router structure:
- API routes: `apps/guestflow/src/app/api/`
- Utilities: `apps/guestflow/src/lib/`
- Tests: `apps/guestflow/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing utilities and prepare test infrastructure

- [x] T001 Verify existing token generation utilities (generateGuestToken, hashToken, calculateTokenExpiry) in apps/guestflow/src/lib/token.ts
- [x] T002 Verify existing portal URL helpers (getGuestPortalUrl, getPortalBaseUrl) in apps/guestflow/src/lib/portal-url.ts
- [x] T003 [P] Verify guest_tokens table schema supports required operations (SELECT with filters, INSERT, UPDATE for revocation)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend WelcomeDraft interface and prepare database access patterns

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Update WelcomeDraft interface to include portalUrl?: string field in apps/guestflow/src/app/api/welcome-drafts/route.ts (lines 10-22)
- [x] T005 [P] Create helper function to check for existing valid tokens in apps/guestflow/src/app/api/welcome-drafts/route.ts: getExistingValidToken(db, bookingId) returns token metadata or null
- [x] T006 [P] Create helper function to revoke existing tokens in apps/guestflow/src/app/api/welcome-drafts/route.ts: revokeExistingTokens(db, bookingId) sets revoked=1 for active tokens
- [x] T007 [P] Create helper function to mint and store new token in apps/guestflow/src/app/api/welcome-drafts/route.ts: mintAndStoreToken(db, bookingId, checkOut) returns {rawToken, tokenHash, expiresAt}

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Staff Generate Welcome Drafts with Working Portal Links (Priority: P1) 🎯 MVP

**Goal**: When staff generate welcome drafts, each draft includes a working guest portal magic link URL minted during generation

**Independent Test**: Generate drafts in Ops Hub, verify each includes URL matching https://{domain}/guest/{43-char-token}, click URL to confirm portal loads

### Implementation for User Story 1

- [x] T008 [US1] Modify generateWelcomeMessage function in apps/guestflow/src/app/api/welcome-drafts/route.ts (lines 36-79) to accept optional portalUrl parameter and include portal section in message body after greeting
- [x] T009 [US1] Update GET handler in apps/guestflow/src/app/api/welcome-drafts/route.ts to import token and portal-url utilities (lines 1-4): add imports for generateGuestToken, hashToken, calculateTokenExpiry, getGuestPortalUrl
- [x] T010 [US1] Add token minting logic to draft generation loop in apps/guestflow/src/app/api/welcome-drafts/route.ts (after line 114): For each booking: (1) revoke old tokens, (2) generate new token with generateGuestToken(), (3) calculate expiry with calculateTokenExpiry(check_out || check_in + 14 days), (4) INSERT into guest_tokens, (5) construct URL with getGuestPortalUrl(token)
- [x] T011 [US1] Wrap token generation in try-catch in apps/guestflow/src/app/api/welcome-drafts/route.ts: on error, log to console and push 'portal_url' to draft.missingFields, set draft.portalUrl = null
- [x] T012 [US1] Pass portalUrl to generateWelcomeMessage and populate draft.portalUrl field in response in apps/guestflow/src/app/api/welcome-drafts/route.ts (lines 124-134)
- [ ] T013 [US1] Test draft generation in Ops Hub at http://localhost:3100/ops/welcome-drafts - verify portal URLs appear in message text and portalUrl field is populated

**Checkpoint**: User Story 1 complete - staff can generate drafts with working portal links

---

## Phase 4: User Story 2 - Portal Links Persist and Can Be Re-Used (Priority: P2)

**Goal**: Generated tokens are fresh on each draft generation (revoke-and-regenerate pattern) for security and consistency

**Independent Test**: Generate drafts, note URL, refresh drafts, verify URL has changed (new token minted), verify both URLs still work when clicked

### Implementation for User Story 2

- [ ] T014 [US2] Verify token revocation logic from T010 works correctly: Query guest_tokens table after draft generation and confirm old tokens have revoked=1
- [ ] T015 [US2] Add database query logging (temporary) in apps/guestflow/src/app/api/welcome-drafts/route.ts to track token INSERT and UPDATE operations during development
- [ ] T016 [US2] Test token regeneration: Generate drafts twice for same booking, verify different portal URLs, verify both URLs load guest portal page successfully
- [ ] T017 [US2] Remove temporary logging from T015 after verification complete

**Checkpoint**: User Story 2 complete - token regeneration works correctly with revoke-and-regenerate pattern

---

## Phase 5: User Story 3 - Portal Links Removed from Placeholders (Priority: P1)

**Goal**: No [PORTAL_URL] placeholder text appears in any draft message, only actual working URLs

**Independent Test**: Generate drafts, search all message text for "[PORTAL_URL]", verify zero occurrences, verify actual URLs present

### Implementation for User Story 3

- [ ] T018 [US3] Verify message generation from T008 includes actual portal URL in body (check generateWelcomeMessage output includes portal section with URL parameter)
- [ ] T019 [US3] Add validation check in apps/guestflow/src/app/api/welcome-drafts/route.ts after draft generation: for each draft.message, assert it does not contain '[PORTAL_URL]' substring
- [ ] T020 [US3] Test in Ops Hub: generate drafts and manually inspect all message text for placeholder strings - confirm none present
- [ ] T021 [US3] Test via API: curl http://localhost:3100/api/welcome-drafts?tenant_id=1 | grep -q '[PORTAL_URL]' should return no matches

**Checkpoint**: User Story 3 complete - all portal URLs are real, no placeholders

---

## Phase 6: Integration Testing

**Purpose**: End-to-end validation across all user stories

- [ ] T022 [P] Create integration test file apps/guestflow/__tests__/welcome-drafts-portal-links.test.ts with Vitest setup
- [ ] T023 [P] Write test: "welcome drafts include working portal URLs" - fetch /api/welcome-drafts, assert portalUrl field populated, assert URL matches pattern https://.../guest/[43-char-token]
- [ ] T024 [P] Write test: "portal URLs appear in message text" - fetch drafts, assert draft.message contains draft.portalUrl string
- [ ] T025 [P] Write test: "no [PORTAL_URL] placeholders in messages" - fetch drafts, assert no message contains '[PORTAL_URL]' substring
- [ ] T026 [P] Write test: "missingFields includes portal_url when generation fails" - mock database INSERT failure, assert draft.missingFields includes 'portal_url'
- [ ] T027 [P] Write test: "missing check_out date uses fallback expiry" - create booking with null check_out, generate draft, verify token.expires_at = check_in + 14 days
- [ ] T028 Run all integration tests: npm test -- welcome-drafts-portal-links.test.ts and verify all pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements and final validation across all user stories

- [ ] T029 [P] Code cleanup: Remove any temporary console.log statements from token minting code in apps/guestflow/src/app/api/welcome-drafts/route.ts
- [ ] T030 [P] Add JSDoc comments to helper functions created in Phase 2 (getExistingValidToken, revokeExistingTokens, mintAndStoreToken)
- [ ] T031 Verify TypeScript compilation: npm run build in apps/guestflow directory - should complete without errors
- [ ] T032 Run full test suite: npm test in apps/guestflow directory - all tests should pass
- [ ] T033 Execute quickstart validation from specs/001-portal-magic-link-welcome-drafts/quickstart.md: Scenario 1 (generate drafts with portal links)
- [ ] T034 Execute quickstart validation: Scenario 2 (portal URLs are clickable and load guest portal)
- [ ] T035 Execute quickstart validation: Scenario 3 (token persistence - URLs change on refresh)
- [ ] T036 Execute quickstart validation: Scenario 5 (no placeholder text in any draft)
- [ ] T037 [P] Update AGENTS.md if needed to document this workflow for future reference (optional based on project conventions)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1) can start immediately after Phase 2
  - US2 (P2) can start after Phase 2 (parallel with US1)
  - US3 (P1) can start after Phase 2 (parallel with US1/US2)
- **Integration Testing (Phase 6)**: Depends on all user stories complete
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 - No dependencies on other stories (MVP candidate)
- **User Story 2 (P2)**: Depends on Phase 2 and US1 implementation (uses token minting logic from US1)
- **User Story 3 (P1)**: Depends on Phase 2 and US1 implementation (validates message output from US1)

### Within Each User Story

- US1: Message generation (T008) → Token minting (T009-T012) → Manual testing (T013)
- US2: Revocation verification (T014-T015) → Regeneration testing (T016) → Cleanup (T017)
- US3: Message validation (T018-T019) → Manual testing (T020-T021)

### Parallel Opportunities

- Phase 1: T001, T002, T003 can run in parallel (verification tasks)
- Phase 2: T005, T006, T007 can run in parallel (helper functions in separate sections)
- Phase 6: T022-T027 can run in parallel (test writing in same file with different test blocks)
- Phase 7: T029, T030, T037 can run in parallel (different files)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all helper function tasks together after T004:
Task: "Create helper function to check for existing valid tokens"
Task: "Create helper function to revoke existing tokens"
Task: "Create helper function to mint and store new token"
```

## Parallel Example: Phase 6 (Integration Tests)

```bash
# Launch all test writing tasks together:
Task: "Write test: welcome drafts include working portal URLs"
Task: "Write test: portal URLs appear in message text"
Task: "Write test: no [PORTAL_URL] placeholders in messages"
Task: "Write test: missingFields includes portal_url when generation fails"
Task: "Write test: missing check_out date uses fallback expiry"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify utilities exist)
2. Complete Phase 2: Foundational (interface + helpers)
3. Complete Phase 3: User Story 1 (draft generation with portal links)
4. **STOP and VALIDATE**: Test in Ops Hub, verify URLs work
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!) ✅ Staff can generate drafts with portal links
3. Add User Story 2 → Test independently → Verify token regeneration works
4. Add User Story 3 → Test independently → Confirm no placeholders
5. Integration Tests → Automated validation complete
6. Polish → Production ready

### Parallel Team Strategy

Single developer (likely scenario):
1. Complete Setup + Foundational sequentially
2. Complete US1 (P1) - MVP
3. Complete US2 (P2) and US3 (P1) - can be done sequentially or in quick succession since they build on US1
4. Integration tests + Polish

With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (blocking for others)
   - After US1 complete:
     - Developer A: User Story 2
     - Developer B: User Story 3
     - Developer C: Integration tests (Phase 6)
3. Final polish together

---

## Notes

- [P] tasks = different files or non-conflicting sections, no dependencies
- [Story] label maps task to specific user story from spec.md
- Each user story should be independently testable after completion
- Commit after each task or logical group (T008-T012 could be one commit for US1 core)
- Stop at any checkpoint to validate story independently
- Feature modifies only one primary file (welcome-drafts/route.ts) - most tasks are in same file but can be done sequentially
- Token security: Never store raw tokens in database, only SHA-256 hashes (enforced by existing helpers)
- Error handling: Graceful degradation - failed token generation doesn't block entire draft response

---

## Task Count Summary

- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 4 tasks
- **User Story 1 (Phase 3)**: 6 tasks ← MVP
- **User Story 2 (Phase 4)**: 4 tasks
- **User Story 3 (Phase 5)**: 4 tasks
- **Integration Testing (Phase 6)**: 7 tasks
- **Polish (Phase 7)**: 9 tasks

**Total**: 37 tasks

**MVP Scope**: Phases 1-3 (13 tasks) delivers working portal links in welcome drafts

**Full Feature**: All 37 tasks delivers validated, tested, production-ready implementation
