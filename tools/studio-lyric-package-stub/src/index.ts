#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { CliOptions } from './types.js';
import { createPackage } from './package-generator.js';

const HELP_TEXT = `
Studio Lyric Package Stub CLI

Usage: npm run stub -- [options]

Options:
  --lyrics <path>      Path to lyrics text file (required)
  --title <string>     Song title (optional, derived from first line if omitted)
  --artist <string>    Artist name (child name: Katelyn|Kyle|Emma or free text) (optional)
  --mood <string>      Song mood/vibe (optional)
  --notes <path>       Path to notes file (optional)
  --outdir <path>      Output package directory (required)
  --help, -h           Show this help message

Purpose:
  Turn pasted lyric text (+ optional metadata) into a stub package folder
  that studio-suno-package-validate can check. Offline only. Never uploads
  to YouTube/Suno/Drive. Never invents lyrics.

Example:
  npm run stub -- \\
    --lyrics my-song.txt \\
    --title "Happy Birthday" \\
    --artist "Emma" \\
    --mood "Celebratory and joyful" \\
    --outdir out/happy-birthday/

Next Step:
  Run studio-suno-package-validate on the output directory to verify the package.
`;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--lyrics' && i + 1 < args.length) {
      options.lyrics = args[++i];
    } else if (arg === '--title' && i + 1 < args.length) {
      options.title = args[++i];
    } else if (arg === '--artist' && i + 1 < args.length) {
      options.artist = args[++i];
    } else if (arg === '--mood' && i + 1 < args.length) {
      options.mood = args[++i];
    } else if (arg === '--notes' && i + 1 < args.length) {
      options.notes = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  
  if (!options.lyrics) {
    console.error('❌ Error: --lyrics is required');
    console.log(HELP_TEXT);
    process.exit(1);
  }
  
  if (!options.outdir) {
    console.error('❌ Error: --outdir is required');
    console.log(HELP_TEXT);
    process.exit(1);
  }
  
  if (!fs.existsSync(options.lyrics)) {
    console.error(`❌ Error: Lyrics file not found: ${options.lyrics}`);
    process.exit(1);
  }
  
  if (options.notes && !fs.existsSync(options.notes)) {
    console.error(`❌ Error: Notes file not found: ${options.notes}`);
    process.exit(1);
  }
  
  console.log('\n🎵 Studio Lyric Package Stub\n');
  console.log(`📄 Lyrics: ${options.lyrics}`);
  console.log(`📂 Output: ${options.outdir}\n`);
  
  try {
    const result = await createPackage(options);
    
    console.log('✅ Package created successfully!\n');
    console.log('📦 Files generated:');
    Object.entries(result.files).forEach(([key, filepath]) => {
      console.log(`   ✓ ${path.basename(filepath)}`);
    });
    
    console.log('\n📝 Next step:');
    console.log(`   Run: cd ../studio-suno-package-validate && npm run validate -- --dir ${path.resolve(options.outdir)}`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    } else {
      console.error('\n❌ Unexpected error occurred\n');
    }
    process.exit(1);
  }
}

main();
