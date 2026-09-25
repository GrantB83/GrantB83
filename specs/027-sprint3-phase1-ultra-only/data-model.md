# Data Model: Sprint 3 Phase 1 Ultra-Only Drafts

No new tables. This package changes how a draft body is produced, not what is stored.

## draft_job (existing)

| Field | Type | Constraints |
| --- | --- | --- |
| id | integer pk | autoincrement |
| tenant_id | integer | required |
| thread_id | integer | required |
| message_id | integer | required; unique among open (`pending`/`claimed`) rows |
| intent | text | nullable; Phase 1 allowlist at enqueue |
| status | text | `pending` \| `claimed` \| `done` \| `failed` |
| attempts | integer | default 0 |
| error | text | nullable |
| created_at | datetime | default now |
| updated_at | datetime | default now |

**Validation (this package)**: A live batch with Ultra path unavailable MUST leave every row `pending`. Claim is allowed only after an Ultra path is present (or dry-run).

## batch_run (existing)

| Field | Type | Constraints |
| --- | --- | --- |
| id | integer pk | autoincrement |
| batch_id | text | required |
| jobs_count | integer | required |
| created_at | datetime | default now |

**Validation**: Soft cap counts rows for the Africa/Johannesburg date. A refused Ultra batch MUST NOT insert a `batch_run`.

## inbound_messages draft fields (existing)

| Field | Type | Constraints |
| --- | --- | --- |
| draft_reply | text | editable staff reply |
| draft_source | text | `heuristic` \| `llm` \| `human` |

**State**: Ultra-saved drafts use `draft_source=llm`. Staff edit → `human` (existing). Worker never sends.

## UltraPath (runtime, not persisted)

| Signal | Meaning |
| --- | --- |
| `dryRun` | Placeholders only; no upsert |
| `draftGenerator` | Injected function (Vitest / CA library) |
| `draftsByMessageId` | Non-empty map from `--drafts-file` |
| anything else, including `OPENAI_API_KEY` | Unavailable → refuse batch |

## Prompt envelope (ephemeral)

Built per job from `prompts/DRAFT_PROMPT.md` + message context + `formatPropertyKnowledgeForPrompt`. Not stored. Must not invent rates, phones, or facts.

## State transitions

```text
pending  --[Ultra path ready + contract]--> claimed
claimed  --[upsert ok]--> done
claimed  --[single-job error after Ultra opened batch]--> failed
pending  --[Ultra path missing]--> pending   # no transition
```
