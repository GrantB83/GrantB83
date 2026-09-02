/**
 * Job generator - creates the Suno job package folder
 */

import * as fs from 'fs';
import * as path from 'path';
import { JobConfig, JobManifest, SunoMetadata } from './types.js';
import { cleanLyrics, validateLyrics } from './lyrics-processor.js';
import { buildPrompt, buildStyle, buildTitle } from './prompt-builder.js';

/**
 * Generate a slug from a string (for directory names)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate the checklist markdown for manual Chrome steps
 */
function generateChecklist(title: string): string {
  return `# Suno Job Checklist: ${title}

## Manual Steps

1. **Open Suno**
   - Go to https://suno.com
   - Sign in if needed

2. **Create New Song**
   - Click "Create" or "New Song"

3. **Paste Prompt**
   - Open \`suno-prompt.txt\` from this folder
   - Copy the entire content
   - Paste into the "Song Description" or main prompt field

4. **Paste Style**
   - Open \`style.txt\` from this folder
   - Copy the entire content
   - Paste into the "Style of Music" field

5. **Paste Lyrics**
   - Open \`lyrics.cleaned.txt\` from this folder
   - Copy the entire content
   - Paste into the "Lyrics" field (if using custom mode)

6. **Set Title**
   - Open \`title.txt\` from this folder
   - Copy the title
   - Enter it in the title field

7. **Generate**
   - Review all fields
   - Click "Generate" or "Create"
   - Wait for generation to complete

8. **Download**
   - Once generated, download the audio file
   - Save with the title from \`title.txt\`

9. **Store Output**
   - Move the downloaded file to this job folder
   - Or file according to your studio workflow

## Notes

- This is an **offline preparation package**
- No browser automation or Suno API calls are involved
- All paste operations are manual
- Review all generated text before submitting
`;
}

/**
 * Generate the complete job package
 */
export async function generateJobPackage(config: JobConfig): Promise<string> {
  // Clean and validate lyrics
  const cleanedLyrics = cleanLyrics(config.lyrics);
  const validation = validateLyrics(cleanedLyrics);
  
  if (!validation.valid) {
    throw new Error(`Lyrics validation failed:\n${validation.errors.join('\n')}`);
  }
  
  // Prepare metadata with defaults
  const meta: SunoMetadata = config.meta || {};
  const title = buildTitle(meta);
  const artist = meta.artist || meta.kids?.join(', ') || 'Unknown Artist';
  
  // Build prompt components
  const prompt = buildPrompt(meta);
  const style = buildStyle(meta);
  
  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const slug = slugify(title);
  const jobDir = path.join(config.outdir, `${slug}-${timestamp}`);
  
  // Ensure directory exists
  fs.mkdirSync(jobDir, { recursive: true });
  
  // Write output files
  const lyricsPath = path.join(jobDir, 'lyrics.cleaned.txt');
  const promptPath = path.join(jobDir, 'suno-prompt.txt');
  const stylePath = path.join(jobDir, 'style.txt');
  const titlePath = path.join(jobDir, 'title.txt');
  const checklistPath = path.join(jobDir, 'checklist.md');
  const manifestPath = path.join(jobDir, 'manifest.json');
  
  fs.writeFileSync(lyricsPath, cleanedLyrics, 'utf-8');
  fs.writeFileSync(promptPath, prompt || '(No prompt specified)', 'utf-8');
  fs.writeFileSync(stylePath, style || '(No style specified)', 'utf-8');
  fs.writeFileSync(titlePath, title, 'utf-8');
  fs.writeFileSync(checklistPath, generateChecklist(title), 'utf-8');
  
  // Create manifest
  const manifest: JobManifest = {
    generated_at: new Date().toISOString(),
    title,
    artist,
    lyrics_file: 'lyrics.cleaned.txt',
    prompt_file: 'suno-prompt.txt',
    style_file: 'style.txt',
    title_file: 'title.txt',
    checklist_file: 'checklist.md',
    metadata: meta,
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  return jobDir;
}
