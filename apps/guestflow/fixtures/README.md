# GuestFlow Fixtures

This folder contains sample JSON fixtures for testing and demonstration purposes.

## Inquiry Fixtures (Phase 23)

### inquiry-with-amounts.json
Sample inquiry with embedded rate information. Used to demonstrate quote generation when pricing is already known (e.g., from rate card or prior quote).

**Use case:** Customer returning to confirm a previously discussed rate, or inquiry with pre-quoted pricing.

### inquiry-without-amounts.json
Sample inquiry without pricing information. Used to demonstrate availability-only confirmation with `[RATE CARD REQUIRED]` placeholders.

**Use case:** New inquiry where rates must be looked up from the rate card system or property owner must provide pricing.

## Usage

These fixtures are loaded in the Phase 23 quote-draft demo page (`/demo/quote-draft`) via the "Load Fixture" buttons. They demonstrate the two primary quote generation scenarios:

1. **With Amounts:** Generate complete quote with all pricing included
2. **Without Amounts:** Generate availability confirmation with rate placeholders (never invents pricing)

All fixtures use DEMO data only and follow hard gates:
- Never invent rates when missing
- Never auto-send (draft only)
- All amounts clearly labeled as DEMO/FIXTURE data
