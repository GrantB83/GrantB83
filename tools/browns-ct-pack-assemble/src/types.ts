/**
 * Types for Browns CT Pack Assembler
 */

export interface CliOptions {
  day: string; // YYYY-MM-DD
  outdir: string;
  bookings?: string;
  before?: string;
  after?: string;
  facts?: string;
  'guest-booking'?: string;
  'run-change-check'?: boolean;
  'run-daily-ops'?: boolean;
  'run-guest-comms'?: boolean;
  'run-adapter'?: boolean;
}

export interface PackManifest {
  day: string;
  generatedAt: string;
  files: PackFile[];
  sources: PackSources;
  flags: PackFlags;
}

export interface PackFile {
  filename: string;
  type: 'index' | 'approval' | 'changes' | 'daily-ops' | 'guest-draft' | 'manifest';
  description: string;
}

export interface PackSources {
  bookingsProvided: boolean;
  beforeAfterProvided: boolean;
  factsProvided: boolean;
  guestBookingProvided: boolean;
}

export interface PackFlags {
  ranChangeCheck: boolean;
  ranDailyOps: boolean;
  ranGuestComms: boolean;
  ranAdapter: boolean;
}

export interface TimedChecklistItem {
  time: string; // e.g., "20:00 CT"
  description: string;
  files: string[];
}
