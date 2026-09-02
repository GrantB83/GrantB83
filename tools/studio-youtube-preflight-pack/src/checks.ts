import * as fs from 'fs';
import * as path from 'path';
import { CheckResult } from './types.js';

/**
 * Check if required package files are present
 */
export function checkRequiredFiles(packageDir: string): CheckResult {
  const requiredFiles = [
    'lyrics.cleaned.txt',
    'checklist.md',
    'manifest.json'
  ];
  
  const missingFiles: string[] = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(packageDir, file);
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
 * Check if validate report passes (if provided)
 */
export function checkValidateReport(validateReportPath: string): CheckResult {
  try {
    const content = fs.readFileSync(validateReportPath, 'utf-8');
    const report = JSON.parse(content);
    
    if (report.summary && report.summary.all_passed === true) {
      return {
        passed: true,
        message: 'Validate report shows all checks passed'
      };
    } else if (report.summary && report.summary.all_passed === false) {
      const failedCount = report.summary.failed || 0;
      return {
        passed: false,
        message: 'Validate report shows failures',
        details: `${failedCount} validation check(s) failed`
      };
    } else {
      return {
        passed: false,
        message: 'Validate report format invalid',
        details: 'Expected summary.all_passed field'
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to read or parse validate report',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check if Drive URL is present
 */
export function checkDriveUrl(driveUrl?: string, driveUrlFile?: string): CheckResult {
  if (driveUrl) {
    if (driveUrl.includes('drive.google.com') || driveUrl.includes('docs.google.com')) {
      return {
        passed: true,
        message: 'Drive URL provided'
      };
    } else {
      return {
        passed: false,
        message: 'Drive URL provided but invalid',
        details: 'Expected drive.google.com or docs.google.com URL'
      };
    }
  }
  
  if (driveUrlFile) {
    try {
      const content = fs.readFileSync(driveUrlFile, 'utf-8').trim();
      if (content.includes('drive.google.com') || content.includes('docs.google.com')) {
        return {
          passed: true,
          message: 'Drive URL found in file'
        };
      } else {
        return {
          passed: false,
          message: 'Drive URL file exists but URL invalid',
          details: 'Expected drive.google.com or docs.google.com URL'
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: 'Failed to read Drive URL file',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  return {
    passed: false,
    message: 'No Drive URL provided',
    details: 'CoS chat Drive link required for Grant approval'
  };
}

/**
 * Check if video file exists (no media decode)
 */
export function checkVideoExists(videoPath: string): CheckResult {
  if (!fs.existsSync(videoPath)) {
    return {
      passed: false,
      message: 'Video file not found',
      details: `Path: ${videoPath}`
    };
  }
  
  const stats = fs.statSync(videoPath);
  if (!stats.isFile()) {
    return {
      passed: false,
      message: 'Video path is not a file',
      details: `Path: ${videoPath}`
    };
  }
  
  return {
    passed: true,
    message: 'Video file exists'
  };
}

/**
 * Skim lyrics for PII patterns (basic check)
 */
export function checkPiiPatterns(packageDir: string): CheckResult {
  const lyricsPath = path.join(packageDir, 'lyrics.cleaned.txt');
  
  try {
    const content = fs.readFileSync(lyricsPath, 'utf-8');
    
    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailPattern);
    
    // Phone pattern (common formats)
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g;
    const phones = content.match(phonePattern);
    
    const violations: string[] = [];
    
    if (emails && emails.length > 0) {
      violations.push(`${emails.length} email pattern(s) detected`);
    }
    
    if (phones && phones.length > 0) {
      violations.push(`${phones.length} phone pattern(s) detected`);
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
