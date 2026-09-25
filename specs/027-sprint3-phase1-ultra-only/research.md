# Research: Sprint 3 Phase 1 Ultra-Only Drafts

## Decision: New spec folder `027`, do not rewrite `008` as the SoR

**Rationale**: `008` is the original Phase 1 queue/contract spec and is incomplete as a Spec Kit folder (spec.md only). This work is a meter realignment (Sprint 3 S), not a new enqueue product. Sequential numbering after `026` yields `027`.

**Alternatives considered**:
- Continue `008` in place — mixes original Phase 1 acceptance with the Ultra-only delta; #201 already tried this and went stale
- Use `028` as the example id — skips `027` for no reason

## Decision: New branch + supersede #201, do not rebase `cursor/guestflow-ultra-only-cfea`

**Rationale**: #201 Ultra-only design still holds (CA is the LLM; no `chat.completions`). Its tree is ~42 commits behind `main@c3af13d`. Tip of main added property-knowledge injection (`buildDraftPrompt`, `{property_knowledge}`) that #201’s `loadPromptForDraft` does not have. Rebase would fight Sprint 2 worker changes.

**Alternatives considered**:
- Merge main into #201 — high conflict risk on `batch-worker.ts`, tests, STATUS
- Cherry-pick #201 files onto main — would drop KB injection

## Decision: Cursor Ultra CA is the LLM; injectable generator + drafts file; no HTTP provider

**Rationale**: A Node script cannot call the Cloud Agent model mid-process. #201 used `generateDraftWithCursorUltra()` (fail-closed) plus optional `draftGenerator` for tests. Keep that, and add a `--drafts-file` map so a CA can write replies with its own model, then let the worker upsert. Dry-run still returns placeholders.

**Alternatives considered**:
- Keep OpenAI `chat.completions` as fallback — forbidden by item S
- Detect `CURSOR_*` env and call OpenAI anyway — still the wrong meter
- Two-process RPC into the CA — extra product, Principle V

## Decision: Refuse the entire batch before claim when Ultra path is missing

**Rationale**: Brief: “Refuse the batch if Ultra path is unavailable.” #201 failed per job after claim, which marks rows `failed` and hides them from the next Ultra launch.

Ultra path is available only when one of:
- `dryRun === true`
- a `draftGenerator` is injected (tests / CA library use)
- `draftsByMessageId` is a non-empty map (CLI `--drafts-file`)

`OPENAI_API_KEY` is never an availability signal.

**Alternatives considered**:
- Fail each claimed job — burns the queue
- Skip only when the key is unset — current main; wrong meter

## Decision: Keep main’s property-knowledge prompt path

**Rationale**: Sprint 2 WhatsApp work already injects KB and “do not invent facts.” #201’s simple `{from_number}` replace would regress that.

**Alternatives considered**: Revert to #201 string replace — loses `{property_knowledge}`.

## Decision: Docs must not instruct anyone to set `OPENAI_API_KEY` for Production Phase 1

**Rationale**: Explicit Sprint 3 S lock. Current `PHASE1-BATCH-DRAFTS.md` does the opposite. Rewrite that file and add `CURSOR-ULTRA-BATCH-LAUNCH.md`. Mention the key only as “not required / ignored / do not set for this path.”

**Alternatives considered**: Leave OpenAI troubleshooting “solutions” in place — fails the grep gate.

## Decision: No schema, redirect, From, or go-live change

**Rationale**: Item S is meter-only. From stays `+27600200825`. Redirect stays as configured. Approve&Send stays human.

**Alternatives considered**: Fold item R (stay@ From) — explicitly forbidden.
