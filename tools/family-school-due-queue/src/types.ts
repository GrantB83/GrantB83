export interface QueueEntry {
  text: string;
  source: 'subject' | 'filename';
  dueDate?: string;
  signals: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface QueueOutput {
  asOf: string;
  entries: QueueEntry[];
  missingSignals: string[];
}

export interface Manifest {
  generatedAt: string;
  mode: 'subjects' | 'files' | 'both';
  asOf: string;
  inputs: {
    subjects?: string;
    files?: string;
  };
  summary: {
    totalInputs: number;
    withSignals: number;
    missingSignals: number;
  };
}
