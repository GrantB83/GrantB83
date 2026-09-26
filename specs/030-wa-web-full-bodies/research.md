# Research: WA Web Full Bodies + Source Display Names

## Decision: Fix ingest + backfill; do not rewrite UMI

**Decision**: Keep `POST /api/inbound/webhook` and `POST /api/umi/backfill/wa-web`. Change them so WhatsApp Web never persists a sentinel and so backfill updates sentinel rows in place.

**Rationale**: UMI v2.1 already claimed full bodies. Prod thread 28 is still all `[metadata-only]` because (1) the webhook rewrites empty/`[metadata-only]`/`[observe-probe]` to `[body unavailable]` and still inserts, and (2) backfill calls insert-only `ingestInboundMessage`, which treats an existing `external_message_id` as a duplicate and leaves the sentinel.

**Alternatives considered**:
- New ingest table — rejected (Principle V; dual-write risk)
- UI-only hide of sentinels — rejected (operator still cannot read the guest)
- Live CoS Chrome scrape from this Cloud Agent — rejected (GuestFlow owns API/storage; CoS may supply source payloads; no invent)

## Decision: Shared sentinel + display-name helper

**Decision**: One module (`wa-web-body.ts`) owns sentinel detection, phone-like name rejection, and source-name extraction from payload + metadata.

**Rationale**: Webhook, ingest, and backfill currently each invent a slightly different placeholder. Staff must see one rule: real text or no row.

**Alternatives considered**:
- Per-route string compares — rejected (the current bug pattern)
- LLM name inference from number — rejected (invent PII)

## Decision: Skip empty observe; replace sentinels in place

**Decision**:
1. Going forward: if WhatsApp Web body is empty or a sentinel, do not insert an inbound row. Optionally refresh an existing temp thread title if a real source name is present.
2. Backfill / later observe with real text: if a WhatsApp Web row exists with the same `external_message_id` or the same sender + timestamp and a sentinel body, `UPDATE` that row. Recompute `dedup_key` from the real text.
3. If a non-sentinel Cloud (or Web) row already matches the real-text `dedup_key`, treat as duplicate. If a separate sentinel row also exists for that event, delete the sentinel (Cloud already has the real line). Do not create a second real copy.

**Rationale**: Kick says prefer capture, never invent, no duplicate storms, durable keys first.

**Alternatives considered**:
- Keep writing `[body unavailable]` “so the thread exists” — rejected (S3 / operator job)
- Always insert a new row on backfill — rejected (duplicate storms)
- Soft-delete only — unnecessary if in-place UPDATE works

## Decision: Display name on temp / unmatched only as title source

**Decision**: Persist contactName / pushName / chatTitle / displayName / notifyName when the value is not empty and not phone-like. Write to `inbound_threads.guest_name` when the current value is empty or phone-like. Booking-linked `bookerName` remains `booking_guest_name || guest_name || from_number`.

**Rationale**: Grant add: unmatched temps must show a human name without a booking. Booking SoR name still wins when linked.

**Alternatives considered**:
- Overwrite booking guest_name with WA push name — rejected (booking SoR)
- Invent “Guest” / “Unknown” — rejected (no invent; phone fallback is honest)

## Decision: Two-week window plus open sentinels

**Decision**: Backfill accepts messages in the last 14 SAST days, **or** messages that match an already-stored WhatsApp Web sentinel (open metadata-only), even if slightly older. Ignore brand-new inserts older than 14 days that are not replacing a sentinel.

**Rationale**: Kick allows “two-week (or all open metadata-only)”. Thread 28 must be recoverable if the source still has the bubbles.

**Alternatives considered**:
- Strict 14-day only — may miss an open staff thread
- Full-history scrape — out of scope; CoS/history residual documented

## Decision: Tests over live Production writes

**Decision**: Prove sentinel rejection, in-place replace, name persistence, and Cloud dedup in Vitest. Do not apply a Production Turso backfill from this agent.

**Rationale**: Approval gates; no invent of live guest bodies. Preview/API proof uses fixtures + documented verify path for thread 28 after a source-backed backfill.

**Alternatives considered**:
- Agent-invented thread 28 bodies — forbidden
