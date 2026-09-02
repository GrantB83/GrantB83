# Vault Due Digest Pack CLI

An offline command-line tool that assembles weekday Vault due digests by orchestrating `vault-filename-due-queue` and `vault-entity-due-pack`. Built for Vault / CoS compliance tracking.

## Purpose

Vault weekday ops need a consolidated due digest with entity-scoped research packs. This tool:

1. Optionally runs `vault-filename-due-queue` to extract due dates from filenames
2. Optionally runs `vault-entity-due-pack` to group items by entity
3. Assembles a master DIGEST.md with numbered overview by entity
4. Copies entity pack subdirectories for detailed review
5. Flags missing signals and provides approval gates

**Critical constraints:**
- Never opens file bodies
- Never invents due dates or amounts
- Never submits to SARS/CIPC
- Vault owns all research and next actions (N2 gate)

## Features

- 📁 **Two input modes** - Queue JSON or filename list
- 🔧 **Optional sibling tool orchestration** - Shell out to vault-filename-due-queue and/or vault-entity-due-pack
- 🏷️ **Entity-scoped digest** - Numbered overview with counts per entity
- 📊 **Complete entity packs** - Copies by-entity subdirectories with pack.md + items.json
- 📝 **4 summary files** - DIGEST.md, missing-signals.md, APPROVAL.md, manifest.json
- ✅ **Fully tested** - Automated tests with synthetic fixtures
- 🔒 **Offline only** - No APIs, no file body reads, no secrets

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/vault-due-digest-pack
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

### Mode 1: Use Prebuilt Queue JSON

Process queue.json from vault-filename-due-queue + optionally run entity pack:

```bash
npm run pack -- --queue <queue.json> --run-entity-pack --outdir <dir>
```

**Example:**

```bash
npm run pack -- \\
  --queue ../vault-filename-due-queue/out/queue.json \\
  --run-entity-pack \\
  --outdir digest/
```

### Mode 2: Run Both Sibling Tools

Start from filename list and run both tools:

```bash
npm run pack -- \\
  --filenames <list.txt> \\
  --run-filename-queue \\
  --run-entity-pack \\
  --outdir <dir>
```

**Example:**

```bash
npm run pack -- \\
  --filenames vault-filenames.txt \\
  --run-filename-queue \\
  --run-entity-pack \\
  --outdir weekday-digest/
```

### Mode 3: Custom Entity Mappings

Provide custom entity mappings to vault-entity-due-pack:

```bash
npm run pack -- \\
  --queue queue.json \\
  --run-entity-pack \\
  --entities custom-entities.json \\
  --outdir digest/
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--queue` | Path to queue.json from vault-filename-due-queue | * | - |
| `--filenames` | Path to filename list (one per line) | * | - |
| `--entities` | Path to custom entity mappings JSON (passed to vault-entity-due-pack) | No | - |
| `--outdir` | Output directory | Yes | - |
| `--run-filename-queue` | Shell out to vault-filename-due-queue (requires --filenames) | No | false |
| `--run-entity-pack` | Shell out to vault-entity-due-pack | No | false |
| `--help`, `-h` | Show help message | No | - |

\* Either `--queue` or `--filenames` is required (but not both)

## Output Structure

The tool generates the following directory structure:

```
<outdir>/
├── DIGEST.md              # Numbered overview by entity + unknowns
├── by-entity/             # Copied from vault-entity-due-pack
│   ├── gab-trust/
│   │   ├── pack.md
│   │   └── items.json
│   ├── b-group/
│   │   ├── pack.md
│   │   └── items.json
│   ├── sars/
│   │   ├── pack.md
│   │   └── items.json
│   ├── plimmer/
│   │   ├── pack.md
│   │   └── items.json
│   └── unknown/
│       ├── pack.md
│       └── items.json
├── missing-signals.md     # Files without clear category or date hints
├── APPROVAL.md            # Vault research gates
└── manifest.json          # Run metadata
```

### Output Files

#### 1. DIGEST.md

Master digest with numbered entity overview:

```markdown
# Vault Due Digest

**Generated:** 2026-09-02T12:00:00.000Z
**Mode:** queue
**Total Items:** 10

## Overview by Entity

### GAB Trust (4 items)

1. See `by-entity/gab-trust/pack.md` for details
   - 4 items requiring review

### SARS (3 items)

2. See `by-entity/sars/pack.md` for details
   - 3 items requiring review

...

## Next Steps

1. Review entity packs in `by-entity/` subdirectories
2. Check `missing-signals.md` for files without category or date hints
3. Review `APPROVAL.md` for safety gates and Vault ownership rules
4. Vault owns all research and next actions — never auto-submit to CIPC/SARS
```

#### 2. by-entity/ subdirectories

Complete entity pack directories copied from vault-entity-due-pack output. Each entity has:
- `pack.md` - Human-readable research pack with numbered items
- `items.json` - Structured item data

See [vault-entity-due-pack README](../vault-entity-due-pack/README.md) for entity pack structure.

#### 3. missing-signals.md

Files without clear category or date hints:

```markdown
# Missing Signals Report

Files without category or date signals: **1**

See individual entity packs for items marked with low confidence or missing signals.

## Recommendations

1. Review filenames for entity and due date keywords
2. Check `by-entity/unknown/pack.md` for unclassified items
3. Consider manual research for files without clear signals
```

#### 4. APPROVAL.md

Safety gates and Vault ownership:

```markdown
# APPROVAL — Vault Due Digest Pack

## Safety Rules

- ✅ **Filename heuristics only** — No file bodies opened
- ✅ **No invented dates** — Date tokens from source queue/filenames only
- ✅ **No invented amounts** — This tool never handles monetary values
- ✅ **No legal positions** — Category and entity classification is heuristic guidance only

## Vault Ownership

Vault owns all research and next actions on CIPC/SARS/trust documents:

- **Never auto-submit** — All CIPC/SARS filings require human approval (N2 gate)
- **Never post figures in chat** — Amounts stay in files, never in prose
- **Research only** — This digest is for Vault weekday ops research workflow
```

#### 5. manifest.json

Run metadata:

```json
{
  "generatedAt": "2026-09-02T12:00:00.000Z",
  "mode": "queue",
  "inputPath": "queue.json",
  "ranFilenameQueue": false,
  "ranEntityPack": true,
  "summary": {
    "totalItems": 10,
    "byEntity": {
      "gab-trust": 4,
      "b-group": 2,
      "sars": 3,
      "plimmer": 1
    },
    "unknownCount": 0
  },
  "outputs": {
    "digest": "DIGEST.md",
    "missingSignals": "missing-signals.md",
    "approval": "APPROVAL.md",
    "manifest": "manifest.json",
    "entityPacks": [...]
  },
  "warnings": []
}
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes a synthetic queue.json with 6 test entries:

```bash
npm run test:fixtures
```

This will:
1. Build the tool
2. Process `fixtures/sample-queue.json`
3. Run vault-entity-due-pack (via --run-entity-pack)
4. Generate digest pack in `test-out/`
5. Verify outputs were created successfully

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/vault-due-digest-pack/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── tool-runner.ts        # Sibling tool orchestration
│   ├── pack-assembler.ts     # Entity pack data collection
│   ├── digest-generator.ts   # DIGEST.md, missing-signals.md, APPROVAL.md
│   └── output-writer.ts      # File writing and entity pack copying
├── fixtures/
│   ├── sample-queue.json     # 6 synthetic queue entries
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── test-out/                 # Test output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                 # This file
```

## Integration with Sibling Tools

This tool orchestrates two sibling Vault tools:

### 1. vault-filename-due-queue

Extracts due date and category hints from filenames.

```bash
# Manual pipeline
cd tools/vault-filename-due-queue
npm run queue -- --files filenames.txt --outdir queue-out/

# Then pass queue.json to vault-due-digest-pack
cd ../vault-due-digest-pack
npm run pack -- --queue ../vault-filename-due-queue/queue-out/queue.json --outdir digest/
```

Or use `--run-filename-queue` flag:

```bash
npm run pack -- --filenames filenames.txt --run-filename-queue --outdir digest/
```

### 2. vault-entity-due-pack

Groups queue items by entity using keyword heuristics.

```bash
# Manual pipeline
cd tools/vault-entity-due-pack
npm run pack -- --queue queue.json --outdir entity-out/

# Then manually copy entity-out/by-entity/ to digest/by-entity/
```

Or use `--run-entity-pack` flag:

```bash
npm run pack -- --queue queue.json --run-entity-pack --outdir digest/
```

### Full Pipeline Example

```bash
# Option 1: Manual three-step pipeline
cd tools/vault-filename-due-queue
npm run queue -- --files ../../vault-filenames.txt --outdir queue-out/

cd ../vault-entity-due-pack
npm run pack -- --queue ../vault-filename-due-queue/queue-out/queue.json --outdir entity-out/

cd ../vault-due-digest-pack
# (manually assemble outputs)

# Option 2: Automated via vault-due-digest-pack
cd tools/vault-due-digest-pack
npm run pack -- \\
  --filenames ../../vault-filenames.txt \\
  --run-filename-queue \\
  --run-entity-pack \\
  --outdir ../../vault-digest/
```

**Recommendation:** Use `--run-entity-pack` flag for reliability. Prebuilt queue.json from vault-filename-due-queue is also preferred over `--run-filename-queue` when iterating on entity mappings.

## Use Cases

### For Vault / CoS Weekday Ops

Generate Monday morning Vault due digest:

```bash
npm run pack -- \\
  --filenames vault-filenames-2026-09-02.txt \\
  --run-filename-queue \\
  --run-entity-pack \\
  --outdir weekday-digest-2026-09-02/
```

### For Trust Administration

Digest GAB Trust + B Group Holdings compliance:

```bash
npm run pack -- \\
  --queue trust-queue.json \\
  --run-entity-pack \\
  --outdir trust-digest/
```

### For Custom Entity Groupings

Use custom entity mappings for specific projects:

```bash
npm run pack -- \\
  --queue queue.json \\
  --run-entity-pack \\
  --entities project-entities.json \\
  --outdir project-digest/
```

## Constraints & Limitations

- ✅ **Offline only** - No APIs or network calls
- ✅ **No file body reads** - Only processes basenames/filenames
- ✅ **No secrets** - No credentials or tokens stored
- ✅ **No invented dates** - Date tokens from source queue/filenames only
- ✅ **No invented amounts** - Never handles monetary values
- ✅ **No legal positions** - Category and entity classification is heuristic guidance only
- ✅ **Read-only** - Does not move, rename, or modify files
- ✅ **Heuristic-based** - Entity and category tagging may have false positives/negatives
- ⚠️ **Requires sibling tools** - Depends on vault-filename-due-queue and vault-entity-due-pack

## Example Terminal Output

```
Vault Due Digest Pack CLI

Using prebuilt queue: ../vault-filename-due-queue/out/queue.json
🔧 Running vault-entity-due-pack...
  ✓ vault-entity-due-pack completed

📊 Assembling digest data...
📝 Generating outputs...
📁 Copying entity packs...

✅ Digest pack generation complete!

📊 Summary:
   Total items: 10
   Entities: 4
   Unknown: 0
   Missing signals: 1

📂 Output directory: /workspace/weekday-digest-2026-09-02
```

## Troubleshooting

### "Either --queue or --filenames is required" error

Provide one input source:
- `--queue path/to/queue.json` (prebuilt)
- `--filenames path/to/list.txt` (with `--run-filename-queue`)

### "--run-filename-queue requires --filenames" error

The `--run-filename-queue` flag only works with `--filenames`, not `--queue`.

### "No entity packs found" warning

Ensure `--run-entity-pack` flag is set, or manually run vault-entity-due-pack first.

### Empty entity packs

If all items land in `unknown/`, check:
- Filename spelling (entity keywords)
- Default keyword list in vault-entity-due-pack
- Use `--entities` to add missing keywords

## Who This Is For

- **Vault / CoS hub** - Weekday due digest for CIPC/SARS/trust compliance tracking
- **Trust administration** - Consolidated GAB Trust + B Group Holdings digest
- **Grok Bot builders** - Prebuilt digest for weekday automation
- **Document librarians** - Entity-scoped research queues without opening file bodies

## Ritual Removed

**Before this tool:** Manually review flat filename lists, classify by entity, research each due date separately.

**After this tool:** Automated weekday digest with entity-scoped packs ready for Vault research.

**Artifact Grant can use this week:** `DIGEST.md` with numbered entity overview + `by-entity/` packs for targeted weekday research.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
