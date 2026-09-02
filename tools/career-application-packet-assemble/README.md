# Career Application Packet Assemble

**One-line:** Offline CLI assembler for Career / CoS application packets: score report, cover lint report, facts snapshot, APPROVAL checklist.

**Owning desk(s):** Career / CoS

## Overview

Career hunt produces score output + cover draft + facts. This CLI assembles one dated packet folder before apply: score report, cover lint report, facts snapshot, APPROVAL checklist (hard gates, score ≥8, Career owns apply).

Career bot needs a consistent apply packet structure. This tool collects outputs from `career-jd-hard-gates-score` and `career-cover-letter-facts-lint` (or can optionally run them), packages everything into one folder, and generates an approval checklist so Career bot can review before applying.

## Features

- 🎯 **Orchestrator** - Can copy prebuilt reports or shell out to sibling tools
- 📦 **Offline only** - No LinkedIn API or network calls
- ✅ **Approval checklist** - APPROVAL.md with hard gates and score floor
- 🔒 **Never invents** - Only packages existing reports and facts
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- Sibling tools (if using `--run-*` flags):
  - `career-jd-hard-gates-score`
  - `career-cover-letter-facts-lint`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/career-application-packet-assemble
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
npm run assemble -- --outdir <dir> [options]
```

### Examples

**Use prebuilt reports (recommended):**
```bash
npm run assemble -- \\
  --outdir out/packet-20260902/ \\
  --score path/to/score-outdir/scorecard.md \\
  --cover-lint path/to/lint-outdir/report.md \\
  --facts facts.json \\
  --jd jd.txt
```

**Run scoring tool during assembly:**
```bash
npm run assemble -- \\
  --outdir out/packet-20260902/ \\
  --run-score --jd jd.txt \\
  --cover-lint lint-outdir/report.md \\
  --facts facts.json
```

**Run both tools during assembly:**
```bash
npm run assemble -- \\
  --outdir out/packet-20260902/ \\
  --run-score --jd jd.txt \\
  --run-cover-lint --draft cover.md --facts facts.json
```

**Minimal packet (warnings but still creates structure):**
```bash
npm run assemble -- \\
  --outdir out/packet-20260902/
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--outdir` | ✅ Yes | Output directory for packet | - |
| `--score` | No | Path to score report (scorecard.md from score tool) | - |
| `--cover-lint` | No | Path to cover lint report (report.md from lint tool) | - |
| `--facts` | No | Path to facts.json (career-os claims) | - |
| `--jd` | No | Path to job description text file | - |
| `--draft` | No | Path to cover letter draft | - |
| `--run-score` | No | Run career-jd-hard-gates-score (requires --jd) | false |
| `--run-cover-lint` | No | Run career-cover-letter-facts-lint (requires --draft and --facts) | false |
| `--help, -h` | No | Show help message | - |

## Output Structure

Generates a packet folder with:

```
out/packet-YYYYMMDD/
├── PACK.md              # Packet index and summary
├── APPROVAL.md          # Checklist with safety gates
├── score-report.md      # Copy of scorecard.md (if provided)
├── cover-lint-report.md # Copy of report.md (if provided)
├── facts.json           # Copy of facts (if provided)
├── jd.txt               # Copy of job description (if provided)
├── cover-draft.md       # Copy of cover letter draft (if provided)
└── manifest.json        # Machine-readable metadata
```

### PACK.md

Packet index with:
- Overview of packet purpose
- Score summary (company, title, total score, verdict, gates)
- Cover letter lint summary (claims matched/unmatched/suspicious)
- List of packet contents
- Warnings (if any inputs missing)
- Next steps checklist

### APPROVAL.md

Review checklist with:
- **Hard gates:** Score ≥8, all hard gates pass, verdict = apply
- **Cover letter:** All claims matched/safe
- **Ownership reminders:** Never invent facts/comp, Career owns apply, no LinkedIn send from tool
- **Reminders:** Draft-only, score floor, lint must be safe

### manifest.json

Machine-readable metadata:
- Tool version and timestamp
- Packet date (YYYYMMDD format)
- Input paths (score, lint, facts, jd)
- Run options (whether tools were run)
- Output file list
- Checks (which files are present)

## Integration with Sibling Tools

### Option 1: Prebuilt Reports (Recommended)

```bash
# Step 1: Run scoring tool
cd tools/career-jd-hard-gates-score
npm run score -- --jd jd.txt --outdir score-out/

# Step 2: Run cover lint tool
cd ../career-cover-letter-facts-lint
npm run lint -- --draft cover.md --facts facts.json --outdir lint-out/

# Step 3: Assemble packet
cd ../career-application-packet-assemble
npm run assemble -- \\
  --outdir out/packet-20260902/ \\
  --score ../career-jd-hard-gates-score/score-out/scorecard.md \\
  --cover-lint ../career-cover-letter-facts-lint/lint-out/report.md \\
  --facts facts.json \\
  --jd jd.txt
```

### Option 2: Run Tools During Assembly

```bash
cd tools/career-application-packet-assemble
npm run assemble -- \\
  --outdir out/packet-20260902/ \\
  --run-score --jd jd.txt \\
  --run-cover-lint --draft cover.md --facts facts.json
```

## Approval Checklist

Before applying, Career bot must verify:

1. **Score ≥8** - Minimum threshold for apply-eligible
2. **All hard gates pass** - DNC, comp, location, function, seniority
3. **Verdict = "apply"** - Not watch/discard/skip
4. **Cover letter safe** - No unmatched or suspicious claims (or acceptable after review)
5. **Never invent facts** - All compensation and achievement claims from career-os only

## Critical Safety Note

- ✅ **Offline only** - No LinkedIn API or network calls
- ✅ **Never invents data** - Only packages existing reports
- ✅ **Facts-only reminder** - APPROVAL.md reminds Career to use career-os claims only
- ✅ **Score floor enforced** - APPROVAL.md checks score ≥8
- ✅ **Career bot owns apply** - This is a packaging aid, not auto-apply
- ⚠️ **No LinkedIn send** - Career bot handles all application sends

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Fixture Test

```bash
npm run test:fixtures
```

The fixture test:
1. Builds the tool
2. Assembles a packet from sample fixtures
3. Verifies output files exist
4. Checks for successful assembly

### Clean Build Artifacts

```bash
npm run clean
```

## Fixtures

Test fixtures are provided in `fixtures/`:

- `score-report.md` - Sample scorecard (Tesla ops manager, score 10/10, apply)
- `lint-report.md` - Sample lint report (11 matched, 1 suspicious, safe to apply)
- `facts.json` - Sample career-os claims
- `jd.txt` - Sample job description (Tesla Gigafactory ops manager)

## Career Bot Workflow

1. **Receive JD** - Email/LinkedIn paste
2. **Run scoring** - `career-jd-hard-gates-score`
3. **Draft cover letter** - Using career-os facts
4. **Run facts lint** - `career-cover-letter-facts-lint`
5. **Assemble packet** - This tool
6. **Review APPROVAL.md** - Verify all gates pass
7. **Apply decision** - Career bot makes final call
8. **LinkedIn send** - Career bot handles (separate from this tool)

## Common Issues

### Missing Sibling Tools

If you get errors about missing tools when using `--run-score` or `--run-cover-lint`:

1. Ensure sibling tools are installed:
   ```bash
   cd tools/career-jd-hard-gates-score && npm install && npm run build
   cd ../career-cover-letter-facts-lint && npm install && npm run build
   ```

2. Or use prebuilt reports instead of `--run-*` flags

### Warnings in Output

Warnings are normal if inputs are omitted. The tool will:
- Create the packet structure
- List warnings in PACK.md
- Still generate APPROVAL.md
- Succeed with exit code 0

To eliminate warnings, provide all inputs: `--score`, `--cover-lint`, `--facts`, `--jd`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
