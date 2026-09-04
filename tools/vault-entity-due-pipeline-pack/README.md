# vault-entity-due-pipeline-pack

**One-line:** Offline CLI pipeline pack orchestrator combining vault-filename-due-queue (optional) with vault-entity-due-pack for Vault weekday operations.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-entity-due-pipeline-pack/`

## Purpose

Vault weekday ops need dated entity research packs for CIPC/SARS/trust compliance monitoring. This orchestrator:

1. Optionally runs vault-filename-due-queue to extract due date hints from filenames
2. Runs vault-entity-due-pack (default ON) to group items by entity
3. Writes one output pipeline pack with PACK.md + manifest.json listing only files actually present / stages that ran
4. APPROVAL.md: Vault / Grant review only; no SARS/CIPC submit; heuristic guidance only

**Critical constraints:**
- Offline/CLI only - no mail send, no API calls
- Never opens file bodies (filenames/markdown heuristics only)
- Never invents due dates, amounts, or legal positions
- Never submits to SARS/CIPC/attorney (N2 gate)
- Vault owns all research and filings
- Entity classification is heuristic guidance only

## Features

- 📦 **Two input modes** - Existing queue.json (preferred) or filename list
- 🔧 **Optional queue stage** - vault-filename-due-queue (default OFF unless --run-queue)
- ✅ **Default entity pack** - vault-entity-due-pack (default ON, disable with --no-run-entity-pack)
- 🏗️ **Auto-build siblings** - Builds sibling tools if dist/ missing (PR #132 pattern)
- 📊 **Output discovery** - Discovers actual sibling tool output layout
- 🎛️ **Flexible boolean flags** - Supports --flag, --flag=false, --no-flag (PR #114 pattern)
- 📊 **Accurate manifest** - Lists only files actually present / stages that ran (PR #116 accuracy)
- 📝 **Complete outputs** - PACK.md, APPROVAL.md, by-entity/, master.md, manifest.json
- 🔒 **Offline & safe** - No file body reads, no network calls, no SARS/CIPC submit

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- Sibling tools (auto-built if dist/ missing):
  - `tools/vault-filename-due-queue/` (optional, for --run-queue)
  - `tools/vault-entity-due-pack/` (required for entity pack stage)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/vault-entity-due-pipeline-pack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## Usage

### Basic Command

```bash
npm run pack -- --queue <queue.json> [options]
npm run pack -- --filenames <list.txt> [options]
```

### Examples

**Use existing queue.json (preferred, most reliable):**
```bash
npm run pack -- \
  --queue ../vault-filename-due-queue/out/queue.json \
  --outdir entity-pack/
```

**From filename list (entity pack only, no queue stage):**
```bash
npm run pack -- \
  --filenames vault-filenames.txt \
  --outdir research-packs/
```

**From filename list with both stages:**
```bash
npm run pack -- \
  --filenames vault-filenames.txt \
  --run-queue \
  --outdir full-pipeline/
```

**Skip entity pack (queue stage only):**
```bash
# All equivalent:
npm run pack -- --filenames list.txt --run-queue --no-run-entity-pack
npm run pack -- --filenames list.txt --run-queue --run-entity-pack=false
npm run pack -- --filenames list.txt --run-queue --run-entity-pack false
```

**With custom entity mappings and as-of date:**
```bash
npm run pack -- \
  --queue queue.json \
  --entity-map custom-entities.json \
  --as-of 2026-09-02 \
  --outdir vault-pack-20260902/
```

**Test with fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--queue <file>` | * | Path to existing vault-filename-due-queue output | - |
| `--filenames <file>` | * | Path to filename list (one per line) | - |
| `--entity-map <file>` | No | Path to custom entity mappings JSON | - |
| `--run-queue` | No | Run vault-filename-due-queue | false |
| `--run-queue=false` | No | Disable queue stage | - |
| `--no-run-queue` | No | Disable queue stage | - |
| `--run-entity-pack` | No | Run vault-entity-due-pack | true |
| `--run-entity-pack=false` | No | Disable entity pack stage | - |
| `--no-run-entity-pack` | No | Disable entity pack stage | - |
| `--as-of <YYYY-MM-DD>` | No | As-of date label for the pack | - |
| `--outdir`, `-o` | No | Output directory | `./out` |
| `--help`, `-h` | No | Show help message | - |

\* Either `--queue` or `--filenames` is required (but not both)

## Pipeline Stages

### Stage 1: Filename Queue (Optional, Default OFF)

**Trigger:** Enabled with `--run-queue` (or when using `--filenames` without existing queue)

**Purpose:** Extract due date and category hints from filenames

**Tool:** `vault-filename-due-queue`

**Outputs:**
- `queue.json` - Due date queue data
- `queue.md` - Due date queue overview
- `missing-signals.md` - Files without category or date hints

**Important:** When queue stage is skipped, these files are **not** listed in `manifest.json` files array (accuracy fix matching PR #116 pattern).

### Stage 2: Entity Pack (Default ON)

**Trigger:** Runs by default unless disabled with `--no-run-entity-pack`

**Purpose:** Group queue items (or filenames) by entity using keyword heuristics

**Tool:** `vault-entity-due-pack`

**Outputs:**
- `by-entity/` - Entity pack subdirectories (gab-trust, sars, b-group, etc.)
- `master.md` - Entity pack overview
- `unknown.md` - Unmatched filenames

**Important:** When entity pack stage is skipped, these files are **not** listed in `manifest.json` files array.

## Output Structure

The tool generates outputs in the specified directory:

```
<outdir>/
├── PACK.md                     # Pipeline pack index with workflow summary
├── APPROVAL.md                 # Vault research gates
├── queue.json                  # Due date queue data (if queue ran)
├── queue.md                    # Due date queue overview (if queue ran)
├── missing-signals.md          # Files without date hints (if queue ran)
├── by-entity/                  # Entity pack subdirectories (if entity pack ran)
│   ├── gab-trust/
│   │   ├── pack.md
│   │   └── items.json
│   ├── sars/
│   │   ├── pack.md
│   │   └── items.json
│   └── ...
├── master.md                   # Entity overview (if entity pack ran)
├── unknown.md                  # Unmatched filenames (if entity pack ran)
└── manifest.json               # Pipeline metadata
```

### Output Files

#### 1. PACK.md - Pipeline Pack Index

**Primary deliverable:** Pipeline index with workflow summary

**Contents:**
- Generated timestamp and source inputs
- Pipeline summary (which stages ran)
- Contents listing
- Warnings (if any)
- Next steps checklist
- Safety reminders

#### 2. APPROVAL.md - Vault Research Gates

**Contents:**
- N2 gate (never submit without Vault/Grant review)
- Workflow checklist
- Safety rules (offline only, never opens bodies, never invents data)
- Approval checklist

#### 3. by-entity/ - Entity Pack Subdirectories (if entity pack ran)

Complete entity pack directories. Each entity has:
- `pack.md` - Human-readable research pack with numbered items
- `items.json` - Structured item data

Entities: gab-trust, b-group, cipc, sars, plimmer, charisse, unknown

#### 4. master.md - Entity Overview (if entity pack ran)

Entity-scoped overview with item counts per entity.

#### 5. queue.json - Due Date Queue Data (if queue ran)

Structured queue data from vault-filename-due-queue.

#### 6. queue.md - Due Date Queue Overview (if queue ran)

Human-readable due date queue with numbered items.

#### 7. manifest.json - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "vault-entity-due-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-02T12:00:00.000Z",
  "asOf": "2026-09-02",
  "inputs": {
    "queuePath": "path/to/queue.json",
    "filenamesPath": null,
    "entityMapPath": null
  },
  "runOptions": {
    "ranFilenameQueue": false,
    "ranEntityPack": true
  },
  "files": [
    {
      "filename": "PACK.md",
      "type": "index",
      "description": "Pipeline pack index"
    }
  ]
}
```

**Important:** When stages are skipped, their output files are **not** included in the `files` array (accuracy fix).

## Workflow: Vault Weekday Ops Routine

### Recommended Flow

**Option A: Prebuilt queue (most reliable)**

1. **Morning prep**
   - Run `vault-filename-due-queue` separately → verify output
   - Export queue.json

2. **Assemble pipeline pack**
   ```bash
   npm run pack -- \
     --queue ../vault-filename-due-queue/out/queue.json \
     --outdir entity-pack-2026-09-02/
   ```

3. **Review outputs**
   - Open `PACK.md` for pipeline overview
   - Review `master.md` for entity-scoped overview
   - Check `by-entity/` subdirectories for detailed research packs
   - Review `unknown.md` for unmatched filenames

4. **Vault research workflow**
   - Vault reviews all entity packs (never opens file bodies)
   - Vault performs research using filename/markdown heuristics only
   - Vault obtains N2 approval before any CIPC/SARS submission

**Option B: Run queue + entity pack during pipeline**

```bash
npm run pack -- \
  --filenames vault-filenames.txt \
  --run-queue \
  --outdir weekday-pack/
```

This invokes both tools as child processes. Less reliable if tools fail, but faster for simple packs.

**Option C: Entity pack only (no queue)**

```bash
npm run pack -- \
  --filenames vault-filenames.txt \
  --outdir entity-pack/
```

Skips the queue stage entirely. Entity pack classifies filenames directly.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Boolean flag parsing (PR #114 pattern)
- Manifest accuracy when stages skipped (PR #116 pattern)
- RunOptions flags reflecting actual execution

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/healthy-pack/filenames.txt` as input.

**Expected output:**
- `test-out/PACK.md` - Pipeline index
- `test-out/APPROVAL.md` - Vault gates
- `test-out/by-entity/` - Entity packs (auto-built from sibling tool)
- `test-out/master.md` - Entity overview
- `test-out/manifest.json` - Pipeline metadata

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/vault-entity-due-pipeline-pack/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── types.ts                    # TypeScript type definitions
│   ├── pipeline-builder.ts         # Pipeline orchestration logic
│   └── pipeline-builder.test.ts    # Pipeline tests
├── fixtures/
│   ├── healthy-pack/
│   │   ├── filenames.txt           # Sample filenames
│   │   └── by-entity/              # Expected entity structure
│   └── README.md                   # Fixture documentation
├── dist/                           # Compiled JavaScript (generated by tsc)
├── out/                            # Default output directory (generated by CLI)
├── test-out/                       # Test outputs (generated by npm run test:fixtures)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                       # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No file body reads** - Filename and markdown structure heuristics only
- ❌ **No SARS/CIPC/attorney submissions** - Vault owns filings (N2 gate)
- ❌ **No network calls** - Offline only
- ❌ **No data invention** - Never fabricates due dates, amounts, or legal positions
- ❌ **No auto-submit** - All outputs are for manual Vault review and approval

### What This Tool Does

- ✅ **Orchestrates sibling tools** via npm run child processes with auto-build
- ✅ **Discovers actual output layout** from sibling tools (handles flat and subdirectory layouts)
- ✅ **Generates PACK.md** with pipeline summary
- ✅ **Copies tool outputs** into one dated pipeline pack folder
- ✅ **Produces manifest.json** for machine-readable inventory
- ✅ **Accurate manifest** - Only lists files actually present / stages that ran

### Data Privacy

- **Never commit real compliance data to git**
- Keep actual pipeline pack folders local only (e.g., `entity-pack/`)
- `.gitignore` already excludes `out/` and `test-out/` directories
- Fixtures use synthetic names for testing

## Sibling Tools Integration

### vault-filename-due-queue

**Purpose:** Extract due date and category hints from filenames

**Invoked with:** `--run-queue` flag (default OFF)

**Outputs copied:**
- `queue.json` - Due date queue data
- `queue.md` - Due date queue overview
- `missing-signals.md` - Files without category or date hints

**Status:** Optional upstream dependency

**Auto-build:** Yes, if dist/ missing (PR #132 pattern)

### vault-entity-due-pack

**Purpose:** Group queue items or filenames by entity using keyword heuristics

**Invoked with:** Runs by default unless `--no-run-entity-pack`

**Outputs copied:**
- `by-entity/` - Entity pack subdirectories
- `master.md` - Entity pack overview
- `unknown.md` - Unmatched filenames

**Status:** Default ON (disable with `--no-run-entity-pack`)

**Auto-build:** Yes, if dist/ missing (PR #132 pattern)

## Troubleshooting

### "Error: Either --queue or --filenames is required"

Provide one input source:
```bash
# Use existing queue:
--queue ../vault-filename-due-queue/out/queue.json

# Or provide filenames:
--filenames vault-filenames.txt
```

### "Queue file not found"

Ensure `--queue` path points to a valid queue.json:
```bash
ls ../vault-filename-due-queue/out/queue.json
```

### "Filenames file not found"

Ensure `--filenames` path points to a valid text file:
```bash
cat vault-filenames.txt
# Should show one filename per line
```

### "vault-entity-due-pack tool not found"

Ensure sibling tool exists:
```bash
ls ../vault-entity-due-pack/
```

If missing, the tool will be auto-built when invoked. If auto-build fails, check sibling tool setup.

### "vault-filename-due-queue tool not found"

Only relevant if `--run-queue` is used. Ensure sibling tool exists:
```bash
ls ../vault-filename-due-queue/
```

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Ritual Removed

**Before this tool:** Manually run queue tool, then entity pack tool, copy files by hand, track which stages ran, manually assemble PACK.md.

**After this tool:** Automated weekday pipeline with optional queue stage, default entity pack, auto-build siblings, accurate manifest of what ran.

**Artifact Grant can use this week:** `PACK.md` with pipeline summary + complete by-entity/ packs + manifest.json listing only files actually present / stages that ran.

## Use Cases

### For Vault / CoS Weekday Ops

Generate Monday morning Vault entity packs for CIPC/SARS/trust compliance:

```bash
npm run pack -- \
  --queue ../vault-filename-due-queue/out/queue-2026-09-02.json \
  --as-of 2026-09-02 \
  --outdir vault-pack-2026-09-02/
```

### For Trust Administration

Consolidated GAB Trust + B Group Holdings entity packs:

```bash
npm run pack -- \
  --filenames trust-filenames.txt \
  --entity-map trust-entities.json \
  --outdir trust-pack/
```

### For Quick Entity Classification (Skip Queue)

When you only need entity grouping (no due date extraction):

```bash
npm run pack -- \
  --filenames vault-filenames.txt \
  --outdir entity-pack/
```

### For Queue + Entity Pack (Both Stages)

When you need both due date extraction and entity grouping:

```bash
npm run pack -- \
  --filenames vault-filenames.txt \
  --run-queue \
  --outdir full-pipeline/
```

## Related Tools

- **vault-filename-due-queue** - Extract due date and category hints from filenames
- **vault-entity-due-pack** - Group queue items by entity using keyword heuristics
- **vault-due-digest-pipeline-pack** - Assemble weekday Vault due digest (orchestrates upstream tools)

## Vault Weekday Workflow Overview

```
Vault filenames list
    ↓
vault-entity-due-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
    ├── vault-filename-due-queue (optional, default OFF)
    └── vault-entity-due-pack (default ON)
    ↓
entity-pack/
    ├── PACK.md (pipeline index)
    ├── APPROVAL.md (Vault gates)
    ├── by-entity/ (entity research packs)
    ├── master.md (entity overview)
    ├── unknown.md (unmatched)
    ├── queue.json (if queue ran)
    ├── queue.md (if queue ran)
    └── manifest.json
    ↓
Manual Vault review
    ↓
Research using entity packs (never opens file bodies)
    ↓
N2 approval before any CIPC/SARS submission
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are for **MANUAL VAULT REVIEW ONLY**. Never opens file bodies. Never submits to SARS/CIPC. Vault owns all research and filings (N2 gate). Entity classification is heuristic guidance only. Offline only.
