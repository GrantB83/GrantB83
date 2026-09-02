import { EntityTag, FileIndexEntry } from './types.js';

const ENTITY_KEYWORDS: Record<EntityTag, string[]> = {
  'plimmer': ['plimmer', 'pimmer'],
  'charisse': ['charisse', 'charise'],
  'tax-emigration': ['emigration', 'emigrate', 'tax clearance', 'tax-emigration', 'emigr'],
  'sars': ['sars', 'south african revenue'],
  'cipc': ['cipc', 'companies commission', 'pty ltd'],
  'share-sale': ['share sale', 'sharesale', 'share-sale', 'share transaction', 'equity'],
  'xero': ['xero'],
  'loyverse': ['loyverse'],
  'budget': ['budget'],
  'monarch': ['monarch'],
  'aisd': ['aisd', 'austin isd', 'school'],
  'wesbank': ['wesbank', 'wes bank'],
  'fnb': ['fnb', 'first national bank'],
  'standard-bank': ['standard bank', 'standardbank', 'stanbic'],
  'eskom': ['eskom'],
  'municipal': ['municipal', 'municipality', 'rates', 'levy'],
  'nightsbridge': ['nightsbridge', 'nights bridge'],
  'perfect-water': ['perfect water', 'perfectwater', 'pw', 'bvr'],
  'heavy-metal': ['heavy metal', 'heavymetal', 'hm sand', 'hmsand'],
  'hospitality': ['browns', 'rivendell', 'hospitality', 'guest'],
  'unknown': []
};

const DATE_PATTERNS = [
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
  /\b(\d{4})(\d{2})(\d{2})\b/g,
  /\b(\d{4})-(\d{1,2})\b/g,
  /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
];

export function extractEntities(filename: string): EntityTag[] {
  const normalizedFilename = filename.toLowerCase().replace(/-/g, ' ');
  const entities: EntityTag[] = [];

  for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    if (entity === 'unknown') continue;
    
    for (const keyword of keywords) {
      if (normalizedFilename.includes(keyword.toLowerCase())) {
        entities.push(entity as EntityTag);
        break;
      }
    }
  }

  return entities.length > 0 ? entities : ['unknown'];
}

export function extractDates(filename: string): string[] {
  const dates: string[] = [];
  const dateStrings = new Set<string>();
  
  for (const pattern of DATE_PATTERNS) {
    const matches = filename.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        dateStrings.add(match[0]);
      }
    }
  }
  
  for (const dateStr of dateStrings) {
    const normalized = normalizeDate(dateStr);
    if (normalized && !dates.includes(normalized)) {
      const isSubstringOfLonger = Array.from(dateStrings).some(other => 
        other !== dateStr && other.includes(dateStr)
      );
      
      if (!isSubstringOfLonger) {
        dates.push(normalized);
      }
    }
  }
  
  return dates.sort();
}

function normalizeDate(dateStr: string): string | null {
  dateStr = dateStr.replace(/\//g, '-');
  
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  const isoYearMonthMatch = dateStr.match(/^(\d{4})-(\d{1,2})$/);
  if (isoYearMonthMatch) {
    const [, year, month] = isoYearMonthMatch;
    return `${year}-${month.padStart(2, '0')}`;
  }
  
  const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    return `${year}-${month}-${day}`;
  }
  
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot);
}

export function parseFilename(filename: string, path?: string): FileIndexEntry {
  const entities = extractEntities(filename);
  const dates = extractDates(filename);
  const extension = getExtension(filename);
  
  let notes = '';
  if (entities.includes('unknown')) {
    notes = 'No entity keywords detected';
  }
  if (dates.length === 0) {
    notes = notes ? `${notes}; No dates found` : 'No dates found';
  }
  
  return {
    filename,
    inferredEntities: entities,
    inferredDates: dates,
    extension,
    path,
    matchedSubjects: [],
    notes
  };
}
