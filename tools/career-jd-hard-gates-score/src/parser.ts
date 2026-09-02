/**
 * Career JD Hard Gates Score - JD Parser
 * Extracts structured data from job description text
 */

import { ParsedJD } from './types.js';

/**
 * Parse job description text into structured data
 */
export function parseJD(jdText: string, companyOverride?: string, titleOverride?: string): ParsedJD {
  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
  const lowerText = jdText.toLowerCase();
  
  // Extract company
  let company = companyOverride || extractCompany(jdText, lines);
  
  // Extract title
  let title = titleOverride || extractTitle(jdText, lines);
  
  // Extract location
  const location = extractLocation(jdText);
  
  // Extract compensation
  const compensation = extractCompensation(jdText);
  
  // Detect Tesla
  const isTesla = /\btesla\b/i.test(jdText);
  
  // Detect remote/WFH
  const isRemote = /\b(remote|work from home|wfh|distributed)\b/i.test(jdText);
  const isWFH = isRemote;
  
  // Extract keywords
  const seniorityKeywords = extractSeniorityKeywords(lowerText);
  const functionKeywords = extractFunctionKeywords(lowerText);
  const titleKeywords = extractTitleKeywords(title || jdText);
  const proofKeywords = extractProofKeywords(lowerText);
  
  return {
    company,
    title,
    location,
    compensation,
    description: jdText,
    isTesla,
    isRemote,
    isWFH,
    seniorityKeywords,
    functionKeywords,
    titleKeywords,
    proofKeywords,
  };
}

/**
 * Extract company name from JD
 */
function extractCompany(text: string, lines: string[]): string | null {
  // Look for "Company: X" or "Employer: X"
  const companyMatch = text.match(/(?:company|employer|organization):\s*([^\n]+)/i);
  if (companyMatch) {
    return companyMatch[1].trim();
  }
  
  // Look for first capitalized line (might be company name)
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && line.length < 50 && /^[A-Z]/.test(line)) {
      return line;
    }
  }
  
  return null;
}

/**
 * Extract job title from JD
 */
function extractTitle(text: string, lines: string[]): string | null {
  // Look for "Title: X" or "Position: X"
  const titleMatch = text.match(/(?:title|position|role):\s*([^\n]+)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Look for lines with job-related keywords
  const jobKeywords = /\b(manager|director|head|lead|senior|principal|vp|vice president|operations|product|strategy)\b/i;
  for (const line of lines.slice(0, 10)) {
    if (jobKeywords.test(line) && line.length < 100) {
      return line;
    }
  }
  
  return null;
}

/**
 * Extract location from JD
 */
function extractLocation(text: string): string | null {
  // Look for "Location: X"
  const locMatch = text.match(/location:\s*([^\n]+)/i);
  if (locMatch) {
    return locMatch[1].trim();
  }
  
  // Look for Austin mentions
  if (/\baustin\b/i.test(text)) {
    const austinMatch = text.match(/\baustin[,\s]+(?:tx|texas)\b/i);
    if (austinMatch) {
      return austinMatch[0];
    }
    return 'Austin';
  }
  
  return null;
}

/**
 * Extract compensation information
 */
function extractCompensation(text: string): string | null {
  // Look for salary patterns: $XXX,XXX or $XXXk
  const salaryPattern = /\$\s*\d{2,3}[,\s]*\d{3}(?:\s*-\s*\$?\s*\d{2,3}[,\s]*\d{3})?|\$\s*\d{2,3}k(?:\s*-\s*\$?\s*\d{2,3}k)?/gi;
  const matches = text.match(salaryPattern);
  
  if (matches && matches.length > 0) {
    return matches.join(', ');
  }
  
  // Look for "Compensation:" or "Salary:" lines
  const compMatch = text.match(/(?:compensation|salary|pay):\s*([^\n]+)/i);
  if (compMatch) {
    return compMatch[1].trim();
  }
  
  return null;
}

/**
 * Extract seniority keywords
 */
function extractSeniorityKeywords(lowerText: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    'senior manager',
    'director',
    'head of',
    'vice president',
    'vp',
    'plant manager',
    'operations manager',
    'lead',
    'principal',
  ];
  
  for (const pattern of patterns) {
    if (lowerText.includes(pattern)) {
      keywords.push(pattern);
    }
  }
  
  return keywords;
}

/**
 * Extract function keywords
 */
function extractFunctionKeywords(lowerText: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    'operations',
    'product',
    'strategy',
    'finance',
    'production',
    'manufacturing',
    'supply chain',
    'logistics',
  ];
  
  for (const pattern of patterns) {
    if (lowerText.includes(pattern)) {
      keywords.push(pattern);
    }
  }
  
  return keywords;
}

/**
 * Extract title match keywords
 */
function extractTitleKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  const patterns = [
    'operations',
    'product',
    'strategy',
    'director',
    'manager',
    'head',
    'lead',
  ];
  
  for (const pattern of patterns) {
    if (lowerText.includes(pattern)) {
      keywords.push(pattern);
    }
  }
  
  return keywords;
}

/**
 * Extract proof point keywords (things that might match resume)
 */
function extractProofKeywords(lowerText: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    'p&l',
    'profit and loss',
    'budget',
    'team',
    'cross-functional',
    'stakeholder',
    'process improvement',
    'operational excellence',
    'kpi',
    'metrics',
    'scale',
    'growth',
    'turnaround',
  ];
  
  for (const pattern of patterns) {
    if (lowerText.includes(pattern)) {
      keywords.push(pattern);
    }
  }
  
  return keywords;
}
