# Quickstart: Sprint 3 Phase 1 Ultra-Only Drafts

Validation only. Do not send, merge, deploy, or write Production Turso.

## Prerequisites

- Repo at `apps/guestflow/`
- `npm ci` if `node_modules` is missing
- No `OPENAI_API_KEY` required

## Automated

```bash
cd apps/guestflow
npm test -- __tests__/batch-worker.test.ts
npx tsc --noEmit
```

Expect green fail-closed, dry-run, and mock-generator cases.

```bash
# from repo root
rg -n "OPENAI_API_KEY" apps/guestflow --glob '!**/node_modules/**'
```

Expect **no** Production Phase 1 instruction to set `OPENAI_API_KEY`. Mentions that the key is not required / ignored are allowed. Alerts-parser optional fallback in other specs is out of this path.

## Dry-run (GFM)

Needs worker env names only (`GUESTFLOW_API_URL`, `DRAFT_WORKER_SECRET`, Turso). Never a chat-completion key.

```bash
cd apps/guestflow
npm run batch-worker -- --dry-run
```

Expect: window/cap/claim skip reasons, or placeholder drafts, and **no** upsert. Jobs may be claimed in dry-run; do not use Production Turso.

Live without `--dry-run` or `--drafts-file` must refuse the batch and leave jobs `pending`.

## After Preview is READY (GFM spot-check — MERGE HOLD)

1. Confirm redirect banner still ON.
2. Open one thread that has a model draft (`draft_source=llm`) on Preview only.
3. Confirm the reply is editable.
4. Confirm Approve&Send still asks for the human confirm token.
5. Do **not** send to a live guest. Do **not** flip `OUTBOUND_MODE`.

See `apps/guestflow/docs/CURSOR-ULTRA-BATCH-LAUNCH.md`.
