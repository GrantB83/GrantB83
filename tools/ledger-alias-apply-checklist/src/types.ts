export interface CliOptions {
  suggestions?: string;
  suggestionsMd?: string;
  noMatch?: string;
  month?: string;
  outdir: string;
}

export interface MerchantSuggestion {
  merchant: string;
  topMatch: {
    alias: string;
    score: number;
    matchedPattern?: string;
  };
  allMatches?: Array<{
    alias: string;
    score: number;
    matchedPattern?: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

export interface SuggestionsJson {
  suggestions: MerchantSuggestion[];
  noMatches?: string[];
  generatedAt?: string;
  minScore?: number;
  totalMerchants?: number;
}

export interface GroupedSuggestions {
  high: MerchantSuggestion[];
  medium: MerchantSuggestion[];
  low: MerchantSuggestion[];
}

export interface ManifestOutput {
  tool: string;
  version: string;
  generatedAt: string;
  month?: string;
  inputFiles: {
    suggestions?: string;
    suggestionsMd?: string;
    noMatch?: string;
  };
  outputFiles: string[];
  stats: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    skipped: number;
    totalMappings: number;
  };
}
