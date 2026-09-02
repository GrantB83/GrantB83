/**
 * Type definitions for family-school-subject-digest
 */

export type ItemTag = 'school' | 'forms' | 'calendar' | 'payment' | 'sports' | 'other';

export interface ParsedItem {
  n: number;
  tag: ItemTag;
  subject: string;
  snippet?: string;
  dueDate?: string;
  notes?: string;
}

export interface DigestItem {
  n: number;
  tag: ItemTag;
  text: string;
  hasAction: boolean;
}

export interface CliOptions {
  input?: string;
  outdir?: string;
  date?: string;
  timezone?: string;
  help?: boolean;
}

export interface GeneratorOptions {
  date: string;
  timezone: string;
  outdir: string;
}
