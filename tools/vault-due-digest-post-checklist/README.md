# vault-due-digest-post-checklist

**One-line:** Offline CLI to generate pre-action checklist from vault-due-digest-pack output before CIPC/SARS/trust research or filing steps.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-due-digest-post-checklist/`

## Purpose

Generate a pre-action checklist for Vault / CoS manual review **before** any CIPC/SARS/trust research or filing steps. Validates pack structure, flags warnings, and provides numbered go/no-go items.

**Scope:**
- Validates `vault-due-digest-pack` output folder
- Checks for required files (DIGEST.md or master.md, APPROVAL.md)
- Warns if by-entity/ directory missing (expected entity packs)
- Flags if DIGEST/master mentions amounts with currency tokens (amounts must stay in files, not prose)
- Provides N2 gate reminder: human approval before SARS/CIPC submit
- Generates numbered checklist for Vault approval workflow
- **Never submits to CIPC/SARS**
- **Never opens file bodies**
- **Never invents dates/amounts**

**Safety:**
- ✅ **Offline only** - No file body reads, no network calls
- ✅ **Read-only** - Validates pack structure only (filename/markdown heuristics)
- ✅ **Never invents** - No dates, amounts, or legal positions fabricated
- ✅ **Vault owns research/filings** - Never auto-submits

## Install and Run

```bash
cd tools/vault-due-digest-post-checklist
npm install
npm run build

# Basic usage
npm run checklist -- --pack ./digest-pack-2026-09-02

# With date label and output directory
npm run checklist -- --pack ./digest-pack-2026-09-02 --as-of 2026-09-02 --outdir reports/

# Test with fixtures
npm run test:fixtures
```

## CLI Options

### Required
- `--pack <dir>` — Path to pack folder from `vault-due-digest-pack`

### Optional
- `--as-of YYYY-MM-DD` — Date label for checklist header (extracted from pack name if not provided)
- `--outdir <dir>` — Output directory for checklist files (default: `./out`)
- `--help` — Show help message

## Pack Structure Expected

The tool expects a pack directory with the following structure:

```
pack-dir/
├── DIGEST.md or master.md (required - overview)
├── APPROVAL.md (required)
├── by-entity/ (optional but expected)
│   ├── gab-trust/
│   │   ├── pack.md
│   │   └── items.json
│   ├── sars/
│   │   ├── pack.md
│   │   └── items.json
│   └── ...
└── missing-signals.md (optional)
```

## Output Files

The tool generates four files in the specified output directory:

1. **ACTION-CHECKLIST.md** — Numbered go/no-go checklist for Vault weekday ops
2. **ISSUES.md** — Failures and warnings only (empty if all checks pass)
3. **APPROVAL.md** — Vault research gates, N2 reminder, safety rules
4. **manifest.json** — Machine-readable checklist metadata

## Checks Performed

The tool performs the following heuristic, read-only checks:

1. **Required overview present:**
   - DIGEST.md or master.md exists in pack
   - At least one overview file must be present

2. **APPROVAL.md present:**
   - APPROVAL.md exists and contains approval-related keywords

3. **by-entity/ directory:**
   - Warns if by-entity/ directory not found (expected entity packs)
   - Counts entity pack subdirectories if present

4. **Currency violation check:**
   - Scans DIGEST/master for currency tokens (R, ZAR, USD, $, etc.)
   - Warns if amounts found in prose (amounts must stay in files)

5. **N2 gate reminder:**
   - Reminds that human approval required before SARS/CIPC submit
   - Vault owns all research and filings

## Critical Safety Notes

- ✅ **OFFLINE ONLY** — No file body reads, no network calls
- ✅ **READ-ONLY** — Validates pack structure only; never modifies files
- ✅ **NEVER OPENS FILE BODIES** — Filename and markdown heuristics only
- ✅ **NEVER INVENTS** — No dates, amounts, or legal positions fabricated
- ✅ **NEVER SUBMITS** — Vault owns all CIPC/SARS/trust filings (N2 gate)
- ⚠️ **VAULT OWNS RESEARCH/FILINGS** — Never auto-submit via tool
- ⚠️ **MANUAL REVIEW REQUIRED** — Every checklist before research or filing steps

## Typical Workflow

1. **Generate due digest pack:**
   ```bash
   cd tools/vault-due-digest-pack
   npm run pack -- \
     --filenames vault-filenames.txt \
     --run-filename-queue \
     --run-entity-pack \
     --outdir digest-2026-09-02/
   ```

2. **Generate post checklist:**
   ```bash
   cd tools/vault-due-digest-post-checklist
   npm run checklist -- \
     --pack ../vault-due-digest-pack/digest-2026-09-02 \
     --as-of 2026-09-02 \
     --outdir checklist-2026-09-02/
   ```

3. **Review outputs:**
   - Read `ACTION-CHECKLIST.md` for numbered go/no-go items
   - Review `ISSUES.md` for any failures or warnings
   - Check `APPROVAL.md` for Vault workflow gates and N2 reminder

4. **Vault approval workflow:**
   - Vault reviews all checklist items
   - Vault performs research using by-entity/ packs (never opens file bodies)
   - Vault obtains N2 approval before any CIPC/SARS submission
   - **Never** bypass manual approval gates

## Integration with Other Tools

- **Input from:** `vault-due-digest-pack` (digest pack folder)
- **Workflow:** Digest pack → post checklist → manual Vault research → N2 approval → filing
- **Sibling tools:** `vault-filename-due-queue`, `vault-entity-due-pack` (orchestrated by vault-due-digest-pack)

## Scope Boundaries

### In Scope
- GAB Trust due items (filename validation only)
- SARS correspondence (filename validation only)
- CIPC compliance (filename validation only)
- B Group Holdings documents (filename validation only)
- Pack structure validation
- Pre-research go/no-go checklist

### Out of Scope
- Opening file bodies (filename heuristics only)
- Automated CIPC/SARS submissions (Vault manual workflow only)
- Inventing dates, amounts, or legal positions (source data only)
- Network operations or API calls (offline only)

## Testing

### Run fixture tests
```bash
npm run test:fixtures
```

### Manual testing
```bash
# Test with healthy pack (should pass)
npm run checklist -- --pack fixtures/healthy-pack --outdir test-out/healthy

# Test with missing approval (should fail, exit 1)
npm run checklist -- --pack fixtures/missing-approval --outdir test-out/missing-approval
```

## Exit Codes

- **0** — Success (all critical checks passed)
- **1** — Failure (missing required files or pack path issues)

## Example Outputs

### ACTION-CHECKLIST.md

```markdown
# Vault Due Digest Post Checklist

**Date:** 2026-09-02
**Generated:** 2026-09-02T12:00:00.000Z
**Pack Path:** /workspace/digest-2026-09-02

## Pre-Action Checklist for Vault / CoS

Review each item before any CIPC/SARS/trust research or filing steps.

### 1. Required Pack Files
- [ ] DIGEST.md or master.md present
- [ ] APPROVAL.md present

**Status:** ✅ PASS - DIGEST.md present
**Status:** ✅ PASS - APPROVAL.md present with relevant keywords

### 2. Entity Packs
- [ ] by-entity/ directory exists
- [ ] Entity pack subdirectories present

**Status:** ✅ PASS - by-entity/ directory present with 2 entity pack(s)

### 3. Currency Violation Check
- [ ] DIGEST/master does NOT contain amounts with currency tokens
- [ ] Amounts stay in files, not prose

**Status:** ✅ PASS - No currency tokens detected in overview

### 4. N2 Gate Reminder
- [ ] Human approval required before SARS/CIPC submit
- [ ] Vault owns all research and filings
- [ ] Never auto-submit via tool

**Reminder:** All CIPC/SARS/trust filings require explicit N2 approval gate.

### 5. Final Go/No-Go
- [ ] All checklist items above reviewed
- [ ] Pack structure validated
- [ ] Ready for Vault weekday ops research

**Action:** Vault proceeds with research workflow (never auto-submits).

---

**OFFLINE ONLY:** This tool never opens file bodies or submits to CIPC/SARS.
**FILENAME HEURISTICS ONLY:** Classification and due dates from filenames/markdown only.
**NO INVENTED DATES/AMOUNTS:** This tool never fabricates dates or monetary values.
```

### ISSUES.md (when all checks pass)

```markdown
# Issues and Warnings

**Generated:** 2026-09-02T12:00:00.000Z

✅ **No issues detected**

All checks passed. Pack is ready for Vault weekday ops.
```

### APPROVAL.md

```markdown
# APPROVAL - Vault Due Digest Post Checklist

**Date:** 2026-09-02
**Generated:** 2026-09-02T12:00:00.000Z

## Vault Ownership

Vault / CoS owns all CIPC/SARS/trust research and filings:

- ✅ **Research only** - This checklist is for Vault weekday ops research workflow
- ✅ **No auto-submit** - All CIPC/SARS filings require human approval (N2 gate)
- ✅ **No body reads** - Filename and markdown heuristics only
- ✅ **Offline only** - No file body opens, no network calls

## Safety Rules

### Never Open File Bodies
- ❌ **NO file body reads** - Filenames and markdown structure only
- ✅ Classification from filename keywords and DIGEST/master structure
- ✅ Due dates from filename tokens only

### Never Invent Dates or Amounts
- ❌ **NO invented due dates** - Date tokens from source filenames only
- ❌ **NO invented amounts** - This tool never handles monetary values
- ✅ Amounts stay in files, never in prose

### Never Submit
- ❌ **NO CIPC submissions** - Vault owns filings (N2 gate)
- ❌ **NO SARS submissions** - Vault owns filings (N2 gate)
- ✅ Checklist output only for Vault research workflow

### N2 Gate Reminder
All CIPC/SARS/trust filings require explicit human approval:

- **N2 gate:** Attorney, SARS, CIPC, or municipal submissions
- **Vault owns:** All research and next actions on compliance documents
- **Human approval:** Required before any statutory filing

## Scope

- ✅ **Vault due digest packs** - Post-validation before research steps
- ✅ **Filename heuristics** - Entity and due date classification guidance only
- ❌ **Legal positions** - Category classification is heuristic, not legal advice

## Vault Responsibilities

1. **Review:** Read ACTION-CHECKLIST.md and verify all items
2. **Research:** Use by-entity/ packs for targeted research (never opens file bodies)
3. **N2 approval:** Obtain explicit approval before any CIPC/SARS submission
4. **Never bypass:** All safety gates are mandatory

---

**Vault owns research and filings. Never submit via tool. Filename heuristics only. No body reads. Offline only.**
```

## Entity Context

- **Lane:** trust (GAB Trust, B Group Holdings, BVR, compliance)
- **Target desk:** Vault / CoS
- **Automation:** Offline checklist validation only; Vault owns research and filing path
- **N2 gate:** Human approval required before any CIPC/SARS/attorney/municipal submission

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
