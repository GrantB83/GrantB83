/**
 * Shared sanitize helper for arrival draft sermon text.
 * Single source of truth for scrubbing sermon pattern across all surfaces.
 *
 * Product bar: Staff list + transcript = state + next action only.
 * Policy lives on Approve&Send / Redirect chrome — never in stored draft message_text,
 * list preview, or bubble body.
 *
 * Pattern: "[Arrival draft T-1] Approve&Send required — never auto-sent." → "Arrival draft T-1"
 */
export function scrubArrivalDraftSermon(text: string): string {
  if (!text) return text

  const match = text.match(/^\[?Arrival draft ([^\]]+)\]?\s*Approve&Send required/i)
  if (match && match[1]) {
    return `Arrival draft ${match[1].trim()}`
  }

  return text
}
