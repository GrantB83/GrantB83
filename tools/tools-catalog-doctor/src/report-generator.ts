import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { CheckResult } from './types.js';

/**
 * Generate JSON and Markdown reports
 */
export async function generateReports(
  result: CheckResult,
  outdir: string
): Promise<{ json: string; markdown: string }> {
  await mkdir(outdir, { recursive: true });
  
  const jsonPath = join(outdir, 'report.json');
  const mdPath = join(outdir, 'report.md');
  
  // Write JSON report
  await writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
  
  // Generate Markdown report
  const md = generateMarkdownReport(result);
  await writeFile(mdPath, md, 'utf-8');
  
  return { json: jsonPath, markdown: mdPath };
}

function generateMarkdownReport(result: CheckResult): string {
  const lines: string[] = [];
  
  lines.push('# Tools Catalog Health Report\n');
  lines.push(`**Status:** ${result.healthy ? '✅ HEALTHY' : '❌ ISSUES FOUND'}\n`);
  lines.push('---\n');
  
  lines.push('## Summary\n');
  lines.push(`- Tools on disk: ${result.toolsOnDisk.length}`);
  lines.push(`- Tools in index: ${result.toolsInIndex.length}`);
  lines.push(`- Section headings: ${result.sectionsFound.length}\n`);
  
  if (result.onDiskNotInIndex.length > 0) {
    lines.push('## ⚠️ Tools on Disk but NOT in Index\n');
    for (const tool of result.onDiskNotInIndex) {
      lines.push(`- \`${tool}\``);
    }
    lines.push('');
  }
  
  if (result.inIndexNotOnDisk.length > 0) {
    lines.push('## ⚠️ Tools in Index but NOT on Disk\n');
    for (const tool of result.inIndexNotOnDisk) {
      lines.push(`- \`${tool}\``);
    }
    lines.push('');
  }
  
  if (result.duplicateSections.length > 0) {
    lines.push('## ⚠️ Duplicate Section Headings\n');
    for (const dup of result.duplicateSections) {
      lines.push(`- \`## ${dup.name}\` appears ${dup.count} times (lines: ${dup.lines.join(', ')})`);
    }
    lines.push('');
  }
  
  if (result.indexDuplicates.length > 0) {
    lines.push('## ⚠️ Duplicate Index Entries\n');
    for (const dup of result.indexDuplicates) {
      lines.push(`- \`${dup.slug}\` appears ${dup.count} times in index (lines: ${dup.lines.join(', ')})`);
    }
    lines.push('');
  }
  
  if (result.healthy) {
    lines.push('## ✅ All Checks Passed\n');
    lines.push('The catalog is healthy:\n');
    lines.push('- All tool directories have index entries');
    lines.push('- All index entries have corresponding directories');
    lines.push('- No duplicate section headings');
    lines.push('- No duplicate index entries');
  }
  
  return lines.join('\n');
}
