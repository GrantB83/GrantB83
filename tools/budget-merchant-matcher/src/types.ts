export interface Transaction {
  merchant: string;
  date?: string;
  amount?: string;
  rawRow: string[];
}

export interface Rule {
  pattern: string;
  category: string;
  notes?: string;
  isRegex?: boolean;
}

export interface MatchResult {
  merchant: string;
  category: string;
  count: number;
  totalAmount?: number;
  notes?: string;
}

export interface UnmatchedResult {
  merchant: string;
  count: number;
  totalAmount?: number;
}

export interface MatchingSummary {
  matched: MatchResult[];
  unmatched: UnmatchedResult[];
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  uniqueMatchedMerchants: number;
  uniqueUnmatchedMerchants: number;
}
