import { DocumentCategory, QueueEntry } from './types.js';

const CATEGORY_PATTERNS: Record<DocumentCategory, RegExp[]> = {
  'cipc-annual-return': [
    /\bcipc\b.*\bannual.*return\b/i,
    /\bannual.*return\b.*\bcipc\b/i,
    /\bar\d{2,4}\b/i,  // AR2024, AR24, etc.
    /\bcos\d{2,4}\b/i, // CoS2024 (Companies Office)
  ],
  'cipc-change-form': [
    /\bcipc\b.*\bchange\b/i,
    /\bcipc\b.*\bform\b/i,
    /\bck\d{1,2}\b/i,  // CK1, CK2 (change forms)
    /\bcm\d{1,2}\b/i,  // CM29, etc.
  ],
  'cipc-certificate': [
    /\bcipc\b.*\bcertificate\b/i,
    /\bcertificate.*incorporation\b/i,
    /\bgood.*standing\b/i,
  ],
  'sars-annual-tax-return': [
    /\bsars\b.*\bannual\b/i,
    /\btax.*return\b.*\bannual\b/i,
    /\bitr12\b/i,
    /\bincome.*tax.*return\b/i,
  ],
  'sars-provisional-tax': [
    /\bprovisional\b.*\btax\b/i,
    /\bitr14\b/i,
    /\bprov.*tax\b/i,
  ],
  'sars-vat-return': [
    /\bvat\b.*\breturn\b/i,
    /\bvat\d{3}\b/i, // VAT201, etc.
  ],
  'sars-emp-return': [
    /\bemp\d{3}\b/i, // EMP201, EMP501
    /\bemployer.*return\b/i,
    /\buif\b.*\breturn\b/i,
    /\bpaye\b.*\breturn\b/i,
  ],
  'sars-correspondence': [
    /\bsars\b.*\bletter\b/i,
    /\bsars\b.*\bnotice\b/i,
    /\btax.*clearance\b/i,
  ],
  'bee-affidavit': [
    /\bbee\b.*\baffidavit\b/i,
    /\bb-?bbee\b.*\baffidavit\b/i,
  ],
  'bee-certificate': [
    /\bbee\b.*\bcertificate\b/i,
    /\bb-?bbee\b.*\bcertificate\b/i,
    /\btransformation\b.*\bcertificate\b/i,
  ],
  'trust-distribution': [
    /\btrust\b.*\bdistribution\b/i,
    /\bdistribution.*resolution\b/i,
  ],
  'trust-resolution': [
    /\btrust\b.*\bresolution\b/i,
    /\btrustee.*resolution\b/i,
    /\bboard.*resolution\b/i,
  ],
  'trust-compliance': [
    /\btrust\b.*\bcompliance\b/i,
    /\btrust\b.*\breturn\b/i,
  ],
  'property-rates': [
    /\bmunicipal\b.*\brates\b/i,
    /\brates\b.*\bmunicipal\b/i,
    /\bproperty.*rates\b/i,
  ],
  'property-levies': [
    /\blevies\b/i,
    /\bhoa\b.*\bfee/i,
    /\bbody.*corporate\b/i,
  ],
  'insurance-renewal': [
    /\binsurance\b.*\brenewal\b/i,
    /\brenewal.*notice\b/i,
    /\bpolicy.*renewal\b/i,
  ],
  'forex-application': [
    /\bforex\b/i,
    /\bcurrency\b.*\bapplication\b/i,
    /\bsda\b/i, // Single Discretionary Allowance
    /\bfia\b/i, // Foreign Investment Allowance
  ],
  'bank-statement': [
    /\bbank\b.*\bstatement\b/i,
    /\bstatement\b.*\baccount\b/i,
  ],
  'attorney-letter': [
    /\battorney\b/i,
    /\blegal\b.*\bletter\b/i,
    /\binstructions\b/i,
  ],
  'other-compliance': [
    /\bcompliance\b/i,
    /\bstatutory\b/i,
    /\bregulatory\b/i,
  ],
  'unknown': [],
};

const DATE_PATTERNS = [
  // ISO format: YYYY-MM-DD or YYYY-MM
  { pattern: /\b(\d{4})-(\d{2})-(\d{2})\b/g, groups: [1, 2, 3] },
  { pattern: /\b(\d{4})-(\d{2})\b/g, groups: [1, 2] },
  
  // Compact: YYYYMMDD
  { pattern: /\b(\d{4})(\d{2})(\d{2})\b/g, groups: [1, 2, 3] },
  
  // European: DD-MM-YYYY or DD/MM/YYYY
  { pattern: /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/g, groups: [3, 2, 1] },
  
  // Year only
  { pattern: /\b(20\d{2})\b/g, groups: [1] },
];

const DUE_DATE_KEYWORDS = [
  'due',
  'deadline',
  'submit',
  'filing',
  'return',
  'renewal',
  'tax',
];

export function parseFilename(filename: string): QueueEntry {
  const category = inferCategory(filename);
  const dateTokens = extractDateTokens(filename);
  const signals = extractSignals(filename);
  
  let dueStatus: 'has-date' | 'unknown-due' | 'no-date-pattern' = 'no-date-pattern';
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let notes = '';

  if (dateTokens.length > 0) {
    dueStatus = 'has-date';
    confidence = hasActionKeywords(filename) ? 'high' : 'medium';
  } else if (hasActionKeywords(filename)) {
    dueStatus = 'unknown-due';
    notes = 'Action keywords present but no date found in filename';
  } else {
    notes = 'No date pattern or due date keywords detected';
  }

  if (category !== 'unknown') {
    if (confidence === 'low') confidence = 'medium';
  }

  if (category === 'unknown' && dueStatus === 'no-date-pattern') {
    notes = notes || 'No category or date signals detected';
  }

  return {
    filename,
    category,
    dateTokens,
    dueStatus,
    confidence,
    signals,
    notes,
  };
}

function inferCategory(filename: string): DocumentCategory {
  const lower = filename.toLowerCase();
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'unknown') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return category as DocumentCategory;
      }
    }
  }
  
  return 'unknown';
}

function extractDateTokens(filename: string): string[] {
  const dates: string[] = [];
  
  for (const { pattern, groups } of DATE_PATTERNS) {
    let match;
    while ((match = pattern.exec(filename)) !== null) {
      if (groups.length === 1) {
        dates.push(match[groups[0]]);
      } else if (groups.length === 2) {
        dates.push(`${match[groups[0]]}-${match[groups[1]]}`);
      } else if (groups.length === 3) {
        dates.push(`${match[groups[0]]}-${match[groups[1]]}-${match[groups[2]]}`);
      }
    }
  }
  
  return [...new Set(dates)];
}

function extractSignals(filename: string): string[] {
  const signals: string[] = [];
  const lower = filename.toLowerCase();
  
  // Check for category-specific signals
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'unknown') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        signals.push(category);
        break;
      }
    }
  }
  
  // Check for due date keywords
  for (const keyword of DUE_DATE_KEYWORDS) {
    if (lower.includes(keyword)) {
      signals.push(`keyword:${keyword}`);
    }
  }
  
  return signals;
}

function hasActionKeywords(filename: string): boolean {
  const lower = filename.toLowerCase();
  return DUE_DATE_KEYWORDS.some(keyword => lower.includes(keyword));
}
