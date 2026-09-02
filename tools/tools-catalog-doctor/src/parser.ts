import { readFile } from 'fs/promises';
import type { IndexEntry, SectionHeading } from './types.js';

/**
 * Parse README.md to extract index table tool slugs and section headings
 */
export async function parseReadme(catalogPath: string): Promise<{
  indexEntries: IndexEntry[];
  sectionHeadings: SectionHeading[];
}> {
  const content = await readFile(catalogPath, 'utf-8');
  const lines = content.split('\n');
  
  const indexEntries: IndexEntry[] = [];
  const sectionHeadings: SectionHeading[] = [];
  
  let inIndexTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Detect index table start
    if (line.includes('| Tool | Purpose |') || line.includes('|------|---------|')) {
      inIndexTable = true;
      continue;
    }
    
    // Detect index table end (empty line or start of next section)
    if (inIndexTable && (line.trim() === '' || line.startsWith('#'))) {
      inIndexTable = false;
    }
    
    // Parse index table entries
    if (inIndexTable && line.trim().startsWith('|') && !line.includes('---')) {
      const match = line.match(/\|\s*\[([^\]]+)\]/);
      if (match) {
        const slug = match[1];
        indexEntries.push({ slug, lineNumber });
      }
    }
    
    // Parse section headings (## tool-name-style headings)
    const sectionMatch = line.match(/^##\s+([a-z0-9-]+)\s*$/);
    if (sectionMatch) {
      const name = sectionMatch[1];
      sectionHeadings.push({ name, lineNumber });
    }
  }
  
  return { indexEntries, sectionHeadings };
}
