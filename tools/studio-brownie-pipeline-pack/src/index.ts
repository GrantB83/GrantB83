#!/usr/bin/env node
/**
 * Studio Brownie Pipeline Pack CLI
 * Offline orchestrator for BrownieTunez: lyric-package-stub → suno-validate → youtube-preflight
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions } from './types.js';
import {
  buildPipelineFromExistingPack,
  buildPipelineWithLyricStub
} from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Studio Brownie Pipeline Pack CLI - Offline BrownieTunez orchestrator

USAGE:
  npm run pipeline -- --pack <path-to-package> [options]
  npm run pipeline -- --run-lyric-stub --lyrics <path> [options]

OPTIONS:
  --pack <path>                   Path to existing lyric package [preferred]
  --run-lyric-stub                Run studio-lyric-package-stub first
  --run-suno-validate             Run studio-suno-package-validate [default: true]
                                  Accepts: --run-suno-validate, --run-suno-validate=true/false,
                                  --run-suno-validate true/false, --no-run-suno-validate
  --run-youtube-preflight         Run studio-youtube-preflight-pack [default: true]
                                  Accepts: --run-youtube-preflight, --run-youtube-preflight=true/false,
                                  --run-youtube-preflight true/false, --no-run-youtube-preflight
  --outdir <path>                 Output directory [default: ./out]
  --help, -h                      Show this help message

LYRIC STUB OPTIONS (when --run-lyric-stub is used):
  --lyrics <path>                 Path to lyrics text file [required]
  --title <string>                Song title (optional, derived from first line if omitted)
  --artist <string>               Artist name (child name or free text)
  --mood <string>                 Song mood/vibe
  --notes <path>                  Path to notes file

PREFLIGHT OPTIONS (when --run-youtube-preflight is used):
  --drive-url <url>               Drive approval link URL
  --drive-url-file <path>         File containing Drive approval link URL
  --video <path>                  Video file path (existence check only)

BEHAVIOR:
  Inputs:
  - --pack path to existing lyric package (preferred), OR
  - --run-lyric-stub with lyric stub inputs

  Pipeline stages (run by default, can be skipped):
  1. Lyric package (existing or generated)
  2. studio-suno-package-validate [default: ON, skip with --no-run-suno-validate]
  3. studio-youtube-preflight-pack [default: ON, skip with --no-run-youtube-preflight]

  Output:
  - PACK.md — Index of pipeline contents (only files actually present)
  - APPROVAL.md — Drive approval and CoS approval reminders
  - Core files from lyric package
  - Validation reports (if run)
  - Preflight reports (if run)
  - manifest.json — Accurate file inventory

EXIT CODES:
  0 - Pipeline pack created successfully
  1 - Pack path missing/invalid or pipeline stage failed

SAFETY:
  - Offline only - no YouTube/Suno/Drive APIs
  - Never uploads to YouTube
  - Never invents lyrics or titles
  - Kids BrownieTunez only
  - Drive approval required
  - Grant approval in CoS required before any YouTube upload

EXAMPLES:
  # Use existing lyric package (preferred)
  npm run pipeline -- --pack ../studio-lyric-package-stub/out/my-song/

  # Run with both stages
  npm run pipeline -- --pack path/to/package --drive-url "https://drive.google.com/..."

  # Skip validation (using equals sign)
  npm run pipeline -- --pack path/to/package --run-suno-validate=false

  # Skip validation (using space)
  npm run pipeline -- --pack path/to/package --run-suno-validate false

  # Skip validation (using negative flag)
  npm run pipeline -- --pack path/to/package --no-run-suno-validate

  # Skip both stages
  npm run pipeline -- --pack path/to/package --no-run-suno-validate --no-run-youtube-preflight

  # Generate lyric package first
  npm run pipeline -- --run-lyric-stub --lyrics my-song.txt --title "Sunshine Day" --artist "Emma"

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runSunoValidate: true, // default to true
    runYoutubePreflight: true // default to true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--pack') {
      options.pack = args[++i];
    } else if (arg === '--run-lyric-stub') {
      options.runLyricStub = true;
    } else if (arg === '--no-run-suno-validate') {
      // Handle negative flag: --no-run-suno-validate
      options.runSunoValidate = false;
    } else if (arg === '--run-suno-validate' || arg.startsWith('--run-suno-validate=')) {
      // Handle --run-suno-validate[=value]
      if (arg.includes('=')) {
        // Parse --run-suno-validate=false or --run-suno-validate=true
        const value = arg.split('=')[1].toLowerCase();
        options.runSunoValidate = !(value === 'false' || value === '0' || value === 'no');
      } else {
        // Check next argument for false/0/no
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runSunoValidate = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runSunoValidate = true;
          i++;
        } else {
          // Bare --run-suno-validate means true
          options.runSunoValidate = true;
        }
      }
    } else if (arg === '--no-run-youtube-preflight') {
      // Handle negative flag: --no-run-youtube-preflight
      options.runYoutubePreflight = false;
    } else if (arg === '--run-youtube-preflight' || arg.startsWith('--run-youtube-preflight=')) {
      // Handle --run-youtube-preflight[=value]
      if (arg.includes('=')) {
        // Parse --run-youtube-preflight=false or --run-youtube-preflight=true
        const value = arg.split('=')[1].toLowerCase();
        options.runYoutubePreflight = !(value === 'false' || value === '0' || value === 'no');
      } else {
        // Check next argument for false/0/no
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runYoutubePreflight = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runYoutubePreflight = true;
          i++;
        } else {
          // Bare --run-youtube-preflight means true
          options.runYoutubePreflight = true;
        }
      }
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--lyrics') {
      options.lyrics = args[++i];
    } else if (arg === '--title') {
      options.title = args[++i];
    } else if (arg === '--artist') {
      options.artist = args[++i];
    } else if (arg === '--mood') {
      options.mood = args[++i];
    } else if (arg === '--notes') {
      options.notes = args[++i];
    } else if (arg === '--drive-url') {
      options.driveUrl = args[++i];
    } else if (arg === '--drive-url-file') {
      options.driveUrlFile = args[++i];
    } else if (arg === '--video') {
      options.video = args[++i];
    }
  }

  return options;
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Validate input mode
  if (!options.pack && !options.runLyricStub) {
    console.error('❌ Error: Either --pack or --run-lyric-stub is required\n');
    printHelp();
    process.exit(1);
  }

  if (options.pack && options.runLyricStub) {
    console.error('❌ Error: Cannot use both --pack and --run-lyric-stub\n');
    printHelp();
    process.exit(1);
  }

  if (options.runLyricStub && !options.lyrics) {
    console.error('❌ Error: --lyrics is required when using --run-lyric-stub\n');
    printHelp();
    process.exit(1);
  }

  try {
    console.log('🎵 Studio Brownie Pipeline Pack CLI\n');
    console.log('⚠️  Offline orchestrator - no YouTube/Suno/Drive APIs');
    console.log('⚠️  Never uploads to YouTube');
    console.log('⚠️  Never invents lyrics or titles');
    console.log('⚠️  Kids BrownieTunez only\n');

    const outdir = options.outdir || './out';

    let result;

    if (options.pack) {
      // Mode 1: Use existing lyric package
      const packPath = path.resolve(options.pack);

      console.log(`📦 Using existing lyric package: ${packPath}\n`);
      console.log('Building pipeline pack...\n');

      result = buildPipelineFromExistingPack(
        packPath,
        options.runSunoValidate ?? true,
        options.runYoutubePreflight ?? true,
        options.driveUrl,
        options.driveUrlFile,
        options.video,
        outdir
      );
    } else if (options.runLyricStub) {
      // Mode 2: Run lyric-package-stub first
      if (!options.lyrics) {
        console.error('❌ Error: --lyrics is required when using --run-lyric-stub\n');
        process.exit(1);
      }

      console.log(`📦 Running lyric-package-stub first\n`);
      console.log('Generating lyric package...\n');

      result = buildPipelineWithLyricStub(
        options.lyrics,
        options.title,
        options.artist,
        options.mood,
        options.notes,
        options.runSunoValidate ?? true,
        options.runYoutubePreflight ?? true,
        options.driveUrl,
        options.driveUrlFile,
        options.video,
        outdir
      );
    }

    if (!result) {
      console.error('❌ Error: No result from pipeline builder\n');
      process.exit(1);
    }

    if (!result.success) {
      console.error(`❌ Error: ${result.message}\n`);
      process.exit(1);
    }

    console.log(`✅ ${result.message}\n`);

    if (result.manifest) {
      console.log('📊 Pipeline Summary:');
      console.log(`  Lyric Stub Ran: ${result.manifest.lyricStubRan ? 'Yes' : 'No'}`);
      console.log(`  Validation Ran: ${result.manifest.sunoValidateRan ? 'Yes' : 'No'}`);
      if (result.manifest.sunoValidateRan) {
        console.log(`    - ${result.manifest.validationPassCount}/${result.manifest.validationCheckCount} checks passed`);
      }
      console.log(`  Preflight Ran: ${result.manifest.youtubePreflightRan ? 'Yes' : 'No'}`);
      if (result.manifest.youtubePreflightRan) {
        console.log(`    - ${result.manifest.preflightPassCount}/${result.manifest.preflightCheckCount} checks passed`);
      }
      console.log(`  Overall Status: ${result.manifest.allChecksPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log('');
    }

    console.log('📝 Next steps:');
    console.log(`  1. Review ${result.pipelinePackDir}/PACK.md`);
    console.log('  2. Check validation reports (if present)');
    console.log('  3. Check preflight reports (if present)');
    console.log('  4. Review APPROVAL.md for workflow reminders');
    console.log('  5. Finished video → thebrownsusa Drive (REQUIRED)');
    console.log('  6. Grant approves in CoS chat before any YouTube upload\n');

    process.exit(result.manifest?.allChecksPassed ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
