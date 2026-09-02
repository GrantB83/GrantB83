#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CliOptions, QueueData, ManifestData } from './types.js';
import { runSiblingTool } from './tool-runner.js';
import { assembleDigestData, countMissingSignals } from './pack-assembler.js';
import { generateDigest, generateMissingSignals, generateApproval } from './digest-generator.js';
import { writeOutputs, copyEntityPacks } from './output-writer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function showHelp(): void {
  console.log(`
vault-due-digest-pack - Assemble weekday Vault due digest

PURPOSE:
  Orchestrate vault-filename-due-queue and vault-entity-due-pack into one weekday
  Vault / CoS due digest. Never opens file bodies. Never invents dates. Never submits
  to SARS/CIPC. Produces DIGEST.md with entity overview, entity packs, missing-signals.md,
  APPROVAL.md, and manifest.json.

USAGE:
  npm run pack -- --queue queue.json --outdir out/
  npm run pack -- --filenames list.txt --run-filename-queue --run-entity-pack --outdir out/

REQUIRED (pick one):
  --queue       Path to queue.json from vault-filename-due-queue
  --filenames   Path to filename list (one per line)

REQUIRED:
  --outdir      Output directory for the digest pack

OPTIONAL:
  --entities    Path to custom entity mappings JSON (passed to vault-entity-due-pack)
  --run-filename-queue   Shell out to vault-filename-due-queue (requires --filenames)
  --run-entity-pack      Shell out to vault-entity-due-pack
  --help, -h    Show this help message

EXAMPLES:
  # Use prebuilt queue.json
  npm run pack -- --queue ../vault-filename-due-queue/out/queue.json --outdir digest/

  # Run both sibling tools
  npm run pack -- \\
    --filenames vault-files.txt \\
    --run-filename-queue \\
    --run-entity-pack \\
    --outdir digest/

  # Use prebuilt queue + run entity pack only
  npm run pack -- \\
    --queue queue.json \\
    --run-entity-pack \\
    --entities custom-entities.json \\
    --outdir digest/

OUTPUTS:
  DIGEST.md         - Numbered overview by entity + unknowns
  by-entity/        - Copied/linked entity pack subdirectories
  missing-signals.md - Files without clear category or date hints
  APPROVAL.md       - Vault research gates (no figures in chat, no SARS/CIPC submit)
  manifest.json     - Run metadata

SAFETY:
  - Never opens file bodies
  - Never invents due dates or amounts
  - Never submits to SARS/CIPC
  - Vault owns all research and next actions (N2 gate)
`);
}

function parseCliArgs(): CliOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        queue: { type: 'string' },
        filenames: { type: 'string' },
        entities: { type: 'string' },
        outdir: { type: 'string' },
        'run-filename-queue': { type: 'boolean' },
        'run-entity-pack': { type: 'boolean' },
        help: { type: 'boolean' },
      },
      strict: true,
    });

    if (values.help) {
      showHelp();
      return null;
    }

    // Validate: need either --queue or --filenames
    if (!values.queue && !values.filenames) {
      console.error('❌ Error: Either --queue or --filenames is required');
      showHelp();
      process.exit(1);
    }

    if (values.queue && values.filenames) {
      console.error('❌ Error: Cannot specify both --queue and --filenames');
      showHelp();
      process.exit(1);
    }

    if (!values.outdir) {
      console.error('❌ Error: --outdir is required');
      showHelp();
      process.exit(1);
    }

    // Validate: if --run-filename-queue, must have --filenames
    if (values['run-filename-queue'] && !values.filenames) {
      console.error('❌ Error: --run-filename-queue requires --filenames');
      showHelp();
      process.exit(1);
    }

    return {
      queue: values.queue,
      filenames: values.filenames,
      entities: values.entities,
      outdir: values.outdir!,
      'run-filename-queue': values['run-filename-queue'] || false,
      'run-entity-pack': values['run-entity-pack'] || false,
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('Vault Due Digest Pack CLI\n');

  const opts = parseCliArgs();
  if (!opts) {
    return;
  }

  const toolsDir = resolve(__dirname, '../..');
  const outdir = resolve(opts.outdir);
  const tempDir = join(outdir, '.temp');
  mkdirSync(tempDir, { recursive: true });

  let queuePath: string;
  let queueData: QueueData | null = null;
  let ranFilenameQueue = false;
  let ranEntityPack = false;
  const mode: 'queue' | 'filenames' = opts.queue ? 'queue' : 'filenames';
  const inputPath = opts.queue || opts.filenames!;

  try {
    // Step 1: Get or generate queue.json
    if (opts.queue) {
      queuePath = resolve(opts.queue);
      if (!existsSync(queuePath)) {
        console.error(`❌ Error: Queue file not found: ${queuePath}`);
        process.exit(1);
      }
      console.log(`Using prebuilt queue: ${queuePath}`);
    } else {
      // Run vault-filename-due-queue
      console.log('🔧 Running vault-filename-due-queue...');
      const filenamesPath = resolve(opts.filenames!);
      if (!existsSync(filenamesPath)) {
        console.error(`❌ Error: Filenames file not found: ${filenamesPath}`);
        process.exit(1);
      }

      const queueOutdir = join(tempDir, 'queue-out');
      await runSiblingTool(
        'vault-filename-due-queue',
        ['--files', filenamesPath, '--outdir', queueOutdir],
        toolsDir
      );

      queuePath = join(queueOutdir, 'queue.json');
      ranFilenameQueue = true;
      console.log('  ✓ vault-filename-due-queue completed\n');
    }

    // Load queue data
    queueData = JSON.parse(readFileSync(queuePath, 'utf-8'));

    // Step 2: Run or use existing entity pack
    let entityPackDir: string;

    if (opts['run-entity-pack']) {
      console.log('🔧 Running vault-entity-due-pack...');
      entityPackDir = join(tempDir, 'entity-out');
      const entityArgs = ['--queue', queuePath, '--outdir', entityPackDir];

      if (opts.entities) {
        const entitiesPath = resolve(opts.entities);
        if (!existsSync(entitiesPath)) {
          console.error(`❌ Error: Entities file not found: ${entitiesPath}`);
          process.exit(1);
        }
        entityArgs.push('--entities', entitiesPath);
      }

      await runSiblingTool('vault-entity-due-pack', entityArgs, toolsDir);
      ranEntityPack = true;
      console.log('  ✓ vault-entity-due-pack completed\n');
    } else {
      // Assume entity packs are already in a sibling location
      console.log('⚠️ Warning: --run-entity-pack not specified; no entity packs will be included');
      entityPackDir = tempDir; // Will be empty
    }

    // Step 3: Assemble digest data
    console.log('📊 Assembling digest data...');
    const digestData = assembleDigestData(entityPackDir, queueData, mode, inputPath);
    const missingCount = countMissingSignals(queueData);

    // Step 4: Generate outputs
    console.log('📝 Generating outputs...');
    const digest = generateDigest(digestData);
    const missingSignals = generateMissingSignals(missingCount);
    const approval = generateApproval();

    const manifestData: ManifestData = {
      generatedAt: digestData.generatedAt,
      mode,
      inputPath,
      ranFilenameQueue,
      ranEntityPack,
      summary: {
        totalItems: digestData.totalItems,
        byEntity: digestData.byEntity,
        unknownCount: digestData.unknownCount,
      },
      outputs: {
        digest: 'DIGEST.md',
        missingSignals: 'missing-signals.md',
        approval: 'APPROVAL.md',
        manifest: 'manifest.json',
        entityPacks: digestData.entityPacks,
      },
      warnings: digestData.warnings,
    };

    // Step 5: Write outputs
    writeOutputs(outdir, digest, missingSignals, approval, manifestData);

    // Step 6: Copy entity packs
    if (ranEntityPack) {
      console.log('📁 Copying entity packs...');
      copyEntityPacks(entityPackDir, outdir);
    }

    console.log('\n✅ Digest pack generation complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total items: ${digestData.totalItems}`);
    console.log(`   Entities: ${Object.keys(digestData.byEntity).length}`);
    console.log(`   Unknown: ${digestData.unknownCount}`);
    console.log(`   Missing signals: ${missingCount}`);

    if (digestData.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      digestData.warnings.forEach((w) => console.log(`   - ${w}`));
    }

    console.log(`\n📂 Output directory: ${outdir}`);
  } catch (err: any) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
