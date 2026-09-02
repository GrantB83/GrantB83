/**
 * Tests for mapper.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapQuoteToPod } from './mapper.js';
import type { Quote } from './types.js';

describe('mapQuoteToPod', () => {
  it('maps full quote to pod successfully', () => {
    const quote: Quote = {
      customerName: 'Pieter van der Merwe',
      customerPhone: '+27823456789',
      materials: ['Sand'],
      volume: 12,
      volumeUnit: 'm³',
      deliveryLocation: '123 Main Road, Dullstroom',
      dateNeeded: '2026-09-20',
      pricePerUnit: 450,
      totalPrice: 5400,
      currency: 'ZAR',
      notes: 'Side gate access',
    };

    const { pod, report } = mapQuoteToPod(quote);

    assert.equal(pod.customer, 'Pieter van der Merwe');
    assert.equal(pod.phone, '+27823456789');
    assert.equal(pod.material, 'Sand');
    assert.equal(pod.volume, 12);
    assert.equal(pod.unit, 'm³');
    assert.equal(pod.deliveryLocation, '123 Main Road, Dullstroom');
    assert.equal(pod.deliveredAt, '2026-09-20');
    assert.equal(pod.notes, 'Side gate access');
    assert.equal(pod.signedBy, undefined);
    assert.equal(pod.vehicle, undefined);
    assert.equal(pod.driver, undefined);

    assert.ok(report.carried.length > 0);
    assert.ok(report.missing.includes('signedBy (NEVER populated by mapper - manual only)'));
  });

  it('handles missing volume gracefully', () => {
    const quote: Quote = {
      customerName: 'Test Customer',
      materials: ['Stone'],
      deliveryLocation: 'Test Location',
    };

    const { pod, report } = mapQuoteToPod(quote);

    assert.equal(pod.volume, undefined);
    assert.ok(report.missing.includes('volume (not present in quote)'));
    assert.ok(
      report.notes.some((n) => n.includes('Volume missing'))
    );
  });

  it('takes first material from multiple materials', () => {
    const quote: Quote = {
      materials: ['Sand', 'Stone', 'Gravel'],
    };

    const { pod, report } = mapQuoteToPod(quote);

    assert.equal(pod.material, 'Sand');
    assert.ok(
      report.notes.some((n) => n.includes('Multiple materials'))
    );
  });

  it('appends optional notes when provided', () => {
    const quote: Quote = {
      notes: 'Original quote notes',
    };

    const additionalNotes = 'Extra delivery instructions';
    const { pod, report } = mapQuoteToPod(quote, additionalNotes);

    assert.ok(pod.notes?.includes('Original quote notes'));
    assert.ok(pod.notes?.includes('Extra delivery instructions'));
    assert.ok(
      report.notes.some((n) => n.includes('Additional notes appended'))
    );
  });

  it('never populates signedBy field', () => {
    const quote: Quote = {
      customerName: 'Test',
      materials: ['Sand'],
    };

    const { pod, report } = mapQuoteToPod(quote);

    assert.equal(pod.signedBy, undefined);
    assert.ok(
      report.missing.includes('signedBy (NEVER populated by mapper - manual only)')
    );
    assert.ok(
      report.notes.some((n) => n.includes('NEVER invent signatures'))
    );
  });

  it('handles empty quote gracefully', () => {
    const quote: Quote = {};

    const { pod, report } = mapQuoteToPod(quote);

    assert.equal(Object.keys(pod).length, 0);
    assert.ok(report.missing.length > 0);
    assert.ok(report.carried.length === 0);
  });

  it('notes when quote contains pricing', () => {
    const quote: Quote = {
      pricePerUnit: 450,
      totalPrice: 5400,
    };

    const { pod, report } = mapQuoteToPod(quote);

    assert.ok(
      report.notes.some((n) => n.includes('pricing fields'))
    );
  });

  it('uses dateNeeded as deliveredAt placeholder', () => {
    const quote: Quote = {
      dateNeeded: '2026-09-25',
    };

    const { pod, report } = mapQuoteToPod(quote);

    assert.equal(pod.deliveredAt, '2026-09-25');
    assert.ok(
      report.carried.some((c) => c.includes('deliveredAt'))
    );
    assert.ok(
      report.notes.some((n) => n.includes('placeholder'))
    );
  });
});
