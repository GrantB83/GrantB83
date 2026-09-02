export interface ValidationOptions {
  csvPath: string;
  requireHeaders?: string[];
  forbidCurrencyIn?: string[];
  minRows?: number;
  outdir: string;
}

export interface ColumnStats {
  columnName: string;
  totalRows: number;
  blankCount: number;
  blankPercentage: number;
  currencyViolations?: CurrencyViolation[];
}

export interface CurrencyViolation {
  rowIndex: number;
  value: string;
  matchedToken: string;
}

export interface ValidationResult {
  passed: boolean;
  csvPath: string;
  totalRows: number;
  headers: string[];
  missingHeaders: string[];
  columnStats: ColumnStats[];
  minRowsCheck: {
    required: number | null;
    actual: number;
    passed: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface ReportFiles {
  markdown: string;
  json: string;
}
