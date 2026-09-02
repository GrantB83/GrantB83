import { writeFileSync } from 'fs';
import { join } from 'path';
import { FileDigest, DigestReport } from './types.js';

export function generateReports(
  digests: FileDigest[],
  report: DigestReport,
  outdir: string
): void {
  // Generate DIGEST.md
  const digestMd = generateDigestMarkdown(digests);
  writeFileSync(join(outdir, 'DIGEST.md'), digestMd);

  // Generate reasons.json
  const reasonsJson = generateReasonsJson(digests);
  writeFileSync(join(outdir, 'reasons.json'), JSON.stringify(reasonsJson, null, 2));

  // Generate missing-headers.md
  const missingHeadersMd = generateMissingHeadersMarkdown(digests);
  writeFileSync(join(outdir, 'missing-headers.md'), missingHeadersMd);

  // Generate APPROVAL.md
  const approvalMd = generateApprovalMarkdown();
  writeFileSync(join(outdir, 'APPROVAL.md'), approvalMd);

  // Generate manifest.json
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(report, null, 2));
}

function generateDigestMarkdown(digests: FileDigest[]): string {
  let md = '# Rejected CSV Digest\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += '**Purpose:** Human review pack for rejected CSV rows WITHOUT pasting quantities/amounts into prose.\n\n';
  md += '---\n\n';

  md += `## Summary\n\n`;
  md += `Total files processed: ${digests.length}\n\n`;

  digests.forEach((digest, index) => {
    md += `### ${index + 1}. ${digest.label}\n\n`;
    md += `**Filename:** \`${digest.filename}\`\n\n`;
    md += `**Total rows:** ${digest.totalRows}\n\n`;

    if (digest.missingHeaders.length > 0) {
      md += `**⚠️ Missing expected headers:** ${digest.missingHeaders.join(', ')}\n\n`;
    }

    md += `**Rejection reason buckets:**\n\n`;
    if (digest.reasonBuckets.length === 0) {
      md += `- No rows (empty file)\n\n`;
    } else {
      digest.reasonBuckets.forEach(bucket => {
        md += `- **${bucket.reason}**: ${bucket.count} row(s)\n`;
      });
      md += '\n';
    }

    md += `**⚠️ Amounts/quantities:** See file \`${digest.filename}\` for actual values. Do not paste into prose.\n\n`;
    md += '---\n\n';
  });

  return md;
}

function generateReasonsJson(digests: FileDigest[]): Record<string, any> {
  const reasons: Record<string, any> = {};

  digests.forEach(digest => {
    reasons[digest.label] = {
      filename: digest.filename,
      totalRows: digest.totalRows,
      buckets: digest.reasonBuckets.map(b => ({
        reason: b.reason,
        count: b.count,
        sampleIndices: b.sampleIndices,
      })),
    };
  });

  return reasons;
}

function generateMissingHeadersMarkdown(digests: FileDigest[]): string {
  let md = '# Missing Headers Report\n\n';
  md += '**Files with unexpected or empty headers:**\n\n';

  const filesWithIssues = digests.filter(d => d.missingHeaders.length > 0);

  if (filesWithIssues.length === 0) {
    md += 'No issues found. All files have expected headers.\n';
  } else {
    filesWithIssues.forEach(digest => {
      md += `## ${digest.label}\n\n`;
      md += `**Filename:** \`${digest.filename}\`\n\n`;
      md += `**Missing headers:**\n\n`;
      digest.missingHeaders.forEach(h => {
        md += `- ${h}\n`;
      });
      md += '\n';
    });
  }

  return md;
}

function generateApprovalMarkdown(): string {
  return `# APPROVAL Checklist

**Perfect Water / CoS owns inventory/recon decisions.**

## Safety Rules

- ✅ **Amounts stay in files** - Never paste monetary amounts or quantity values into markdown/chat/prose
- ✅ **Offline only** - No Loyverse/Xero write-back
- ✅ **Read-only** - This tool does not modify source CSVs
- ✅ **No invented amounts** - All data is pass-through from rejected CSVs

## Review Checklist

Before acting on rejected rows:

1. [ ] Review \`DIGEST.md\` for rejection reason counts
2. [ ] Open each \`rejected.csv\` file to see actual amounts/quantities
3. [ ] Verify rejection reasons match expectations
4. [ ] Check \`missing-headers.md\` for structural issues
5. [ ] Confirm no quantities were pasted into \`DIGEST.md\` prose
6. [ ] Perfect Water / CoS approves any corrective action

## Human Approval Required

- **H2** - Before any Google Sheet writes
- **H3** - Before any Drive file moves outside \`_Inbox\`
- **Offline only** - This tool generates drafts; no auto-uploads

## Next Steps

1. Review rejected rows in source files
2. Correct data quality issues at source
3. Re-run normalization tools (pw-grv-csv-normalize, pw-stocktake-csv-normalize, etc.)
4. Archive this digest in Perfect Water Drive:
   \`30_PerfectWater/RejectedReviews/YYYY-MM/YYYY-MM-DD__digest/\`
`;
}
