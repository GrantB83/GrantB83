# GuestFlow Phase 0 — Safety & contact foundation

Grant CLEAR 20 Sep 2026. **No auto-send. No Phase 1 LLM batch. No Gmail Contacts merge.**

## Ritual this removes

“Send because a draft body exists.” Staff cookie + draft is no longer enough. Send requires **approved/ready** and a **one-time `confirmToken`** issued after the confirm dialog.

## confirmToken

1. Approve the thread (Needs Approval Approve, or Approve & Send which PATCHes `approved` first).
2. Confirm the browser dialog.
3. UI `POST /api/inbound/confirm-token` `{ "threadId": N }`.
4. UI `POST /api/inbound/send` with that `confirmToken`.
5. Reuse of the same token returns **400**. Failed provider send does not resurrect the token.

Applies to WhatsApp live, email, and WhatsApp Web queue on the same send route.

## `/api/whatsapp/send` retired (P0)

`POST /api/whatsapp/send` is **410 Gone**. It never calls the WhatsApp provider, even if a body or `confirmToken` is supplied. Welcome drafts (`/ops/welcome-drafts`) are **copy-only** — they must not POST that route. Guest send is only `POST /api/inbound/send` after approve + one-time `confirmToken`. `GET /api/whatsapp/send` is status-only (`sendRetired: true`).

## `DRAFT_WORKER_SECRET` ≠ `CRON_SECRET`

| Secret | Used for |
| --- | --- |
| `CRON_SECRET` | Nightsbridge ingest / reminder only |
| `DRAFT_WORKER_SECRET` | `POST /api/drafts/upsert` only (Phase 0 stub, no LLM) |

The stub rejects a missing secret, a wrong secret, and `CRON_SECRET` even when that cron value is valid for ingest. Coding sets the Vercel Production `DRAFT_WORKER_SECRET` after merge.

## Contacts

`guest_contacts` upserts on every A&D ingest. Null-tolerant. Never invent phones. Retention **5 years after last stay then DELETE**.

## Message Status (Durable State)

`inbound_messages.status` column added for Phase 0 workflow:
- **`new`** (default): Unread message
- **`seen`**: Staff viewed
- **`archived`**: Completed/closed

**Production hotfix**: Grant manually ALTER'd Production Turso 20 Sep 2026 after SQL_INPUT_ERROR in Approve&Send. Now durable in code via `PHASE0_COLUMN_STATEMENTS` and standalone migration script `migrate-add-inbound-message-status.js`.

**Run migration**: `npm run db:migrate:inbound-status`

## HOLD

Resend inbound webhook dashboard remains HOLD. Email code already uses the shared ingest path. See `EMAIL-CONTROL-CENTER.md`.
