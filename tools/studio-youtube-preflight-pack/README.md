# Studio YouTube Preflight Pack

An offline CLI tool that performs preflight checks on Studio/BrownieTunez packages before requesting YouTube upload approval from CoS/Grant. This tool validates packages, checks for Drive approval links, and ensures all hard gates are held.

## 🎯 Goal

**Studio/BrownieTunez runs one offline preflight before asking CoS/Grant for YouTube upload approval.** The package must already be validated; this tool never uploads and never invents lyrics/titles.

## 🚫 What This Tool Does NOT Do

- ❌ No YouTube API calls (official or unofficial)
- ❌ No Suno API calls
- ❌ No Google Drive uploads
- ❌ No WhatsApp sends
- ❌ No browser automation
- ❌ No auto-upload of any kind
- ❌ No invention of lyrics, titles, or URLs
- ❌ No media decoding (video check is path existence only)

## ✅ What This Tool DOES

- ✅ Validates required package files are present
- ✅ Checks validation report pass (if provided)
- ✅ Verifies Drive approval link is present (BLOCKING)
- ✅ Checks video file exists (optional, no decode)
- ✅ Scans lyrics for PII patterns
- ✅ Generates preflight reports (PREFLIGHT.md, APPROVAL.md, missing.md, manifest.json)
- ✅ Works 100% offline
- ✅ Exit 1 on bad input or strict failures

## 📦 Input Requirements

This tool expects a Studio job/package folder with:
- `lyrics.cleaned.txt` - Cleaned lyrics file
- `checklist.md` - Manual workflow checklist
- `manifest.json` - Package metadata (as produced by studio-lyric-package-stub / studio-suno-package-validate / suno-package-prep)

Optional inputs:
- Drive approval link URL (via `--drive-url` or `--drive-url-file`)
- Video file path (via `--video`) - existence check only
- Validation report (via `--validate-report` or `--run-validate`)

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/studio-youtube-preflight-pack
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
npm run preflight -- --dir path/to/package --drive-url "https://drive.google.com/..."
```

### With Drive URL File

```bash
npm run preflight -- --dir path/to/package --drive-url-file drive-link.txt
```

### With Video Check

```bash
npm run preflight -- --dir path/to/package --drive-url "https://..." --video video.mp4
```

### With Validation

Option 1: Use prebuilt validate report
```bash
npm run preflight -- --dir path/to/package --validate-report path/to/report.json --drive-url "https://..."
```

Option 2: Shell out to studio-suno-package-validate
```bash
npm run preflight -- --dir path/to/package --run-validate --drive-url "https://..."
```

### Strict Mode

Exit with code 1 if any required check fails:
```bash
npm run preflight -- --dir path/to/package --drive-url "https://..." --strict
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--dir <path>` | Path to Studio job/package folder | ✅ Yes | - |
| `--outdir <path>` | Output directory for reports | No | `./out` |
| `--drive-url <url>` | Drive approval link URL | No* | - |
| `--drive-url-file <path>` | File containing Drive approval link URL | No* | - |
| `--video <path>` | Video file path (existence check only) | No | - |
| `--run-validate` | Shell out to studio-suno-package-validate | No | - |
| `--validate-report <path>` | Path to prebuilt validate report.json | No | - |
| `--strict` | Exit code 1 if any required check fails | No | `false` |
| `--help`, `-h` | Show help message | No | - |

\* At least one of `--drive-url` or `--drive-url-file` is strongly recommended (Drive approval link is a BLOCKING check)

## 📂 Output Structure

The tool generates these files in the output directory:

```
out/
├── PREFLIGHT.md        # Numbered pass/fail checks
├── APPROVAL.md         # Explicit approval gate rules and workflow
├── missing.md          # What's blocking
└── manifest.json       # Machine-readable report
```

### File Contents

- **`PREFLIGHT.md`** - Numbered preflight checks with ✅ PASS / ❌ FAIL status, summary, and approval gate reminder
- **`APPROVAL.md`** - Explicit rules: CoS chat Drive link required; Grant must approve in CoS before any YouTube upload; never auto-upload; Studio owns paste workflow only
- **`missing.md`** - List of missing or failed items that are blocking progress
- **`manifest.json`** - Tool version, timestamps, paths, summary, and file inventory

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
2. Run preflight on the fixture valid package folder
3. Generate reports in `test-out/`
4. Exit with success code

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### 1. Create and Validate Package

First, create a package with `studio-lyric-package-stub`:
```bash
cd tools/studio-lyric-package-stub
npm run stub -- --lyrics my-song.txt --title "Sunshine Day" --artist "Emma" --outdir out/sunshine-day/
```

Then validate it with `studio-suno-package-validate`:
```bash
cd ../studio-suno-package-validate
npm run validate -- --dir ../studio-lyric-package-stub/out/sunshine-day/
```

### 2. Run Preflight Before YouTube Upload Request

```bash
cd ../studio-youtube-preflight-pack
npm run preflight -- \
  --dir ../studio-lyric-package-stub/out/sunshine-day/ \
  --validate-report ../studio-suno-package-validate/out/report.json \
  --drive-url "https://drive.google.com/file/d/abc123/view" \
  --video sunshine-day.mp4
```

### 3. Review Results

```
🎬 Studio YouTube Preflight Pack CLI

Package folder: /workspace/tools/studio-lyric-package-stub/out/sunshine-day
Output directory: /workspace/tools/studio-youtube-preflight-pack/out

Running preflight checks...

✅ Required Files: All required files present
✅ Package Validation: Validate report shows all checks passed
✅ Drive Approval Link: Drive URL provided
✅ Video File: Video file exists
✅ Pii Patterns: No PII patterns detected

Summary: 5/5 checks passed

Generating reports...
  ✓ PREFLIGHT.md
  ✓ APPROVAL.md
  ✓ missing.md
  ✓ manifest.json

✅ Preflight complete!

Reports written to: /workspace/tools/studio-youtube-preflight-pack/out
Review PREFLIGHT.md for details.
```

### 4. Proceed Based on Results

- **If all checks passed:** Ready to request CoS/Grant approval for YouTube upload
- **If Drive URL missing:** BLOCKING - cannot proceed without Drive approval link
- **If validation failed:** Fix package issues and re-run preflight
- **If PII detected:** Review lyrics and decide if acceptable or needs cleaning

## ⚠️ Exit Codes

- **0** - Preflight ran successfully (default, even if checks failed)
- **1** - Bad input (missing --dir, directory not found) OR (strict mode AND required checks failed)

### Exit Code Behavior

#### Default Mode (No --strict)

Always exits with code 0 if preflight runs:
```bash
npm run preflight -- --dir package-folder --drive-url "https://..."
echo $?  # 0 (even if validation checks failed)
```

#### Strict Mode (--strict)

Exits with code 1 if any required check fails:
```bash
npm run preflight -- --dir package-folder --drive-url "https://..." --strict
echo $?  # 1 (if any check failed), 0 (if all passed)
```

Use strict mode in CI/CD pipelines or scripts where you want to halt on preflight failures.

## 🔍 Preflight Checks

### 1. Required Files Present

Checks for:
- `lyrics.cleaned.txt`
- `checklist.md`
- `manifest.json`

**Failure:** Package is incomplete.

### 2. Validate Report Pass (Optional)

If `--validate-report` or `--run-validate` is provided, checks that the validation report shows `summary.all_passed === true`.

**Failure:** Package validation failed; fix issues with `studio-suno-package-validate` first.

### 3. Drive Approval Link (BLOCKING)

Checks that a Drive approval link is provided via `--drive-url` or `--drive-url-file`.

**Failure:** BLOCKING - CoS chat Drive link is required before any YouTube upload request.

### 4. Video File Exists (Optional)

If `--video` is provided, checks that the video file exists at the given path. No media decoding is performed.

**Failure:** Video file not found or path is invalid.

### 5. PII Pattern Scan

Scans lyrics for PII patterns (emails, phone numbers).

**Failure:** PII patterns detected (WARNING - review and use judgment).

## 🏗️ Project Structure

```
tools/studio-youtube-preflight-pack/
├── src/
│   ├── index.ts                     # CLI entry point
│   ├── types.ts                     # TypeScript type definitions
│   ├── checks.ts                    # Preflight check functions
│   └── report-generator.ts          # Report generation logic
├── fixtures/
│   └── valid-package/               # Example valid package folder
│       ├── lyrics.cleaned.txt
│       ├── checklist.md
│       └── manifest.json
├── dist/                            # Compiled JavaScript (generated)
├── out/                             # Default output location (generated)
├── test-out/                        # Test fixture output (generated)
├── package.json
├── tsconfig.json
└── README.md                        # This file
```

## 🐛 Troubleshooting

### "Package directory not found" error

- Check that the directory path is correct
- Use absolute paths if relative paths aren't working
- Ensure the package folder was created successfully by `studio-lyric-package-stub` or `suno-package-prep`

### "Required files missing" error

- The package folder is incomplete
- Re-run `studio-lyric-package-stub` or `suno-package-prep` to regenerate the package
- Check that you're running preflight on the correct directory

### "No Drive URL provided" error

- BLOCKING - CoS chat Drive link is required
- Provide via `--drive-url` or `--drive-url-file`
- Without Drive approval link, no YouTube upload request can proceed

### "Validate report shows failures" error

- The package validation failed
- Run `studio-suno-package-validate` to see detailed validation errors
- Fix issues in the package and re-validate before running preflight again

### "PII patterns detected" error

- Review the lyrics for accidental personal information
- Email addresses and phone numbers should not be in song lyrics
- If the detection is a false positive (e.g., "867-5309" in a song), use judgment
- Consider if the lyrics need revision

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Studio/BrownieTunez needs to:
1. Ensure packages are valid before requesting YouTube upload approval
2. Confirm Drive approval link is present (hard gate)
3. Never auto-upload to YouTube
4. Keep Grant in the approval loop

Before this tool, there was no systematic preflight check before YouTube upload requests.

### The Solution

**Offline preflight checker** that:
1. Validates package completeness
2. Confirms validation report pass (if provided)
3. Checks Drive approval link is present (BLOCKING)
4. Optionally checks video file exists
5. Scans for PII patterns in lyrics
6. Generates clear reports with approval reminders
7. Never uploads anything
8. Works 100% offline

### The Hypothesis

A preflight checker reduces approval-loop friction by catching issues early and ensuring all hard gates are held. This tool proves that hypothesis by:
- Working 100% offline (no APIs)
- Being fast (< 1 second)
- Being clear (numbered pass/fail reports)
- Being safe (read-only, never uploads)
- Being maintainable (pure TypeScript, well-tested)

### Integration with Sibling Tools

These tools work together:

1. **studio-lyric-package-stub** (creates stub packages)
   - Input: lyrics text file + optional metadata
   - Output: stub package folder

2. **studio-suno-package-validate** (validates packages)
   - Input: package folder
   - Output: validation reports

3. **studio-youtube-preflight-pack** (THIS TOOL)
   - Input: validated package + Drive URL + optional video
   - Output: preflight reports

4. **CoS approval workflow** (human-in-loop)
   - CoS shares Drive link in chat
   - Grant reviews and approves
   - Only then: Studio may upload to YouTube

This design keeps Studio in control while ensuring all approval gates are respected and no auto-upload occurs.
