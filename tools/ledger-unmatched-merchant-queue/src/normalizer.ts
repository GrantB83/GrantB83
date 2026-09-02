export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUnmatched(
  row: { status?: string },
  unmatchedValues: string[],
  hasStatusColumn: boolean
): { isUnmatched: boolean; reason?: string } {
  if (!hasStatusColumn) {
    return { isUnmatched: true, reason: 'no-status-column' };
  }

  const status = (row.status || '').toLowerCase().trim();

  // Empty status counts as unmatched
  if (status === '') {
    return { isUnmatched: true, reason: 'empty-status' };
  }

  // Check if status is in unmatched values
  const isUnmatchedStatus = unmatchedValues.some(
    val => val.toLowerCase() === status
  );

  return { isUnmatched: isUnmatchedStatus, reason: isUnmatchedStatus ? 'status-match' : undefined };
}
