import { RawRow, NormalizedRow, RejectedRow, ParseResult, ProfileConfig } from './types.js';

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  const cleaned = dateStr.trim();

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try DD/MM/YYYY
  const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD-MM-YYYY
  const ddmmyyyyDashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDashMatch) {
    const [, day, month, year] = ddmmyyyyDashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try MM/DD/YYYY (US format)
  const mmddyyyyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    // Disambiguate: if month > 12, assume DD/MM/YYYY
    if (monthNum > 12) {
      return `${year}-${day.padStart(2, '0')}-${month.padStart(2, '0')}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY/MM/DD
  const yyyymmddMatch = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr || !amountStr.trim()) {
    return null;
  }

  // Remove spaces, commas, and currency symbols
  const cleaned = amountStr.trim().replace(/[\s,R$]/g, '');

  // Try parsing
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return null;
  }

  return num;
}

function findColumnValue(row: RawRow, aliases: string[]): string | null {
  const lowerAliases = aliases.map(a => a.toLowerCase());
  const lowerKeys = Object.keys(row).map(k => k.toLowerCase());

  for (const alias of lowerAliases) {
    const index = lowerKeys.indexOf(alias);
    if (index !== -1) {
      const originalKey = Object.keys(row)[index];
      const value = row[originalKey];
      if (value && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

export function normalizeRows(rows: RawRow[], profile: ProfileConfig): ParseResult {
  const normalized: NormalizedRow[] = [];
  const rejected: RejectedRow[] = [];
  const missingFields: string[] = [];

  for (const row of rows) {
    const dateValue = findColumnValue(row, profile.dateAliases);
    let referenceValue = findColumnValue(row, profile.referenceAliases);
    const descriptionValue = findColumnValue(row, profile.descriptionAliases);
    const payeeValue = findColumnValue(row, profile.payeeAliases);
    const storeValue = findColumnValue(row, profile.storeAliases);

    // Amount handling: single amount column or debit/credit split
    let amountValue = findColumnValue(row, profile.amountAliases);
    const debitValue = findColumnValue(row, profile.debitAliases);
    const creditValue = findColumnValue(row, profile.creditAliases);

    let amount: number | null = null;

    if (amountValue) {
      amount = parseAmount(amountValue);
    } else if (debitValue || creditValue) {
      // Combine debit/credit: credits positive (money-in), debits negative (money-out)
      const debit = debitValue ? parseAmount(debitValue) : 0;
      const credit = creditValue ? parseAmount(creditValue) : 0;

      if (debit === null && credit === null) {
        amount = null;
      } else {
        amount = (credit || 0) - (debit || 0);
      }
    }

    // Validation
    const reasons: string[] = [];

    if (!dateValue) {
      reasons.push('missing date');
      missingFields.push('Date');
    } else {
      const normalizedDate = normalizeDate(dateValue);
      if (!normalizedDate) {
        reasons.push('invalid date format');
      }
    }

    if (amount === null) {
      reasons.push('missing or unparseable amount');
      missingFields.push('Amount');
    }

    if (!descriptionValue && !payeeValue) {
      reasons.push('missing description and payee');
      missingFields.push('Description/Payee');
    }

    // Reference: prefer reference column, fall back to description snippet
    if (!referenceValue) {
      if (descriptionValue) {
        referenceValue = descriptionValue.substring(0, 50);
      } else if (payeeValue) {
        referenceValue = payeeValue.substring(0, 50);
      } else {
        reasons.push('missing reference');
        missingFields.push('Reference');
      }
    }

    if (reasons.length > 0) {
      rejected.push({
        originalRow: row,
        reason: reasons.join('; '),
      });
      continue;
    }

    // Build normalized row
    const normalizedDate = normalizeDate(dateValue!)!;
    
    // Description: prefer Payee + Description, or Payee alone if Description empty
    let finalDescription = '';
    if (payeeValue && descriptionValue) {
      finalDescription = `${payeeValue} | ${descriptionValue}`;
    } else if (payeeValue) {
      finalDescription = payeeValue;
    } else {
      finalDescription = descriptionValue || '';
    }

    const normalizedRow: NormalizedRow = {
      Date: normalizedDate,
      Reference: referenceValue!,
      Amount: amount!.toFixed(2),
      Description: finalDescription,
    };

    if (payeeValue) {
      normalizedRow.Payee = payeeValue;
    }

    if (storeValue) {
      normalizedRow.Store = storeValue;
    }

    normalized.push(normalizedRow);
  }

  return {
    normalized,
    rejected,
    missingFields: Array.from(new Set(missingFields)),
  };
}
