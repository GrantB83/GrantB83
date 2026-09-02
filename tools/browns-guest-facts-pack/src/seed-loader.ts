import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import type { SeedSample } from './types.js';

export function loadSeeds(seedsDir: string): Record<string, SeedSample[]> {
  if (!existsSync(seedsDir)) {
    console.warn(`⚠️  Seeds directory not found: ${seedsDir}`);
    return {};
  }

  if (!statSync(seedsDir).isDirectory()) {
    console.warn(`⚠️  Seeds path is not a directory: ${seedsDir}`);
    return {};
  }

  const seeds: Record<string, SeedSample[]> = {};
  const files = readdirSync(seedsDir);

  for (const file of files) {
    if (!file.endsWith('.txt')) continue;

    const filePath = join(seedsDir, file);
    const content = readFileSync(filePath, 'utf-8').trim();

    if (!content) continue;

    const baseName = file.replace(/\.txt$/, '');
    const parts = baseName.split('-');
    const category = parts.length > 1 ? parts[0] : 'general';

    if (!seeds[category]) {
      seeds[category] = [];
    }

    seeds[category].push({
      content,
      toneLabel: baseName
    });
  }

  return seeds;
}
