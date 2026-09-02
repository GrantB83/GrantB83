/**
 * Suno prompt builder - assembles prompt and style text from metadata
 */

import { SunoMetadata } from './types.js';

/**
 * Build the main Suno prompt text
 * This is the text that goes in the "Song Description" or main prompt box
 */
export function buildPrompt(meta: SunoMetadata): string {
  const parts: string[] = [];
  
  // Add mood/vibe if provided
  if (meta.mood) {
    parts.push(meta.mood);
  }
  
  // Add duration hint if provided
  if (meta.duration_hint) {
    parts.push(`Duration: ${meta.duration_hint}`);
  }
  
  // Add kids/artist context if provided
  if (meta.kids && meta.kids.length > 0) {
    parts.push(`Written by: ${meta.kids.join(', ')}`);
  } else if (meta.artist) {
    parts.push(`Artist: ${meta.artist}`);
  }
  
  // Join parts with newlines
  return parts.join('\n');
}

/**
 * Build the style/tags text
 * This goes in the "Style of Music" box
 */
export function buildStyle(meta: SunoMetadata): string {
  const parts: string[] = [];
  
  // Add style if provided
  if (meta.style) {
    parts.push(meta.style);
  }
  
  // Add negative prompts if provided
  if (meta.negative_prompts && meta.negative_prompts.length > 0) {
    parts.push('');
    parts.push('Avoid: ' + meta.negative_prompts.join(', '));
  }
  
  return parts.join('\n');
}

/**
 * Build the title
 * Uses provided title or generates from artist/kids
 */
export function buildTitle(meta: SunoMetadata): string {
  if (meta.title) {
    return meta.title;
  }
  
  // Generate a default title
  if (meta.kids && meta.kids.length > 0) {
    return `${meta.kids[0]}'s Song`;
  }
  
  if (meta.artist) {
    return `${meta.artist} - Untitled`;
  }
  
  return 'Untitled Song';
}
