import { readFileSync } from 'fs';
import { parseMarkdown, extractFacts } from './parser.js';
import { loadSeeds } from './seed-loader.js';
import type { PackOutput, GuestFacts } from './types.js';

const EXPECTED_FIELDS = [
  'directions',
  'wifi',
  'lateCheckIn',
  'blueCrane',
  'checkInTime',
  'checkOutTime',
  'address',
  'parking',
  'contact',
  'breakfast'
];

export function extractFactsPack(
  factsFile: string,
  seedsDir?: string
): PackOutput {
  const markdown = readFileSync(factsFile, 'utf-8');
  
  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  const propertyName = detectPropertyName(markdown);

  const missingFields = EXPECTED_FIELDS.filter(field => !(field in facts));

  const snippets: Record<string, string> = {};
  for (const [key, value] of Object.entries(facts)) {
    if (value) {
      snippets[key] = value;
    }
  }

  if (seedsDir) {
    const seeds = loadSeeds(seedsDir);
    const seedCount = Object.values(seeds).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`  ℹ️  Loaded ${seedCount} seed sample(s) for tone reference`);
    console.log(`     (Seeds are for tone only; no new facts extracted from seeds)`);
  }

  const manifest = {
    packVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    sourceFile: factsFile,
    factsCount: Object.keys(facts).length,
    missingCount: missingFields.length,
    propertyName,
    disclaimer: 'Facts extracted from source markdown only. No invented data. For draft communications only.'
  };

  return {
    facts,
    snippets,
    missingFields,
    manifest
  };
}

function detectPropertyName(markdown: string): string | undefined {
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      return h1Match[1].trim();
    }
  }
  
  if (markdown.toLowerCase().includes('the browns')) {
    return 'The Browns Luxury Guest Suites Dullstroom';
  }
  
  return undefined;
}
