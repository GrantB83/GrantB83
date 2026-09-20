# Research: GuestFlow Outbound Redirect for Pre-Live Testing

**Date**: 2026-09-20

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document consolidates research findings for implementing the pre-live outbound redirect system. All NEEDS CLARIFICATION items from the technical context have been resolved through codebase analysis, CoS/Efficiency bounce review, and Grant CLEAR requirements.

## Decision Log

### Decision 1: Environment Variable Naming Convention

**Chosen**: `OUTBOUND_MODE`, `OUTBOUND_REDIRECT_TO_WA`, `OUTBOUND_REDIRECT_TO_EMAIL`, `OUTBOUND_LIVE_CLEAR`

**Rationale**:
- CoS bounce specified dual-gate pattern with explicit mode + clear flag
- Prefix `OUTBOUND_` groups related config and avoids collisions with existing `WHATSAPP_MODE`
- `REDIRECT_TO_*` clearly indicates sink destinations (not source)
- `LIVE_CLEAR` name emphasizes it's a safety clear/authorization flag, not just an enable toggle

**Alternatives Considered**:
- `OUTBOUND_REDIRECT_ENABLED=true|false` alone (Coding bounce alias): Rejected as insufficient for dual-gate. Mode+CLEAR provides two independent keys.
- `OUTBOUND_TARGET_WA` / `OUTBOUND_TARGET_EMAIL`: Rejected as less clear than `REDIRECT_TO_*`
- `OUTBOUND_PRODUCTION_ENABLED`: Rejected as confusing; "production" could mean env, not guest sends

**Implementation Note**: Resolver may accept alias `OUTBOUND_REDIRECT_ENABLED=true` as equivalent to `MODE=redirect` for backward compatibility, but canonical docs use MODE.

---

### Decision 2: Resolver Function Signature and Return Type

**Chosen**:
```typescript
export interface OutboundRecipientResolution {
  to: string
  redirected: boolean
  intendedTo: string
  mode: 'redirect' | 'live'
}

export function resolveOutboundRecipient(input: {
  channel: 'whatsapp' | 'email'
  intendedTo: string
}): OutboundRecipientResolution
```

**Rationale**:
- Channel enum distinguishes which sink to use (WA vs email)
- `intendedTo` is the guest contact (phone or email) from conversation/draft
- Return type includes all fields needed for audit: resolved `to`, redirect status, original contact, and mode
- Throws on fail-closed errors (missing sink) rather than returning null/error field for clarity

**Alternatives Considered**:
- Return `{ to, error? }` tuple: Rejected; throwing is more idiomatic for config errors
- Accept `channel: SendJobChannel` (including 'whatsapp_web'): Rejected; `whatsapp_web` uses same sink as `whatsapp`, so internal normalization is cleaner
- Async function: Rejected; all config is synchronous env reads

**Edge Cases Handled**:
- Unknown channel → throw
- Missing intendedTo → throw (caller must validate before resolver)
- Unknown MODE value → treat as redirect (fail-closed default)
- MODE=live but LIVE_CLEAR ≠ "true" → block (return would redirect or throw)

---

### Decision 3: Integration Points and Call Order

**Chosen**: Resolver called at the **start** of each send function, before any external API call or job insert:

1. `whatsapp.ts` `sendWhatsAppMessage`: Call resolver → override `params.to` → proceed with existing Twilio/Meta logic
2. `email.ts` `sendEmail`: Call resolver → override `input.to` → proceed with Resend API call
3. `send-jobs.ts` `createQueuedJob`: Call resolver → override `input.toAddress` → insert job row with resolved `to_address`

**Rationale**:
- CoS bounce requirement: "not send-route-only intercept" — must handle all three paths, including job creation
- Calling resolver early (before provider selection in whatsapp.ts) ensures redirect applies regardless of Twilio vs Meta
- `send_jobs.to_address` holds the post-redirect sink so WhatsApp Web clicker sends to Grant's number

**Alternatives Considered**:
- Intercept at send-route API level only (`/api/inbound/send`): Rejected per CoS; misses direct calls and future cron/bridge paths
- Intercept inside Twilio/Resend HTTP call: Rejected; too late for job creation, harder to audit original intent
- Separate redirect functions per channel: Rejected; shared resolver enforces consistency

**Backward Compatibility**: Existing `WHATSAPP_MODE=sandbox` (Twilio dry-run) is orthogonal. Sandbox mode dry-runs Twilio API; redirect mode rewrites `to` for all channels. Both can coexist (redirect runs first, then sandbox dry-run if applicable).

---

### Decision 4: Fail-Closed Behavior and Error Codes

**Chosen**: When `OUTBOUND_MODE=redirect` and a channel's sink env is missing/empty, resolver throws:
```typescript
throw new Error('Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set')
throw new Error('Redirect enabled but OUTBOUND_REDIRECT_TO_EMAIL not set')
```

Callers catch and return HTTP 503 (Service Unavailable) to staff with error message in response body.

**Rationale**:
- 503 indicates temporary config issue (not client error)
- Staff see clear actionable message (not silent failure or guest send)
- Throwing ensures no code path can accidentally fall through to guest `to`

**Alternatives Considered**:
- HTTP 500: Less precise; 503 better signals "retry after ops fix config"
- Return `{ error }` instead of throw: Rejected; throwing enforces fail-closed at type level (caller must handle)
- Block via job status `blocked`: Considered for `send_jobs`, but throwing at job creation is cleaner and consistent with whatsapp/email paths

**Edge Case**: If MODE is unknown/missing in production, default to redirect and apply fail-closed checks. If sinks also missing → block. Never silent live send.

---

### Decision 5: Audit Metadata Schema

**Chosen**:
- `send_jobs` table: existing `to_address` column holds resolved sink (or guest in live mode). Add/use metadata JSON field with:
  ```json
  {
    "intended_to": "+27821234567",
    "redirect_enabled": true,
    "mode": "redirect"
  }
  ```
- Email audit: similar metadata (implementation may vary if separate audit table exists; if not, logs are sufficient for Phase 0)
- WhatsApp message metadata: add same fields to existing message metadata JSON or log structure

**Rationale**:
- Grant CLEAR requirement: audit must show both intended and actual recipients
- Existing `send_jobs` schema likely has a metadata JSON column (common pattern in codebase); if not, add one
- Storing `intended_to` in metadata (not overwriting `to_address`) preserves ops ability to see what guest contact was replaced

**Alternatives Considered**:
- Separate `intended_to_address` column in `send_jobs`: Rejected; metadata JSON is more flexible and avoids schema churn
- Store only in logs: Rejected; Grant needs queryable DB audit, not just log scraping
- Redact guest contact fully: Rejected; ops need full contact for debugging; redaction is for log display only (middle digits blurred)

**Log Redaction Pattern**: `+2782***4567` for display. Full value in DB.

---

### Decision 6: Staff Banner Implementation

**Chosen**: Add a persistent banner component at the top of the staff layout (`apps/guestflow/src/app/layout.tsx` or dedicated banner component). Banner reads `OUTBOUND_MODE` on server side (env) and conditionally renders.

Banner text: "ℹ️ Outbound Redirect Active – All guest sends go to test sinks. Live mode disabled."

Styling: Info-level (blue/gray), non-blocking (not modal), dismissible per-session (optional; simplest is always-visible when redirect on).

**Rationale**:
- Layout-level banner ensures visibility on all staff pages (Needs Approval, inbound queue, ops hub)
- Server-side env check avoids exposing config to client unnecessarily (env read in Server Component)
- Info styling (not error-red) reduces alarm fatigue; this is expected state during pre-live, not a failure

**Alternatives Considered**:
- Per-page banner: Rejected; staff may navigate between pages and miss it
- Modal on login: Rejected; too intrusive for expected pre-live state
- Only on Needs Approval page: Rejected; CoS requirement is broader visibility

**Hide Condition**: When `OUTBOUND_MODE=live` AND `OUTBOUND_LIVE_CLEAR=true`, banner hidden.

---

### Decision 7: Health Endpoint Extension

**Chosen**: Extend `/api/health` route to include:
```json
{
  "status": "ok",
  "service": "guestflow",
  "tenant": "Browns Dullstroom",
  "database": "turso",
  "timestamp": "...",
  "outboundMode": "redirect",
  "outboundRedirect": "on"
}
```

Values for `outboundRedirect`:
- `"on"` when `OUTBOUND_MODE=redirect`
- `"off"` when `OUTBOUND_MODE=live` AND `OUTBOUND_LIVE_CLEAR=true`
- `"blocked"` when `OUTBOUND_MODE=live` BUT `OUTBOUND_LIVE_CLEAR` ≠ "true"

**Rationale**:
- Grant needs quick Production status check without reading Vercel env UI
- Health endpoint already exists and is fast (<100ms target)
- Fields are informational only; no secrets or sink values exposed

**Alternatives Considered**:
- Separate `/api/outbound/status` endpoint: Rejected; health is natural home for ops status
- Expose sink values: Rejected per security; health is unauthenticated
- Only boolean `redirectEnabled`: Rejected; Grant wants to distinguish "blocked" from "off"

**Implementation**: Small helper function `getOutboundStatus()` called by health route. Reads env, returns { mode, redirectStatus }.

---

### Decision 8: Test Strategy

**Chosen**: Unit + integration tests in Vitest. Mocked Twilio/Resend APIs. No live external calls.

Test files:
1. `apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts`: Resolver unit tests (all scenarios: redirect on/off, fail-closed, live gate)
2. `apps/guestflow/__tests__/whatsapp.test.ts`: Add scenarios for redirect (mocked Twilio calls verify redirected `to`)
3. `apps/guestflow/__tests__/email.test.ts` or `apps/guestflow/src/lib/__tests__/email.test.ts`: Add redirect scenarios (mocked Resend)
4. `apps/guestflow/__tests__/send-jobs.test.ts` or `apps/guestflow/src/lib/__tests__/send-jobs.test.ts`: Add job creation with redirected `to_address`

Test scenarios (from spec User Story 7):
- Redirect rewrites `to` when mode=redirect + sinks set
- Fail-closed blocks when mode=redirect + sink missing
- Live mode with LIVE_CLEAR=true sends to original guest
- Live mode without LIVE_CLEAR blocks/redirects
- From identities unchanged
- Unknown/missing MODE defaults to redirect/block

**Rationale**:
- Existing Vitest setup in `apps/guestflow`
- Mocking external APIs is standard practice (no Twilio test creds needed)
- Unit tests for resolver (pure function) + integration tests for whatsapp/email/send-jobs (resolver + API integration)

**Alternatives Considered**:
- Sandbox mode for testing: Rejected; sandbox is Twilio-only and doesn't test redirect logic
- Manual testing only: Rejected; Grant CLEAR requires tests green before merge

**CI**: Tests run via `npm run test` in `apps/guestflow`. Must pass before PR merge.

---

### Decision 9: Documentation and Go-Live Checklist

**Chosen**: Add go-live documentation in two places:
1. Inline JSDoc comments at top of `outbound-redirect.ts` with full checklist
2. PR description includes go-live checklist and links to docs

Checklist:
1. Smoke test: Set redirect in non-prod env, send WhatsApp + email, verify arrival at Grant's sinks
2. NeedsGrant: In Vercel Production env settings, set:
   - `OUTBOUND_MODE=live`
   - `OUTBOUND_LIVE_CLEAR=true`
   - Confirm `OUTBOUND_REDIRECT_TO_WA` and `OUTBOUND_REDIRECT_TO_EMAIL` are present (will not be used in live mode, but good hygiene)
3. Redeploy Production (Vercel auto-redeploy or manual trigger)
4. Verify: `curl https://guestflow.example.com/api/health | jq .outboundRedirect` returns `"off"`
5. Verify: Staff UI shows no banner
6. Safe live test: Approve and send one message to a known-safe guest contact (Grant's own reservation or test guest)
7. Monitor: First 5-10 live sends, verify they reach real guests (not Grant's sinks)

**Forbidden**:
- Flipping env inside this CA (Coding sets env after merge, never agent-driven)
- Auto-flip or scheduled live mode activation
- Expiry timers that revert to live mode

**Rationale**:
- CoS bounce requires explicit go-live docs
- Grant is non-technical; checklist must be step-by-step
- Forbidden list prevents common mistakes

**Alternatives Considered**:
- Separate GOINGALIVE.md file: Rejected; inline docs in `outbound-redirect.ts` are more discoverable
- Automation for go-live: Rejected; Grant CLEAR requires manual explicit steps

---

## Summary

All technical decisions resolved. No NEEDS CLARIFICATION items remain. Ready for Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).

**Key Implementation Files**:
- `src/lib/outbound-redirect.ts` (new): ~80 lines (resolver + getOutboundStatus helper)
- `src/lib/whatsapp.ts` (modified): +10 lines (call resolver, override `to`)
- `src/lib/email.ts` (modified): +10 lines (call resolver, override `to`)
- `src/lib/send-jobs.ts` (modified): +15 lines (call resolver, add metadata JSON to job insert)
- `src/app/layout.tsx` (modified): +20 lines (banner component or inline conditional)
- `src/app/api/health/route.ts` (modified): +10 lines (call getOutboundStatus, add fields)

**Test Files**:
- `src/lib/__tests__/outbound-redirect.test.ts` (new): ~100 lines (resolver unit tests)
- `__tests__/whatsapp.test.ts` (modified): +30 lines (redirect scenarios)
- `__tests__/email.test.ts` or `src/lib/__tests__/email.test.ts` (modified): +30 lines
- `__tests__/send-jobs.test.ts` or `src/lib/__tests__/send-jobs.test.ts` (modified): +30 lines

**Total Effort**: ~250 lines production code, ~200 lines test code. S–M complexity.
