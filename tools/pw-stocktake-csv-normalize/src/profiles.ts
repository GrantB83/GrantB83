import { Profile, ProfileConfig } from './types.js';

const profiles: Record<Profile, ProfileConfig> = {
  auto: {
    name: 'auto',
    storeAliases: ['store', 'location', 'branch', 'outlet', 'shop'],
    skuAliases: ['sku', 'item', 'product', 'sku/item', 'item name', 'product name', 'product code', 'item code'],
    qtyAliases: ['countedqty', 'counted qty', 'qty', 'quantity', 'count', 'stock', 'counted', 'amount'],
    unitAliases: ['unit', 'uom', 'unit of measure', 'measure'],
    countedAtAliases: ['countedat', 'counted at', 'date', 'timestamp', 'counted date', 'stocktake date'],
    notesAliases: ['notes', 'note', 'remarks', 'comment', 'comments', 'description'],
  },
  generic: {
    name: 'generic',
    storeAliases: ['store', 'location', 'branch'],
    skuAliases: ['sku', 'item', 'product', 'sku/item'],
    qtyAliases: ['countedqty', 'counted qty', 'qty', 'quantity', 'count'],
    unitAliases: ['unit', 'uom'],
    countedAtAliases: ['countedat', 'counted at', 'date', 'timestamp'],
    notesAliases: ['notes', 'note', 'remarks'],
  },
  loyverse: {
    name: 'loyverse',
    storeAliases: ['store', 'store name', 'outlet'],
    skuAliases: ['item name', 'product name', 'item', 'sku'],
    qtyAliases: ['quantity', 'qty', 'stock'],
    unitAliases: ['unit', 'unit of measure'],
    countedAtAliases: ['date', 'stocktake date', 'timestamp'],
    notesAliases: ['notes', 'comment'],
  },
};

export function getProfile(profileName: Profile): ProfileConfig {
  return profiles[profileName];
}

export function detectProfile(headers: string[]): Profile {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  // Check for Loyverse-specific headers
  if (lowerHeaders.some(h => h.includes('item name') || h === 'outlet')) {
    return 'loyverse';
  }

  // Default to auto
  return 'auto';
}
