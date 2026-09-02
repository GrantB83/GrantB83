#!/usr/bin/env node

import { existsSync } from 'fs';
import { extractFactsPack } from './extractor.js';
import { writeOutputs } from './output-writer.js';

interface CLIArgs {
  factsFile: string;
  seedsDir?: string;
  outDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let factsFile = '';
  let seedsDir: string | undefined;
  let outDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--facts' || arg === '-f') {
      factsFile = args[++i];
    } else if (arg === '--seeds' || arg === '-s') {
      seedsDir = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      outDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!factsFile) {
    console.error('Error: --facts argument is required.\n');
    printHelp();
    process.exit(1);
  }

  return { factsFile, seedsDir, outDir };
}

function printHelp(): void {
  console.log(`
Browns Guest Facts Pack

Extracts structured guest facts from markdown knowledge files into JSON and snippet files.
IMPORTANT: Only extracts stated facts. Never invents rates, times, or amenities.

Usage:
  pack --facts <markdown-file> [--seeds <dir>] [--outdir <dir>]

Required:
  --facts, -f      Path to markdown knowledge file (e.g., stay-knowledge/the-browns.md)
                   Must contain property information in section headings and content

Optional:
  --seeds, -s      Directory containing redacted sample snippets (*.txt files)
                   Seeds are for tone labels only, NOT for extracting new facts
  --outdir, -o     Output directory for facts pack (default: ./out)
  --help, -h       Show this help message

Expected Markdown Sections (heuristically extracted):
  - Directions / Getting Here / How to Find Us
  - Wi-Fi / WiFi / Internet (extracts network name and password if present)
  - Late Check-in / Late Arrival / After Hours
  - Blue Crane / Restaurant / Dining
  - Check-in Time
  - Check-out Time
  - Address / Location
  - Parking
  - Contact / Phone / Email
  - Breakfast

Output Files (in timestamped job folder):
  - facts.json               Structured key-value facts
  - snippets/*.txt           Individual snippet files per fact (paste-ready)
  - missing-fields.md        Report of expected fields not found in source
  - APPROVAL.md              Approval gate reminder
  - manifest.json            Pack metadata

Examples:
  Basic usage:
    pack --facts stay-knowledge/the-browns.md --outdir out/

  With seed samples (for tone reference):
    pack --facts the-browns.md --seeds seeds/ --outdir out/

  From fixtures:
    pack --facts fixtures/the-browns-like.md --outdir out/

Safety:
  ❌ Never invents missing facts
  ❌ Never fabricates rates, amounts, or times
  ❌ No Wi-Fi password invention (flagged as missing if not in source)
  ✅ Offline extraction only
  ✅ Source-faithful heuristic parsing
  ✅ Missing fields explicitly reported
  ✅ For draft communications only (see APPROVAL.md)
  `);
}

function main(): void {
  console.log('🏡 Browns Guest Facts Pack\n');

  const args = parseArgs();

  if (!existsSync(args.factsFile)) {
    console.error(`Error: Facts file not found: ${args.factsFile}`);
    process.exit(1);
  }

  console.log(`📖 Reading facts from: ${args.factsFile}`);

  console.log('\n🔍 Extracting facts...');
  const output = extractFactsPack(args.factsFile, args.seedsDir);

  console.log(`  ✓ Extracted ${output.manifest.factsCount} fact(s)`);
  if (output.missingFields.length > 0) {
    console.log(`  ⚠️  ${output.missingFields.length} expected field(s) not found`);
  }

  console.log(`\n📁 Writing outputs to: ${args.outDir}`);
  writeOutputs(output, args.outDir);

  console.log('\n✅ Facts pack complete.');
  console.log('   Review missing-fields.md for any gaps.');
  console.log('   Review APPROVAL.md before using facts in downstream tools.\n');
}

main();
