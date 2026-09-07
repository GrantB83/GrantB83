# Career Apply Doc QC

**One-line:** Fail-closed offline QC gate for career application documents before apply is allowed.

**Owning desk(s):** Career (Efficiency maintains gate)

## Overview

Career apply must not proceed without verified resume and cover letter documents. This CLI provides deterministic, offline quality checks to ensure documents exist, are readable, meet minimum standards, and contain relevant content.

This is a **fail-closed gate** — if any check cannot be passed with confidence, the tool exits 1 and apply is blocked. No LLM. No browser. No network.

## Install and Run

```bash
cd tools/career-apply-doc-qc

# Basic usage - resume only (minimum requirement)
python3 qc.py --resume path/to/resume.pdf

# With cover letter
python3 qc.py --resume resume.pdf --cover cover.md

# With job context for soft-matching
python3 qc.py --resume resume.pdf --cover cover.md \
  --company "Acme Corp" --role "VP Operations"

# With custom output directory
python3 qc.py --resume resume.pdf --cover cover.md --outdir out/
```

## CLI Usage

```bash
python3 qc.py --resume <path> [--cover <path>] [--company <name>] [--role <title>] [--outdir <dir>]
```

### Options

- `--resume` - Path to resume file (PDF, DOCX, MD, TXT) [REQUIRED]
- `--cover` - Path to cover letter file (PDF, DOCX, MD, TXT) [OPTIONAL]
- `--company` - Target company name for soft-check [OPTIONAL]
- `--role` - Target role for soft-check [OPTIONAL]
- `--outdir` - Output directory for QC report [default: ./out]

## Exit Codes

- **0** - PASS (apply allowed)
- **1** - FAIL (do not apply)

## QC Checks

The tool performs these deterministic checks in order:

### 1. File Existence & Readability
- Resume file must exist and be readable
- Cover letter file (if provided) must exist and be readable
- **FAIL if:** any specified file is missing or unreadable

### 2. File Format Validation
- Resume must have recognized extension (`.pdf`, `.docx`, `.md`, `.txt`)
- Cover letter must have recognized extension (`.pdf`, `.docx`, `.md`, `.txt`)
- **FAIL if:** unrecognized file format

### 3. Content Extraction
- For `.md` and `.txt`: direct read
- For `.pdf`: attempt PyPDF2 extraction (fall back to FAIL if not available)
- For `.docx`: attempt python-docx extraction (fall back to FAIL if not available)
- **FAIL if:** extraction fails or library unavailable

### 4. Non-Empty Content
- Resume content must have at least 100 characters
- Cover letter (if provided) must have at least 100 characters
- **FAIL if:** content too short or empty

### 5. Resume Minimum Length
- Resume must have at least 500 characters
- **FAIL if:** resume is suspiciously short

### 6. Soft Company/Role Check (Optional)
- If `--company` or `--role` provided and cover letter exists:
  - Normalize text (lowercase, strip punctuation)
  - Check if company name appears in cover letter
  - Check if role keywords appear in cover letter
- **WARN but PASS if:** company/role not found (this is a soft check)
- Output includes warning but does not block apply

## Output Files

All files written to `--outdir`:

1. **qc-report.json** - Structured QC results
2. **qc-report.md** - Human-readable report
3. **APPLY-GATE.txt** - Status file (PASS/FAIL)

### Example qc-report.json

```json
{
  "status": "PASS",
  "checks": {
    "resume_exists": "PASS",
    "resume_format": "PASS",
    "resume_readable": "PASS",
    "resume_length": "PASS",
    "cover_exists": "PASS",
    "cover_format": "PASS",
    "cover_readable": "PASS",
    "cover_length": "PASS",
    "company_mention": "WARN",
    "role_mention": "PASS"
  },
  "warnings": ["Company name 'Acme Corp' not found in cover letter"],
  "errors": [],
  "metadata": {
    "resume_file": "resume.pdf",
    "resume_chars": 2547,
    "cover_file": "cover.md",
    "cover_chars": 458,
    "company": "Acme Corp",
    "role": "VP Operations"
  }
}
```

## Fixtures & Testing

Test fixtures are provided in `fixtures/`:

### Pass Fixtures
- `resume-pass.txt` - Valid resume (>500 chars)
- `cover-pass.txt` - Valid cover letter (>100 chars, mentions company/role)

### Fail Fixtures
- `resume-empty.txt` - Empty resume (FAIL: too short)
- `resume-short.txt` - Resume with <500 chars (FAIL: minimum length)
- `cover-empty.txt` - Empty cover letter (FAIL: too short)

### Running Fixture Tests

```bash
# Test PASS cases
python3 qc.py --resume fixtures/resume-pass.txt --cover fixtures/cover-pass.txt \
  --company "Tesla" --role "Operations Manager" --outdir out/pass
# Expected: Exit 0

# Test FAIL cases
python3 qc.py --resume fixtures/resume-empty.txt --outdir out/fail-empty
# Expected: Exit 1

python3 qc.py --resume fixtures/resume-short.txt --outdir out/fail-short
# Expected: Exit 1

python3 qc.py --resume fixtures/resume-pass.txt --cover fixtures/cover-empty.txt \
  --outdir out/fail-cover
# Expected: Exit 1
```

## Dependencies

**Optional (for PDF/DOCX support):**
```bash
pip install PyPDF2 python-docx
```

If these libraries are not available:
- PDF files will FAIL with clear error
- DOCX files will FAIL with clear error
- Use `.txt` or `.md` files for offline/no-dependency operation

## Fail-Closed Philosophy

This tool follows strict fail-closed principles:

- ✅ **Offline only** - No network, no LLM, no browser
- ✅ **Deterministic** - Same inputs = same outputs
- ✅ **Explicit failures** - Clear error messages
- ✅ **Conservative** - When in doubt, FAIL
- ✅ **No invented content** - Never modifies or generates documents
- ⚠️ **Career bot owns apply** - This is a quality gate, not an approval system

## Integration with Career Bot

Career bot workflow:

1. Draft resume and cover letter
2. Run `career-apply-doc-qc` CLI before every apply
3. If exit code 0: proceed with application
4. If exit code 1: fix issues, re-run QC
5. Career bot still makes final apply decision
6. This tool is a necessary but not sufficient condition

**Note:** This QC gate does NOT validate facts (see `career-cover-letter-facts-lint` for that). This tool only validates document quality and readability.

## Example Scenarios

```bash
# Scenario 1: Valid documents
python3 qc.py --resume resume.pdf --cover cover.md
# Exit 0 ✅ (apply allowed)

# Scenario 2: Empty resume
python3 qc.py --resume empty.txt
# Exit 1 ❌ (blocked: resume too short)

# Scenario 3: Missing cover letter file
python3 qc.py --resume resume.txt --cover missing.txt
# Exit 1 ❌ (blocked: file not found)

# Scenario 4: Resume-only (cover optional)
python3 qc.py --resume resume.txt
# Exit 0 ✅ (cover is optional)

# Scenario 5: Company check warning (still passes)
python3 qc.py --resume resume.txt --cover cover.txt --company "SpaceX"
# Exit 0 ✅ (warns but doesn't block if company not mentioned)
```

## Critical Safety Notes

- 🚨 **Never apply without QC pass** - Exit 1 must block apply
- 🚨 **Career bot final arbiter** - This tool is a gate, not approval
- 🚨 **No file modifications** - This tool only reads and validates
- 🚨 **Fail closed on unknowns** - Unhandled cases exit 1

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
