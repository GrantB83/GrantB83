export interface LoyverseSale {
  store: string;
  item: string;
  quantity: number;
  grossSales: number;
}

export interface DigestData {
  stores: StoreDigest[];
  totalStores: number;
  totalItems: number;
  totalQuantity: number;
  totalGrossSales: number;
  generatedAt: string;
}

export interface StoreDigest {
  store: string;
  items: ItemDigest[];
  storeTotal: number;
  itemCount: number;
  quantityTotal: number;
}

export interface ItemDigest {
  item: string;
  quantity: number;
  grossSales: number;
}

export interface MissingFields {
  missingStores: number;
  missingItems: number;
  missingQuantities: number;
  missingAmounts: number;
  totalRows: number;
  invalidRows: number[];
}
