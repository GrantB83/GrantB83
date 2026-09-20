# Feature Specification: GuestFlow Outbound Redirect for Pre-Live Testing

**Feature Branch**: `cursor/outbound-redirect-6711`

**Created**: 2026-09-20

**Status**: Ready for planning

**Input**: Grant CLEAR (20 Sep 2026) for GuestFlow pre-live outbound redirect: ALL Approve&Send channels deliver only to Grant test sinks (never real guest To) while `mode=redirect`. Dual-gate env control with fail-closed defaults. Shared redirect resolver for WhatsApp live (Twilio), Resend email, and WhatsApp Web send_jobs. Audit trail with intended_to + actual_to. Staff/Ops banner while mode ≠ live. Health surfaces redirect status. From identities unchanged. Phase 0 confirmToken/Approve unchanged. No auto-send. Tests for redirect rewrite, fail-closed missing sink, live requires LIVE_CLEAR, send-jobs to_address redirected. Docs for go-live (NeedsGrant: MODE=live + LIVE_CLEAR=true + redeploy). FORBID: WHATSAPP_MODE=sandbox as full redirect; hardcoding Grant numbers as only path; changing From; auto-send; flipping Production env inside CA; Phase 1 LLM/allowlist.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - All outbound channels redirect to Grant test sinks during pre-live (Priority: P1)

When `OUTBOUND_MODE=redirect` (or redirect enabled flag), staff approve and send a guest message as normal. The system intercepts the destination before calling external APIs and replaces the guest's phone/email with Grant's test WhatsApp (`+15124064300`) or test email (`grant830318@gmail.com`). The actual send goes to Grant's sink. All three channels—Twilio live WhatsApp, Resend email, and WhatsApp Web send_jobs queue—use the same redirect logic. From identities (`+27600200825` for WhatsApp, `RESEND_FROM_EMAIL` for email) remain unchanged so Grant sees realistic sender behavior.

**Why this priority**: This is the core safety gate. Without it, Approve&Send flows to real guests before Grant is ready to go live.

**Independent Test**: Set `OUTBOUND_MODE=redirect` plus both sink envs. Approve a WhatsApp draft with a real guest number, confirm send. Verify the message arrives at Grant's test WhatsApp `+15124064300`, not the original guest number. Repeat for email to a real guest address and verify arrival at `grant830318@gmail.com`. Check WhatsApp Web send_jobs queue has `to_address` set to Grant's sink, not the original guest contact.

**Acceptance Scenarios**:

1. **Given** `OUTBOUND_MODE=redirect` and both sink envs are set, and staff approve a WhatsApp draft for guest `+27821234567`, **When** they confirm send, **Then** the Twilio API call targets `whatsapp:+15124064300` and the original `+27821234567` is recorded in audit/metadata only
2. **Given** redirect mode and an email draft for `guest@example.com`, **When** staff send, **Then** Resend API is called with `to: grant830318@gmail.com` and the original email is audit-only
3. **Given** redirect mode and a WhatsApp Web job is queued for `+27821234567`, **When** the job is created in `send_jobs`, **Then** `to_address` is `+15124064300` (so the clicker sends to Grant's sink) and the original number is in metadata
4. **Given** redirect mode, **When** any channel sends successfully, **Then** From identity (`TWILIO_WHATSAPP_FROM` or `RESEND_FROM_EMAIL`) is not changed from production values
5. **Given** redirect mode, **When** staff review the conversation or check audit logs, **Then** they can see both `intended_to` (original guest contact) and `actual_to` (Grant's sink) plus redirect status

---

### User Story 2 - System refuses send when redirect sink is missing (fail-closed) (Priority: P1)

When `OUTBOUND_MODE=redirect` but a channel's sink env is empty or missing, the system refuses to send for that channel. Staff see a clear error (HTTP 503 or 500) explaining the redirect configuration is incomplete. No message is sent to the real guest To, and no message is sent at all. The From is never changed as a fallback. WhatsApp Web jobs are not created with missing sink. Logs show the refusal reason.

**Why this priority**: Fail-closed prevents accidental live guest sends when redirect is half-configured. It's a safety requirement from the CoS bounce.

**Independent Test**: Set `OUTBOUND_MODE=redirect` and `OUTBOUND_REDIRECT_TO_EMAIL=grant830318@gmail.com` but leave `OUTBOUND_REDIRECT_TO_WA` empty. Approve a WhatsApp draft and attempt send. Verify the send is blocked with a clear error (not silent fallback to guest number). Repeat for email with missing email sink. Confirm no external API call occurred and no send_jobs row with guest To was created.

**Acceptance Scenarios**:

1. **Given** `OUTBOUND_MODE=redirect` and `OUTBOUND_REDIRECT_TO_WA` is empty, **When** staff attempt WhatsApp send, **Then** the system returns HTTP 503 with an error message stating WhatsApp redirect sink is not configured and no Twilio API call is made
2. **Given** redirect mode and `OUTBOUND_REDIRECT_TO_EMAIL` is missing, **When** staff attempt email send, **Then** the system returns HTTP 500 with an error stating email redirect sink is not configured and no Resend API call is made
3. **Given** redirect mode and missing WhatsApp sink, **When** send_jobs job creation is attempted for `whatsapp_web`, **Then** the job is not created or is marked `blocked` with error_code indicating missing sink
4. **Given** redirect mode with missing sink, **When** send fails, **Then** logs show the refusal reason (e.g., "Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set") and staff see a clear UI error

---

### User Story 3 - Live mode requires explicit OUTBOUND_LIVE_CLEAR gate (Priority: P1)

When `OUTBOUND_MODE=live`, the system only sends to real guest contacts if `OUTBOUND_LIVE_CLEAR` is exactly the string `"true"`. If `OUTBOUND_LIVE_CLEAR` is missing, `"false"`, empty, or any other value, all sends are either blocked or forced back to redirect mode (with sink checks applied). Unknown or missing `OUTBOUND_MODE` in production defaults to redirect or block (never silent live guest send). Staff and health endpoints can detect when live mode is disabled by the LIVE_CLEAR gate.

**Why this priority**: Dual-gate requirement from CoS: mode alone is not enough. LIVE_CLEAR is the second key that must be turned.

**Independent Test**: Set `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR=false`. Approve a guest message and attempt send. Verify the send is blocked or redirected (not sent to real guest). Set `OUTBOUND_LIVE_CLEAR=true` and retry; verify send proceeds to the original guest contact (or is blocked if sinks are missing in redirect fallback). Set `OUTBOUND_MODE` to an unknown value or empty and verify redirect/block behavior.

**Acceptance Scenarios**:

1. **Given** `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR` is not exactly `"true"` (e.g., `"false"`, empty, missing), **When** staff attempt send, **Then** the system blocks or redirects (with fail-closed sink checks) and does not send to the real guest To
2. **Given** `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR=true`, **When** staff send, **Then** the system resolves the original guest contact as the recipient and proceeds (no redirect)
3. **Given** `OUTBOUND_MODE` is empty, missing, or an unknown value in production, **When** any send is attempted, **Then** the system treats it as redirect mode (or blocks) and never silently sends to real guest contacts
4. **Given** live mode is disabled by LIVE_CLEAR, **When** health or staff UI queries the outbound config, **Then** they report "outbound redirect: on" or "live mode: blocked" (not "live mode: active")

---

### User Story 4 - Staff see banner when outbound is not in live mode (Priority: P2)

While `OUTBOUND_MODE` is `redirect` (or when live mode is disabled by `OUTBOUND_LIVE_CLEAR`), the staff Ops hub or main layout displays a persistent banner stating "Outbound Redirect Active – All sends go to Grant test sinks." The banner is visible on every page staff load (or at least on the Needs Approval and inbound queue pages). When mode is `live` and `OUTBOUND_LIVE_CLEAR=true`, the banner is hidden. Banner styling is clear but not alarming (info-level, not error-level).

**Why this priority**: Visibility for staff and Grant. Without it, staff may forget that Production is still in redirect.

**Independent Test**: Log in as staff with `OUTBOUND_MODE=redirect`. Open the Ops hub or Needs Approval page and confirm a banner stating redirect is active. Change env to `mode=live` + `LIVE_CLEAR=true`, reload, and confirm the banner is gone. Change back to redirect and confirm the banner reappears.

**Acceptance Scenarios**:

1. **Given** `OUTBOUND_MODE=redirect`, **When** staff open the Ops hub or layout, **Then** a banner is displayed stating "Outbound Redirect Active – All sends go to Grant test sinks" (or similar wording)
2. **Given** `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR=true`, **When** staff open the same pages, **Then** the banner is not displayed
3. **Given** live mode is disabled by `OUTBOUND_LIVE_CLEAR` not being `"true"`, **When** staff load a page, **Then** the banner is displayed (or a "Live mode disabled" message)
4. **Given** staff see the banner, **When** they read it, **Then** it is info-level styling (not error-red) and does not block UI interaction

---

### User Story 5 - Health endpoint reports redirect mode status (Priority: P2)

The `/api/health` endpoint includes an `outboundRedirect` field in its JSON response indicating whether redirect is active. Possible values: `"on"` (redirect enabled), `"off"` (live mode with LIVE_CLEAR true), or `"blocked"` (live mode but LIVE_CLEAR not true). The endpoint also reports the mode value (`redirect` or `live`). This allows Grant and CoS to check Production redirect status without reading Vercel env directly. Health checks are unauthenticated (or use existing health auth) and never expose sink values or secrets.

**Why this priority**: Grant needs a quick way to verify Production mode before launching. Health is already in place.

**Independent Test**: Set `OUTBOUND_MODE=redirect` and call `GET /api/health`. Verify response includes `"outboundRedirect": "on"` and `"outboundMode": "redirect"`. Change to `mode=live` + `LIVE_CLEAR=true` and verify `"outboundRedirect": "off"` and `"outboundMode": "live"`. Change to `mode=live` + `LIVE_CLEAR=false` and verify `"outboundRedirect": "blocked"` (or similar).

**Acceptance Scenarios**:

1. **Given** `OUTBOUND_MODE=redirect`, **When** calling `/api/health`, **Then** the response JSON includes `"outboundRedirect": "on"` and `"outboundMode": "redirect"`
2. **Given** `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR=true`, **When** calling health, **Then** `"outboundRedirect": "off"` and `"outboundMode": "live"`
3. **Given** `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR` is not `"true"`, **When** calling health, **Then** `"outboundRedirect": "blocked"` or `"on"` (indicating live mode is disabled)
4. **Given** any mode, **When** health responds, **Then** sink values and secrets are never included in the response (only mode/status strings)

---

### User Story 6 - Audit and metadata records intended and actual recipients (Priority: P2)

For every send attempt (WhatsApp, email, send_jobs), the system records the original intended recipient (`intended_to`) and the actual recipient after redirect resolution (`actual_to` or `redirected_to`). For `send_jobs`, the `to_address` column holds the redirected sink when redirect is on, and a new metadata JSON column (or existing metadata field) holds the original guest contact and redirect status. Email audit (if a separate table or log exists) similarly records both. Logs redact the middle digits of guest numbers for privacy (e.g., `+2782***4567`) but keep full values in DB for ops review.

**Why this priority**: Grant and CoS need to verify that redirect is working and to audit which drafts were sent to sinks vs live guests when going live.

**Independent Test**: Send a redirected WhatsApp message. Query the conversation or message metadata and confirm `intended_to: +27821234567` and `actual_to: +15124064300` (or similar fields) are both present. Check a `send_jobs` row and confirm `to_address` is the sink and metadata JSON includes the original guest contact. Confirm logs show redacted guest numbers where appropriate.

**Acceptance Scenarios**:

1. **Given** a WhatsApp send is redirected, **When** the send completes, **Then** message metadata (or a log entry) includes `intended_to` (original guest number) and `actual_to` (Grant's sink)
2. **Given** an email send is redirected, **When** the send completes, **Then** email audit or metadata includes `intended_to` (original guest email) and `redirected_to` or `actual_to` (Grant's email sink)
3. **Given** a `send_jobs` row is created for a redirected WhatsApp Web message, **When** the row is inserted, **Then** `to_address` is Grant's sink and a metadata JSON field includes `intended_to` (original guest) and `redirect_enabled: true`
4. **Given** logs are written for a redirected send, **When** staff or Grant read the logs, **Then** guest contact middle digits are redacted (e.g., `+2782***4567`) but full values remain in database for ops queries

---

### User Story 7 - Tests validate all redirect scenarios and fail-closed behavior (Priority: P1)

Automated tests cover: (1) redirect rewrites `to` for WhatsApp and email and `to_address` for send_jobs when mode is redirect and sinks are set; (2) sends are blocked when redirect is on but a sink is missing for the channel; (3) live mode with `LIVE_CLEAR=true` sends to original guest contact; (4) live mode without `LIVE_CLEAR=true` blocks or redirects; (5) From identities are unchanged in all modes; (6) unknown/missing `OUTBOUND_MODE` defaults to redirect/block, not live. Tests run in CI and locally. No tests call live Twilio or Resend APIs (mocked or sandbox). Tests pass before PR is merged.

**Why this priority**: Grant CLEAR requires tests green. This is the quality gate.

**Independent Test**: Run `npm run test` in `apps/guestflow` and confirm all new test suites pass. Inspect test output for coverage of redirect rewrite, fail-closed, live gate, and mode defaults.

**Acceptance Scenarios**:

1. **Given** test suite for `outbound-redirect.ts`, **When** tests run, **Then** they verify `resolveOutboundRecipient` returns `{ to: sink, redirected: true, intendedTo: guest, mode: 'redirect' }` when mode is redirect and sinks are set
2. **Given** tests for `whatsapp.ts`, `email.ts`, and `send-jobs.ts`, **When** they run, **Then** they verify calls to those modules respect the resolved recipient and do not call external APIs when sinks are missing in redirect mode
3. **Given** tests for live mode, **When** `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR=true`, **Then** tests verify recipient is the original guest contact (no redirect)
4. **Given** tests for live mode without CLEAR, **When** `LIVE_CLEAR` is missing or not `"true"`, **Then** tests verify sends are blocked or redirected
5. **Given** all tests pass, **When** CI runs, **Then** the PR is marked green and ready for merge

---

### User Story 8 - Documentation explains go-live process for Grant (Priority: P3)

A README section or inline code comment in `outbound-redirect.ts` explains the go-live checklist: (1) Smoke test sends in redirect mode to Grant's sinks and verify arrival; (2) NeedsGrant: set `OUTBOUND_MODE=live` + `OUTBOUND_LIVE_CLEAR=true` in Vercel Production env; (3) Redeploy; (4) Verify health endpoint shows `outboundRedirect: off`; (5) Verify banner is gone; (6) Send one live test to a known-safe guest contact (e.g., Grant's own guest profile or a test reservation); (7) Never flip Production env inside this CA (Coding sets env after merge). Docs note that expiry or auto-flip to live is forbidden. Docs clarify that `WHATSAPP_MODE=sandbox` is separate and does not replace the redirect system.

**Why this priority**: Grant must know how to go live safely. Docs prevent missteps.

**Independent Test**: Read the documentation in the PR or in `outbound-redirect.ts` header comments and confirm all go-live steps are listed. Verify the checklist warns against auto-flip and clarifies that sandbox mode is not the same as redirect.

**Acceptance Scenarios**:

1. **Given** the PR is merged, **When** Grant or Coding reads the go-live docs, **Then** they find a clear checklist with all steps (smoke test → env set → redeploy → verify health/banner → safe live test)
2. **Given** the docs are read, **When** checking for forbidden actions, **Then** the docs explicitly state: no auto-flip, no Production env changes inside this CA, expiry→live is not allowed
3. **Given** the docs mention `WHATSAPP_MODE`, **When** reading, **Then** they clarify that sandbox mode is for Twilio dry-run only and does not replace the redirect system for all channels
4. **Given** the go-live checklist is followed, **When** Grant sets env and redeploys, **Then** the system behavior matches the documented steps (redirect off, banner gone, live sends work)

---

### Edge Cases

- What happens when `OUTBOUND_MODE` is set to an unknown value like `"test"` or is completely missing? System defaults to redirect or block (never silent live guest send). Health reports `outboundRedirect: on` or `blocked`.
- What happens when both sinks are set but one is invalid (e.g., email is not a valid email format)? Fail-closed: system blocks sends for that channel with a clear error.
- What happens when staff approve a draft, redirect is on, but they never confirm send? Nothing is sent (Phase 0 confirmToken gate still applies). Redirect logic only runs when send is actually triggered.
- What happens when Grant changes `OUTBOUND_MODE` from `redirect` to `live` without setting `OUTBOUND_LIVE_CLEAR=true`? Sends are blocked or redirected (dual-gate enforced).
- What happens when a `send_jobs` row is already queued with a guest `to_address` and then redirect is enabled? Existing jobs are not retroactively rewritten. New jobs created after redirect is enabled will have redirected `to_address`. (Optional: a migration or warning for operators to clear old pending jobs before enabling redirect.)
- What happens when Coding tests redirect in a non-Production environment (e.g., Preview)? Redirect works the same way (mode + sinks control behavior). Sinks can be set to different test values per environment if needed.
- What happens when staff try to send while `OUTBOUND_MODE` is being changed (race condition during redeploy)? The send attempt will use whichever mode value is read at the time of the resolver call. No atomic transition is guaranteed, but fail-closed defaults prevent accidental live sends during the transition.
- What happens when Grant wants to temporarily disable live sends after going live? Grant sets `OUTBOUND_LIVE_CLEAR=false` (or removes it), redeploys, and sends revert to redirect/block. Banner reappears.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST read `OUTBOUND_MODE` environment variable and interpret `"redirect"` as redirect mode and `"live"` as live mode. Unknown, missing, or empty values MUST default to redirect or block (never silent live guest send).
- **FR-002**: System MUST read `OUTBOUND_REDIRECT_TO_WA` (E.164 format, e.g., `+15124064300`) and `OUTBOUND_REDIRECT_TO_EMAIL` (valid email, e.g., `grant830318@gmail.com`) as redirect sink destinations.
- **FR-003**: System MUST read `OUTBOUND_LIVE_CLEAR` and only allow live guest sends when its value is exactly the string `"true"`. Any other value (including missing) MUST block live sends or force redirect.
- **FR-004**: System MUST provide a shared function `resolveOutboundRecipient({ channel, intendedTo })` in `src/lib/outbound-redirect.ts` that returns `{ to, redirected, intendedTo, mode }` based on the environment configuration.
- **FR-005**: When `OUTBOUND_MODE=redirect` and the appropriate sink env is set, the resolver MUST return the sink as `to` and set `redirected: true`. When live mode is active (`mode=live` + `LIVE_CLEAR=true`), the resolver MUST return the original `intendedTo` as `to` and set `redirected: false`.
- **FR-006**: When `OUTBOUND_MODE=redirect` and the sink for a channel is missing or empty, the resolver MUST throw an error or return a failure result (fail-closed behavior). The calling code MUST NOT send to the original guest contact as a fallback.
- **FR-007**: The resolver MUST be called from `sendWhatsAppMessage` in `whatsapp.ts`, `sendEmail` in `email.ts`, and `createQueuedJob` in `send-jobs.ts` before the actual `to` or `to_address` is used in API calls or job inserts.
- **FR-008**: For `send-jobs.ts`, the `to_address` column MUST hold the redirected sink when redirect is active, so that the WhatsApp Web clicker sends to Grant's sink (not the original guest contact).
- **FR-009**: From identities (`TWILIO_WHATSAPP_FROM`, `RESEND_FROM_EMAIL`) MUST NOT be changed by the redirect logic. They remain set to Production values regardless of redirect mode.
- **FR-010**: For every send or job creation, the system MUST persist or log the `intended_to` (original guest contact) and `actual_to` (resolved recipient after redirect) plus the `mode` and `redirected` status in metadata, audit tables, or logs.
- **FR-011**: The staff Ops hub or main layout MUST display a persistent banner when `OUTBOUND_MODE=redirect` or when live mode is disabled by `OUTBOUND_LIVE_CLEAR`. The banner MUST state that redirect is active and sends go to Grant's test sinks. The banner MUST be hidden when mode is `live` and `LIVE_CLEAR=true`.
- **FR-012**: The `/api/health` endpoint MUST include an `outboundRedirect` field indicating `"on"`, `"off"`, or `"blocked"` and an `outboundMode` field indicating `"redirect"` or `"live"` based on the current environment configuration. The health response MUST NOT expose sink values or secrets.
- **FR-013**: Automated tests MUST cover: redirect rewrite for WhatsApp, email, and send_jobs; fail-closed behavior when sinks are missing; live mode with `LIVE_CLEAR=true`; live mode without `LIVE_CLEAR` (blocked/redirected); unknown/missing `OUTBOUND_MODE` defaults; From identity unchanged. All tests MUST pass before merge.
- **FR-014**: Documentation (README or code comments) MUST explain the go-live checklist and explicitly forbid auto-flip to live mode and Production env changes inside this CA.
- **FR-015**: The redirect implementation MUST NOT rely solely on `WHATSAPP_MODE=sandbox` for full redirect behavior. Sandbox mode (if used) is separate and does not rewrite Resend `to` or `send_jobs.to_address`.

### Key Entities *(include if feature involves data)*

- **OutboundRecipientResolution**: Represents the result of redirect logic. Attributes: `to` (resolved recipient), `redirected` (boolean), `intendedTo` (original guest contact), `mode` (string: `redirect` or `live`). Not a database entity; returned by the resolver function.
- **SendJobRow** (existing): `to_address` holds the resolved recipient (sink or guest). A metadata JSON field (new or existing) holds `intended_to`, `redirect_enabled`, and `mode` for audit.
- **Message/Email audit** (existing or new): Logs or metadata include `intended_to`, `actual_to`, `redirected`, and `mode` for each send attempt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When `OUTBOUND_MODE=redirect` and both sinks are set, 100% of Approve&Send attempts across all three channels (WhatsApp live, Resend email, WhatsApp Web jobs) result in messages/jobs created with Grant's sink as the recipient (no real guest To is used).
- **SC-002**: When redirect is enabled but a sink is missing for a channel, 100% of send attempts for that channel are blocked with a clear error response (no real guest To is used as fallback).
- **SC-003**: When `OUTBOUND_MODE=live` and `OUTBOUND_LIVE_CLEAR=true`, 100% of sends target the original guest contact (no redirect). When `LIVE_CLEAR` is not `"true"`, 100% of sends are blocked or redirected (no real guest To unless CLEAR is explicitly true).
- **SC-004**: Staff see a persistent banner when redirect is active. The banner is visible on at least 90% of page loads in the staff Ops hub or Needs Approval screens. The banner is hidden when live mode is confirmed active.
- **SC-005**: The `/api/health` endpoint correctly reports redirect status (`on`, `off`, or `blocked`) and mode within 1 second of being called, with zero false positives (never reports `off` when redirect is actually active).
- **SC-006**: Audit logs and metadata record `intended_to` and `actual_to` for 100% of sends and job creations, allowing Grant and CoS to verify redirect behavior post-send.
- **SC-007**: Automated test suite achieves 100% pass rate on all redirect scenarios (rewrite, fail-closed, live gate, mode defaults) before PR merge. No new test failures are introduced.
- **SC-008**: Grant successfully goes live by following the documented go-live checklist without requiring additional Coding support or discovering undocumented steps.

## Assumptions

- Target environment: Vercel Production (`apps/guestflow` Next.js app) with existing Turso DB and Resend/Twilio integrations.
- Grant will set the four environment variables (`OUTBOUND_MODE`, `OUTBOUND_REDIRECT_TO_WA`, `OUTBOUND_REDIRECT_TO_EMAIL`, `OUTBOUND_LIVE_CLEAR`) in Vercel dashboard after PR merge. Coding will not change Production env during this CA.
- Existing Phase 0 approve + confirmToken gates remain unchanged. Redirect logic runs after approval but before external API calls (intercept layer).
- From identities are already set in `TWILIO_WHATSAPP_FROM` and `RESEND_FROM_EMAIL` and are Production-ready. Redirect does not change them.
- `send_jobs` table already has a metadata or similar JSON column (or one will be added) to store `intended_to` and redirect status. If not, a new column is acceptable.
- Email audit (if separate from message metadata) has a place to record `intended_to` and `actual_to`. If not, logs are sufficient for audit.
- Staff banner will be added to an existing layout component or Ops hub page. Styling is info-level (blue or gray), not error-level (red).
- Health endpoint (`/api/health`) exists and is unauthenticated or uses existing simple auth. Extending it to include redirect status is low-risk.
- Tests use mocked Twilio and Resend APIs (or `WHATSAPP_MODE=sandbox` for Twilio if needed, but not as the redirect mechanism). No live API calls in tests.
- Go-live will be a manual process: Grant approves, Coding sets env, redeploy happens, Grant tests. No automated or scheduled live mode activation.
- Mobile support: not required. Staff Ops hub is desktop web-based. Banner must be visible in desktop browsers.
- Expiry or time-based auto-flip to live mode is explicitly forbidden and will not be implemented.
- Phase 1 language-model batch writer and WhatsApp allowlist are out of scope for this phase and will not conflict with redirect logic.
- Grant's test sinks (`+15124064300` for WhatsApp, `grant830318@gmail.com` for email) are stable and will not change during the redirect testing period. If they need to change, Grant will update env vars.
