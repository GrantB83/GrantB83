/**
 * Type definitions for vault-due-digest-pack
 */

export interface CliOptions {
  filenames?: string;
  queue?: string;
  entities?: string;
  outdir: string;
  'run-filename-queue'?: boolean;
  'run-entity-pack'?: boolean;
}

export interface QueueEntry {
  filename: string;
  category: string;
  dateTokens: string[];
  dueStatus: 'has-date' | 'unknown-due' | 'no-date-pattern';
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
  notes?: string;
}

export interface QueueData {
  entries: QueueEntry[];
  summary: {
    totalFiles: number;
    byCategory: Record<string, number>;
    filesWithDates: number;
    filesUnknownDue: number;
    filesNoDatePattern: number;
  };
}

export interface EntityPack {
  entity: string;
  count: number;
  packPath: string;
  itemsPath: string;
}

export interface DigestData {
  generatedAt: string;
  mode: 'queue' | 'filenames';
  inputPath: string;
  totalItems: number;
  byEntity: Record<string, number>;
  entityPacks: EntityPack[];
  unknownCount: number;
  warnings: string[];
}

export interface ManifestData {
  generatedAt: string;
  mode: 'queue' | 'filenames';
  inputPath: string;
  ranFilenameQueue: boolean;
  ranEntityPack: boolean;
  summary: {
    totalItems: number;
    byEntity: Record<string, number>;
    unknownCount: number;
  };
  outputs: {
    digest: string;
    missingSignals: string;
    approval: string;
    manifest: string;
    entityPacks: EntityPack[];
  };
  warnings: string[];
}
