import * as fs from 'fs';
import { MerchantSuggestion, SuggestionsJson, GroupedSuggestions } from './types.js';

export function parseSuggestionsJson(filePath: string): MerchantSuggestion[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Suggestions JSON file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let data: SuggestionsJson;
  
  try {
    data = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse suggestions JSON: ${err}`);
  }

  if (!data.suggestions || !Array.isArray(data.suggestions)) {
    throw new Error('Suggestions JSON must have a "suggestions" array');
  }

  return data.suggestions;
}

export function parseSuggestionsMd(filePath: string): MerchantSuggestion[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Suggestions markdown file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const suggestions: MerchantSuggestion[] = [];
  
  const lines = content.split('\n');
  let currentConfidence: 'high' | 'medium' | 'low' | null = null;
  let currentMerchant: string | null = null;
  let currentAlias: string | null = null;
  let currentScore: number | null = null;
  let currentPattern: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('High Confidence')) {
      currentConfidence = 'high';
    } else if (line.includes('Medium Confidence')) {
      currentConfidence = 'medium';
    } else if (line.includes('Low Confidence')) {
      currentConfidence = 'low';
    }

    if (line.match(/^###\s+\d+\.\s+(.+)$/)) {
      if (currentMerchant && currentAlias !== null && currentScore !== null && currentConfidence) {
        suggestions.push({
          merchant: currentMerchant,
          topMatch: {
            alias: currentAlias,
            score: currentScore,
            matchedPattern: currentPattern || undefined
          },
          confidence: currentConfidence
        });
      }

      currentMerchant = line.replace(/^###\s+\d+\.\s+/, '');
      currentAlias = null;
      currentScore = null;
      currentPattern = null;
    }

    if (line.match(/^\*\*Suggested alias:\*\*\s+(.+)$/)) {
      currentAlias = line.replace(/^\*\*Suggested alias:\*\*\s+/, '');
    }

    if (line.match(/^\*\*Score:\*\*\s+([0-9.]+)$/)) {
      currentScore = parseFloat(line.replace(/^\*\*Score:\*\*\s+/, ''));
    }

    if (line.match(/^\*\*Matched pattern:\*\*\s+(.+)$/)) {
      currentPattern = line.replace(/^\*\*Matched pattern:\*\*\s+/, '');
    }
  }

  if (currentMerchant && currentAlias !== null && currentScore !== null && currentConfidence) {
    suggestions.push({
      merchant: currentMerchant,
      topMatch: {
        alias: currentAlias,
        score: currentScore,
        matchedPattern: currentPattern || undefined
      },
      confidence: currentConfidence
    });
  }

  return suggestions;
}

export function parseNoMatchMd(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No-match markdown file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const merchants: string[] = [];
  
  const lines = content.split('\n');
  let inList = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      inList = true;
      continue;
    }

    if (inList) {
      const match = line.match(/^\d+\.\s+(.+)$/);
      if (match) {
        merchants.push(match[1].trim());
      }
    }
  }

  return merchants;
}

export function groupByConfidence(suggestions: MerchantSuggestion[]): GroupedSuggestions {
  return {
    high: suggestions.filter(s => s.confidence === 'high'),
    medium: suggestions.filter(s => s.confidence === 'medium'),
    low: suggestions.filter(s => s.confidence === 'low')
  };
}
