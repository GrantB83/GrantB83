import type { ToolDirectory, IndexEntry, SectionHeading, CheckResult } from './types.js';

/**
 * Run integrity checks on catalog
 */
export function runChecks(
  toolsOnDisk: ToolDirectory[],
  indexEntries: IndexEntry[],
  sectionHeadings: SectionHeading[]
): CheckResult {
  const diskNames = toolsOnDisk.map(t => t.name);
  const indexSlugs = indexEntries.map(e => e.slug);
  const sectionNames = sectionHeadings.map(s => s.name);
  
  // Check 1: Tools on disk but not in index
  const onDiskNotInIndex = diskNames.filter(name => !indexSlugs.includes(name));
  
  // Check 2: Tools in index but not on disk
  const inIndexNotOnDisk = indexSlugs.filter(slug => !diskNames.includes(slug));
  
  // Check 3: Duplicate section headings
  const sectionCounts = new Map<string, number[]>();
  for (const section of sectionHeadings) {
    const existing = sectionCounts.get(section.name) || [];
    existing.push(section.lineNumber);
    sectionCounts.set(section.name, existing);
  }
  
  const duplicateSections = Array.from(sectionCounts.entries())
    .filter(([_, lines]) => lines.length > 1)
    .map(([name, lines]) => ({ name, count: lines.length, lines }));
  
  // Check 4: Duplicate index entries
  const indexCounts = new Map<string, number[]>();
  for (const entry of indexEntries) {
    const existing = indexCounts.get(entry.slug) || [];
    existing.push(entry.lineNumber);
    indexCounts.set(entry.slug, existing);
  }
  
  const indexDuplicates = Array.from(indexCounts.entries())
    .filter(([_, lines]) => lines.length > 1)
    .map(([slug, lines]) => ({ slug, count: lines.length, lines }));
  
  const healthy = 
    onDiskNotInIndex.length === 0 &&
    inIndexNotOnDisk.length === 0 &&
    duplicateSections.length === 0 &&
    indexDuplicates.length === 0;
  
  return {
    healthy,
    onDiskNotInIndex,
    inIndexNotOnDisk,
    duplicateSections,
    indexDuplicates,
    toolsOnDisk: diskNames,
    toolsInIndex: indexSlugs,
    sectionsFound: sectionHeadings.map(s => ({ name: s.name, line: s.lineNumber })),
  };
}
