export interface SpamFilterResult {
  spam: boolean
  reason: string | null
}

const SPAM_PHRASES = [
  'congratulations',
  'you have won',
  'you are a winner',
  'claim your prize',
  'lottery',
  'act now',
  'limited time',
  'click here',
  'bitcoin',
  'crypto giveaway',
  'investment opportunity',
  'make money fast',
  'work from home',
  'unsubscribe',
  'hot deals',
  'lowest prices guaranteed',
  'viagra',
  'casino bonus',
]

const MARKETING_PHRASES = [
  'special offer',
  '% off',
  'percent off',
  'buy now',
  'free trial',
  'marketing newsletter',
  'you are receiving this email because',
  'view in browser',
]

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Fail-closed: when the message looks like junk, skip auto-draft.
 * Unsure → treat as spam for draft purposes only (message still stored).
 */
export function isSpamOrMarketing(text: string | null | undefined): SpamFilterResult {
  const raw = String(text || '').trim()
  if (!raw || raw === '[body unavailable]' || raw === '[metadata-only]') {
    return { spam: true, reason: 'empty_or_unavailable_body' }
  }

  const value = normalize(raw)
  const spamHits = SPAM_PHRASES.filter((phrase) => value.includes(phrase))
  const marketingHits = MARKETING_PHRASES.filter((phrase) => value.includes(phrase))
  const urlCount = (value.match(/https?:\/\//g) || []).length

  if (spamHits.length >= 2) {
    return { spam: true, reason: 'spam_phrases' }
  }
  if (spamHits.length >= 1 && urlCount >= 1) {
    return { spam: true, reason: 'spam_link' }
  }
  if (marketingHits.length >= 2) {
    return { spam: true, reason: 'marketing' }
  }
  if (urlCount >= 3 && value.length < 280) {
    return { spam: true, reason: 'link_only_blast' }
  }

  return { spam: false, reason: null }
}
