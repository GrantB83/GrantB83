# Implementation Plan: Sprint 3 Phase 1 Ultra-Only Drafts

**Branch**: `cursor/guestflow-ultra-only-6420` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-sprint3-phase1-ultra-only/spec.md`

## Summary

Remove the OpenAI `chat.completions` fallback from GuestFlow Phase 1. The Cursor Ultra Cloud Agent is the language model. The worker loads the QC’d prompt plus property knowledge, accepts drafts only from dry-run placeholders, an injected generator (tests / Ultra CA), or a CA-supplied drafts file, and **refuses the entire batch without claiming** when that Ultra path is missing. A set `OPENAI_API_KEY` is ignored. Webhook enqueue, batch contract, Approve&Send, redirect, and WhatsApp From stay unchanged.

## Technical Context

**Language/Version**: TypeScript 5.5 / Node 20 / Next.js 14 (App Router)

**Primary Dependencies**: Existing GuestFlow (`apps/guestflow`), Vitest, tsx worker script, `buildDraftPrompt` / `formatPropertyKnowledgeForPrompt`

**Storage**: Existing `draft_jobs` + `batch_runs`. No schema change. No Production Turso writes.

**Testing**: Vitest in `apps/guestflow/__tests__/batch-worker.test.ts` — fail-closed refuse-batch, dry-run placeholder, mock generator, `OPENAI_API_KEY` ignored

**Target Platform**: Cursor Ultra Cloud Agent against GuestFlow Preview/Production API. Vercel webhook path stays enqueue-only.

**Project Type**: Web application + CLI worker in monorepo

**Performance Goals**: One batch then exit. No loop. Webhook still <30s with no LLM.

**Constraints**: No OpenAI / Anthropic calls; no auto-send; no redirect/From/go-live flip; no Production deploy; MERGE HOLD for GFM

**Scale/Scope**: Phase 1 allowlist only (`general_question` / `maintenance_other` / confidence < 0.6); ≤6 batches/day SAST

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate |
| --- | --- |
| I. Human-Gated Guest Send | PASS — worker writes drafts only; Approve&Send + confirmToken unchanged |
| II. Fail-Closed Facts | PASS — refuse batch if Ultra path missing; prompt still forbids invented rates/phones; KB injection kept |
| III. Booking SoR vs Comms SoR | PASS — no booking writes |
| IV. Channel Identity Freeze | PASS — From stays `+27600200825`; redirect untouched |
| V. Extend Live Systems | PASS — extend `batch-worker` + Phase 1 docs; no new product |
| VI. Retention / lanes | PASS — hospitality comms only; no new PII store |
| Safety | PASS — draft/queue/flag; no Production secret values; no live send |

Post-design re-check: still PASS. Complexity is a generator swap + refuse-batch gate, justified by Principle V (extend the live worker).

## Project Structure

### Documentation (this feature)

```text
specs/027-sprint3-phase1-ultra-only/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ultra-batch-worker.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/batch-worker.ts
├── src/lib/property-knowledge.ts          # keep buildDraftPrompt
├── scripts/batch-worker.ts
├── prompts/DRAFT_PROMPT.md
├── __tests__/batch-worker.test.ts
├── docs/PHASE1-BATCH-DRAFTS.md
└── docs/CURSOR-ULTRA-BATCH-LAUNCH.md      # NEW
docs/automation/STATUS.md
docs/automation/labor-ledger.md
specs/008-guestflow-phase1-batch-drafts/spec.md  # pointer only
```

**Structure Decision**: Extend the live Phase 1 worker in `apps/guestflow`. Do not add a parallel draft service. New Spec Kit folder `027` is the realignment SoR; `008` stays the original queue/contract spec.

## Complexity Tracking

> No constitution violations.
