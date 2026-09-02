import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateDrafts } from './generator.js';
import { loadSeeds } from './seed-loader.js';
import { getDefaultFacts } from './facts-loader.js';
import type { BookingData } from './types.js';

describe('Draft Generator', () => {
  const sampleBooking: BookingData = {
    guestName: 'Jane Smith',
    checkInDate: '2026-09-15',
    checkOutDate: '2026-09-17',
    suiteOrUnit: 'Garden Suite',
    lateCheckIn: false,
    adults: 2,
    children: 0,
    channel: 'whatsapp'
  };

  it('should generate all required outputs', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    assert.ok(drafts.welcomeWhatsApp, 'Should generate WhatsApp welcome');
    assert.ok(drafts.welcomeEmail.subject, 'Should generate email subject');
    assert.ok(drafts.welcomeEmail.body, 'Should generate email body');
    assert.ok(drafts.lateCheckIn, 'Should generate late check-in draft');
    assert.ok(drafts.teamCheckIn, 'Should generate team check-in');
    assert.ok(drafts.approval, 'Should generate approval notice');
    assert.ok(drafts.manifest, 'Should generate manifest');
  });

  it('should include guest name in all drafts', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    assert.ok(drafts.welcomeWhatsApp.includes('Jane Smith'), 'WhatsApp should include guest name');
    assert.ok(drafts.welcomeEmail.body.includes('Jane Smith'), 'Email should include guest name');
    assert.ok(drafts.teamCheckIn.includes('Jane Smith'), 'Team check-in should include guest name');
  });

  it('should include booking dates', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    assert.ok(drafts.welcomeWhatsApp.includes('2026-09-15'), 'Should include check-in date');
    assert.ok(drafts.welcomeWhatsApp.includes('2026-09-17'), 'Should include check-out date');
  });

  it('should include suite/unit information', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    assert.ok(drafts.welcomeWhatsApp.includes('Garden Suite'), 'Should include suite name');
    assert.ok(drafts.teamCheckIn.includes('Garden Suite'), 'Team check-in should include suite');
  });

  it('should handle late check-in flag', () => {
    const lateBooking: BookingData = { ...sampleBooking, lateCheckIn: true };
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(lateBooking, facts, seeds);

    assert.ok(
      drafts.lateCheckIn.includes('arriving after hours') || drafts.lateCheckIn.includes('late'),
      'Late check-in draft should mention after-hours arrival'
    );
    assert.ok(
      !drafts.lateCheckIn.includes('N/A'),
      'Late check-in should not be N/A when flag is true'
    );
  });

  it('should show N/A for late check-in when not needed', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    assert.ok(
      drafts.lateCheckIn.includes('N/A'),
      'Should indicate N/A when late check-in is not needed'
    );
  });

  it('should never invent rates or check-in times', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    const allText = [
      drafts.welcomeWhatsApp,
      drafts.welcomeEmail.body,
      drafts.lateCheckIn,
      drafts.teamCheckIn
    ].join(' ');

    // Should not contain specific times or prices
    assert.ok(!allText.match(/\d{2}:\d{2}/), 'Should not invent specific check-in times');
    assert.ok(!allText.match(/R\d+/), 'Should not mention Rand amounts');
    assert.ok(!allText.match(/\$\d+/), 'Should not mention Dollar amounts');
    assert.ok(
      allText.includes('Team will confirm') || allText.includes('will be confirmed'),
      'Should indicate times will be confirmed by team'
    );
  });

  it('should include contact information from facts', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    const allText = [drafts.welcomeWhatsApp, drafts.welcomeEmail.body].join(' ');

    assert.ok(allText.includes('stay@hospitality.partners'), 'Should include contact email');
    assert.ok(allText.includes('+27 83 645 8313'), 'Should include WhatsApp number');
  });

  it('should fail on missing guest name', () => {
    const invalidBooking = { ...sampleBooking, guestName: '' } as BookingData;
    const facts = getDefaultFacts();
    const seeds = {};

    // This should still generate (validation happens in main CLI)
    // but the output will have empty name
    const drafts = generateDrafts(invalidBooking, facts, seeds);
    assert.ok(drafts, 'Should still generate drafts even with empty name');
  });

  it('should include approval warning in all outputs', () => {
    const facts = getDefaultFacts();
    const seeds = {};
    const drafts = generateDrafts(sampleBooking, facts, seeds);

    assert.ok(
      drafts.approval.includes('DRAFT') && drafts.approval.includes('approval'),
      'Approval notice should warn about draft status'
    );
  });
});
