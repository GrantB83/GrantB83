import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { IndexResult, EntityTag, FileIndexEntry } from './types.js';

export function generateCSV(result: IndexResult, outputPath: string): void {
  const headers = [
    'Filename',
    'Inferred Entities',
    'Inferred Dates',
    'Extension',
    'Path',
    'Matched Subjects',
    'Notes'
  ];
  
  const rows = result.entries.map(entry => [
    escapeCSV(entry.filename),
    escapeCSV(entry.inferredEntities.join('; ')),
    escapeCSV(entry.inferredDates.join('; ')),
    escapeCSV(entry.extension),
    escapeCSV(entry.path || ''),
    escapeCSV(entry.matchedSubjects.join(' | ')),
    escapeCSV(entry.notes)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, csvContent, 'utf-8');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateMarkdown(result: IndexResult, outputPath: string): void {
  const lines: string[] = [];
  
  lines.push('# Attachment Filename Index\n');
  lines.push(`**Generated:** ${new Date().toISOString()}\n`);
  
  lines.push('## Summary\n');
  lines.push(`- **Total Files:** ${result.summary.totalFiles}`);
  lines.push(`- **Files with Dates:** ${result.summary.filesWithDates}`);
  lines.push(`- **Files with Matched Subjects:** ${result.summary.filesWithSubjects}\n`);
  
  lines.push('## Counts by Entity\n');
  const sortedEntities = Object.entries(result.summary.byEntity)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [entity, count] of sortedEntities) {
    lines.push(`- **${entity}:** ${count}`);
  }
  lines.push('');
  
  lines.push('## File Index\n');
  
  for (const entry of result.entries) {
    lines.push(`### ${entry.filename}\n`);
    lines.push(`- **Entities:** ${entry.inferredEntities.join(', ')}`);
    lines.push(`- **Dates:** ${entry.inferredDates.length > 0 ? entry.inferredDates.join(', ') : 'None'}`);
    lines.push(`- **Extension:** ${entry.extension || 'None'}`);
    
    if (entry.path) {
      lines.push(`- **Path:** ${entry.path}`);
    }
    
    if (entry.matchedSubjects.length > 0) {
      lines.push(`- **Matched Subjects:**`);
      for (const subject of entry.matchedSubjects) {
        lines.push(`  - ${subject}`);
      }
    }
    
    if (entry.notes) {
      lines.push(`- **Notes:** ${entry.notes}`);
    }
    
    lines.push('');
  }
  
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

export function buildIndexResult(entries: FileIndexEntry[]): IndexResult {
  const byEntity: Record<EntityTag, number> = {
    'plimmer': 0,
    'charisse': 0,
    'tax-emigration': 0,
    'sars': 0,
    'cipc': 0,
    'share-sale': 0,
    'xero': 0,
    'loyverse': 0,
    'budget': 0,
    'monarch': 0,
    'aisd': 0,
    'wesbank': 0,
    'fnb': 0,
    'standard-bank': 0,
    'eskom': 0,
    'municipal': 0,
    'nightsbridge': 0,
    'perfect-water': 0,
    'heavy-metal': 0,
    'hospitality': 0,
    'unknown': 0
  };
  
  let filesWithDates = 0;
  let filesWithSubjects = 0;
  
  for (const entry of entries) {
    for (const entity of entry.inferredEntities) {
      byEntity[entity as EntityTag]++;
    }
    
    if (entry.inferredDates.length > 0) {
      filesWithDates++;
    }
    
    if (entry.matchedSubjects.length > 0) {
      filesWithSubjects++;
    }
  }
  
  return {
    entries,
    summary: {
      totalFiles: entries.length,
      byEntity,
      filesWithDates,
      filesWithSubjects
    }
  };
}
