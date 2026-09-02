import { LoyverseRecord, XeroRecord, GapRecord, ReconResult } from './types.js';

export function reconcile(
  loyverseRecords: LoyverseRecord[],
  xeroRecords: XeroRecord[]
): ReconResult {
  const gaps: GapRecord[] = [];
  const matchedLoyverse = new Set<number>();
  const matchedXero = new Set<number>();

  for (let i = 0; i < loyverseRecords.length; i++) {
    const loyRecord = loyverseRecords[i];
    
    for (let j = 0; j < xeroRecords.length; j++) {
      if (matchedXero.has(j)) continue;
      
      const xeroRecord = xeroRecords[j];
      
      if (isMatch(loyRecord, xeroRecord)) {
        matchedLoyverse.add(i);
        matchedXero.add(j);
        
        if (loyRecord.date !== xeroRecord.date) {
          gaps.push({
            type: 'date_mismatch',
            loyverseRecord: loyRecord,
            xeroRecord: xeroRecord,
            issue: `Date mismatch: Loyverse ${loyRecord.date} vs Xero ${xeroRecord.date}`
          });
        }
        
        if (Math.abs(loyRecord.totalAmount - xeroRecord.amount) > 0.01) {
          gaps.push({
            type: 'amount_mismatch',
            loyverseRecord: loyRecord,
            xeroRecord: xeroRecord,
            issue: `Amount mismatch: Loyverse ${loyRecord.totalAmount} vs Xero ${xeroRecord.amount}`
          });
        }
        
        break;
      }
    }
  }

  for (let i = 0; i < loyverseRecords.length; i++) {
    if (!matchedLoyverse.has(i)) {
      gaps.push({
        type: 'unmatched_loyverse',
        loyverseRecord: loyverseRecords[i],
        issue: `Loyverse receipt ${loyverseRecords[i].receiptNumber} not found in Xero`
      });
    }
  }

  for (let i = 0; i < xeroRecords.length; i++) {
    if (!matchedXero.has(i)) {
      gaps.push({
        type: 'unmatched_xero',
        xeroRecord: xeroRecords[i],
        issue: `Xero reference ${xeroRecords[i].reference} not found in Loyverse`
      });
    }
  }

  const duplicateLoyverse = findDuplicates(loyverseRecords);
  for (const dup of duplicateLoyverse) {
    gaps.push({
      type: 'duplicate',
      loyverseRecord: dup,
      issue: `Duplicate Loyverse receipt: ${dup.receiptNumber}`
    });
  }

  const duplicateXero = findDuplicates(xeroRecords);
  for (const dup of duplicateXero) {
    gaps.push({
      type: 'duplicate',
      xeroRecord: dup,
      issue: `Duplicate Xero reference: ${dup.reference}`
    });
  }

  return {
    gaps,
    matchedCount: matchedLoyverse.size,
    loyverseTotal: loyverseRecords.reduce((sum, r) => sum + r.totalAmount, 0),
    xeroTotal: xeroRecords.reduce((sum, r) => sum + r.amount, 0),
    loyverseRecordCount: loyverseRecords.length,
    xeroRecordCount: xeroRecords.length
  };
}

function isMatch(loyRecord: LoyverseRecord, xeroRecord: XeroRecord): boolean {
  const receiptMatch = xeroRecord.reference.includes(loyRecord.receiptNumber) ||
                       xeroRecord.description.includes(loyRecord.receiptNumber);
  
  const amountMatch = Math.abs(loyRecord.totalAmount - xeroRecord.amount) < 0.01;
  
  const dateClose = Math.abs(
    new Date(loyRecord.date).getTime() - new Date(xeroRecord.date).getTime()
  ) < 7 * 24 * 60 * 60 * 1000;

  return receiptMatch && amountMatch && dateClose;
}

function findDuplicates<T extends { receiptNumber?: string; reference?: string }>(
  records: T[]
): T[] {
  const seen = new Map<string, number>();
  const duplicates: T[] = [];

  for (const record of records) {
    const key = 'receiptNumber' in record 
      ? record.receiptNumber 
      : record.reference;
    
    if (!key) continue;

    const count = seen.get(key) || 0;
    seen.set(key, count + 1);

    if (count > 0) {
      duplicates.push(record);
    }
  }

  return duplicates;
}
