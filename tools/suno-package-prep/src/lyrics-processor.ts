/**
 * Lyrics processor - cleans and validates lyrics
 */

import { ValidationResult } from './types.js';

/**
 * Maximum lyrics length in characters (Suno typical limit)
 * Based on Suno documentation, songs are typically 2-4 minutes
 * ~3000 characters is a reasonable upper bound
 */
export const MAX_LYRICS_LENGTH = 3000;

/**
 * Clean lyrics by normalizing line endings and trimming excess blank lines
 * Preserves content while making it paste-ready
 */
export function cleanLyrics(rawLyrics: string): string {
  // Normalize line endings to \n
  let cleaned = rawLyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Replace multiple blank lines with max 2 (preserve verse separation)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim trailing spaces from each line
  cleaned = cleaned
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
  
  return cleaned;
}

/**
 * Validate lyrics content
 */
export function validateLyrics(lyrics: string): ValidationResult {
  const errors: string[] = [];
  
  // Check if empty
  if (!lyrics || lyrics.trim().length === 0) {
    errors.push('Lyrics are empty');
  }
  
  // Check if too long
  if (lyrics.length > MAX_LYRICS_LENGTH) {
    errors.push(
      `Lyrics exceed maximum length (${lyrics.length} > ${MAX_LYRICS_LENGTH} characters). ` +
      `Consider splitting into multiple songs or trimming content.`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
