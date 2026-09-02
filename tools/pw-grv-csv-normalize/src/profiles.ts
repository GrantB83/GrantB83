import { Profile, ProfileConfig } from './types.js';

const PROFILES: Record<Profile, ProfileConfig> = {
  auto: {
    name: 'auto',
    storeColumn: null,
    itemColumn: null,
    qtyColumn: null,
    unitColumn: null,
    dateColumn: null,
    supplierColumn: null,
    docnoColumn: null,
    notesColumn: null,
    detectHeaders: () => false,
  },

  generic: {
    name: 'generic',
    storeColumn: null, // Use heuristic
    itemColumn: null, // Use heuristic
    qtyColumn: null, // Use heuristic
    unitColumn: null, // Use heuristic
    dateColumn: null, // Use heuristic
    supplierColumn: null, // Use heuristic
    docnoColumn: null, // Use heuristic
    notesColumn: null, // Use heuristic
    detectHeaders: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase());
      return lowerHeaders.some(h =>
        h.includes('store') || h.includes('location') ||
        h.includes('item') || h.includes('sku') || h.includes('product') ||
        h.includes('qty') || h.includes('quantity') || h.includes('received')
      );
    },
  },

  loyverse: {
    name: 'loyverse',
    storeColumn: 'Outlet',
    itemColumn: 'Item',
    qtyColumn: 'Quantity',
    unitColumn: 'Unit',
    dateColumn: 'Date',
    supplierColumn: 'Supplier',
    docnoColumn: 'Receipt Number',
    notesColumn: 'Note',
    detectHeaders: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase());
      return lowerHeaders.includes('outlet') && lowerHeaders.includes('item') && lowerHeaders.includes('quantity');
    },
  },
};

export function getProfile(profileName: Profile): ProfileConfig {
  return PROFILES[profileName];
}

export function detectProfile(headers: string[]): Profile {
  if (PROFILES.loyverse.detectHeaders(headers)) {
    return 'loyverse';
  }
  if (PROFILES.generic.detectHeaders(headers)) {
    return 'generic';
  }
  return 'auto';
}

// Heuristic matching for generic CSVs
export function findColumnByHeuristic(headers: string[], keywords: string[]): string | null {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  for (const keyword of keywords) {
    const idx = lowerHeaders.findIndex(h => h.includes(keyword.toLowerCase()));
    if (idx !== -1) {
      return headers[idx];
    }
  }
  return null;
}

export function resolveColumnName(
  profile: ProfileConfig,
  headers: string[],
  explicitCol: string | null,
  heuristicKeywords: string[]
): string | null {
  if (explicitCol) {
    return headers.includes(explicitCol) ? explicitCol : null;
  }
  if (profile.name !== 'generic' && profile.name !== 'auto') {
    // For named profiles, use the profile's column name if it exists
    const profileCol = heuristicKeywords[0]; // First keyword is typically the profile column name
    if (headers.includes(profileCol)) {
      return profileCol;
    }
  }
  return findColumnByHeuristic(headers, heuristicKeywords);
}
