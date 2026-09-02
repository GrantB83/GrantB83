# Studio Lyric Package Stub

An offline CLI tool that creates stub package folders from lyric text (+ optional metadata) for Studio / BrownieTunez validation with `studio-suno-package-validate`.

## 🎯 Goal

**Turn pasted lyrics into validation-ready stub packages:** Take lyric text from a file and generate a properly structured package folder that can be validated by `studio-suno-package-validate` before any Studio work begins. This tool is **offline only** and **never uploads** to YouTube/Suno/Drive.

## 🚫 What This Tool Does NOT Do

- ❌ No YouTube uploads
- ❌ No Suno API calls (official or unofficial)
- ❌ No Google Drive uploads
- ❌ No browser automation
- ❌ No lyrics invention (exact copy from input file)
- ❌ No file modifications (read-only on source)

## ✅ What This Tool DOES

- ✅ Creates stub package folders from lyric text files
- ✅ Copies lyrics exactly (never rewrites meaning)
- ✅ Generates required package files (lyrics.txt, meta.json, NOTES.md, APPROVAL.md, manifest.json)
- ✅ Derives safe stub title from first lyric line if title not provided
- ✅ Supports optional metadata (title, artist, mood, notes)
- ✅ Works 100% offline
- ✅ Exits with error if lyrics are empty

## 📦 Package Structure

The tool creates a package folder with:

```
out/package-name/
├── lyrics.cleaned.txt  # Exact copy of input lyrics (never modified)
├── meta.json           # Metadata: title, artist?, mood?, source: "stub", createdAt
├── checklist.md        # Notes from --notes file or placeholder checklist
├── APPROVAL.md         # Drive approval reminder (no auto-upload)
└── manifest.json       # Package manifest with metadata and file paths
```

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/studio-lyric-package-stub
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

### Basic Usage (Title Derived)

```bash
npm run stub -- --lyrics path/to/lyrics.txt --outdir out/my-song/
```

If `--title` is not provided, the tool derives a safe stub title from the first non-empty lyric line (truncated to 50 characters, special characters stripped). The `meta.json` will include `titleDerived: true`.

### With Title and Artist

```bash
npm run stub -- \
  --lyrics path/to/lyrics.txt \
  --title "Sunshine Day" \
  --artist "Emma" \
  --outdir out/sunshine-day/
```

### With All Metadata

```bash
npm run stub -- \
  --lyrics my-song.txt \
  --title "Happy Birthday" \
  --artist "Katelyn" \
  --mood "Celebratory and joyful" \
  --notes my-notes.md \
  --outdir out/happy-birthday/
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--lyrics <path>` | Path to lyrics text file (UTF-8) | ✅ Yes | - |
| `--title <string>` | Song title | No | Derived from first lyric line |
| `--artist <string>` | Artist name (child name: Katelyn\|Kyle\|Emma or free text) | No | - |
| `--mood <string>` | Song mood/vibe | No | - |
| `--notes <path>` | Path to notes markdown file | No | Placeholder checklist |
| `--outdir <path>` | Output package directory | ✅ Yes | - |
| `--help`, `-h` | Show help message | No | - |

## 📂 Output Files

### lyrics.cleaned.txt

Exact copy of the input lyrics file. Never modified, never rewritten.

### meta.json

```json
{
  "title": "Sunshine Day",
  "artist": "Emma",
  "mood": "Happy and upbeat",
  "source": "stub",
  "createdAt": "2026-09-02T12:00:00.000Z",
  "titleDerived": true
}
```

Fields:
- `title` (string, required) - Song title (provided or derived)
- `artist` (string, optional) - Artist name
- `mood` (string, optional) - Song mood/vibe
- `source` (string, always "stub") - Package source identifier
- `createdAt` (string, required) - ISO 8601 timestamp
- `titleDerived` (boolean, optional) - True if title was derived from lyrics

### checklist.md

If `--notes` is provided, the content of that file. Otherwise, a placeholder checklist:

```markdown
# Manual Chrome/Suno Paste Checklist

This is a **manual paste workflow** for Studio. Follow these steps in your Chrome browser.

## Steps

1. Review the package files
2. Validate the package with studio-suno-package-validate
3. Open Chrome browser
4. Navigate to Suno
5. Paste the lyrics from `lyrics.cleaned.txt`
6. Enter the metadata (title, artist, mood)
7. Generate the song
8. Download when complete

## Important

- This is a manual workflow only
- Human paste in browser required
- Studio owns the paste workflow
- Validate package before starting

## Metadata

Check `meta.json` for:
- Title (derived if titleDerived is true)
- Artist (if provided)
- Mood (if provided)
```

### APPROVAL.md

Safety gates and workflow reminders:
- Offline only
- Never uploads to YouTube/Suno/Drive
- Never invents lyrics
- Stub package for validation only
- Manual paste workflow required
- Drive approval required before any YouTube upload

### manifest.json

Package manifest with:
- Generation timestamp
- Tool name and version
- Input lyrics path
- Output directory path
- Metadata object
- File paths for all generated files

## 🧪 Testing

### Run Unit Tests

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
2. Run stub generation on the fixture lyrics
3. Create test output in `test-out/sunshine-day/`
4. Exit with success code

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### 1. Paste Lyrics to File

Save pasted lyrics to a text file:

```bash
cat > my-song.txt << 'EOF'
Twinkle twinkle little star
How I wonder what you are
Up above the world so high
Like a diamond in the sky
EOF
```

### 2. Create Stub Package

```bash
cd tools/studio-lyric-package-stub
npm run stub -- \
  --lyrics my-song.txt \
  --title "Twinkle Star" \
  --artist "Emma" \
  --outdir out/twinkle-star/
```

Output:
```
🎵 Studio Lyric Package Stub

📄 Lyrics: my-song.txt
📂 Output: out/twinkle-star/

✅ Package created successfully!

📦 Files generated:
   ✓ lyrics.cleaned.txt
   ✓ meta.json
   ✓ checklist.md
   ✓ APPROVAL.md
   ✓ manifest.json

📝 Next step:
   Run: cd ../studio-suno-package-validate && npm run validate -- --dir /workspace/tools/studio-lyric-package-stub/out/twinkle-star/
```

### 3. Validate the Package

```bash
cd ../studio-suno-package-validate
npm run validate -- --dir ../studio-lyric-package-stub/out/twinkle-star/
```

### 4. Proceed Based on Validation

- **If validation passes:** Proceed with manual Studio workflow
- **If validation fails:** Fix issues and re-stub

## ⚠️ Exit Codes

- **0** - Package created successfully
- **1** - Error (missing required options, lyrics file not found, lyrics empty, etc.)

## 🔍 Title Derivation Rules

When `--title` is not provided, the tool derives a title from the first non-empty lyric line:

1. Extract first non-empty line
2. If line exceeds 50 characters, truncate to 47 and append "..."
3. Strip special characters (keep only alphanumeric, spaces, hyphens)
4. If result is empty, use "Untitled"

The `meta.json` will include `titleDerived: true` when title is derived.

### Examples

| First Line | Derived Title |
|------------|---------------|
| "Sunshine on a rainy day" | "Sunshine on a rainy day" |
| "This is a very long first line that exceeds fifty characters and should be truncated" | "This is a very long first line that exceeds..." |
| "Hello, World! @#$%" | "Hello World " |
| "" (empty) | "Untitled" |

## 🏗️ Project Structure

```
tools/studio-lyric-package-stub/
├── src/
│   ├── index.ts                     # CLI entry point
│   ├── types.ts                     # TypeScript type definitions
│   ├── package-generator.ts         # Package creation logic
│   └── package-generator.test.ts    # Unit tests
├── fixtures/
│   └── valid-lyrics.txt             # Example valid lyrics
├── dist/                            # Compiled JavaScript (generated)
├── out/                             # Default output location (generated)
├── test-out/                        # Test fixture output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                        # This file
```

## 🐛 Troubleshooting

### "Lyrics file not found" error

- Check that the file path is correct
- Use absolute paths if relative paths aren't working
- Ensure the lyrics file exists and is readable

### "Lyrics file is empty or contains only whitespace" error

- The lyrics file must contain non-whitespace content
- Add actual lyric text to the file
- Check that the file encoding is UTF-8

### "Notes file not found" error

- Check that the `--notes` file path is correct
- Ensure the notes file exists and is readable
- If notes are not needed, omit the `--notes` option

### Title derivation produces unexpected result

- Provide an explicit `--title` to override derivation
- Check that the first lyric line is what you expect
- Remember that special characters are stripped

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Tool?

### The Problem

Studio / BrownieTunez needs to:
1. Take pasted lyric text (from chat, email, etc.)
2. Create a properly structured package folder
3. Validate the package before starting manual Chrome/Suno work
4. Never upload to YouTube/Suno/Drive without approval

Before this tool, manually creating package folders was error-prone and inconsistent.

### The Solution

**Offline stub package generator** that:
1. Takes lyric text from a file
2. Generates all required package files
3. Creates proper metadata structure
4. Derives safe stub titles when needed
5. Ensures package is ready for validation
6. Never invents or modifies lyrics

### The Hypothesis

An offline stub generator reduces Studio setup time and ensures packages are validation-ready before any Suno work begins. This tool proves that hypothesis by:
- Working 100% offline (no APIs)
- Being fast (< 1 second)
- Being safe (read-only on source, never uploads)
- Being maintainable (pure TypeScript, well-tested)
- Integrating with `studio-suno-package-validate`

### Integration with studio-suno-package-validate

These tools work together:

1. **studio-lyric-package-stub** (THIS TOOL)
   - Input: lyrics text file + optional metadata
   - Output: stub package folder

2. **studio-suno-package-validate** (sibling tool)
   - Input: stub package folder
   - Output: validation reports

3. **Studio manual workflow** (after validation passes)
   - Input: validated stub package
   - Action: Manual paste into Suno UI
   - Output: Generated songs

4. **Drive approval** (before YouTube upload)
   - CoS reviews in Drive
   - No auto-upload
   - Human approval required

This design keeps Studio in control while reducing setup errors and ensuring validation before work begins.
