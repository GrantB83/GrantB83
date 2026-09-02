/**
 * Tone and template helpers for Browns guest communications
 * Style: short warm sentences, Kind regards/Kindest regards + Grant Brown, rare smileys
 */

export interface ToneConfig {
  language: 'en' | 'af';
  propertyName: string;
  includeEmoji: boolean;
}

export const DEFAULT_TONE: ToneConfig = {
  language: 'en',
  propertyName: 'The Browns Luxury Guest Suites Dullstroom',
  includeEmoji: false
};

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export function getGreeting(language: 'en' | 'af'): string {
  return language === 'af' ? 'Hallo' : 'Hi';
}

export function getClosing(language: 'en' | 'af', formal: boolean = false): string {
  if (language === 'af') {
    return formal ? 'Vriendelike groete' : 'Groete';
  }
  return formal ? 'Kindest regards' : 'Kind regards';
}

export function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  if (currency === 'ZAR') {
    return `R${amount.toFixed(2)}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}
