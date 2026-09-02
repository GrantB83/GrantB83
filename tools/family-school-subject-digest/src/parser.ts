/**
 * Parser for email subject input
 */

import { ParsedItem } from './types.js';
import { classifySubject, extractDueDate, hasActionVerb } from './classifier.js';

/**
 * Parse input file into structured items
 * Supports multiple formats:
 * - One subject per line
 * - "SUBJECT | snippet"
 * - Markdown bullet list
 */
export function parseInput(content: string): ParsedItem[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const items: ParsedItem[] = [];
  let itemNumber = 1;
  
  for (const line of lines) {
    // Skip markdown headers
    if (line.startsWith('#')) {
      continue;
    }
    
    // Remove bullet markers
    let cleanLine = line;
    if (cleanLine.match(/^[-*+]\s+/)) {
      cleanLine = cleanLine.replace(/^[-*+]\s+/, '');
    }
    
    // Parse subject and optional snippet
    let subject: string;
    let snippet: string | undefined;
    
    if (cleanLine.includes(' | ')) {
      const parts = cleanLine.split(' | ');
      subject = parts[0].trim();
      snippet = parts[1]?.trim();
    } else {
      subject = cleanLine;
    }
    
    // Skip empty subjects
    if (!subject) {
      continue;
    }
    
    // Classify and extract metadata
    const tag = classifySubject(subject);
    const fullText = snippet ? `${subject} ${snippet}` : subject;
    const dueDate = extractDueDate(fullText);
    
    // Build notes if we found metadata
    const notes: string[] = [];
    if (dueDate) {
      notes.push(`Due: ${dueDate}`);
    }
    if (!hasActionVerb(subject)) {
      notes.push('No clear action verb');
    }
    
    items.push({
      n: itemNumber++,
      tag,
      subject,
      snippet,
      dueDate,
      notes: notes.length > 0 ? notes.join('; ') : undefined,
    });
  }
  
  return items;
}
