# vault-due-digest-pipeline-pack

**One-line:** Offline CLI pipeline pack orchestrator combining vault-due-digest-pack with vault-due-digest-post-checklist for Vault weekday operations.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-due-digest-pipeline-pack/`

## Purpose

Vault weekday ops need a consolidated due digest with validation before CIPC/SARS/trust research or filing steps. This orchestrator:

1. Accepts existing digest pack directories OR runs vault-due-digest-pack from filename inputs
2. Optionally runs vault-entity-due-pack stage if needed (via digest pack --run-entity-pack)
3. Runs vault-due-digest-post-checklist (default ON; `--run-post-checklist=false` / `--no-run-post-checklist` to disable)
4. Writes one output pipeline pack with PACK.md + manifest.json listing only files actually present / stages that ran
5. APPROVAL.md: Vault / Grant review only; no SARS/CIPC submit; no figures in chat

**Critical constraints:**
- Offline/CLI only - no mail send
- Never opens file bodies (filenames/markdown heuristics only)
- Never invents due dates or amounts
- Never submits to SARS/CIPC/attorney (N2 gate)
- Vault owns all research and filings

## Features

- 📦 **Two input modes** - Existing digest pack (preferred) or filename list
- 🔧 **Optional upstream orchestration** - Can shell out to vault-due-digest-pack
- ✅ **Flexible post-checklist** - Default ON with flexible boolean parsing (`--no-run-post-checklist`, `=false`, etc.)
- 📊 **Accurate manifest** - POST-CHECKLIST.md / ISSUES.md only listed when actually present (PR #116 accuracy)
- 📝 **Complete outputs** - PACK.md, DIGEST.md, by-entity/, APPROVAL.md, manifest.json
- 🔒 **Offline & safe** - No file body reads, no network calls, no SARS/CIPC submit

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- Sibling tools (if using `--filenames` mode):
  - `tools/vault-due-digest-pack/`
  - `tools/vault-due-digest-post-checklist/` (optional, for post-checklist)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/vault-due-digest-pipeline-pack
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
npm run pipeline -- --pack <digest-pack-dir> [options]
npm run pipeline -- --filenames <list.txt> [options]
```

### Examples

**Use existing digest pack (preferred, most reliable):**
```bash
npm run pipeline -- \
  --pack ../vault-due-digest-pack/out/digest-2026-09-02 \
  --outdir pipeline-pack/
```

**From filename list (runs vault-due-digest-pack):**
```bash
npm run pipeline -- \
  --filenames vault-filenames.txt \
  --outdir weekday-digest/
```

**Skip post-checklist (multiple formats):**
```bash
# All equivalent:
npm run pipeline -- --pack digest/ --no-run-post-checklist
npm run pipeline -- --pack digest/ --run-post-checklist=false
npm run pipeline -- --pack digest/ --run-post-checklist false
```

**Test with fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--pack <dir>` | * | Path to existing vault-due-digest-pack output | - |
| `--filenames <file>` | * | Path to filename list (one per line) | - |
| `--run-post-checklist` | No | Run vault-due-digest-post-checklist | true |
| `--run-post-checklist=false` | No | Disable post-checklist | - |
| `--no-run-post-checklist` | No | Disable post-checklist | - |
| `--outdir`, `-o` | No | Output directory | `./out` |
| `--help`, `-h` | No | Show help message | - |

\* Either `--pack` or `--filenames` is required (but not both)

## Pipeline Stages

### Stage 1: Digest Pack (Required)

**Options:**
- **Use existing pack:** `--pack <dir>` (fastest, most reliable)
- **Run digest pack:** `--filenames <file>` (tool invoked automatically with `--run-entity-pack`)

**Purpose:** Assemble vault due digest with entity-scoped research packs

**Tool:** `vault-due-digest-pack`

**Outputs:**
- `DIGEST.md` - Vault due digest overview
- `APPROVAL.md` - Vault research gates
- `by-entity/` - Entity pack subdirectories (gab-trust, sars, b-group, etc.)
- `missing-signals.md` - Files without category or date hints
- `manifest.json` - Run metadata

### Stage 2: Post-Checklist (Optional, Default ON)

**Trigger:** Runs by default unless disabled with `--no-run-post-checklist`

**Purpose:** Generate pre-action checklist for Vault review before research/filing steps

**Tool:** `vault-due-digest-post-checklist`

**Outputs:**
- `POST-CHECKLIST.md` - Go/no-go checklist
- `ISSUES.md` - Validation warnings
- `APPROVAL.md` - Post-checklist approval gates

**Important:** When post-checklist is skipped, `POST-CHECKLIST.md` and `ISSUES.md` are **not** listed in `manifest.json` files array (accuracy fix matching PR #116 pattern).

## Output Structure

The tool generates outputs in the specified directory:

```
<outdir>/
├── PACK.md              # Pipeline pack index with workflow summary
├── DIGEST.md            # Vault due digest overview (copied from digest pack)
├── APPROVAL.md          # Vault research gates (copied from digest pack)
├── missing-signals.md   # Files without clear category/date hints
├── by-entity/           # Entity pack subdirectories (copied from digest pack)
│   ├── gab-trust/
│   │   ├── pack.md
│   │   └── items.json
│   ├── sars/
│   │   ├── pack.md
│   │   └── items.json
│   └── ...
├── POST-CHECKLIST.md    # Pre-action checklist (if post-checklist ran)
├── ISSUES.md            # Failures and warnings (if post-checklist ran)
└── manifest.json        # Pipeline metadata
```

### Output Files

#### 1. PACK.md - Pipeline Pack Index

**Primary deliverable:** Pipeline index with workflow summary

**Contents:**
- Generated timestamp and source pack
- Pipeline summary (which stages ran)
- Contents listing
- Warnings (if any)
- Next steps checklist
- Safety reminders

#### 2. DIGEST.md - Vault Due Digest

Copied from vault-due-digest-pack output

**Contents:**
- Entity-scoped overview with item counts
- Links to by-entity/ research packs
- Next steps for Vault weekday ops

#### 3. APPROVAL.md - Vault Research Gates

Copied from vault-due-digest-pack output

**Contents:**
- Safety rules (filename heuristics only, no body reads)
- Vault ownership (never auto-submit, N2 gate)
- Research-only workflow

#### 4. by-entity/ - Entity Pack Subdirectories

Complete entity pack directories copied from vault-due-digest-pack output. Each entity has:
- `pack.md` - Human-readable research pack with numbered items
- `items.json` - Structured item data

Entities: gab-trust, b-group, cipc, sars, plimmer, charisse, unknown

#### 5. POST-CHECKLIST.md (if post-checklist ran)

Copied from vault-due-digest-post-checklist output

**Contents:**
- Numbered go/no-go items
- Pack validation results
- N2 gate reminder
- Vault workflow checklist

#### 6. ISSUES.md (if post-checklist ran)

Copied from vault-due-digest-post-checklist output

**Contents:**
- Failures and warnings only
- Empty if all checks pass

#### 7. manifest.json - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "vault-due-digest-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-02T12:00:00.000Z",
  "inputs": {
    "packPath": "path/to/digest-pack",
    "filenamesPath": null
  },
  "runOptions": {
    "ranFilenameQueue": false,
    "ranEntityPack": false,
    "ranDigestPack": false,
    "ranPostChecklist": true
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

**Important:** When `ranPostChecklist: false`, the `files` array does **not** include `POST-CHECKLIST.md` or `ISSUES.md` entries (accuracy fix).

## Workflow: Vault Weekday Ops Routine

### Recommended Flow

**Option A: Prebuilt digest pack (most reliable)**

1. **Morning prep**
   - Run `vault-due-digest-pack` separately → verify output
   - Export entity packs and digest

2. **Assemble pipeline pack**
   ```bash
   npm run pipeline -- \
     --pack ../vault-due-digest-pack/out/digest-2026-09-02 \
     --outdir pipeline-pack/
   ```

3. **Review outputs**
   - Open `PACK.md` for pipeline overview
   - Review `POST-CHECKLIST.md` for go/no-go items
   - Check `ISSUES.md` for warnings
   - Review `DIGEST.md` and by-entity/ packs

4. **Vault research workflow**
   - Vault reviews all checklist items
   - Vault performs research using entity packs (never opens file bodies)
   - Vault obtains N2 approval before any CIPC/SARS submission

**Option B: Run digest pack during pipeline**

```bash
npm run pipeline -- \
  --filenames vault-filenames.txt \
  --outdir weekday-digest/
```

This invokes vault-due-digest-pack as a child process. Less reliable if tools fail, but faster for simple packs.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Pipeline assembly with existing pack
- Post-checklist skipping behavior
- Manifest.files accuracy when checklist skipped
- Input validation
- File copying

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/healthy-pack/` (minimal vault-due-digest-pack output).

**Expected output:**
- `test-out/PACK.md` - Pipeline index
- `test-out/DIGEST.md` - Vault due digest
- `test-out/manifest.json` - Pipeline metadata

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/vault-due-digest-pipeline-pack/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── pipeline-builder.ts     # Pipeline orchestration logic
│   └── pipeline-builder.test.ts # Pipeline tests
├── fixtures/
│   ├── healthy-pack/           # Minimal vault-due-digest-pack output
│   │   ├── DIGEST.md
│   │   ├── APPROVAL.md
│   │   ├── missing-signals.md
│   │   └── by-entity/
│   │       ├── gab-trust/
│   │       └── sars/
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated by tsc)
├── out/                        # Default output directory (generated by CLI)
├── test-out/                   # Test outputs (generated by npm run test:fixtures)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                   # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No file body reads** - Filename and markdown structure heuristics only
- ❌ **No SARS/CIPC/attorney submissions** - Vault owns filings (N2 gate)
- ❌ **No network calls** - Offline only
- ❌ **No data invention** - Never fabricates due dates, amounts, or legal positions
- ❌ **No auto-submit** - All outputs are for manual Vault review and approval

### What This Tool Does

- ✅ **Orchestrates sibling tools** via npm run child processes or accepts prebuilt outputs
- ✅ **Generates PACK.md** with pipeline summary
- ✅ **Copies tool outputs** into one dated pipeline pack folder
- ✅ **Produces manifest.json** for machine-readable inventory
- ✅ **Accurate manifest** - POST-CHECKLIST.md / ISSUES.md not listed when checklist skipped

### Data Privacy

- **Never commit real compliance data to git**
- Keep actual pipeline pack folders local only (e.g., `pipeline-pack/`)
- `.gitignore` already excludes `out/` and `test-out/` directories
- Fixtures use synthetic names for testing

## Sibling Tools Integration

### vault-filename-due-queue

**Purpose:** Extract due date and category hints from filenames

**Not directly invoked by this tool** - Instead, vault-due-digest-pack can invoke it with `--run-filename-queue`

**Status:** Optional upstream dependency

### vault-entity-due-pack

**Purpose:** Group queue items by entity using keyword heuristics

**Not directly invoked by this tool** - Instead, vault-due-digest-pack can invoke it with `--run-entity-pack`

**Status:** Optional upstream dependency

### vault-due-digest-pack

**Purpose:** Assemble weekday Vault due digest by orchestrating filename-queue and entity-pack

**Invoked with:** Automatically when `--filenames` provided (instead of `--pack`)

**Outputs copied:**
- `DIGEST.md` - Vault due digest overview
- `APPROVAL.md` - Vault research gates
- `by-entity/` - Entity pack subdirectories
- `missing-signals.md` - Files without category/date hints

**Status:** Required (either via `--pack` or `--filenames`)

### vault-due-digest-post-checklist

**Purpose:** Generate pre-action checklist from vault-due-digest-pack output

**Invoked with:** Runs by default unless `--no-run-post-checklist`

**Outputs copied:**
- `POST-CHECKLIST.md` - Go/no-go checklist
- `ISSUES.md` - Validation warnings

**Status:** Optional, default ON

**Important:** When skipped, `POST-CHECKLIST.md` and `ISSUES.md` are **not** listed in `manifest.json` files array.

## Troubleshooting

### "Error: Either --pack or --filenames is required"

Provide one input source:
```bash
# Use existing pack:
--pack ../vault-due-digest-pack/out/digest-2026-09-02

# Or provide filenames to run digest pack:
--filenames vault-filenames.txt
```

### "Pack directory not found"

Ensure `--pack` path points to a valid vault-due-digest-pack output folder:
```bash
ls ../vault-due-digest-pack/out/digest-2026-09-02/
# Should show: DIGEST.md, APPROVAL.md, by-entity/, ...
```

### "Required file DIGEST.md not found in pack"

The pack directory must contain DIGEST.md. Verify you're pointing to a valid vault-due-digest-pack output.

### "vault-due-digest-pack tool not found"

Ensure sibling tool exists and is built:
```bash
cd ../vault-due-digest-pack
npm install
npm run build
```

### "Post-checklist failed"

The post-checklist stage failed or the tool wasn't found. Check:
- `../vault-due-digest-post-checklist/` exists and is built
- The pack structure is valid for post-checklist validation

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Ritual Removed

**Before this tool:** Manually review digest pack, run post-checklist separately, copy files by hand, track which stages ran.

**After this tool:** Automated weekday pipeline with validation included, one dated output folder, accurate manifest of what ran.

**Artifact Grant can use this week:** `PACK.md` with pipeline summary + complete by-entity/ packs + optional POST-CHECKLIST.md ready for Vault research.

## Use Cases

### For Vault / CoS Weekday Ops

Generate Monday morning Vault due digest with pre-action checklist:

```bash
npm run pipeline -- \
  --pack ../vault-due-digest-pack/out/digest-2026-09-02 \
  --outdir weekday-digest-2026-09-02/
```

### For Trust Administration

Consolidated GAB Trust + B Group Holdings digest with validation:

```bash
npm run pipeline -- \
  --filenames trust-filenames.txt \
  --outdir trust-digest/
```

### For Quick Review (Skip Checklist)

When post-checklist is unnecessary for a quick review:

```bash
npm run pipeline -- \
  --pack digest-pack/ \
  --no-run-post-checklist \
  --outdir quick-review/
```

## Related Tools

- **vault-filename-due-queue** - Extract due date and category hints from filenames
- **vault-entity-due-pack** - Group queue items by entity using keyword heuristics
- **vault-due-digest-pack** - Assemble weekday Vault due digest (orchestrates upstream tools)
- **vault-due-digest-post-checklist** - Generate pre-action checklist from digest pack

## Vault Weekday Workflow Overview

```
Vault filenames list
    ↓
vault-due-digest-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
    ├── vault-due-digest-pack (required)
    │   ↓ (orchestrates)
    │   ├── vault-filename-due-queue (optional)
    │   └── vault-entity-due-pack (optional)
    └── vault-due-digest-post-checklist (optional, default ON)
    ↓
pipeline-pack/
    ├── PACK.md (pipeline index)
    ├── DIGEST.md (due digest overview)
    ├── by-entity/ (entity research packs)
    ├── POST-CHECKLIST.md (go/no-go)
    ├── ISSUES.md (warnings)
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

**Remember:** All outputs are for **MANUAL VAULT REVIEW ONLY**. Never opens file bodies. Never submits to SARS/CIPC. Vault owns all research and filings (N2 gate). Offline only.
