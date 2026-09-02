#!/usr/bin/env node
/**
 * Suno Package Prep CLI
 * Offline tool to prepare Suno job packages from lyrics + metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions, SunoMetadata } from './types.js';
import { generateJobPackage } from './job-generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Suno Package Prep CLI - Offline Suno job package generator

USAGE:
  npm run prep -- --lyrics <path> [options]

OPTIONS:
  --lyrics, -l      Path to lyrics file (.txt or .md) [REQUIRED]
  --meta, -m        Path to metadata JSON file [optional]
  --outdir, -o      Output directory for job packages [default: ./suno-jobs/<slug>-<timestamp>]
  --help, -h        Show this help message

EXAMPLES:
  # Basic usage with just lyrics
  npm run prep -- --lyrics my-song.txt

  # With metadata
  npm run prep -- --lyrics my-song.txt --meta meta.json

  # Custom output directory
  npm run prep -- --lyrics my-song.txt --meta meta.json --outdir ./my-jobs

  # Test with fixtures
  npm run test:fixtures

METADATA FORMAT (JSON):
  {
    "title": "My Song Title",
    "artist": "Artist Name",
    "kids": ["Kid 1", "Kid 2"],
    "style": "pop, upbeat, children's music",
    "mood": "Happy and energetic",
    "duration_hint": "2-3 minutes",
    "negative_prompts": ["explicit", "dark"]
  }

OUTPUT:
  The tool creates a job folder with:
  - lyrics.cleaned.txt       (normalized lyrics)
  - suno-prompt.txt          (main prompt for Suno)
  - style.txt                (style/tags for Suno)
  - title.txt                (song title)
  - checklist.md             (manual Chrome steps)
  - manifest.json            (metadata + paths)

NOTES:
  - This tool does NOT automate Suno's website
  - This tool does NOT call unofficial Suno APIs
  - All outputs are for manual paste into Suno's UI
  - Maximum lyrics length: 3000 characters
  `);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--lyrics' || arg === '-l') {
      options.lyrics = args[++i];
    } else if (arg === '--meta' || arg === '-m') {
      options.meta = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate required arguments
  if (!options.lyrics) {
    console.error('❌ Error: --lyrics is required\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Suno Package Prep CLI\n');
    
    // Read lyrics file
    console.log(`Reading lyrics from: ${options.lyrics}`);
    if (!fs.existsSync(options.lyrics)) {
      throw new Error(`Lyrics file not found: ${options.lyrics}`);
    }
    const lyrics = fs.readFileSync(options.lyrics, 'utf-8');
    console.log(`  ✓ Loaded ${lyrics.length} characters`);
    
    // Read metadata if provided
    let meta: SunoMetadata | undefined;
    if (options.meta) {
      console.log(`Reading metadata from: ${options.meta}`);
      if (!fs.existsSync(options.meta)) {
        throw new Error(`Metadata file not found: ${options.meta}`);
      }
      const metaContent = fs.readFileSync(options.meta, 'utf-8');
      meta = JSON.parse(metaContent);
      console.log(`  ✓ Loaded metadata`);
    }
    
    // Set output directory
    const outdir = options.outdir || './suno-jobs';
    
    // Generate job package
    console.log('\nGenerating Suno job package...');
    const jobDir = await generateJobPackage({
      lyrics,
      meta,
      outdir,
    });
    
    console.log(`  ✓ Package created: ${jobDir}`);
    console.log('\n✅ Job package ready!');
    console.log(`\nNext steps:`);
    console.log(`  1. cd ${jobDir}`);
    console.log(`  2. cat checklist.md`);
    console.log(`  3. Follow the manual Chrome steps to paste into Suno\n`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
