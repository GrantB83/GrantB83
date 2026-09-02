import { Transaction, Rule, MatchResult, UnmatchedResult, MatchingSummary } from './types.js';

function matchesRule(merchant: string, rule: Rule): boolean {
  if (rule.isRegex) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      return regex.test(merchant);
    } catch (e) {
      console.warn(`Invalid regex pattern: ${rule.pattern}`);
      return false;
    }
  } else {
    return merchant.includes(rule.pattern.toLowerCase());
  }
}

function parseAmount(amount: string): number | null {
  const cleaned = amount.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function matchTransactions(transactions: Transaction[], rules: Rule[]): MatchingSummary {
  const matchedMap = new Map<string, { category: string; count: number; totalAmount: number; notes?: string }>();
  const unmatchedMap = new Map<string, { count: number; totalAmount: number }>();
  
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const txn of transactions) {
    let matched = false;
    
    for (const rule of rules) {
      if (matchesRule(txn.merchant, rule)) {
        matched = true;
        matchedCount++;
        
        const key = `${rule.category}:${txn.merchant}`;
        const existing = matchedMap.get(key) || { 
          category: rule.category, 
          count: 0, 
          totalAmount: 0,
          notes: rule.notes 
        };
        
        existing.count++;
        if (txn.amount) {
          const amt = parseAmount(txn.amount);
          if (amt !== null) {
            existing.totalAmount += amt;
          }
        }
        
        matchedMap.set(key, existing);
        break;
      }
    }
    
    if (!matched) {
      unmatchedCount++;
      const existing = unmatchedMap.get(txn.merchant) || { count: 0, totalAmount: 0 };
      existing.count++;
      
      if (txn.amount) {
        const amt = parseAmount(txn.amount);
        if (amt !== null) {
          existing.totalAmount += amt;
        }
      }
      
      unmatchedMap.set(txn.merchant, existing);
    }
  }

  const matched: MatchResult[] = Array.from(matchedMap.entries()).map(([key, value]) => {
    const merchant = key.split(':').slice(1).join(':');
    return {
      merchant,
      category: value.category,
      count: value.count,
      totalAmount: value.totalAmount > 0 ? value.totalAmount : undefined,
      notes: value.notes
    };
  }).sort((a, b) => b.count - a.count);

  const unmatched: UnmatchedResult[] = Array.from(unmatchedMap.entries()).map(([merchant, value]) => ({
    merchant,
    count: value.count,
    totalAmount: value.totalAmount > 0 ? value.totalAmount : undefined
  })).sort((a, b) => b.count - a.count);

  return {
    matched,
    unmatched,
    totalTransactions: transactions.length,
    matchedTransactions: matchedCount,
    unmatchedTransactions: unmatchedCount,
    uniqueMatchedMerchants: matched.length,
    uniqueUnmatchedMerchants: unmatched.length
  };
}
