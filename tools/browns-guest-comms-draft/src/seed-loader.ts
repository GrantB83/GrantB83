import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import type { SeedSamples } from './types.js';

/**
 * Loads seed tone samples from a directory structure
 * Expects files like: welcome-1.txt, directions-2.txt, late-checkin-1.txt, etc.
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

    if (file.startsWith('welcome-')) {
      seeds.welcome!.push(content);
    } else if (file.startsWith('directions-')) {
      seeds.directions!.push(content);
    } else if (file.startsWith('late-checkin-')) {
      seeds.lateCheckIn!.push(content);
    } else if (file.startsWith('quote-followup-')) {
      seeds.quoteFollowUp!.push(content);
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
