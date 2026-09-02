/**
 * Types for family-morning-digest-pack CLI
 */

/**
 * CLI options
 */
export interface CliOptions {
  date?: string;
  subjects?: string;
  outdir?: string;
  runSubjectDigest?: boolean;
  schoolSubjects?: string;
  ics?: string;
  timezone?: string;
  runIcsDigest?: boolean;
  help?: boolean;
}

/**
 * Digest item from family-school-subject-digest
 */
export interface DigestItem {
  n: number;
  tag: string;
  subject: string;
  snippet?: string;
  dueDate?: string;
  notes?: string;
}

/**
 * Pack generation options
 */
export interface PackOptions {
  date: string;
  outdir: string;
  timezone: string;
}

/**
 * Pack manifest
 */
export interface PackManifest {
  tool: string;
  version: string;
  date: string;
  timezone: string;
  generatedAt: string;
  schoolItemCount: number;
  familyItemCount: number;
  totalItemCount: number;
  calendarEventCount?: number;
  files: string[];
}

/**
 * Section for pack output
 */
export interface Section {
  title: string;
  items: DigestItem[];
}
