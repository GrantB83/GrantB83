#!/usr/bin/env node

import { parseArgs } from 'util';
import { resolve, join } from 'path';
import { discoverToolDirectories } from './discovery.js';
import { parseReadme } from './parser.js';
import { runChecks } from './checker.js';
import { generateReports } from './report-generator.js';
import type { CliOptions } from './types.js';

const usage = `
Tools Catalog Doctor - Validate tools/README.md catalog integrity

USAGE:
  npm run doctor -- [options]

OPTIONS:
  --root <path>        Repository root (default: ../..)
  --catalog <path>     Path to tools/README.md (default: <root>/tools/README.md)
  --toolsDir <path>    Path to tools directory (default: <root>/tools)
  --outdir <path>      Output directory for reports (default: ./out)
  --help               Show this help message

EXAMPLES:
  # From tools/tools-catalog-doctor directory (default)
  npm run doctor

  # From different location
  npm run doctor -- --root /path/to/repo

  # Custom paths
  npm run doctor -- --catalog tools/README.md --toolsDir tools

EXIT CODES:
  0  Catalog is healthy
  1  Issues found (see report for details)

CHECKS:
  ✓ Tools on disk are in the index
  ✓ Index entries have corresponding directories
  ✓ No duplicate section headings
  ✓ No duplicate index entries
`;

async function main() {
  let args;

  try {
    args = parseArgs({
      options: {
        root: { type: 'string' },
        catalog: { type: 'string' },
        toolsDir: { type: 'string' },
        outdir: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: false,
    });
  } catch (error) {
    console.error(`Error parsing arguments: ${error instanceof Error ? error.message : String(error)}`);
    console.log(usage);
    process.exit(1);
  }

  if (args.values.help) {
    console.log(usage);
    process.exit(0);
  }

  const options: Required<CliOptions> = {
    root: args.values.root || resolve(process.cwd(), '..', '..'),
    catalog: args.values.catalog || '',
    toolsDir: args.values.toolsDir || '',
    outdir: args.values.outdir || './out',
  };

  // Default catalog and toolsDir based on root
  if (!options.catalog) {
    options.catalog = join(options.root, 'tools', 'README.md');
  }
  if (!options.toolsDir) {
    options.toolsDir = join(options.root, 'tools');
  }

  console.log('🩺 Tools Catalog Doctor\n');
  console.log(`Root: ${options.root}`);
  console.log(`Catalog: ${options.catalog}`);
  console.log(`Tools directory: ${options.toolsDir}`);
  console.log('');

  try {
    // Step 1: Discover tool directories
    console.log('📂 Discovering tool directories...');
    const toolsOnDisk = await discoverToolDirectories(options.toolsDir);
    console.log(`   Found ${toolsOnDisk.length} tool directories\n`);

    // Step 2: Parse README
    console.log('📖 Parsing catalog...');
    const { indexEntries, sectionHeadings } = await parseReadme(options.catalog);
    console.log(`   Found ${indexEntries.length} index entries`);
    console.log(`   Found ${sectionHeadings.length} section headings\n`);

    // Step 3: Run checks
    console.log('🔍 Running integrity checks...\n');
    const result = runChecks(toolsOnDisk, indexEntries, sectionHeadings);

    // Step 4: Report results
    if (result.onDiskNotInIndex.length > 0) {
      console.log('❌ Tools on disk but NOT in index:');
      for (const tool of result.onDiskNotInIndex) {
        console.log(`   - ${tool}`);
      }
      console.log('');
    }

    if (result.inIndexNotOnDisk.length > 0) {
      console.log('❌ Tools in index but NOT on disk:');
      for (const tool of result.inIndexNotOnDisk) {
        console.log(`   - ${tool}`);
      }
      console.log('');
    }

    if (result.duplicateSections.length > 0) {
      console.log('❌ Duplicate section headings:');
      for (const dup of result.duplicateSections) {
        console.log(`   - ## ${dup.name} (${dup.count} times, lines: ${dup.lines.join(', ')})`);
      }
      console.log('');
    }

    if (result.indexDuplicates.length > 0) {
      console.log('❌ Duplicate index entries:');
      for (const dup of result.indexDuplicates) {
        console.log(`   - ${dup.slug} (${dup.count} times, lines: ${dup.lines.join(', ')})`);
      }
      console.log('');
    }

    // Step 5: Generate reports
    const files = await generateReports(result, options.outdir);
    console.log('📝 Reports generated:');
    console.log(`   - ${files.markdown}`);
    console.log(`   - ${files.json}`);
    console.log('');

    if (result.healthy) {
      console.log('✅ Catalog is healthy!');
      process.exit(0);
    } else {
      console.log('❌ Issues found. See report for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n💥 Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
