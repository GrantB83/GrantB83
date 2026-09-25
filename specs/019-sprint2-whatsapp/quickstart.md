# Quickstart: 019 Sprint 2 WhatsApp

Validate on Preview / local GuestFlow only. Do not run Production migrations, do not send, do not submit templates.

## Prerequisites

- `apps/guestflow` dependencies installed
- Local SQLite (default) — do **not** point `DATABASE_URL` at Production Turso

## Tests (required)

```bash
cd apps/guestflow
npm test -- src/lib/__tests__/whatsapp-care-window.test.ts \
  src/lib/__tests__/wa-template-fill.test.ts \
  src/lib/__tests__/wa-templates-picker.test.ts \
  src/lib/__tests__/property-knowledge.test.ts \
  src/lib/__tests__/draft-prompt-kb.test.ts \
  __tests__/inbound-send-handler.test.ts
```

Expected: all listed files pass, including 24h edge, timezone, 409, SoR fill, approved-only picker, knowledge injection, no-fact-outside-KB prompt guard.

## Typecheck / build (Preview gate)

```bash
cd apps/guestflow
npx tsc --noEmit
# next.config.mjs must NOT set typescript.ignoreBuildErrors
```

## Manual Preview checks (no guest send)

1. Open Inbox: closed / closing-soon marks on list; header + composer badge copy.
2. Open a closed Cloud thread: composer template mode; confirm dialog warning; picker empty with “waiting for WhatsApp approval” copy.
3. Open `/ops/property-knowledge`: seed values + empty/ask-staff gaps; edit one field.
4. Do **not** run `scripts/submit-wa-templates.ts` (even with the flag).
5. Do **not** run `scripts/migrate-sprint2-whatsapp.js` against Production Turso.

## Submit script (document only)

```bash
# exits 1, no Twilio calls:
npx tsx scripts/submit-wa-templates.ts
# AFTER Grant final go-ahead (not this PR):
npx tsx scripts/submit-wa-templates.ts --i-have-grant-go-ahead
```
