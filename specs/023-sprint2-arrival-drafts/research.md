# Research: Sprint 2 Scheduled Arrival Drafts

## Decision: Daily Vercel cron + hourly GitHub Actions fallback

**Rationale**: Vercel Hobby rejects any cron expression that fires more than once per day (`0 * * * *` fails deploy with “Hobby accounts are limited to daily cron jobs”). Preview READY is a hard gate. Existing `apps/guestflow/vercel.json` already uses daily expressions. #217/#220 used the same GHA fallback pattern.

**Alternatives considered**:
- Hourly `vercel.json` only — fails Hobby Preview
- Daily Vercel only — misses late-day imports after 06:00 SAST
- External cron SaaS — extra vendor; GHA already in-repo

**Fallback**: `schedule: 0 4 * * *` in `vercel.json` (06:00 SAST). Hourly GHA calls `GET /api/cron/arrival-drafts` with `CRON_SECRET`. The handler is idempotent and no-ops before the configured run hour.

## Decision: One config file for offsets + run hour

**Rationale**: Brief requires a single file. Defaults: T-3 offset −3, T-1 offset −1, Day-of offset 0, run hour 06:00 Africa/Johannesburg.

**Alternatives considered**: env-only offsets (scattered); DB-editable schedule (out of scope).

## Decision: Johannesburg calendar math, not UTC date

**Rationale**: Constitution + brief. SAST is UTC+2 year-round. Reuse `sastDateString` / `addDaysIsoDate` from `umi-sort.ts`. Due = `todaySast === checkIn + offset`. Hour gate = `sastHour >= runHourSast`.

**Alternatives considered**: `date-fns-tz` (new dep); assume UTC dates (fails midnight edges).

## Decision: Unique `arrival_drafts` row per tenant+booking+stage

**Rationale**: Idempotency across Vercel + GHA. Status machine: `drafted` | `needs_attention` | `template_pending_approval` | `sent` | `discarded`. Fingerprint `check_in|check_out|suite` regenerates unsent rows.

**Alternatives considered**: only `inbound_messages.draft_reply` (no unique stage; hard to discard/regenerate); welcome_drafts table reuse (wrong stage model).

## Decision: Codes via `resolveAccessCodesForSuite` + delimited block

**Rationale**: #221 M is on the base. Draft stores a delimited access-codes block plus a snapshot. Approve&Send replaces the block from a fresh resolve. Unresolved → `code missing, ask staff` / `codes: property unresolved`.

**Alternatives considered**: staff-typed codes as source (forbidden); env-only codes (bypasses lockbox property).

## Decision: Matching resolver interfaces for #218 / #219

**Rationale**: Parallel PRs must not be merged by this agent. Prefer import if files exist; otherwise implement:

- `getWindowState(lastInboundAt, now)`
- `findApprovedTemplateFor(name)`
- `fillTemplate(body, vars)`
- `hasGuestContact` / `resolveContactPresence(phone, email)`

Document `wire after #218/#219 merges` in `apps/guestflow/docs/ARRIVAL-DRAFTS.md`.

**Alternatives considered**: cherry-pick #218/#219 (conflict risk on this base); block this PR on those merges (brief says ship own PR).

## Decision: No-contact is an attention item, not a guest draft

**Rationale**: Brief. Persist `arrival_drafts` with `attention_reason = 'no contact'`, `draft_body = null`. If a booking thread exists, flag it. If not, create a booking thread with a staff system message (not `draft_reply`) so Inbox can show the item — this is a real written record, not Inbox-GET thread creation.

## Decision: Inbox Needs attention includes open arrival drafts

**Rationale**: Item N said Needs attention is unanswered inbound only, to stop empty auto-threads. Item G explicitly sets Needs attention on scheduled drafts. Extend `listInboxThreads` with `extraAttentionByBooking` for `arrival_drafts` in open/attention statuses. Inbox GET stays read-only.

## Decision: Day-of has no Grant-approved WhatsApp template name

**Rationale**: The seven approved names do not include a day-of template. Closed window + Day-of → `template pending approval`. Do not invent a Meta name or submit one.

## Decision: Keep current redirect behaviour

**Rationale**: Decision L is a parallel package. This base keeps existing outbound sinks. No header toggle in this PR.

## Decision: Deterministic fill, no LLM

**Rationale**: Constitution II and the brief. Staff may edit. `draft_source = 'heuristic'`.
