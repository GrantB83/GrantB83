export interface CSVRow {
  item: string;
  quantity: number;
  store?: string;
  rowNumber: number;
}

export interface CSVParseResult {
  rows: CSVRow[];
  rejected: RejectedRow[];
}

export interface RejectedRow {
  rowNumber: number;
  reason: string;
  rawItem?: string;
  rawQuantity?: string;
  rawStore?: string;
}

export interface DiffItem {
  item: string;
  store?: string;
  ordered: number;
  sold: number;
  delta: number;
}

export interface DiffResult {
  items: DiffItem[];
  missingInOrdered: string[];
  missingInSold: string[];
  totalOrdered: number;
  totalSold: number;
  totalDelta: number;
}

export interface CSVColumnConfig {
  keyCol: string;
  qtyCol: string;
  storeCol?: string;
}
