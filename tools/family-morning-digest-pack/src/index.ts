#!/usr/bin/env node
/**
 * Family Morning Digest Pack CLI
 * Offline assembler for Family / CoS morning digest workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions, DigestItem, PackManifest } from './types.js';
import { runSubjectDigest, runIcsDigest, runSchoolDue, loadDigestItems } from './digest-runner.js';
import {
  splitSections,
  generateSchoolMarkdown,
  generateFamilyMarkdown,
  generatePackIndex,
  generateApproval
} from './pack-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Family Morning Digest Pack CLI - Assemble morning digest for Family / CoS

USAGE:
  npm run pack -- --date YYYY-MM-DD [options]

OPTIONS:
  --date, -d            Date label (YYYY-MM-DD) [REQUIRED]
  --subjects, -s        Path to subjects file (for subject digest)
  --outdir, -o          Output directory [default: ./out]
  --run-subject-digest  Shell out to ../family-school-subject-digest
  --school-subjects     Optional pre-split school subjects file
  --ics                 Path to .ics calendar file (for ICS digest)
  --timezone            Timezone for calendar digest [default: America/Chicago]
  --run-ics-digest      Shell out to ../family-calendar-ics-digest
  --school-due-subjects Path to school subjects file (for school due queue)
  --school-due-files    Path to school filenames file (for school due queue)
  --run-school-due      Shell out to ../family-school-due-queue
  --help, -h            Show this help message

WORKFLOW:
  Option 1: Provide subjects file and let this tool call family-school-subject-digest
    npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest
  
  Option 2: Provide pre-generated items.json from family-school-subject-digest
    npm run pack -- --date 2026-09-02 --subjects path/to/items.json
  
  Option 3: Provide separate school subjects file
    npm run pack -- --date 2026-09-02 --school-subjects school.txt

  Option 4: Add calendar events from ICS file
    npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest --ics calendar.ics --run-ics-digest
  
  Option 5: Add school due queue from subjects/filenames
    npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest --school-due-subjects school-subjects.txt --run-school-due

OUTPUT:
  Creates pack folder: <outdir>/pack-YYYY-MM-DD/
    - PACK.md           (index + checklist)
    - school.md         (Kids School items)
    - family.md         (Family Admin items, no school repeats)
    - calendar.md       (Calendar events, if --run-ics-digest provided)
    - calendar-events.json  (Calendar event data, if --run-ics-digest provided)
    - school-due-queue.md   (School due queue excerpt, if --run-school-due provided)
    - APPROVAL.md       (review document)
    - manifest.json     (metadata)

SAFETY:
  - Offline only - no API calls
  - DRAFT ONLY - never sends to WhatsApp
  - Family / CoS owns send workflow
  - Clear separation of Kids School vs Family list
  - No duplicate items between sections

EXAMPLES:
  # Basic usage with subject digest
  npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest

  # Use pre-generated items.json
  npm run pack -- --date 2026-09-02 --subjects digest-output/items.json

  # With calendar events
  npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest --ics calendar.ics --run-ics-digest

  # With school due queue
  npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest --school-due-subjects school-subjects.txt --run-school-due

  # Test with fixtures
  npm run test:fixtures
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
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--subjects' || arg === '-s') {
      options.subjects = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--run-subject-digest') {
      options.runSubjectDigest = true;
    } else if (arg === '--school-subjects') {
      options.schoolSubjects = args[++i];
    } else if (arg === '--ics') {
      options.ics = args[++i];
    } else if (arg === '--timezone') {
      options.timezone = args[++i];
    } else if (arg === '--run-ics-digest') {
      options.runIcsDigest = true;
    } else if (arg === '--school-due-subjects') {
      options.schoolDueSubjects = args[++i];
    } else if (arg === '--school-due-files') {
      options.schoolDueFiles = args[++i];
    } else if (arg === '--run-school-due') {
      options.runSchoolDue = true;
    }
  }
  
  return options;
}

/**
 * Create timestamped output directory
 */
function createPackDirectory(baseDir: string, date: string): string {
  const packDir = path.join(baseDir, `pack-${date}`);
  
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }
  
  return packDir;
}

/**
 * Write all pack outputs
 */
function writePackOutputs(
  packDir: string,
  date: string,
  schoolItems: DigestItem[],
  familyItems: DigestItem[],
  calendarDigestMd?: string,
  calendarEventsJson?: any[],
  schoolDueQueueMd?: string,
  schoolDueQueueJson?: any
): void {
  const timezone = 'America/Chicago';
  
  // school.md
  const schoolMd = generateSchoolMarkdown(schoolItems, date);
  fs.writeFileSync(path.join(packDir, 'school.md'), schoolMd);
  
  // family.md
  const familyMd = generateFamilyMarkdown(familyItems, date);
  fs.writeFileSync(path.join(packDir, 'family.md'), familyMd);
  
  // calendar.md and calendar-events.json (if provided)
  const files = ['PACK.md', 'school.md', 'family.md', 'APPROVAL.md', 'manifest.json'];
  if (calendarDigestMd && calendarEventsJson) {
    fs.writeFileSync(path.join(packDir, 'calendar.md'), calendarDigestMd);
    fs.writeFileSync(
      path.join(packDir, 'calendar-events.json'),
      JSON.stringify(calendarEventsJson, null, 2)
    );
    files.splice(3, 0, 'calendar.md', 'calendar-events.json');
  }
  
  // school-due-queue.md (if provided)
  let schoolDueItemCount: number | undefined;
  if (schoolDueQueueMd && schoolDueQueueJson) {
    fs.writeFileSync(path.join(packDir, 'school-due-queue.md'), schoolDueQueueMd);
    const insertIndex = files.indexOf('APPROVAL.md');
    files.splice(insertIndex, 0, 'school-due-queue.md');
    schoolDueItemCount = schoolDueQueueJson.entries ? schoolDueQueueJson.entries.length : 0;
  }
  
  // PACK.md
  const calendarEventCount = calendarEventsJson ? calendarEventsJson.length : undefined;
  const packMd = generatePackIndex(date, schoolItems.length, familyItems.length, calendarEventCount, schoolDueItemCount);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  
  // APPROVAL.md
  const approvalMd = generateApproval(date);
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  
  // manifest.json
  const manifest: PackManifest = {
    tool: 'family-morning-digest-pack',
    version: '1.0.0',
    date,
    timezone,
    generatedAt: new Date().toISOString(),
    schoolItemCount: schoolItems.length,
    familyItemCount: familyItems.length,
    totalItemCount: schoolItems.length + familyItems.length,
    files
  };
  
  if (calendarEventCount !== undefined) {
    manifest.calendarEventCount = calendarEventCount;
  }
  
  if (schoolDueItemCount !== undefined) {
    manifest.schoolDueItemCount = schoolDueItemCount;
  }
  
  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
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
  if (!options.date) {
    console.error('❌ Error: --date is required\n');
    printHelp();
    process.exit(1);
  }
  
  if (!options.subjects && !options.schoolSubjects) {
    console.error('❌ Error: Either --subjects or --school-subjects is required\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Family Morning Digest Pack CLI\n');
    console.log('⚠️  Offline processing only - no API calls');
    console.log('⚠️  DRAFT ONLY - never sends to WhatsApp');
    console.log('⚠️  Family / CoS owns send workflow\n');
    
    const date = options.date;
    const outdir = options.outdir || './out';
    const timezone = options.timezone || 'America/Chicago';
    
    let items: DigestItem[] = [];
    
    // Load or generate items
    if (options.runSubjectDigest && options.subjects) {
      // Run family-school-subject-digest
      console.log('Running family-school-subject-digest...\n');
      
      const tempDir = path.join(outdir, '.digest-temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const digestOutputDir = await runSubjectDigest(
        options.subjects,
        date,
        timezone,
        tempDir
      );
      
      items = loadDigestItems(digestOutputDir);
      console.log(`  ✓ Loaded ${items.length} items from digest output\n`);
      
    } else if (options.subjects) {
      // Load pre-generated items.json
      console.log(`Loading items from: ${options.subjects}\n`);
      
      if (!fs.existsSync(options.subjects)) {
        throw new Error(`File not found: ${options.subjects}`);
      }
      
      const content = fs.readFileSync(options.subjects, 'utf-8');
      items = JSON.parse(content);
      console.log(`  ✓ Loaded ${items.length} items\n`);
      
    } else if (options.schoolSubjects) {
      // For now, just throw an error - this would need the full parsing logic
      throw new Error('--school-subjects not yet implemented (use --subjects with items.json)');
    }
    
    if (items.length === 0) {
      throw new Error('No items to process');
    }
    
    // Run ICS digest if requested
    let calendarDigestMd: string | undefined;
    let calendarEventsJson: any[] | undefined;
    
    if (options.runIcsDigest && options.ics) {
      console.log('Running family-calendar-ics-digest...\n');
      
      const icsTempDir = path.join(outdir, '.ics-digest-temp');
      if (!fs.existsSync(icsTempDir)) {
        fs.mkdirSync(icsTempDir, { recursive: true });
      }
      
      const icsDigestOutputDir = await runIcsDigest(
        options.ics,
        date,
        timezone,
        icsTempDir
      );
      
      // Load digest.md and events.json
      const digestMdPath = path.join(icsDigestOutputDir, 'digest.md');
      const eventsJsonPath = path.join(icsDigestOutputDir, 'events.json');
      
      if (fs.existsSync(digestMdPath) && fs.existsSync(eventsJsonPath)) {
        calendarDigestMd = fs.readFileSync(digestMdPath, 'utf-8');
        const eventsData = JSON.parse(fs.readFileSync(eventsJsonPath, 'utf-8'));
        calendarEventsJson = eventsData;
        console.log(`  ✓ Loaded ${eventsData.length} calendar events from ICS digest\n`);
      } else {
        throw new Error('ICS digest did not produce expected outputs (digest.md, events.json)');
      }
    }
    
    // Run school due queue if requested
    let schoolDueQueueMd: string | undefined;
    let schoolDueQueueJson: any | undefined;
    
    if (options.runSchoolDue && (options.schoolDueSubjects || options.schoolDueFiles)) {
      console.log('Running family-school-due-queue...\n');
      
      const schoolDueTempDir = path.join(outdir, '.school-due-temp');
      if (!fs.existsSync(schoolDueTempDir)) {
        fs.mkdirSync(schoolDueTempDir, { recursive: true });
      }
      
      const schoolDueOutputDir = await runSchoolDue(
        options.schoolDueSubjects || options.subjects,
        options.schoolDueFiles,
        date,
        schoolDueTempDir
      );
      
      // Load queue.md and queue.json
      const queueMdPath = path.join(schoolDueOutputDir, 'queue.md');
      const queueJsonPath = path.join(schoolDueOutputDir, 'queue.json');
      
      if (fs.existsSync(queueMdPath) && fs.existsSync(queueJsonPath)) {
        schoolDueQueueMd = fs.readFileSync(queueMdPath, 'utf-8');
        schoolDueQueueJson = JSON.parse(fs.readFileSync(queueJsonPath, 'utf-8'));
        const itemCount = schoolDueQueueJson.entries ? schoolDueQueueJson.entries.length : 0;
        console.log(`  ✓ Loaded ${itemCount} school due items from queue\n`);
      } else {
        throw new Error('School due queue did not produce expected outputs (queue.md, queue.json)');
      }
    }
    
    // Split into school and family sections
    console.log('Building pack sections...');
    const { school, family } = splitSections(items);
    console.log(`  School items: ${school.length}`);
    console.log(`  Family items: ${family.length}`);
    console.log('');
    
    // Renumber items sequentially
    let itemNumber = 1;
    for (const item of school) {
      item.n = itemNumber++;
    }
    for (const item of family) {
      item.n = itemNumber++;
    }
    
    // Create pack directory and write outputs
    console.log('Writing pack outputs...');
    const packDir = createPackDirectory(outdir, date);
    writePackOutputs(packDir, date, school, family, calendarDigestMd, calendarEventsJson, schoolDueQueueMd, schoolDueQueueJson);
    console.log(`  ✓ Pack directory: ${packDir}\n`);
    
    // Print summary
    console.log('✅ Pack generation complete!\n');
    console.log('Generated files:');
    console.log('  - PACK.md');
    console.log('  - school.md');
    console.log('  - family.md');
    if (calendarDigestMd && calendarEventsJson) {
      console.log('  - calendar.md');
      console.log('  - calendar-events.json');
    }
    if (schoolDueQueueMd && schoolDueQueueJson) {
      console.log('  - school-due-queue.md');
    }
    console.log('  - APPROVAL.md');
    console.log('  - manifest.json');
    console.log('');
    console.log('⚠️  IMPORTANT: Review APPROVAL.md before posting to WhatsApp!\n');
    console.log('Next steps:');
    console.log(`  1. cd ${packDir}`);
    console.log('  2. cat APPROVAL.md');
    console.log('  3. Review PACK.md checklist');
    console.log('  4. Verify school.md and family.md for accuracy');
    let stepNum = 5;
    if (calendarDigestMd && calendarEventsJson) {
      console.log(`  ${stepNum}. Verify calendar.md for accuracy (no invented events)`);
      stepNum++;
    }
    if (schoolDueQueueMd && schoolDueQueueJson) {
      console.log(`  ${stepNum}. Verify school-due-queue.md for accuracy (no invented dues)`);
      stepNum++;
    }
    console.log(`  ${stepNum}. Family / CoS owns WhatsApp send workflow\n`);
    
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
