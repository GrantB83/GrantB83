export type EntitySlug = 
  | 'gab-trust'
  | 'b-group'
  | 'cipc'
  | 'sars'
  | 'plimmer'
  | 'charisse'
  | 'unknown';

export interface QueueItem {
  filename: string;
  category?: string;
  dateTokens?: string[];
  dueStatus?: string;
  confidence?: string;
  signals?: string[];
  notes?: string;
}

export interface EntityPackItem {
  filename: string;
  category?: string;
  dateTokens?: string[];
  dueStatus?: string;
  confidence?: string;
  signals?: string[];
  notes?: string;
}

export interface EntityPack {
  entity: EntitySlug;
  count: number;
  items: EntityPackItem[];
}

export interface EntityMappings {
  [keyword: string]: EntitySlug;
}

export interface PackResult {
  entities: Map<EntitySlug, EntityPackItem[]>;
  summary: {
    totalItems: number;
    byEntity: Record<EntitySlug, number>;
  };
}
