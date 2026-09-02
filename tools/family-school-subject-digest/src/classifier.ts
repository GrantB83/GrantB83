/**
 * Classifier for email subjects
 * Uses keyword-based heuristics (no LLM)
 */

import { ItemTag } from './types.js';

/**
 * School-related keywords
 */
const SCHOOL_KEYWORDS = [
  'aisd',
  'school',
  'teacher',
  'homework',
  'report card',
  'pta',
  'bus',
  'cafeteria',
  'enrollment',
  'skyward',
  'parentsquare',
  'principal',
  'classroom',
  'grade',
  'student',
  'education',
  'curriculum',
  'field trip',
  'school day',
  'parent conference',
  'school lunch',
  'backpack',
  'textbook',
  'assignment',
  'test',
  'quiz',
  'school supplies',
  'school district',
  'campus',
];

/**
 * Forms-related keywords
 */
const FORMS_KEYWORDS = [
  'form',
  'consent',
  'permission',
  'sign',
  'signature',
  'document',
  'waiver',
  'registration',
  'application',
];

/**
 * Calendar-related keywords
 */
const CALENDAR_KEYWORDS = [
  'calendar',
  'event',
  'schedule',
  'meeting',
  'appointment',
  'reminder',
  'date',
  'rsvp',
];

/**
 * Payment-related keywords
 */
const PAYMENT_KEYWORDS = [
  'payment',
  'invoice',
  'bill',
  'due',
  'fee',
  'charge',
  'pay',
  '$',
  'amount',
  'balance',
  'receipt',
  'transaction',
];

/**
 * Sports-related keywords
 */
const SPORTS_KEYWORDS = [
  'sports',
  'practice',
  'game',
  'team',
  'coach',
  'tournament',
  'athletic',
  'soccer',
  'basketball',
  'football',
  'baseball',
  'volleyball',
  'track',
  'swim',
  'tennis',
];

/**
 * Classify a subject line into a tag
 */
export function classifySubject(subject: string): ItemTag {
  const lower = subject.toLowerCase();
  
  const hasFormsKeyword = FORMS_KEYWORDS.some(kw => lower.includes(kw));
  const hasPaymentKeyword = PAYMENT_KEYWORDS.some(kw => lower.includes(kw));
  const hasSportsKeyword = SPORTS_KEYWORDS.some(kw => lower.includes(kw));
  const hasSchoolKeyword = SCHOOL_KEYWORDS.some(kw => lower.includes(kw));
  const hasCalendarKeyword = CALENDAR_KEYWORDS.some(kw => lower.includes(kw));
  
  // School takes priority when present
  if (hasSchoolKeyword) {
    return 'school';
  }
  
  // Then check other strong categories
  if (hasFormsKeyword) {
    return 'forms';
  }
  
  if (hasPaymentKeyword) {
    return 'payment';
  }
  
  // Sports takes priority over calendar
  if (hasSportsKeyword) {
    return 'sports';
  }
  
  if (hasCalendarKeyword) {
    return 'calendar';
  }
  
  return 'other';
}

/**
 * Extract due date from subject/snippet if present
 * Never invents - only returns if clearly stated
 */
export function extractDueDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  
  // Look for explicit date patterns
  const datePatterns = [
    /due\s+(?:by\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /by\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /deadline[:\s]+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+deadline/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

/**
 * Check if subject has a clear action verb
 */
export function hasActionVerb(subject: string): boolean {
  const actionVerbs = [
    'submit',
    'sign',
    'complete',
    'return',
    'pay',
    'register',
    'rsvp',
    'confirm',
    'respond',
    'review',
    'update',
    'send',
    'bring',
    'attend',
    'join',
    'book',
  ];
  
  const lower = subject.toLowerCase();
  
  // Use word boundaries to avoid false positives like "information" matching "form"
  return actionVerbs.some(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(subject);
  });
}
