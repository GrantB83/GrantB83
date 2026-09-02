export interface LoyverseRecord {
  date: string;
  receiptNumber: string;
  totalAmount: number;
  paymentType: string;
  rawLine: string;
}

export interface XeroRecord {
  date: string;
  reference: string;
  amount: number;
  description: string;
  rawLine: string;
}

export interface GapRecord {
  type: 'unmatched_loyverse' | 'unmatched_xero' | 'date_mismatch' | 'amount_mismatch' | 'duplicate';
  loyverseRecord?: LoyverseRecord;
  xeroRecord?: XeroRecord;
  issue: string;
}

export interface ReconResult {
  gaps: GapRecord[];
  matchedCount: number;
  loyverseTotal: number;
  xeroTotal: number;
  loyverseRecordCount: number;
  xeroRecordCount: number;
}
