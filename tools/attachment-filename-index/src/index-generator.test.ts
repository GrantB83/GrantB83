import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildIndexResult } from './index-generator.js';
import { FileIndexEntry } from './types.js';

test('buildIndexResult - counts entities correctly', () => {
  const entries: FileIndexEntry[] = [
    {
      filename: 'sars-notice.pdf',
      inferredEntities: ['sars'],
      inferredDates: ['2024-01-15'],
      extension: '.pdf',
      matchedSubjects: [],
      notes: ''
    },
    {
      filename: 'sars-return.pdf',
      inferredEntities: ['sars'],
      inferredDates: [],
      extension: '.pdf',
      matchedSubjects: [],
      notes: ''
    },
    {
      filename: 'plimmer-invoice.pdf',
      inferredEntities: ['plimmer'],
      inferredDates: ['2024-03-20'],
      extension: '.pdf',
      matchedSubjects: ['Invoice from Plimmer'],
      notes: ''
    }
  ];
  
  const result = buildIndexResult(entries);
  
  assert.equal(result.summary.totalFiles, 3);
  assert.equal(result.summary.byEntity['sars'], 2);
  assert.equal(result.summary.byEntity['plimmer'], 1);
  assert.equal(result.summary.filesWithDates, 2);
  assert.equal(result.summary.filesWithSubjects, 1);
});

test('buildIndexResult - handles unknown entities', () => {
  const entries: FileIndexEntry[] = [
    {
      filename: 'random-file.txt',
      inferredEntities: ['unknown'],
      inferredDates: [],
      extension: '.txt',
      matchedSubjects: [],
      notes: 'No entity keywords detected'
    }
  ];
  
  const result = buildIndexResult(entries);
  
  assert.equal(result.summary.totalFiles, 1);
  assert.equal(result.summary.byEntity['unknown'], 1);
  assert.equal(result.summary.filesWithDates, 0);
});

test('buildIndexResult - handles multiple entities per file', () => {
  const entries: FileIndexEntry[] = [
    {
      filename: 'perfect-water-xero-export.csv',
      inferredEntities: ['perfect-water', 'xero'],
      inferredDates: [],
      extension: '.csv',
      matchedSubjects: [],
      notes: ''
    }
  ];
  
  const result = buildIndexResult(entries);
  
  assert.equal(result.summary.totalFiles, 1);
  assert.equal(result.summary.byEntity['perfect-water'], 1);
  assert.equal(result.summary.byEntity['xero'], 1);
});
