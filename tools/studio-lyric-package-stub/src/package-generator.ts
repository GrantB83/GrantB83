import fs from 'fs';
import path from 'path';
import { CliOptions, PackageMetadata, PackageManifest } from './types.js';

const PACKAGE_VERSION = '1.0.0';

export function deriveTitleFromLyrics(lyrics: string): string {
  const lines = lyrics.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return 'Untitled';
  }
  
  let firstLine = lines[0];
  
  firstLine = firstLine.replace(/[^\w\s-]/g, '').trim();
  
  if (firstLine.length > 50) {
    firstLine = firstLine.substring(0, 47) + '...';
  }
  
  return firstLine || 'Untitled';
}

export function validateLyrics(lyrics: string): void {
  const trimmed = lyrics.trim();
  
  if (trimmed.length === 0) {
    throw new Error('Lyrics file is empty or contains only whitespace');
  }
}

function generateChecklistContent(notesPath?: string): string {
  if (notesPath) {
    return fs.readFileSync(notesPath, 'utf-8');
  }
  
  return `# Manual Chrome/Suno Paste Checklist

This is a **manual paste workflow** for Studio. Follow these steps in your Chrome browser.

## Steps

1. Review the package files
2. Validate the package with studio-suno-package-validate
3. Open Chrome browser
4. Navigate to Suno
5. Paste the lyrics from \`lyrics.cleaned.txt\`
6. Enter the metadata (title, artist, mood)
7. Generate the song
8. Download when complete

## Important

- This is a manual workflow only
- Human paste in browser required
- Studio owns the paste workflow
- Validate package before starting

## Metadata

Check \`meta.json\` for:
- Title (derived if titleDerived is true)
- Artist (if provided)
- Mood (if provided)
`;
}

function generateApprovalContent(): string {
  return `# APPROVAL - Studio Lyric Package Stub

## Safety Gates

- ✅ **Offline only** - No API calls or network requests
- ✅ **Never uploads** - No YouTube/Suno/Drive uploads
- ✅ **Never invents lyrics** - Exact copy from input file
- ✅ **Read-only source** - Input lyrics file not modified
- ✅ **Stub package** - For validation purposes only

## Workflow

1. **Created:** Stub package created from pasted lyric text
2. **Validation:** Run \`studio-suno-package-validate\` before Studio work
3. **Manual paste:** Studio owns manual Chrome/Suno workflow
4. **Approval required:** Human review before any Suno/YouTube work

## Ownership

- **Studio / BrownieTunez** owns all manual Suno paste workflows
- **CoS** coordinates Drive approval before YouTube upload
- **Never auto-upload** - All uploads require explicit human approval

## Next Steps

1. Validate this package with \`studio-suno-package-validate\`
2. If validation passes, proceed with Studio manual workflow
3. If validation fails, fix issues and re-stub
4. After Suno generation, follow Drive approval before YouTube upload

---

Generated: ${new Date().toISOString()}
Tool: studio-lyric-package-stub v${PACKAGE_VERSION}
`;
}

export async function createPackage(options: CliOptions): Promise<PackageManifest> {
  if (!options.lyrics || !options.outdir) {
    throw new Error('Missing required options: lyrics and outdir');
  }
  
  const lyricsContent = fs.readFileSync(options.lyrics, 'utf-8');
  
  validateLyrics(lyricsContent);
  
  const titleDerived = !options.title;
  const title = options.title || deriveTitleFromLyrics(lyricsContent);
  
  const metadata: PackageMetadata = {
    title,
    source: 'stub',
    createdAt: new Date().toISOString(),
  };
  
  if (titleDerived) {
    metadata.titleDerived = true;
  }
  
  if (options.artist) {
    metadata.artist = options.artist;
  }
  
  if (options.mood) {
    metadata.mood = options.mood;
  }
  
  fs.mkdirSync(options.outdir, { recursive: true });
  
  const lyricsPath = path.join(options.outdir, 'lyrics.cleaned.txt');
  fs.writeFileSync(lyricsPath, lyricsContent, 'utf-8');
  
  const metaPath = path.join(options.outdir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
  
  const checklistContent = generateChecklistContent(options.notes);
  const checklistPath = path.join(options.outdir, 'checklist.md');
  fs.writeFileSync(checklistPath, checklistContent, 'utf-8');
  
  const approvalContent = generateApprovalContent();
  const approvalPath = path.join(options.outdir, 'APPROVAL.md');
  fs.writeFileSync(approvalPath, approvalContent, 'utf-8');
  
  const manifest: PackageManifest = {
    generated_at: new Date().toISOString(),
    tool: 'studio-lyric-package-stub',
    tool_version: PACKAGE_VERSION,
    input_lyrics: path.resolve(options.lyrics),
    output_dir: path.resolve(options.outdir),
    metadata,
    files: {
      lyrics: lyricsPath,
      checklist: checklistPath,
      approval: approvalPath,
      meta: metaPath,
      manifest: path.join(options.outdir, 'manifest.json'),
    },
  };
  
  const manifestPath = path.join(options.outdir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  
  return manifest;
}
