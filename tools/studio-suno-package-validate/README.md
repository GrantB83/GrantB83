# Studio Suno Package Validate

An offline CLI tool that validates Suno job packages created by `suno-package-prep` before Studio spends browser time on the manual Chrome/Suno paste workflow.

## 🎯 Goal

**Preflight validation for Studio / BrownieTunez:** Catch job package issues (missing files, empty lyrics, accidental PII, metadata errors) before starting the Chrome paste session. This tool does **NOT** call Suno APIs and does **NOT** do browser automation.

## 🚫 What This Tool Does NOT Do

- ❌ No Suno API calls (official or unofficial)
- ❌ No YouTube API calls
- ❌ No browser automation
- ❌ No auto-send of any kind
- ❌ No file modifications

## ✅ What This Tool DOES

- ✅ Validates required files are present
- ✅ Checks metadata JSON shape in manifest.json
- ✅ Ensures lyrics are not empty
- ✅ Detects PII patterns (emails, phone numbers) in lyrics
- ✅ Verifies checklist mentions manual paste only (no automation)
- ✅ Works 100% offline
- ✅ Generates numbered pass/fail reports

## 📦 Validation Checks

### 1. Required Files Present
Checks for:
- `lyrics.cleaned.txt`
- `checklist.md`
- `manifest.json`

### 2. Metadata JSON Shape
Validates `manifest.json` contains:
- `metadata` object field
- Correct types for optional fields (title, artist, kids, style, mood, duration_hint, negative_prompts)

### 3. Lyrics Not Empty
- Rejects whitespace-only lyrics
- Reports character count

### 4. No PII Patterns
Scans lyrics for:
- Email addresses (pattern: `user@domain.com`)
- Phone numbers (patterns: `555-123-4567`, `(555) 123-4567`, `5551234567`, etc.)

### 5. Checklist Manual Paste Only
Checks that `checklist.md`:
- Contains manual workflow keywords (manual, paste, chrome, browser)
- Does NOT contain automation keywords (automat, api, script, selenium, puppeteer)

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/studio-suno-package-validate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## 🚀 Usage

### Basic Usage

```bash
npm run validate -- --dir path/to/job-folder
```

### With Custom Output Directory

```bash
npm run validate -- --dir path/to/job-folder --outdir reports/
```

### Strict Mode

Exit with code 1 if any validation check fails:

```bash
npm run validate -- --dir path/to/job-folder --strict
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--dir` | `-d` | Path to job folder from suno-package-prep | ✅ Yes | - |
| `--outdir` | `-o` | Output directory for validation reports | No | `./out` |
| `--strict` | - | Exit code 1 if any check fails | No | `false` |
| `--help` | `-h` | Show help message | No | - |

## 📂 Output Structure

The tool generates these files in the output directory:

```
out/
├── report.json         # Machine-readable validation results
├── report.md           # Human-readable numbered pass/fail report
├── APPROVAL.md         # Safety gates and Studio ownership notice
└── manifest.json       # Tool metadata and output inventory
```

### File Contents

- **`report.json`** - Complete validation results with check details and summary
- **`report.md`** - Numbered list of checks with ✅ PASS / ❌ FAIL status
- **`APPROVAL.md`** - Documents that this tool:
  - Is offline only
  - Makes no Suno/YouTube API calls
  - Does not automate browsers
  - Studio owns the manual paste workflow
- **`manifest.json`** - Tool version, timestamps, paths, and validation summary

## 🧪 Testing

### Run All Tests

```bash
npm run build
npm test
```

### Test with Fixtures

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run validation on the fixture valid job folder
3. Generate reports in `test-out/`
4. Exit with success code

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### 1. Create a Job Package

First, use `suno-package-prep` to create a job folder:

```bash
cd tools/suno-package-prep
npm run prep -- --lyrics my-song.txt --meta my-meta.json
```

This creates a job folder like: `./suno-jobs/my-song-2026-09-02/`

### 2. Validate the Job Package

```bash
cd ../studio-suno-package-validate
npm run validate -- --dir ../suno-package-prep/suno-jobs/my-song-2026-09-02/
```

### 3. Review Results

```
Studio Suno Package Validate CLI

Validating job folder: /workspace/tools/suno-package-prep/suno-jobs/my-song-2026-09-02
Output directory: /workspace/tools/studio-suno-package-validate/out

Running validation checks...

✅ Required Files: All required files present
✅ Meta Json Shape: Metadata JSON shape is valid
✅ Lyrics Not Empty: Lyrics not empty (245 characters)
✅ No Pii Patterns: No PII patterns detected
✅ Checklist Manual Paste: Checklist mentions manual paste workflow

Summary: 5/5 checks passed

Generating reports...
  ✓ report.json
  ✓ report.md
  ✓ APPROVAL.md
  ✓ manifest.json

✅ Validation complete!

Reports written to: /workspace/tools/studio-suno-package-validate/out
Review report.md for details.
```

### 4. Check the Report

```bash
cat out/report.md
```

### 5. Proceed Based on Results

- **If all checks passed:** Proceed with manual Chrome/Suno paste workflow
- **If any checks failed:** Fix issues in the job folder and re-validate

## ⚠️ Exit Codes

- **0** - Validation ran successfully (default, even if checks failed)
- **1** - Bad input (missing --dir, directory not found) OR (strict mode AND validation failures)

### Exit Code Behavior

#### Default Mode (No --strict)

Always exits with code 0 if validation runs:
```bash
npm run validate -- --dir job-folder
echo $?  # 0 (even if validation checks failed)
```

#### Strict Mode (--strict)

Exits with code 1 if any validation check fails:
```bash
npm run validate -- --dir job-folder --strict
echo $?  # 1 (if any check failed), 0 (if all passed)
```

Use strict mode in CI/CD pipelines or scripts where you want to halt on validation failures.

## 🎵 When to Use This Tool

**Use this tool after `suno-package-prep` and before Chrome:**

```
1. suno-package-prep creates job folder
2. studio-suno-package-validate validates folder (THIS TOOL)
3. Review report.md
4. If passed: start manual Chrome/Suno paste
5. If failed: fix and re-validate
```

**Benefits:**
- Catch issues before Chrome session starts
- Avoid mid-workflow errors
- Prevent accidental PII in lyrics
- Ensure job package completeness
- Validate metadata correctness

## 🔍 PII Detection Details

### Email Patterns

Detects common email formats:
- `user@example.com`
- `first.last@domain.co.za`
- `name+tag@sub.domain.org`

### Phone Number Patterns

Detects US and SA formats:
- `555-123-4567`
- `(555) 123-4567`
- `555.123.4567`
- `5551234567` (10 digits)
- `+1-555-123-4567`

**Note:** PII detection uses basic regex patterns. It may flag phone-like numbers in lyrics (e.g., "call 867-5309"). Review the details in the report and use judgment.

## 🏗️ Project Structure

```
tools/studio-suno-package-validate/
├── src/
│   ├── index.ts                     # CLI entry point
│   ├── types.ts                     # TypeScript type definitions
│   ├── validators.ts                # Validation check functions
│   ├── validators.test.ts           # Validator tests
│   ├── report-generator.ts          # Report generation
├── fixtures/
│   └── valid-job/                   # Example valid job folder
│       ├── lyrics.cleaned.txt
│       ├── checklist.md
│       └── manifest.json
├── dist/                            # Compiled JavaScript (generated)
├── out/                             # Default output location (generated)
├── package.json
├── tsconfig.json
└── README.md                        # This file
```

## 🐛 Troubleshooting

### "Job directory not found" error

- Check that the directory path is correct
- Use absolute paths if relative paths aren't working
- Ensure the job folder was created successfully by `suno-package-prep`

### "Required files missing" error

- The job folder is incomplete
- Re-run `suno-package-prep` to regenerate the job
- Check that you're validating the correct directory

### "PII patterns detected" error

- Review the lyrics for accidental personal information
- Email addresses and phone numbers should not be in song lyrics
- If the detection is a false positive (e.g., "867-5309" in a song), use judgment
- Consider if the lyrics need revision

### "Metadata has invalid field types" error

- The metadata in `manifest.json` has incorrect types
- Check that `kids` and `negative_prompts` are arrays (not strings)
- Check that other fields are strings (not numbers or objects)
- Re-run `suno-package-prep` with corrected metadata

### "Checklist contains automation keywords" error

- The checklist should describe a manual workflow only
- Remove references to automation, APIs, or scripts
- Ensure it mentions manual paste in Chrome/browser

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

`suno-package-prep` creates job folders for manual Chrome paste workflow. Before Studio invests time in the browser session, the job package should be validated for:

- Completeness (all required files)
- Correctness (metadata shape, non-empty lyrics)
- Safety (no accidental PII in lyrics)
- Workflow alignment (manual paste only, no automation)

### The Solution

**Offline preflight validator** that:
1. Runs fast validation checks before Chrome opens
2. Catches common errors (empty lyrics, missing files)
3. Prevents PII leaks (emails, phone numbers in lyrics)
4. Confirms manual workflow (no automation in checklist)
5. Generates clear pass/fail reports

### The Hypothesis

A job validator is the highest-confidence Studio win for preventing wasted browser time. This tool proves that hypothesis by:
- Working 100% offline (no APIs)
- Being fast (< 1 second)
- Being clear (numbered pass/fail report)
- Being safe (read-only, no modifications)
- Being maintainable (pure TypeScript, well-tested)

### Integration with suno-package-prep

These tools work together:

1. **suno-package-prep** (creates job folders)
   - Input: lyrics + metadata
   - Output: job folder with all paste-ready files

2. **studio-suno-package-validate** (validates job folders)
   - Input: job folder path
   - Output: validation reports

3. **Studio manual workflow** (Chrome/Suno paste)
   - Input: validated job folder
   - Action: Manual paste into Suno UI
   - Output: Generated songs

This design keeps Studio in control while reducing error rates and wasted time.
