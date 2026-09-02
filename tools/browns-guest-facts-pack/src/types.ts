export interface GuestFacts {
  directions?: string;
  wifi?: string;
  wifiPassword?: string;
  lateCheckIn?: string;
  blueCrane?: string;
  checkInTime?: string;
  checkOutTime?: string;
  address?: string;
  parking?: string;
  contact?: string;
  breakfast?: string;
  [key: string]: string | undefined;
}

export interface PackOutput {
  facts: GuestFacts;
  snippets: Record<string, string>;
  missingFields: string[];
  manifest: Manifest;
}

export interface Manifest {
  packVersion: string;
  extractedAt: string;
  sourceFile: string;
  factsCount: number;
  missingCount: number;
  propertyName?: string;
  disclaimer: string;
}

export interface SeedSample {
  content: string;
  toneLabel?: string;
}
