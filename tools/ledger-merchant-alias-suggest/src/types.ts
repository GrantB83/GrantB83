export interface CliOptions {
  unmatched?: string;
  merchants?: string;
  aliases: string;
  outdir: string;
  minScore?: number;
}

export interface UnmatchedQueue {
  merchants: Array<{
    displayName: string;
    count?: number;
  }>;
}

export interface AliasPattern {
  alias: string;
  patterns: string[];
}

export interface AliasesFile {
  aliases?: AliasPattern[];
  [key: string]: any;
}

export interface MerchantSuggestion {
  merchant: string;
  topMatch: {
    alias: string;
    score: number;
    matchedPattern?: string;
  };
  allMatches: Array<{
    alias: string;
    score: number;
    matchedPattern?: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

export interface SuggestionOutput {
  suggestions: MerchantSuggestion[];
  noMatches: string[];
  generatedAt: string;
  minScore: number;
  totalMerchants: number;
}

export interface ManifestOutput {
  tool: string;
  version: string;
  generatedAt: string;
  inputFiles: {
    merchants?: string;
    unmatched?: string;
    aliases: string;
  };
  outputFiles: string[];
  stats: {
    totalMerchants: number;
    withSuggestions: number;
    noMatch: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  config: {
    minScore: number;
  };
}
