# Research: GuestFlow Phase 0

## 1. Send gate (approve + confirmToken)

**Decision**: Fail closed on `POST /api/inbound/send` unless (a) thread **or** latest inbound message status is in `{approved, ready}` and (b) request body includes `confirmToken` that hashes to an unconsumed, unexpired row for that `threadId`. Consume the token **before** provider/queue work so double-submit cannot send twice. Failed provider send does **not** resurrect the token.

**Rationale**: Coding bounce (`origin/main` @452067a) showed send proceeds when `threadId` + draft body exist. Staff cookie is not an approve gate. Token must be one-time and issued only from the confirm UI.

**Alternatives considered**:
- Cookie-only + confirm dialog: dialog is client-side; a crafted POST still sends
- Consume token only after provider success: double-click can create two Twilio/Resend/WA-web jobs
- Allow `drafted` + token: would keep today’s “body exists → send” hole

## 2. Token issue surface

**Decision**: `POST /api/inbound/confirm-token` (staff cookie, same as send). Requires approved/ready already, or performs the same status check the UI just set via existing Approve / PATCH. Returns raw token once. Store SHA-256 hash via existing `hashToken` / `randomBytes` in `src/lib/token.ts`. TTL 15 minutes.

**Rationale**: CA prompt: “issued when staff confirms in UI, consumed on send.” Separate issue endpoint keeps send handler from minting tokens.

**Alternatives considered**:
- Mint token inside PATCH `/api/approvals`: Approve-only must not mint; Grant can approve without sending
- Embed token in page HTML: leaks and is not one-time across tabs

## 3. `draft_source`

**Decision**: `TEXT` column on `inbound_messages.draft_source` with CHECK `heuristic|llm|human`. Backfill `UPDATE ... SET draft_source = 'heuristic' WHERE draft_source IS NULL`. Heuristic classifier/ingest sets `heuristic`. UI save/edit sets `human`. Stub upsert may set `llm`. Do not add an LLM writer.

**Rationale**: P1 in CoS merge; Phase 1 needs the column. Existing rows are all heuristic today.

**Alternatives considered**: Infer source from audit_log — incomplete for historical drafts.

## 4. `guest_contacts` uniqueness + retention

**Decision**: Unique `(tenant_id, normalized_phone)` only when phone is non-null. Email is nullable, indexed, not unique (OTA family shares). `retention_years = 5` stored; `retention_delete_after = last_stay_at + 5 years`. Source enum `nb|inbound|manual`. `nbid` nullable. Never invent phones.

**Rationale**: Grant CLEAR = 5 years then DELETE. Live A&D phone fill ~29–32% — null-tolerant upserts required.

**Alternatives considered**:
- Unique email: would collapse distinct guests who share a booker email
- Anonymize instead of DELETE: Grant said DELETE

## 5. E.164 ZA normalize

**Decision**: Dedicated `normalizeZaE164(raw)`: strip spaces/dashes/parens; if starts with `+` and 8–15 digits keep; if `00` prefix treat as `+`; if `0` + 9 digits treat as `+27` + rest; if `27` + 9 digits add `+`; else return `null` (do not store garbage as a phone).

**Rationale**: Reuse WhatsApp Twilio normalizer only for `whatsapp:` prefix — not general E.164. Extraction helpers return raw match, not E.164.

**Alternatives considered**: libphonenumber — extra dependency for one country; skip for Phase 0 cost.

## 6. `draft_jobs` enqueue without runner

**Decision**: Table + `enqueueDraftJob()` helper called from `ingestInboundMessage` after classify (non-spam). Unique pending-per-message. Status `pending|claimed|done|failed`. No claim API, no cron, no LLM.

**Rationale**: CA allows “schema + helper”; classify already exists.

**Alternatives considered**: Sync LLM in webhook — forbidden (30s + meter).

## 7. `DRAFT_WORKER_SECRET` stub

**Decision**: `POST /api/drafts/upsert` with `Authorization: Bearer` **or** `x-draft-worker-secret`. Compare **only** to `process.env.DRAFT_WORKER_SECRET`. Reject if env unset, header missing, wrong, **or** value equals `CRON_SECRET`. Middleware allowlist the route like cron. Body may update `draft_reply` + `draft_source='llm'`.

**Rationale**: P0 dedicated secret. Empty env must fail closed (even in development) so tests prove the gate.

**Alternatives considered**: Reuse `CRON_SECRET` — explicitly forbidden.

## 8. Email ingest unify

**Decision**: Keep `POST /api/inbound/email` → `ingestInboundMessage`. Enqueue draft jobs there automatically. Document Resend webhook HOLD in `docs/EMAIL-CONTROL-CENTER.md` + PR. No dashboard invention.

**Rationale**: Path already shared; CA says partial OK.

## 9. Nightsbridge tenant lookup

**Decision**: Reuse existing ingest tenant resolution; if `Browns Dullstroom` row missing, fall back to `getDefaultTenantId()` / name LIKE `%Browns%` for contact upserts only so contacts still write. Do not invent booking tenant changes beyond current insert path.

**Rationale**: Seed tenant name is `The Browns Luxury Guest Suites (Dullstroom)` while ingest looks up `Browns Dullstroom` — contact upsert should not silently no-op.

## 10. UI Approve&Send

**Decision**: After the existing `window.confirm`, call `POST /api/inbound/confirm-token` then `POST /api/inbound/send` with `{ threadId, channel, confirmToken, ... }`. If thread is `drafted`, first PATCH status to `approved` (inbound-queue already has this) or approvals `approve` then issue token. Disable button while in-flight.

**Rationale**: Matches CA “obtains token then POSTs it.”
