export interface RateRecord {
  suiteOrUnit: string;
  seasonOrLabel: string;
  currency: string;
  nightlyRate?: number;
  minStay?: string;
  occupancy?: string;
  notes?: string;
}

export interface PromoRecord {
  name: string;
  startDate: string;
  endDate: string;
  discountPercent?: number;
  discountAmount?: number;
}

export interface WorksheetRow {
  suiteOrUnit: string;
  seasonOrLabel: string;
  currency: string;
  baseRate: string;
  promoName?: string;
  promoStartDate?: string;
  promoEndDate?: string;
  discountType?: string;
  discountValue?: string;
  promoRate?: string;
  minStay?: string;
  occupancy?: string;
  notes?: string;
  flags?: string;
}

export interface WorksheetOutput {
  worksheetRows: WorksheetRow[];
  warnings: string[];
  hasIncompletePricing: boolean;
}
