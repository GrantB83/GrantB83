export type EntityTag = 
  | 'plimmer' 
  | 'charisse' 
  | 'tax-emigration' 
  | 'sars' 
  | 'cipc' 
  | 'share-sale' 
  | 'xero' 
  | 'loyverse' 
  | 'budget' 
  | 'monarch' 
  | 'aisd'
  | 'wesbank'
  | 'fnb'
  | 'standard-bank'
  | 'eskom'
  | 'municipal'
  | 'nightsbridge'
  | 'perfect-water'
  | 'heavy-metal'
  | 'hospitality'
  | 'unknown';

export interface FileIndexEntry {
  filename: string;
  inferredEntities: EntityTag[];
  inferredDates: string[];
  extension: string;
  path?: string;
  matchedSubjects: string[];
  notes: string;
}

export interface MailSubject {
  subject: string;
  date?: string;
}

export interface IndexResult {
  entries: FileIndexEntry[];
  summary: {
    totalFiles: number;
    byEntity: Record<EntityTag, number>;
    filesWithDates: number;
    filesWithSubjects: number;
  };
}
