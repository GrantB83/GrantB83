export interface GRVRow {
  Store: string;
  'SKU/Item': string;
  ReceivedQty: number;
  Unit: string;
  ReceivedAt?: string;
  Supplier?: string;
  DocNo?: string;
  Notes?: string;
}

export interface StocktakeRow {
  Store: string;
  'SKU/Item': string;
  CountedQty: number;
  Unit: string;
  CountedAt?: string;
  Notes?: string;
}

export interface ParsedCSV<T> {
  rows: T[];
  rejectedRows: Array<{ row: any; reason: string }>;
}

export interface DiffItem {
  key: string;
  store: string;
  item: string;
  received: number;
  counted: number;
  delta: number;
  unit: string;
}

export interface DiffResult {
  items: DiffItem[];
  totalReceived: number;
  totalCounted: number;
  totalDelta: number;
  missingInStocktake: string[];
  missingInGRV: string[];
  rejectedGRV: Array<{ row: any; reason: string }>;
  rejectedStocktake: Array<{ row: any; reason: string }>;
}

export interface Manifest {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    grv: string;
    stocktake: string;
  };
  summary: {
    totalItems: number;
    totalReceived: number;
    totalCounted: number;
    totalDelta: number;
    missingInStocktake: number;
    missingInGRV: number;
    rejectedGRV: number;
    rejectedStocktake: number;
  };
  outputs: {
    diffJson: string;
    diffMd: string;
    missingKeysMd: string;
    approvalMd: string;
    manifestJson: string;
  };
}
