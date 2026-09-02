import { parseCSV } from './csv-parser.js';
import type { ValidationOptions, ValidationResult, ColumnStats, CurrencyViolation } from './types.js';

const CURRENCY_PATTERNS = [
  /\$\d/,           // Dollar sign with digit
  /R\d/,            // R with digit (South African Rand)
  /ZAR/i,           // ZAR currency code
  /USD/i,           // USD currency code
  /EUR/i,           // EUR currency code
  /GBP/i,           // GBP currency code
  /\d+\.\d{2}/,     // Decimal amount like 123.45
];

export function validateCSV(options: ValidationOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed;
  try {
    parsed = parseCSV(options.csvPath);
  } catch (error) {
    return {
      passed: false,
      csvPath: options.csvPath,
      totalRows: 0,
      headers: [],
      missingHeaders: options.requireHeaders || [],
      columnStats: [],
      minRowsCheck: {
        required: options.minRows || null,
        actual: 0,
        passed: options.minRows ? false : true,
      },
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`],
      warnings: [],
    };
  }

  const { headers, rows } = parsed;
  const totalRows = rows.length;

  const missingHeaders = checkRequiredHeaders(headers, options.requireHeaders || []);
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const minRowsCheck = {
    required: options.minRows || null,
    actual: totalRows,
    passed: options.minRows ? totalRows >= options.minRows : true,
  };

  if (!minRowsCheck.passed) {
    errors.push(`Insufficient rows: expected at least ${options.minRows}, found ${totalRows}`);
  }

  const columnStats = analyzeColumns(headers, rows, options.forbidCurrencyIn || []);

  for (const stat of columnStats) {
    if (stat.blankPercentage >= 50) {
      warnings.push(`Column "${stat.columnName}" is ${stat.blankPercentage.toFixed(1)}% blank`);
    }

    if (stat.currencyViolations && stat.currencyViolations.length > 0) {
      errors.push(
        `Column "${stat.columnName}" contains ${stat.currencyViolations.length} currency-like values (should be empty)`
      );
    }
  }

  const passed = errors.length === 0;

  return {
    passed,
    csvPath: options.csvPath,
    totalRows,
    headers,
    missingHeaders,
    columnStats,
    minRowsCheck,
    errors,
    warnings,
  };
}

function checkRequiredHeaders(actualHeaders: string[], requiredHeaders: string[]): string[] {
  const normalizedActual = actualHeaders.map(h => h.toLowerCase().trim());
  return requiredHeaders.filter(
    required => !normalizedActual.includes(required.toLowerCase().trim())
  );
}

function analyzeColumns(
  headers: string[],
  rows: Record<string, string>[],
  forbidCurrencyIn: string[]
): ColumnStats[] {
  const stats: ColumnStats[] = [];
  const normalizedForbidList = forbidCurrencyIn.map(col => col.toLowerCase().trim());

  for (const header of headers) {
    const blankCount = rows.filter(row => !row[header] || row[header].trim() === '').length;
    const blankPercentage = rows.length > 0 ? (blankCount / rows.length) * 100 : 0;

    let currencyViolations: CurrencyViolation[] | undefined;

    if (normalizedForbidList.includes(header.toLowerCase().trim())) {
      currencyViolations = [];
      for (let i = 0; i < rows.length; i++) {
        const value = rows[i][header] || '';
        if (value.trim() === '') continue;

        const matchedPattern = CURRENCY_PATTERNS.find(pattern => pattern.test(value));
        if (matchedPattern) {
          currencyViolations.push({
            rowIndex: i + 2,
            value,
            matchedToken: matchedPattern.toString(),
          });
        }
      }

      if (currencyViolations.length === 0) {
        currencyViolations = undefined;
      }
    }

    stats.push({
      columnName: header,
      totalRows: rows.length,
      blankCount,
      blankPercentage,
      currencyViolations,
    });
  }

  return stats;
}
