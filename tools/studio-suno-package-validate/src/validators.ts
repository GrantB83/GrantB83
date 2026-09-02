import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, SunoMetadata } from './types.js';

/**
 * Check if required files are present
 */
export function checkRequiredFiles(jobDir: string): CheckResult {
  const requiredFiles = [
    'lyrics.cleaned.txt',
    'checklist.md',
    'manifest.json'
  ];
  
  const missingFiles: string[] = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(jobDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    return {
      passed: false,
      message: 'Required files missing',
      details: `Missing: ${missingFiles.join(', ')}`
    };
  }
  
  return {
    passed: true,
    message: 'All required files present'
  };
}

/**
 * Validate metadata JSON shape
 */
export function checkMetaJsonShape(jobDir: string): CheckResult {
  const manifestPath = path.join(jobDir, 'manifest.json');
  
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    
    // Check for metadata field
    if (!manifest.metadata || typeof manifest.metadata !== 'object') {
      return {
        passed: false,
        message: 'Metadata field missing or invalid in manifest.json',
        details: 'manifest.json must contain a "metadata" object field'
      };
    }
    
    const meta = manifest.metadata as SunoMetadata;
    
    // Validate optional fields have correct types when present
    const errors: string[] = [];
    
    if (meta.title !== undefined && typeof meta.title !== 'string') {
      errors.push('title must be a string');
    }
    if (meta.artist !== undefined && typeof meta.artist !== 'string') {
      errors.push('artist must be a string');
    }
    if (meta.kids !== undefined && !Array.isArray(meta.kids)) {
      errors.push('kids must be an array');
    }
    if (meta.style !== undefined && typeof meta.style !== 'string') {
      errors.push('style must be a string');
    }
    if (meta.mood !== undefined && typeof meta.mood !== 'string') {
      errors.push('mood must be a string');
    }
    if (meta.duration_hint !== undefined && typeof meta.duration_hint !== 'string') {
      errors.push('duration_hint must be a string');
    }
    if (meta.negative_prompts !== undefined && !Array.isArray(meta.negative_prompts)) {
      errors.push('negative_prompts must be an array');
    }
    
    if (errors.length > 0) {
      return {
        passed: false,
        message: 'Metadata has invalid field types',
        details: errors.join('; ')
      };
    }
    
    return {
      passed: true,
      message: 'Metadata JSON shape is valid'
    };
    
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to parse or validate manifest.json',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check that lyrics are not empty
 */
export function checkLyricsNotEmpty(jobDir: string): CheckResult {
  const lyricsPath = path.join(jobDir, 'lyrics.cleaned.txt');
  
  try {
    const content = fs.readFileSync(lyricsPath, 'utf-8');
    const trimmed = content.trim();
    
    if (trimmed.length === 0) {
      return {
        passed: false,
        message: 'Lyrics file is empty',
        details: 'lyrics.cleaned.txt contains only whitespace'
      };
    }
    
    return {
      passed: true,
      message: `Lyrics not empty (${trimmed.length} characters)`
    };
    
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to read lyrics file',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check for PII patterns (emails, phone numbers) in lyrics
 */
export function checkNoPiiPatterns(jobDir: string): CheckResult {
  const lyricsPath = path.join(jobDir, 'lyrics.cleaned.txt');
  
  try {
    const content = fs.readFileSync(lyricsPath, 'utf-8');
    
    // Email pattern: basic check for @
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailPattern);
    
    // Phone pattern: common formats
    // Matches: +1-234-567-8900, (234) 567-8900, 234-567-8900, 234.567.8900, 2345678900
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g;
    const phones = content.match(phonePattern);
    
    const violations: string[] = [];
    
    if (emails && emails.length > 0) {
      violations.push(`${emails.length} email pattern(s): ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}`);
    }
    
    if (phones && phones.length > 0) {
      violations.push(`${phones.length} phone pattern(s): ${phones.slice(0, 3).join(', ')}${phones.length > 3 ? '...' : ''}`);
    }
    
    if (violations.length > 0) {
      return {
        passed: false,
        message: 'PII patterns detected in lyrics',
        details: violations.join('; ')
      };
    }
    
    return {
      passed: true,
      message: 'No PII patterns detected'
    };
    
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to scan lyrics for PII',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check that checklist mentions manual paste only
 */
export function checkChecklistManualPaste(jobDir: string): CheckResult {
  const checklistPath = path.join(jobDir, 'checklist.md');
  
  try {
    const content = fs.readFileSync(checklistPath, 'utf-8').toLowerCase();
    
    // Keywords that should be present for manual workflow
    const manualKeywords = ['manual', 'paste', 'chrome', 'browser'];
    const foundKeywords = manualKeywords.filter(kw => content.includes(kw));
    
    // Anti-patterns that should NOT be present
    const automationKeywords = ['automat', 'api', 'script', 'selenium', 'puppeteer'];
    const foundAutomation = automationKeywords.filter(kw => content.includes(kw));
    
    if (foundAutomation.length > 0) {
      return {
        passed: false,
        message: 'Checklist contains automation keywords',
        details: `Found: ${foundAutomation.join(', ')}`
      };
    }
    
    if (foundKeywords.length < 2) {
      return {
        passed: false,
        message: 'Checklist missing manual workflow keywords',
        details: `Expected keywords like: ${manualKeywords.join(', ')}`
      };
    }
    
    return {
      passed: true,
      message: 'Checklist mentions manual paste workflow'
    };
    
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to read checklist',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
