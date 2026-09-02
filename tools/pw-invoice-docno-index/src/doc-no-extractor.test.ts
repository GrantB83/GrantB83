/**
 * Tests for Doc No extraction
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { extractDocNo, parseKnownIndex } from './doc-no-extractor.js';

test('extractDocNo - extracts uppercase IN pattern', () => {
  assert.strictEqual(extractDocNo('IN236058.pdf'), 'IN236058');
  assert.strictEqual(extractDocNo('Invoice-IN123456.pdf'), 'IN123456');
  assert.strictEqual(extractDocNo('PW_IN999999_final.pdf'), 'IN999999');
});

test('extractDocNo - extracts lowercase in pattern and uppercases it', () => {
  assert.strictEqual(extractDocNo('in236058.pdf'), 'IN236058');
  assert.strictEqual(extractDocNo('invoice-in123456.pdf'), 'IN123456');
});

test('extractDocNo - extracts mixed case pattern', () => {
  assert.strictEqual(extractDocNo('In236058.pdf'), 'IN236058');
  assert.strictEqual(extractDocNo('Invoice-iN123456.pdf'), 'IN123456');
});

test('extractDocNo - handles full paths (uses basename only)', () => {
  assert.strictEqual(extractDocNo('/path/to/IN236058.pdf'), 'IN236058');
  assert.strictEqual(extractDocNo('/vault/invoices/in123456.pdf'), 'IN123456');
  assert.strictEqual(extractDocNo('pdfs/IN999999.pdf'), 'IN999999');
});

test('extractDocNo - returns null when no pattern found', () => {
  assert.strictEqual(extractDocNo('invoice.pdf'), null);
  assert.strictEqual(extractDocNo('statement-2024.pdf'), null);
  assert.strictEqual(extractDocNo('random-file.txt'), null);
  assert.strictEqual(extractDocNo('IN.pdf'), null);
  assert.strictEqual(extractDocNo('INCOMPLETE.pdf'), null);
});

test('extractDocNo - extracts first match when multiple patterns present', () => {
  assert.strictEqual(extractDocNo('IN236058-IN123456.pdf'), 'IN236058');
  assert.strictEqual(extractDocNo('Duplicate-IN111111-IN222222.pdf'), 'IN111111');
});

test('parseKnownIndex - extracts Doc Nos from markdown', () => {
  const markdown = `# Known Invoices
  
## IN236058
- File: invoice1.pdf

## IN123456
- File: invoice2.pdf

## IN999999
- File: invoice3.pdf
`;
  
  const docNos = parseKnownIndex(markdown);
  assert.strictEqual(docNos.size, 3);
  assert.ok(docNos.has('IN236058'));
  assert.ok(docNos.has('IN123456'));
  assert.ok(docNos.has('IN999999'));
});

test('parseKnownIndex - extracts Doc Nos from CSV', () => {
  const csv = `DocNo,Filename
IN236058,invoice1.pdf
IN123456,invoice2.pdf
in999999,invoice3.pdf
`;
  
  const docNos = parseKnownIndex(csv);
  assert.strictEqual(docNos.size, 3);
  assert.ok(docNos.has('IN236058'));
  assert.ok(docNos.has('IN123456'));
  assert.ok(docNos.has('IN999999'));
});

test('parseKnownIndex - handles mixed case in known index', () => {
  const content = `in236058, In123456, IN999999`;
  
  const docNos = parseKnownIndex(content);
  assert.strictEqual(docNos.size, 3);
  assert.ok(docNos.has('IN236058'));
  assert.ok(docNos.has('IN123456'));
  assert.ok(docNos.has('IN999999'));
});

test('parseKnownIndex - returns empty set when no patterns found', () => {
  const content = `No invoice numbers here
Just some random text
Nothing to see`;
  
  const docNos = parseKnownIndex(content);
  assert.strictEqual(docNos.size, 0);
});

test('parseKnownIndex - handles duplicate Doc Nos in known index', () => {
  const content = `IN236058
IN236058
IN123456
in236058
`;
  
  const docNos = parseKnownIndex(content);
  assert.strictEqual(docNos.size, 2); // Deduplicates
  assert.ok(docNos.has('IN236058'));
  assert.ok(docNos.has('IN123456'));
});
