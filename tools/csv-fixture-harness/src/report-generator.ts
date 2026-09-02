import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { ValidationResult, ReportFiles } from './types.js';

export function generateReports(result: ValidationResult, outdir: string): ReportFiles {
  mkdirSync(outdir, { recursive: true });

  const markdownPath = join(outdir, 'report.md');
  const jsonPath = join(outdir, 'report.json');

  writeFileSync(markdownPath, generateMarkdown(result));
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  return {
    markdown: markdownPath,
    json: jsonPath,
  };
}

function generateMarkdown(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('# CSV Fixture Validation Report\n');
  lines.push(`**Status:** ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`);
  lines.push(`**CSV File:** \`${result.csvPath}\`\n`);
  lines.push(`**Total Rows:** ${result.totalRows}\n`);

  if (result.minRowsCheck.required !== null) {
    lines.push(
      `**Min Rows Check:** ${result.minRowsCheck.passed ? '✅' : '❌'} ` +
      `(required: ${result.minRowsCheck.required}, actual: ${result.minRowsCheck.actual})\n`
    );
  }

  lines.push('---\n');

  if (result.errors.length > 0) {
    lines.push('## ❌ Errors\n');
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('## ⚠️ Warnings\n');
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  lines.push('## Headers\n');
  lines.push(`Found ${result.headers.length} headers:\n`);
  for (const header of result.headers) {
    lines.push(`- \`${header}\``);
  }
  lines.push('');

  if (result.missingHeaders.length > 0) {
    lines.push('### Missing Required Headers\n');
    for (const missing of result.missingHeaders) {
      lines.push(`- ❌ \`${missing}\``);
    }
    lines.push('');
  }

  lines.push('## Column Analysis\n');
  lines.push('| Column | Total Rows | Blank Count | Blank % | Currency Violations |');
  lines.push('|--------|-----------|-------------|---------|---------------------|');

  for (const stat of result.columnStats) {
    const violations = stat.currencyViolations ? stat.currencyViolations.length : 0;
    const violationIcon = violations > 0 ? '❌' : '✅';
    lines.push(
      `| ${stat.columnName} | ${stat.totalRows} | ${stat.blankCount} | ` +
      `${stat.blankPercentage.toFixed(1)}% | ${violationIcon} ${violations} |`
    );
  }
  lines.push('');

  const violatingColumns = result.columnStats.filter(
    stat => stat.currencyViolations && stat.currencyViolations.length > 0
  );

  if (violatingColumns.length > 0) {
    lines.push('## Currency Violations Detail\n');
    for (const stat of violatingColumns) {
      lines.push(`### Column: \`${stat.columnName}\`\n`);
      lines.push('| Row | Value | Pattern |');
      lines.push('|-----|-------|---------|');
      for (const violation of stat.currencyViolations!) {
        lines.push(`| ${violation.rowIndex} | \`${violation.value}\` | ${violation.matchedToken} |`);
      }
      lines.push('');
    }
  }

  if (result.passed) {
    lines.push('---\n');
    lines.push('✅ **All validation checks passed.**');
  }

  return lines.join('\n');
}
