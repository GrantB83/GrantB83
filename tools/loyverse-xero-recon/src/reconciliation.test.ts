import { test } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { reconcile } from './reconciliation.js';
import type { LoyverseRecord, XeroRecord } from './types.js';

test('reconcile - perfect match', () => {
  const loyverseRecords: LoyverseRecord[] = [
    {
      date: '2024-01-15',
      receiptNumber: 'RCP-001',
      totalAmount: 100.00,
      paymentType: 'Card',
      rawLine: '2024-01-15,RCP-001,100.00,Card'
    }
  ];

  const xeroRecords: XeroRecord[] = [
    {
      date: '2024-01-15',
      reference: 'RCP-001',
      amount: 100.00,
      description: 'Card Payment',
      rawLine: '2024-01-15,RCP-001,100.00,Card Payment'
    }
  ];

  const result = reconcile(loyverseRecords, xeroRecords);

  strictEqual(result.matchedCount, 1, 'Should match 1 record');
  strictEqual(result.gaps.length, 0, 'Should have 0 gaps');
  strictEqual(result.loyverseRecordCount, 1);
  strictEqual(result.xeroRecordCount, 1);
});

test('reconcile - unmatched loyverse record', () => {
  const loyverseRecords: LoyverseRecord[] = [
    {
      date: '2024-01-15',
      receiptNumber: 'RCP-001',
      totalAmount: 100.00,
      paymentType: 'Card',
      rawLine: '2024-01-15,RCP-001,100.00,Card'
    },
    {
      date: '2024-01-16',
      receiptNumber: 'RCP-002',
      totalAmount: 50.00,
      paymentType: 'Cash',
      rawLine: '2024-01-16,RCP-002,50.00,Cash'
    }
  ];

  const xeroRecords: XeroRecord[] = [
    {
      date: '2024-01-15',
      reference: 'RCP-001',
      amount: 100.00,
      description: 'Card Payment',
      rawLine: '2024-01-15,RCP-001,100.00,Card Payment'
    }
  ];

  const result = reconcile(loyverseRecords, xeroRecords);

  strictEqual(result.matchedCount, 1, 'Should match 1 record');
  strictEqual(result.gaps.length, 1, 'Should have 1 gap');
  strictEqual(result.gaps[0].type, 'unmatched_loyverse');
  ok(result.gaps[0].issue.includes('RCP-002'), 'Gap should reference RCP-002');
});

test('reconcile - unmatched xero record', () => {
  const loyverseRecords: LoyverseRecord[] = [
    {
      date: '2024-01-15',
      receiptNumber: 'RCP-001',
      totalAmount: 100.00,
      paymentType: 'Card',
      rawLine: '2024-01-15,RCP-001,100.00,Card'
    }
  ];

  const xeroRecords: XeroRecord[] = [
    {
      date: '2024-01-15',
      reference: 'RCP-001',
      amount: 100.00,
      description: 'Card Payment',
      rawLine: '2024-01-15,RCP-001,100.00,Card Payment'
    },
    {
      date: '2024-01-16',
      reference: 'RCP-999',
      amount: 200.00,
      description: 'Unknown Payment',
      rawLine: '2024-01-16,RCP-999,200.00,Unknown Payment'
    }
  ];

  const result = reconcile(loyverseRecords, xeroRecords);

  strictEqual(result.matchedCount, 1, 'Should match 1 record');
  strictEqual(result.gaps.length, 1, 'Should have 1 gap');
  strictEqual(result.gaps[0].type, 'unmatched_xero');
  ok(result.gaps[0].issue.includes('RCP-999'), 'Gap should reference RCP-999');
});

test('reconcile - amount mismatch', () => {
  const loyverseRecords: LoyverseRecord[] = [
    {
      date: '2024-01-15',
      receiptNumber: 'RCP-001',
      totalAmount: 100.00,
      paymentType: 'Card',
      rawLine: '2024-01-15,RCP-001,100.00,Card'
    }
  ];

  const xeroRecords: XeroRecord[] = [
    {
      date: '2024-01-15',
      reference: 'RCP-001',
      amount: 95.00,
      description: 'Card Payment',
      rawLine: '2024-01-15,RCP-001,95.00,Card Payment'
    }
  ];

  const result = reconcile(loyverseRecords, xeroRecords);

  strictEqual(result.matchedCount, 0, 'Should not match due to amount difference');
  strictEqual(result.gaps.length, 2, 'Should have 2 gaps (both unmatched)');
});

test('reconcile - multiple records with various gaps', () => {
  const loyverseRecords: LoyverseRecord[] = [
    {
      date: '2024-01-15',
      receiptNumber: 'RCP-001',
      totalAmount: 100.00,
      paymentType: 'Card',
      rawLine: '2024-01-15,RCP-001,100.00,Card'
    },
    {
      date: '2024-01-16',
      receiptNumber: 'RCP-002',
      totalAmount: 50.00,
      paymentType: 'Cash',
      rawLine: '2024-01-16,RCP-002,50.00,Cash'
    }
  ];

  const xeroRecords: XeroRecord[] = [
    {
      date: '2024-01-15',
      reference: 'RCP-001',
      amount: 100.00,
      description: 'Card Payment',
      rawLine: '2024-01-15,RCP-001,100.00,Card Payment'
    },
    {
      date: '2024-01-17',
      reference: 'RCP-003',
      amount: 75.00,
      description: 'Cash Payment',
      rawLine: '2024-01-17,RCP-003,75.00,Cash Payment'
    }
  ];

  const result = reconcile(loyverseRecords, xeroRecords);

  strictEqual(result.matchedCount, 1, 'Should match 1 record');
  strictEqual(result.gaps.length, 2, 'Should have 2 gaps');
  
  const unmatchedLoy = result.gaps.filter(g => g.type === 'unmatched_loyverse');
  const unmatchedXero = result.gaps.filter(g => g.type === 'unmatched_xero');
  
  strictEqual(unmatchedLoy.length, 1, 'Should have 1 unmatched Loyverse');
  strictEqual(unmatchedXero.length, 1, 'Should have 1 unmatched Xero');
});
