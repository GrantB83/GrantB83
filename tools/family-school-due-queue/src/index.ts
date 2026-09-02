#!/usr/bin/env node

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseArgs } from 'util';
import { extractDueDateSignals, parseInputFile } from './parser.js';
import { generateOutputs } from './generator.js';
import type { QueueEntry, QueueOutput, Manifest } from './types.js';

const USAGE = `
Family School Due Queue CLI

Extract due/deadline signals from school email subjects or filename lists.

Usage:
  npm run queue -- [options]

Options:
  --subjects <path>    Path to subjects.txt (one subject per line)
  --files <path>       Path to filenames.txt (one basename per line)
  --as-of <YYYY-MM-DD> As-of date (default: today)
  --outdir <path>      Output directory (default: ./out)
  --help, -h           Show this help message

Examples:
  npm run queue -- --subjects subjects.txt --outdir out/
  npm run queue -- --files filenames.txt --outdir out/
  npm run queue -- --subjects subjects.txt --files filenames.txt --as-of 2026-09-15
`;

interface Args {
  subjects?: string;
  files?: string;
  asOf?: string;
  outdir?: string;
  help?: boolean;
}

function main() {
  const args = parseCliArgs();
  
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  
  if (!args.subjects && !args.files) {
    console.error('Error: At least one of --subjects or --files is required\n');
    console.log(USAGE);
    process.exit(1);
  }
  
  const asOfDate = args.asOf ? new Date(args.asOf) : new Date();
  const outdir = resolve(args.outdir || './out');
  
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }
  
  console.log('Family School Due Queue CLI\n');
  
  const allTexts: string[] = [];
  const inputs: { subjects?: string; files?: string } = {};
  
  if (args.subjects) {
    console.log(`Loading subjects: ${args.subjects}`);
    const content = readFileSync(resolve(args.subjects), 'utf-8');
    const subjects = parseInputFile(content);
    allTexts.push(...subjects);
    inputs.subjects = args.subjects;
    console.log(`  ✓ Loaded ${subjects.length} subjects\n`);
  }
  
  if (args.files) {
    console.log(`Loading filenames: ${args.files}`);
    const content = readFileSync(resolve(args.files), 'utf-8');
    const filenames = parseInputFile(content);
    allTexts.push(...filenames);
    inputs.files = args.files;
    console.log(`  ✓ Loaded ${filenames.length} filenames\n`);
  }
  
  if (allTexts.length === 0) {
    console.error('Error: No valid inputs found. Check that input files are not empty.\n');
    process.exit(1);
  }
  
  console.log('Extracting due date signals...');
  const entries: QueueEntry[] = [];
  const missingSignals: string[] = [];
  
  for (const text of allTexts) {
    const entry = extractDueDateSignals(text, asOfDate);
    if (entry.signals.length === 0) {
      missingSignals.push(text);
    } else {
      entries.push(entry);
    }
  }
  
  console.log(`  ✓ Extracted signals from ${entries.length} items`);
  console.log(`  ✓ ${missingSignals.length} items with no signals\n`);
  
  const output: QueueOutput = {
    asOf: asOfDate.toISOString().split('T')[0],
    entries,
    missingSignals
  };
  
  const mode = args.subjects && args.files ? 'both' : args.subjects ? 'subjects' : 'files';
  
  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    mode,
    asOf: output.asOf,
    inputs,
    summary: {
      totalInputs: allTexts.length,
      withSignals: entries.length,
      missingSignals: missingSignals.length
    }
  };
  
  console.log(`Generating outputs in: ${outdir}`);
  generateOutputs(output, manifest, outdir);
  console.log('  ✓ queue.json');
  console.log('  ✓ queue.md');
  console.log('  ✓ missing-signals.md');
  console.log('  ✓ APPROVAL.md');
  console.log('  ✓ manifest.json\n');
  
  console.log('✅ Queue generation complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total inputs: ${manifest.summary.totalInputs}`);
  console.log(`   With signals: ${manifest.summary.withSignals}`);
  console.log(`   Missing signals: ${manifest.summary.missingSignals}`);
}

function parseCliArgs(): Args {
  try {
    const { values } = parseArgs({
      options: {
        subjects: { type: 'string' },
        files: { type: 'string' },
        'as-of': { type: 'string' },
        asOf: { type: 'string' },
        outdir: { type: 'string' },
        help: { type: 'boolean', short: 'h' }
      },
      strict: true
    });
    
    return {
      subjects: values.subjects as string | undefined,
      files: values.files as string | undefined,
      asOf: (values['as-of'] || values.asOf) as string | undefined,
      outdir: values.outdir as string | undefined,
      help: values.help as boolean | undefined
    };
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}\n`);
    }
    console.log(USAGE);
    process.exit(1);
  }
}

main();
