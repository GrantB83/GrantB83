# Feature Specification: WABA templates sync (Twilio → Turso)

**Feature Branch**: `cursor/waba-templates-sync-54d9`  
**Created**: 2026-09-26  
**Status**: Implementing  
**Grant CLEAR**: 26 Sep 2026 via GFM

## Operator job

Staff pick a **Meta-approved** WhatsApp template in GuestFlow (window-closed / first-touch). **Approve&Send** uses the live Twilio **Content SID** and `whatsapp_approval_status=approved` from Turso — not stale `pending` from an old sync.

## Saleable DoD (S1–S10)

| ID | Requirement |
|----|-------------|
| S1 | Y — ship scoped to `apps/guestflow` sync + catalogue |
| S2 | After sync: Prod rows for Meta-approved templates show `whatsapp_approval_status=approved`, correct `content_sid`, fresh `last_synced_at`; send path uses ContentSid; seed `official_channel_notice` + `browns_ops_smoke` when absent |
| S3 | Sync no-ops cleanly if Twilio unreachable; rejected v1 `HXecc82…` stays non-sendable; check-in catalogue row maps to approved v2 `HX69e7…` |
| S4–S5 | N/A — no IA chrome change unless picker behavior changes |
| S6 | Redirect ON; human Approve&Send; no auto-send; WA From +27600200825; no invented PII |
| S7–S8 | N/A |
| S9 | Design N; QA N — GFM Prod spot-check Turso + one template-eligible thread post-merge |
| S10 | SQL before/after dump + Twilio cross-check documented in VERIFY-PACK |

## User Scenarios

### US1 — Ops refresh after Meta approval (P1)

Staff or GFM runs sync; Turso `wa_templates` picks up Twilio Content SIDs and WhatsApp approval statuses; composer picker (`picker=1`) lists approved templates with SIDs for Approve&Send.

**Acceptance**

1. **Given** Twilio lists approved Content for `browns_pre_arrival_welcome`, **When** sync runs, **Then** row has matching SID and `whatsapp_approval_status=approved`.
2. **Given** catalogue row `browns_checkin_instructions`, **When** sync runs, **Then** SID is v2 `HX69e7…` and status approved (not v1 rejected).
3. **Given** missing rows, **When** sync runs, **Then** `official_channel_notice` and `browns_ops_smoke` are inserted with approved SIDs if Twilio shows approved.

### US2 — Safe failure (P1)

**Given** Twilio credentials missing or Content API unreachable, **When** sync runs, **Then** HTTP 200 with `skipped: true` and no destructive writes.

## Requirements

- **FR-001**: Sync MUST list Twilio Content (read-only GET) and ApprovalRequests per SID (read-only GET).
- **FR-002**: Sync MUST upsert `content_sid`, `whatsapp_approval_status`, `last_synced_at` for catalogue rows; MUST NOT POST create/submit to Twilio.
- **FR-003**: Map Twilio `browns_checkin_instructions_v2` → catalogue name `browns_checkin_instructions`.
- **FR-004**: Preserve rejected v1 as catalogue row `browns_checkin_instructions_v1_rejected` (non-picker) with SID `HXecc82…` and status `rejected`.
- **FR-005**: Entry points: `POST /api/ops/wa-templates/sync` and `npx tsx scripts/sync-wa-templates.ts` (dry-run flag).

## Out of scope

Redirect flip; auto-send; new Meta submissions; deleting rejected history; sandbox webhook hygiene.
