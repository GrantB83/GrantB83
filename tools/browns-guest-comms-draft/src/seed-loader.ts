import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import type { SeedSamples } from './types.js';

/**
 * Loads seed tone samples from a directory structure
 * Loads ALL .txt files in the directory to learn tone patterns
 */
export function loadSeeds(seedsDir: string): SeedSamples {
  if (!existsSync(seedsDir)) {
    return {};
  }

  if (!statSync(seedsDir).isDirectory()) {
    throw new Error(`Seeds path is not a directory: ${seedsDir}`);
  }

  const seeds: SeedSamples = {
    welcome: [],
    directions: [],
    lateCheckIn: [],
    quoteFollowUp: []
  };

  const files = readdirSync(seedsDir);

  for (const file of files) {
    if (!file.endsWith('.txt')) {
      continue;
    }

    const content = readFileSync(join(seedsDir, file), 'utf-8').trim();

    // Categorize by filename patterns, but also add to welcome as catch-all
    if (file.includes('booking') || file.includes('confirm')) {
      seeds.welcome!.push(content);
    } else if (file.includes('directions') || file.includes('address')) {
      seeds.directions!.push(content);
    } else if (file.includes('late') || file.includes('after-hours')) {
      seeds.lateCheckIn!.push(content);
    } else if (file.includes('quote') || file.includes('followup') || file.includes('availability')) {
      seeds.quoteFollowUp!.push(content);
    } else {
      // Catch-all: add to welcome for general tone learning
      seeds.welcome!.push(content);
    }
  }

  return seeds;
}

/**
 * Analyzes seed samples to extract common tone patterns
 */
export function analyzeTone(seeds: SeedSamples): {
  warmGreeting: boolean;
  firstPersonPlural: boolean;
  concise: boolean;
  includesEmoji: boolean;
} {
  const allSamples = [
    ...(seeds.welcome || []),
    ...(seeds.directions || []),
    ...(seeds.lateCheckIn || []),
    ...(seeds.quoteFollowUp || [])
  ].join(' ').toLowerCase();

  return {
    warmGreeting: allSamples.includes('looking forward') || allSamples.includes('excited'),
    firstPersonPlural: allSamples.includes('we ') || allSamples.includes('our '),
    concise: allSamples.length / Math.max(1, (seeds.welcome?.length || 0)) < 500,
    includesEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(allSamples)
  };
}
