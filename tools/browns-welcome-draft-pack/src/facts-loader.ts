import { readFileSync, existsSync } from 'fs';
import type { GuestFacts } from './types.js';

/**
 * Load guest facts from JSON file
 * Returns a Map keyed by normalized guest name
 */
export function loadGuestFacts(factsPath: string): Map<string, GuestFacts> {
  if (!existsSync(factsPath)) {
    console.warn(`Warning: Guest facts file not found: ${factsPath}`);
    return new Map();
  }

  try {
    const raw = readFileSync(factsPath, 'utf-8');
    const parsed = JSON.parse(raw);

    const map = new Map<string, GuestFacts>();

    // Handle array or object format
    const factsArray = Array.isArray(parsed) ? parsed : [parsed];

    for (const fact of factsArray) {
      if (fact.guestName) {
        const normalizedName = normalizeGuestName(fact.guestName);
        map.set(normalizedName, fact);
      }
    }

    return map;
  } catch (err) {
    console.warn(`Warning: Failed to parse guest facts: ${(err as Error).message}`);
    return new Map();
  }
}

function normalizeGuestName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
