# Vault Entity Due Pack CLI

An offline command-line tool that groups filename-due-queue items (or raw filename lists) into **per-entity research packs** for Vault / CoS weekday operations. Built for organizing CIPC, SARS, and trust documents by entity without opening file bodies.

## Purpose

Vault weekday ops need entity-scoped research queues, not flat filename lists. This tool takes either:

1. `queue.json` from the sibling `vault-filename-due-queue` tool, OR
2. A plain text file with one filename per line

...and groups items by entity using keyword heuristics, producing per-entity research packs.

**Critical constraints:**
- Never opens file bodies
- Never invents due dates (only carries signals from input queue)
- Never invents amounts or legal positions
- Entity classification is heuristic guidance only

## Features

- 📁 **Two input modes** - Queue JSON or plain filename list
- 🏷️ **7 default entities** - gab-trust, b-group, cipc, sars, plimmer, charisse, unknown
- 🎯 **Custom entity mappings** - Optional JSON file for keyword→entity rules
- 📊 **Per-entity packs** - Separate pack.md + items.json for each entity
- 📝 **4 summary files** - master.md, unknown.md, APPROVAL.md, manifest.json
- ✅ **Fully tested** - Automated tests with synthetic fixtures
- 🔒 **Offline only** - No APIs, no file body reads, no secrets

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/vault-entity-due-pack
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

### Mode 1: Queue JSON (Preferred)

Process items from `vault-filename-due-queue` output:

```bash
npm run pack -- --queue <queue.json> --outdir <dir>
```

**Example:**

```bash
npm run pack -- --queue ../vault-filename-due-queue/out/queue.json --outdir research-packs/
```

### Mode 2: Filename List

Process plain filenames (one per line):

```bash
npm run pack -- --filenames <list.txt> --outdir <dir>
```

**Example:**

```bash
npm run pack -- --filenames vault-filenames.txt --outdir out/
```

### Mode 3: Custom Entity Mappings

Provide your own keyword→entity mappings:

```bash
npm run pack -- --queue <queue.json> --entities <entities.json> --outdir <dir>
```

**Example custom entities.json:**

```json
{
  "acme-corp": "gab-trust",
  "widgets-ltd": "b-group",
  "john-doe": "plimmer"
}
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--queue` | Path to queue.json from vault-filename-due-queue | * | - |
| `--filenames` | Path to text file with filenames (one per line) | * | - |
| `--entities` | Path to custom entity mappings JSON | No | - |
| `--outdir` | Output directory | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

\* Either `--queue` or `--filenames` is required (but not both)

## Default Entity Heuristics

The tool classifies filenames into entities using **case-insensitive keyword matching**:

| Entity Slug | Keywords |
|-------------|----------|
| **gab-trust** | gab, trust, gabtrust, gab-trust |
| **b-group** | b group, bgroup, b-group, holdings, bvr |
| **cipc** | cipc |
| **sars** | sars, tax |
| **plimmer** | plimmer |
| **charisse** | charisse |
| **unknown** | (no matches found) |

### Priority

The **first matching keyword** determines the entity. For example:

- `GAB-Trust-CIPC-Filing.pdf` → **gab-trust** (matches "gab" and "trust" first)
- `SARS-Tax-Clearance-CIPC.pdf` → **sars** (matches "sars" first)
- `CIPC-Annual-Return-2024.pdf` → **cipc** (only "cipc" matches)

## Output Structure

The tool generates the following directory structure:

```
<outdir>/
├── by-entity/
│   ├── gab-trust/
│   │   ├── pack.md           # Human-readable research pack
│   │   └── items.json        # Structured item data
│   ├── b-group/
│   │   ├── pack.md
│   │   └── items.json
│   ├── cipc/
│   │   ├── pack.md
│   │   └── items.json
│   ├── sars/
│   │   ├── pack.md
│   │   └── items.json
│   ├── plimmer/
│   │   ├── pack.md
│   │   └── items.json
│   ├── charisse/
│   │   ├── pack.md
│   │   └── items.json
│   └── unknown/
│       ├── pack.md
│       └── items.json
├── master.md                 # Overview with counts per entity
├── unknown.md                # Unmatched basenames
├── APPROVAL.md               # H-gate safety rules
└── manifest.json             # Run metadata
```

### Output Files

#### 1. by-entity/\<slug\>/pack.md

Human-readable research pack for each entity:

```markdown
# GAB Trust Research Pack

**Entity:** gab-trust
**Total Items:** 3
**Generated:** 2026-09-02T12:00:00.000Z

## Items

### 1. CIPC-Annual-Return-2024-AR2024-GABTrust.pdf
- **Category:** cipc-annual-return
- **Date Tokens:** 2024
- **Due Status:** has-date
- **Confidence:** high

### 2. SARS-ITR14-Provisional-Tax-GAB-Trust-2024-06-30.pdf
...
```

#### 2. by-entity/\<slug\>/items.json

Structured JSON with item details:

```json
{
  "entity": "gab-trust",
  "count": 3,
  "items": [
    {
      "filename": "CIPC-Annual-Return-2024-AR2024-GABTrust.pdf",
      "category": "cipc-annual-return",
      "dateTokens": ["2024"],
      "dueStatus": "has-date",
      "confidence": "high",
      "signals": ["cipc-annual-return", "keyword:return"],
      "notes": ""
    }
  ]
}
```

#### 3. master.md

Overview with entity counts:

```markdown
# Vault Entity Due Pack - Master Overview

**Generated:** 2026-09-02T12:00:00.000Z
**Total Items:** 10

## Entity Counts

- **GAB Trust:** 4 items
- **SARS:** 3 items
- **B Group Holdings:** 2 items
- **Plimmer:** 1 item

## Next Steps

1. Review entity packs in `by-entity/` subdirectories
2. Check `unknown.md` for unclassified items
3. Review `APPROVAL.md` for safety gates
```

#### 4. unknown.md

Unmatched filenames:

```markdown
# Unknown Entity Items

**Count:** 1

The following filenames could not be matched to any entity:

1. `random-document-xyz.pdf`
   - Category: unknown

## Recommendations

- Review filenames for entity keywords
- Consider adding custom entity mappings with `--entities` option
- Manually classify if entity cannot be determined from filename
```

#### 5. APPROVAL.md

Safety gates and Vault ownership notice:

```markdown
# APPROVAL — Vault Entity Due Pack

## Safety Rules

- ✅ **Filename heuristics only** — No file bodies opened
- ✅ **No invented dates** — Date tokens from source queue only
- ✅ **No invented amounts** — This tool never handles monetary values
- ✅ **No legal positions** — Entity classification is heuristic guidance only

## Vault Ownership

Vault owns all research and next actions on CIPC/SARS/trust documents:

- **Never auto-submit** — All CIPC/SARS filings require human approval (N2 gate)
- **Never post figures in chat** — Amounts stay in files, never in prose
- **Research only** — This pack is for Vault weekday ops research workflow
```

#### 6. manifest.json

Run metadata:

```json
{
  "generatedAt": "2026-09-02T12:00:00.000Z",
  "mode": "queue",
  "inputPath": "queue.json",
  "summary": {
    "totalItems": 10,
    "byEntity": {
      "gab-trust": 4,
      "b-group": 2,
      "cipc": 0,
      "sars": 3,
      "plimmer": 1,
      "charisse": 0,
      "unknown": 0
    }
  },
  "entityPacks": [
    {
      "entity": "gab-trust",
      "count": 4,
      "packPath": "by-entity/gab-trust/pack.md"
    }
  ]
}
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes 10 synthetic test filenames:

```bash
npm run test:fixtures
```

This will:
1. Build the tool
2. Process `fixtures/sample-queue.json`
3. Generate entity packs in `test-out/`
4. Verify outputs were created successfully

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/vault-entity-due-pack/
├── src/
│   ├── index.ts                     # CLI entry point
│   ├── types.ts                     # TypeScript type definitions
│   ├── entity-classifier.ts         # Entity keyword matching
│   ├── entity-classifier.test.ts    # Classifier tests
│   └── pack-generator.ts            # Output file generation
├── fixtures/
│   ├── sample-queue.json            # 10 synthetic queue items
│   ├── sample-filenames.txt         # 10 synthetic filenames
│   └── README.md                    # Fixture documentation
├── dist/                            # Compiled JavaScript (generated)
├── test-out/                        # Test output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                        # This file
```

## Integration with vault-filename-due-queue

This tool is designed to consume output from the sibling `vault-filename-due-queue` tool:

```bash
# Step 1: Generate due queue from filenames
cd tools/vault-filename-due-queue
npm run queue -- --files vault-filenames.txt --outdir due-queue/

# Step 2: Group by entity
cd ../vault-entity-due-pack
npm run pack -- --queue ../vault-filename-due-queue/due-queue/queue.json --outdir entity-packs/

# Step 3: Review entity packs
ls -l entity-packs/by-entity/
```

## How to Shell Out to vault-filename-due-queue

If you have raw filenames and want to run both tools in sequence:

```bash
#!/bin/bash
# Example: Run both tools in pipeline

# Step 1: Extract due dates from filenames
cd tools/vault-filename-due-queue
npm run queue -- --files ../../vault-filenames.txt --outdir temp-queue/

# Step 2: Group by entity
cd ../vault-entity-due-pack
npm run pack -- --queue ../vault-filename-due-queue/temp-queue/queue.json --outdir ../../entity-packs/

# Cleanup
rm -rf ../vault-filename-due-queue/temp-queue/
```

**Note:** Shelling out is optional. You can also use `--filenames` mode directly if you don't need due date extraction.

## Use Cases

### For Vault / CoS Weekday Ops

Group CIPC/SARS/trust documents by entity for targeted research:

```bash
npm run pack -- --queue vault-due-queue.json --outdir weekday-packs/
```

### For Trust Administration

Separate GAB Trust documents from B Group Holdings documents:

```bash
npm run pack -- --filenames trust-filenames.txt --outdir trust-entity-packs/
```

### For Custom Entity Groupings

Use custom mappings for specific projects or property names:

```bash
npm run pack -- --queue queue.json --entities project-entities.json --outdir project-packs/
```

## Constraints & Limitations

- ✅ **Offline only** - No APIs or network calls
- ✅ **No file body reads** - Only processes basenames/filenames
- ✅ **No secrets** - No credentials or tokens stored
- ✅ **No invented dates** - Date tokens from source queue only
- ✅ **No invented amounts** - Never handles monetary values
- ✅ **No legal positions** - Entity classification is heuristic guidance only
- ✅ **Read-only** - Does not move, rename, or modify files
- ✅ **Heuristic-based** - Entity tagging may have false positives/negatives

## Example Terminal Output

```
Vault Entity Due Pack CLI

Mode: Queue JSON

Loading queue: ../vault-filename-due-queue/out/queue.json
  ✓ Loaded 10 queue items

Classifying items by entity...
  ✓ Classified 10 items

Generating entity packs in: out
  ✓ Entity pack: gab-trust (4 items)
  ✓ Entity pack: b-group (2 items)
  ✓ Entity pack: sars (3 items)
  ✓ Entity pack: plimmer (1 item)
  ✓ Master overview: master.md
  ✓ Unknown items: unknown.md (0 items)
  ✓ Approval gates: APPROVAL.md
  ✓ Manifest: manifest.json

✅ Entity pack generation complete!

📊 Entity breakdown:
   gab-trust: 4
   sars: 3
   b-group: 2
   plimmer: 1
```

## Troubleshooting

### "Invalid queue.json format" error

Ensure your queue.json has the structure:

```json
{
  "entries": [
    { "filename": "...", ... }
  ]
}
```

### All items classified as "unknown"

- Verify filenames contain entity keywords (case-insensitive)
- Review default keywords in README
- Add custom mappings with `--entities` if needed

### Empty entity packs

If all items land in `unknown/`, check:
- Filename spelling (e.g., "GABTrust" vs "GAB-Trust" vs "gab trust")
- Default keyword list covers your entity names
- Use `--entities` to add missing keywords

## Who This Is For

- **Vault / CoS hub** - Organize CIPC/SARS/trust documents by entity for weekday ops
- **Trust administration** - Separate GAB Trust from B Group Holdings documents
- **Grok Bot builders** - Pre-group filenames before digest generation
- **Document librarians** - Entity-scoped research queues without opening file bodies

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
