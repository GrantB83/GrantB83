/**
 * Tests for output generation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { buildIndexResult, generateIndexJSON, generateIndexMarkdown, generateDupesMarkdown, generateAlreadyKnownMarkdown, generateNewMarkdown } from './output-generator.js';
import { InvoiceEntry } from './types.js';

test('buildIndexResult - identifies duplicates in batch', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN236058', filename: 'invoice1-copy.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const result = buildIndexResult(entries);
  
  assert.strictEqual(result.entries.length, 3);
  assert.strictEqual(result.uniqueDocNos, 2);
  assert.strictEqual(result.duplicatesInBatch.size, 1);
  assert.ok(result.duplicatesInBatch.has('IN236058'));
  assert.strictEqual(result.duplicatesInBatch.get('IN236058')!.length, 2);
});

test('buildIndexResult - categorizes known vs new Doc Nos', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' },
    { docNo: 'IN999999', filename: 'invoice3.pdf' }
  ];
  
  const knownDocNos = new Set(['IN236058', 'IN123456']);
  
  const result = buildIndexResult(entries, knownDocNos);
  
  assert.strictEqual(result.alreadyKnown.size, 2);
  assert.ok(result.alreadyKnown.has('IN236058'));
  assert.ok(result.alreadyKnown.has('IN123456'));
  
  assert.strictEqual(result.newDocNos.size, 1);
  assert.ok(result.newDocNos.has('IN999999'));
});

test('generateIndexJSON - creates Doc No to filenames mapping', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN236058', filename: 'invoice1-copy.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const result = buildIndexResult(entries);
  const json = generateIndexJSON(result);
  const parsed = JSON.parse(json);
  
  assert.deepStrictEqual(parsed['IN236058'], ['invoice1.pdf', 'invoice1-copy.pdf']);
  assert.deepStrictEqual(parsed['IN123456'], ['invoice2.pdf']);
});

test('generateIndexMarkdown - includes summary and index', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const result = buildIndexResult(entries);
  const markdown = generateIndexMarkdown(result);
  
  assert.ok(markdown.includes('# Perfect Water / CoS Invoice Doc No Index'));
  assert.ok(markdown.includes('**Total Files:** 2'));
  assert.ok(markdown.includes('**Unique Doc Nos:** 2'));
  assert.ok(markdown.includes('### IN236058'));
  assert.ok(markdown.includes('### IN123456'));
  assert.ok(markdown.includes('- `invoice1.pdf`'));
  assert.ok(markdown.includes('- `invoice2.pdf`'));
});

test('generateDupesMarkdown - returns null when no duplicates', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const result = buildIndexResult(entries);
  const markdown = generateDupesMarkdown(result);
  
  assert.strictEqual(markdown, null);
});

test('generateDupesMarkdown - lists duplicates with warning', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN236058', filename: 'invoice1-copy.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const result = buildIndexResult(entries);
  const markdown = generateDupesMarkdown(result);
  
  assert.ok(markdown);
  assert.ok(markdown.includes('# Duplicates in Batch'));
  assert.ok(markdown.includes('⚠️ **Warning:**'));
  assert.ok(markdown.includes('## IN236058 (2 files)'));
  assert.ok(markdown.includes('- `invoice1.pdf`'));
  assert.ok(markdown.includes('- `invoice1-copy.pdf`'));
  assert.ok(!markdown.includes('IN123456'));
});

test('generateAlreadyKnownMarkdown - returns null when no known index provided', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' }
  ];
  
  const result = buildIndexResult(entries);
  const markdown = generateAlreadyKnownMarkdown(result);
  
  assert.strictEqual(markdown, null);
});

test('generateAlreadyKnownMarkdown - lists already known Doc Nos', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const knownDocNos = new Set(['IN236058']);
  const result = buildIndexResult(entries, knownDocNos);
  const markdown = generateAlreadyKnownMarkdown(result);
  
  assert.ok(markdown);
  assert.ok(markdown.includes('# Already Known Doc Nos'));
  assert.ok(markdown.includes('ℹ️ These Doc Nos were found in the known index'));
  assert.ok(markdown.includes('## IN236058'));
  assert.ok(markdown.includes('- `invoice1.pdf`'));
  assert.ok(!markdown.includes('IN123456'));
});

test('generateNewMarkdown - returns null when no new Doc Nos', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' }
  ];
  
  const knownDocNos = new Set(['IN236058']);
  const result = buildIndexResult(entries, knownDocNos);
  const markdown = generateNewMarkdown(result);
  
  assert.strictEqual(markdown, null);
});

test('generateNewMarkdown - lists new Doc Nos', () => {
  const entries: InvoiceEntry[] = [
    { docNo: 'IN236058', filename: 'invoice1.pdf' },
    { docNo: 'IN123456', filename: 'invoice2.pdf' }
  ];
  
  const knownDocNos = new Set(['IN236058']);
  const result = buildIndexResult(entries, knownDocNos);
  const markdown = generateNewMarkdown(result);
  
  assert.ok(markdown);
  assert.ok(markdown.includes('# New Doc Nos'));
  assert.ok(markdown.includes('✅ These Doc Nos are new'));
  assert.ok(markdown.includes('## IN123456'));
  assert.ok(markdown.includes('- `invoice2.pdf`'));
  assert.ok(!markdown.includes('IN236058'));
});
