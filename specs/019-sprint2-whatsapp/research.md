# Research: Sprint 2 WhatsApp Window, Templates, and Property Knowledge

## 1. What opens the 24h window

**Decision**: Last inbound `inbound_messages` row on a UMI thread where the message is Twilio WhatsApp Cloud (`channel = whatsapp_cloud` and/or `source_tag = twilio_whatsapp`), `direction = inbound`. Expires at `timestamp + 24h` in UTC milliseconds.

**Rationale**: Grant brief: measured from the guest’s last inbound on WABA `+27600200825` (Twilio). UMI already stores Cloud vs Web as `whatsapp_cloud` vs `whatsapp_web`.

**Alternatives considered**:
- Using `last_inbound_at` on the thread — rejected because email/SMS/Web would incorrectly open or extend the window.
- Using WhatsApp Web observe timestamps — rejected by constitution IV and the brief.

## 2. Closing-soon vs server 409

**Decision**: UI warning + template mode when remaining ≤ 5 minutes. Server 409 only when remaining ≤ 0 (window closed). Closing-soon free-text is still allowed server-side.

**Rationale**: Brief splits “about 5 min” as a staff warning from “outside the window” as the hard refuse.

**Alternatives considered**: Also 409 when remaining ≤ 5 minutes — rejected; a send at T-4m is still inside Meta/Twilio’s 24h window.

## 3. 409 timing vs confirmToken

**Decision**: Evaluate the window **before** `consumeConfirmToken` so a refused free-text send does not burn the one-time token.

**Rationale**: Staff will switch to a template and retry immediately.

## 4. Template catalogue and picker

**Decision**: Seed seven rows with Grant final text and `approval_status = approved_by_grant_unsubmitted`, empty `content_sid`. Picker filters `whatsapp_approval_status === 'approved'` (Twilio/WhatsApp side). Until Grant submits, picker is empty.

**Rationale**: Brief: picker shows only templates APPROVED by WhatsApp; make the empty state obvious.

**Alternatives considered**: Show Grant-approved drafts in the picker — rejected; a send without a Content SID would fail or become illegal free-text.

## 5. Template body source

**Decision**: Tracker upload contained names, categories, Grant approval dates, and the static review URL, but not bodies. Seed bodies are assembled from existing Grant-facing copy already in the repo (Cottage Falcon template, welcome-drafts structure, portal house-rule times) plus the tracker review URL. Marketing templates include a STOP footer. Every line is listed in `seed-sources.md`.

**Rationale**: Constitution II — do not invent guest-facing facts. The brief said use the tracker verbatim; missing bodies fall back to in-repo approved copy, not new marketing.

## 6. Access-code fill without the shared resolver

**Decision**: New local helper `resolveCodesFromLockboxProperty(db, tenantId, suite)`:
1. Load lockbox rows (`code_type = lockbox`, `suite <> ''`).
2. Match suite by **exact** normalized name (prefix strip only; no `includes` property inference).
3. If exactly one row and `property` is `cottage` or `main-house`, call existing `resolveAccessCodes` with that property.
4. Otherwise return no codes.

**Rationale**: Brief forbids suite-name substring property matching. Shared resolver is in-flight on another PR — do not rewrite those call sites here.

## 7. Twilio Content send vs create

**Decision**: `sendWhatsAppMessage` accepts optional `contentSid` + `contentVariables`. When present, Twilio Messages API is called with `ContentSid` and `ContentVariables` (JSON string). Redirect still rewrites `To`. Sync uses GET only (`/v1/Content`, approval requests). Submit script POSTs only when `--i-have-grant-go-ahead` is passed and is **not executed**.

**Rationale**: Absolute ban on create/approval in this package.

## 8. Knowledge base shape

**Decision**: Mirror access-codes SoR: table + `/ops/property-knowledge` + upsert API + `ensure` seed. Scope `shared` | `cottage` | `main-house`. Sections: `local_recommendations`, `amenities`, `house_rules`, `checkin_checkout`, `contact_escalation`. Inject via `{property_knowledge}` in `DRAFT_PROMPT.md`.

**Rationale**: Staff already know the access-codes page. Fail-closed empty/ask-staff fields beat invented Dullstroom tourism copy.

**Alternatives considered**: Seeding `tools/browns-guest-facts-pack/fixtures/*` — rejected; those files use demo phones and conflicting addresses (Tedder Street / 12 Blue Crane Drive).
