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

export interface LoyverseSalesSummary {
  storeName?: string;
  grossSales: number;
  refunds: number;
  discounts: number;
  netSales: number;
  costOfGoods: number;
  grossProfit: number;
  margin: number;
  taxes: number;
}

export interface XeroProfitAndLoss {
  storeName?: string;
  totalTradingIncome: number;
  totalCostOfSales: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  netProfit: number;
  otherRevenue?: number;
  sales?: number;
  costOfGoodsSold?: number;
}

export interface GapRecord {
  type: 'unmatched_loyverse' | 'unmatched_xero' | 'date_mismatch' | 'amount_mismatch' | 'duplicate';
  loyverseRecord?: LoyverseRecord;
  xeroRecord?: XeroRecord;
  issue: string;
}

export interface SummaryGapRecord {
  type: 'net_sales_mismatch' | 'gross_profit_mismatch' | 'cogs_mismatch' | 'store_mismatch';
  storeName?: string;
  loyverseSummary?: LoyverseSalesSummary;
  xeroPL?: XeroProfitAndLoss;
  issue: string;
  difference: number;
}

export interface ReconResult {
  gaps: GapRecord[];
  matchedCount: number;
  loyverseTotal: number;
  xeroTotal: number;
  loyverseRecordCount: number;
  xeroRecordCount: number;
}

export interface SummaryReconResult {
  gaps: SummaryGapRecord[];
  storeCount: number;
  loyverseTotalNetSales: number;
  xeroTotalTradingIncome: number;
  totalDifference: number;
}
