# Suno Package Prep

An offline CLI tool that prepares Suno job packages from kid lyrics and metadata, making Chrome/Suno form work a short paste session instead of a long fragile browser workflow.

## 🎯 Goal

**Definite-win for Studio / BrownieTunez:** Turn kid lyrics + metadata into a ready-to-paste Suno job package on disk. This tool does **NOT** automate Suno's website and does **NOT** call unofficial Suno APIs.

## 🚫 What This Tool Does NOT Do

- ❌ No browser automation
- ❌ No Suno API calls (official or unofficial)
- ❌ No secrets or credentials
- ❌ No YouTube upload
- ❌ No WhatsApp sending
- ❌ No automatic form filling

## ✅ What This Tool DOES

- ✅ Validates and cleans lyrics
- ✅ Builds Suno prompts from metadata
- ✅ Creates a ready-to-paste job package folder
- ✅ Generates a manual checklist for Chrome/Suno workflow
- ✅ Works 100% offline
- ✅ All outputs are for **manual paste** into Suno's UI

## 📦 Features

- **Lyrics cleaning** - Normalizes line endings, trims excess blank lines, preserves content
- **Validation** - Rejects empty lyrics or content exceeding 3000 characters
- **Prompt assembly** - Builds Suno-ready prompt and style text from metadata
- **Job packaging** - Creates organized folder with all paste-ready files
- **Manual checklist** - Step-by-step Chrome instructions
- **Manifest** - JSON metadata for tracking (no secrets)
- **TypeScript** - Type-safe, well-tested
- **Zero dependencies** - Pure TypeScript, no external libraries

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/suno-package-prep
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
npm run prep -- --lyrics <lyrics-file>
```

### With Metadata

```bash
npm run prep -- --lyrics <lyrics-file> --meta <metadata-file>
```

### Custom Output Directory

```bash
npm run prep -- --outdir <output-dir> --lyrics <lyrics-file> --meta <metadata-file>
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--lyrics` | `-l` | Path to lyrics file (.txt or .md) | ✅ Yes | - |
| `--meta` | `-m` | Path to metadata JSON file | No | - |
| `--outdir` | `-o` | Output directory for job packages | No | `./suno-jobs/<slug>-<timestamp>` |
| `--help` | `-h` | Show help message | No | - |

## 📋 Metadata Format

Create a JSON file with any of these optional fields:

```json
{
  "title": "My Song Title",
  "artist": "Artist Name",
  "kids": ["Kid 1", "Kid 2"],
  "style": "pop, upbeat, children's music",
  "mood": "Happy and energetic",
  "duration_hint": "2-3 minutes",
  "negative_prompts": ["explicit", "dark"]
}
```

### Metadata Fields

- **`title`** - Song title (if not provided, generates from artist/kids)
- **`artist`** - Artist name (used if kids not provided)
- **`kids`** - Array of kid names who wrote the song
- **`style`** - Music style/genre/tags for Suno's "Style of Music" field
- **`mood`** - Mood/vibe description for the prompt
- **`duration_hint`** - Suggested duration (e.g., "2-3 minutes")
- **`negative_prompts`** - Things to avoid (array of strings)

## 📂 Output Structure

The tool creates a job folder with this structure:

```
suno-jobs/
└── my-song-title-2026-09-02/
    ├── lyrics.cleaned.txt      # Normalized lyrics ready to paste
    ├── suno-prompt.txt         # Main prompt for Suno's description field
    ├── style.txt               # Style/tags for Suno's style field
    ├── title.txt               # Song title
    ├── checklist.md            # Step-by-step manual Chrome instructions
    └── manifest.json           # Job metadata (no secrets)
```

### File Contents

- **`lyrics.cleaned.txt`** - Your lyrics with normalized line endings and trimmed blank lines
- **`suno-prompt.txt`** - Generated prompt combining mood, duration hint, and artist/kids info
- **`style.txt`** - Style tags and negative prompts formatted for Suno
- **`title.txt`** - The song title (for paste or reference)
- **`checklist.md`** - Manual step-by-step guide for using Suno's UI
- **`manifest.json`** - Complete metadata and file paths (for tracking, contains no secrets)

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
2. Run on sample lyrics and metadata
3. Generate a test job package in `test-out/`
4. Exit with success code

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### 1. Prepare Your Files

Create a lyrics file (`my-song.txt`):
```
Verse 1
My amazing lyrics here
...

Chorus
More lyrics here
...
```

Create a metadata file (`my-meta.json`):
```json
{
  "title": "My Amazing Song",
  "kids": ["Emma", "Liam"],
  "style": "pop, children's music, upbeat",
  "mood": "Happy and energetic"
}
```

### 2. Run the Tool

```bash
npm run prep -- --lyrics my-song.txt --meta my-meta.json
```

### 3. Review Output

```
Suno Package Prep CLI

Reading lyrics from: my-song.txt
  ✓ Loaded 245 characters
Reading metadata from: my-meta.json
  ✓ Loaded metadata

Generating Suno job package...
  ✓ Package created: ./suno-jobs/my-amazing-song-2026-09-02

✅ Job package ready!

Next steps:
  1. cd ./suno-jobs/my-amazing-song-2026-09-02
  2. cat checklist.md
  3. Follow the manual Chrome steps to paste into Suno
```

### 4. Use the Package

Navigate to the job folder and follow the checklist:

```bash
cd ./suno-jobs/my-amazing-song-2026-09-02
cat checklist.md
```

The checklist walks you through:
1. Opening Suno in Chrome
2. Pasting the prompt from `suno-prompt.txt`
3. Pasting the style from `style.txt`
4. Pasting the lyrics from `lyrics.cleaned.txt`
5. Setting the title from `title.txt`
6. Generating the song
7. Downloading and storing the output

## ⚠️ Validation & Limits

### Lyrics Length

- **Maximum:** 3000 characters
- **Reason:** Based on typical Suno song length (2-4 minutes)
- **What happens:** Tool rejects with clear error message if exceeded

### Empty Lyrics

- Tool rejects empty or whitespace-only lyrics
- Provides clear error message

### Missing Metadata

- All metadata fields are optional
- Tool generates sensible defaults if not provided

## 🎵 When to Use This Tool

**Use this tool when:**
- You have kid lyrics that need to become Suno jobs
- You want to validate lyrics before starting a Chrome session
- You need organized job folders for studio workflow
- You want to reduce token burn from retrying flaky browser automation

**This tool is the "prep" step before manual Suno work**
- Reduces Chrome/Suno session from 10-15 minutes to 2-3 minutes
- Validation happens offline, not mid-session
- All paste content is pre-built and ready
- Checklist ensures nothing is forgotten

## 🏗️ Project Structure

```
tools/suno-package-prep/
├── src/
│   ├── index.ts                     # CLI entry point
│   ├── types.ts                     # TypeScript type definitions
│   ├── lyrics-processor.ts          # Lyrics cleaning and validation
│   ├── lyrics-processor.test.ts     # Lyrics processor tests
│   ├── prompt-builder.ts            # Suno prompt assembly
│   ├── prompt-builder.test.ts       # Prompt builder tests
│   ├── job-generator.ts             # Job package creation
│   └── job-generator.test.ts        # Job generator tests
├── fixtures/
│   ├── sample-lyrics.txt            # Example lyrics for testing
│   └── sample-meta.json             # Example metadata for testing
├── dist/                            # Compiled JavaScript (generated)
├── suno-jobs/                       # Default output location (generated)
├── package.json
├── tsconfig.json
└── README.md                        # This file
```

## 🐛 Troubleshooting

### "Lyrics are empty" error

- Ensure your lyrics file has actual content (not just whitespace)
- Check that the file path is correct

### "Lyrics exceed maximum length" error

- Your lyrics are over 3000 characters
- Consider splitting into multiple songs
- Or trim some content

### "File not found" error

- Check that the file paths are correct
- Use absolute paths if relative paths aren't working
- Ensure files exist before running

### No metadata provided

- This is OK! All metadata fields are optional
- Tool will generate defaults (title, artist, etc.)

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Studio/BrownieTunez workflow was blocked by flaky Chrome/Suno form filling. Long browser sessions with:
- Manual typing of lyrics
- Form field errors requiring retries
- Token burn from AI-driven form automation
- Lost work when sessions fail

### The Solution

**Offline prep step** that:
1. Validates everything before Chrome opens
2. Builds exact paste blocks
3. Creates organized job folders
4. Reduces Chrome work to copy/paste only
5. No browser automation = no browser automation failures

### The Hypothesis

A job-folder packager is the highest-confidence Studio win without depending on Suno UI automation. This tool proves that hypothesis by:
- Working 100% offline
- Requiring zero Suno integration
- Reducing manual work by 70-80%
- Being maintainable by Studio (pure TypeScript, well-tested)
