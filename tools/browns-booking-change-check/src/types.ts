export interface BookingRecord {
  id?: string;
  guestName: string;
  suiteOrUnit?: string;
  checkInDate?: string;
  checkOutDate?: string;
  status?: string;
  phone?: string;
  notes?: string;
  adults?: number;
  children?: number;
  [key: string]: unknown;
}

export interface ChangeRecord {
  type: 'add' | 'remove' | 'update';
  key: string;
  before?: BookingRecord;
  after?: BookingRecord;
  fields?: string[];
}

export interface CliOptions {
  before: string;
  after: string;
  outdir?: string;
  day?: string;
}

export interface ManifestEntry {
  filename: string;
  type: 'changes-json' | 'changes-md' | 'approval' | 'manifest';
  recordCount?: number;
}

export interface OutputSummary {
  adds: number;
  removes: number;
  updates: number;
  total: number;
  beforeHash: string;
  afterHash: string;
}
