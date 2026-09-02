import { FileIndexEntry, MailSubject } from './types.js';

export function matchSubjects(entries: FileIndexEntry[], subjects: MailSubject[]): FileIndexEntry[] {
  return entries.map(entry => {
    const matchedSubjects: string[] = [];
    
    const filenameTokens = tokenize(entry.filename);
    
    for (const subject of subjects) {
      const subjectTokens = tokenize(subject.subject);
      
      if (hasCommonTokens(filenameTokens, subjectTokens, 2)) {
        const subjectLine = subject.date 
          ? `${subject.subject} (${subject.date})`
          : subject.subject;
        matchedSubjects.push(subjectLine);
      }
    }
    
    return {
      ...entry,
      matchedSubjects
    };
  });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
}

function hasCommonTokens(tokens1: string[], tokens2: string[], minCommon: number): boolean {
  const set1 = new Set(tokens1);
  let commonCount = 0;
  
  for (const token of tokens2) {
    if (set1.has(token)) {
      commonCount++;
      if (commonCount >= minCommon) {
        return true;
      }
    }
  }
  
  return false;
}

export function parseSubjectsCSV(csvContent: string): MailSubject[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const subjectIdx = headers.indexOf('subject');
  const dateIdx = headers.indexOf('date');
  
  if (subjectIdx === -1) {
    throw new Error('CSV must have a "Subject" column');
  }
  
  const subjects: MailSubject[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const parts = parseCSVLine(line);
    
    if (parts.length > subjectIdx) {
      const subject: MailSubject = {
        subject: parts[subjectIdx].trim()
      };
      
      if (dateIdx !== -1 && parts.length > dateIdx && parts[dateIdx].trim()) {
        subject.date = parts[dateIdx].trim();
      }
      
      subjects.push(subject);
    }
  }
  
  return subjects;
}

function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  parts.push(current);
  return parts;
}

export function parseSubjectsTXT(txtContent: string): MailSubject[] {
  return txtContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => ({ subject: line }));
}
