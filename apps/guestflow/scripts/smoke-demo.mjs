#!/usr/bin/env node

/**
 * GuestFlow Smoke Test
 * 
 * Validates key routes and pages locally before any deployment.
 * Tests all demo pages, API routes, and database initialization.
 * 
 * Usage:
 *   npm run smoke
 * 
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, '..');
const BASE_URL = process.env.SMOKE_URL || 'http://localhost:3100';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

let passed = 0;
let failed = 0;

function log(emoji, message, color = colors.reset) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

function pass(message) {
  passed++;
  log('✅', message, colors.green);
}

function fail(message) {
  failed++;
  log('❌', message, colors.red);
}

function info(message) {
  log('ℹ️ ', message, colors.cyan);
}

/**
 * Test database file exists and has required tables
 */
async function testDatabase() {
  const dbPath = resolve(APP_ROOT, 'data/guestflow.db');
  
  if (!existsSync(dbPath)) {
    fail('Database file missing (run npm run db:init)');
    return false;
  }
  
  pass('Database file exists');
  
  // Basic schema check using better-sqlite3
  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(dbPath, { readonly: true });
    
    const requiredTables = ['tenants', 'properties', 'waitlist', 'inquiries', 'bookings', 'rate_cards'];
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        pass(`Table '${table}' exists`);
      } else {
        fail(`Table '${table}' missing`);
      }
    }
    
    db.close();
  } catch (err) {
    fail(`Database schema check failed: ${err.message}`);
    return false;
  }
  
  return true;
}

/**
 * Test HTTP route returns expected status
 */
async function testRoute(path, description, options = {}) {
  const {
    expectedStatus = 200,
    checkContent = null,
    method = 'GET',
    body = null
  } = options;
  
  try {
    const fetchOptions = { method };
    if (body) {
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, fetchOptions);
    
    if (response.status !== expectedStatus) {
      fail(`${description}: Expected ${expectedStatus}, got ${response.status}`);
      return false;
    }
    
    if (checkContent) {
      const text = await response.text();
      if (!text.includes(checkContent)) {
        fail(`${description}: Missing expected content "${checkContent}"`);
        return false;
      }
    }
    
    pass(`${description} (${method} ${path})`);
    return true;
  } catch (err) {
    fail(`${description}: ${err.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 GuestFlow Smoke Test Suite');
  console.log('='.repeat(60) + '\n');
  
  info(`Base URL: ${BASE_URL}`);
  info(`App Root: ${APP_ROOT}\n`);
  
  // Phase 1: File system checks
  console.log(colors.cyan + '\n📁 File System Checks' + colors.reset);
  console.log(colors.dim + '-'.repeat(60) + colors.reset);
  
  const configFiles = [
    'package.json',
    'next.config.mjs',
    'tsconfig.json',
    'tailwind.config.ts',
    'Dockerfile',
    'docker-compose.yml',
    '.dockerignore'
  ];
  
  for (const file of configFiles) {
    const path = resolve(APP_ROOT, file);
    if (existsSync(path)) {
      pass(`Config file: ${file}`);
    } else {
      fail(`Config file missing: ${file}`);
    }
  }
  
  // Phase 2: Database checks
  console.log(colors.cyan + '\n💾 Database Checks' + colors.reset);
  console.log(colors.dim + '-'.repeat(60) + colors.reset);
  
  await testDatabase();
  
  // Phase 3: HTTP route checks
  console.log(colors.cyan + '\n🌐 HTTP Route Checks' + colors.reset);
  console.log(colors.dim + '-'.repeat(60) + colors.reset);
  
  info('Testing public pages...\n');
  
  // Public pages
  await testRoute('/', 'Landing page', { checkContent: 'GuestFlow' });
  await testRoute('/pricing', 'Pricing page', { checkContent: 'COMING SOON' });
  await testRoute('/waitlist', 'Waitlist page', { checkContent: 'Join' });
  
  // Phase 14: Sales Funnel Flow Tests
  info('\nPhase 14: Testing sales funnel pages...\n');
  
  await testRoute('/', 'Landing page - Sales pitch', { checkContent: 'inquiry→quote→welcome→ops' });
  await testRoute('/', 'Landing page - Multi-property messaging', { checkContent: 'Multi-Property' });
  await testRoute('/pricing', 'Pricing page - Demo placeholder labels', { checkContent: 'DEMO PLACEHOLDER' });
  await testRoute('/pricing', 'Pricing page - Example pricing note', { checkContent: 'example structures only' });
  await testRoute('/waitlist', 'Waitlist form - Lead capture', { checkContent: 'Property Name' });
  
  info('\nContinuing with other route tests...\n');
  
  // Demo hub
  await testRoute('/demo', 'Demo hub', { checkContent: 'Interactive Demo' });
  
  // Phase 5 pages
  await testRoute('/demo/walkthrough', 'Demo walkthrough script', { checkContent: 'Walkthrough' });
  await testRoute('/demo/leavebehind', 'Sales leave-behind', { checkContent: 'GuestFlow' });
  
  // Phase 6 → 15 page
  await testRoute('/demo/hosting-readiness', 'Hosting readiness page (Phase 15 Docker)', { checkContent: 'Docker' });
  
  // Phase 7 page
  try {
    const response = await fetch(`${BASE_URL}/demo/onboard`);
    if ([200, 401, 403].includes(response.status)) {
      pass('Tenant onboarding wizard (auth check)');
    } else {
      fail(`Tenant onboarding wizard: Unexpected status ${response.status}`);
    }
  } catch (err) {
    fail(`Tenant onboarding wizard: ${err.message}`);
  }

  // Phase 9 page
  try {
    const response = await fetch(`${BASE_URL}/demo/seed`);
    if ([200, 401, 403].includes(response.status)) {
      pass('Demo seed page (auth check)');
    } else {
      fail(`Demo seed page: Unexpected status ${response.status}`);
    }
  } catch (err) {
    fail(`Demo seed page: ${err.message}`);
  }

  // Phase 11 page
  try {
    const response = await fetch(`${BASE_URL}/demo/waitlist-manage`);
    if ([200, 401, 403].includes(response.status)) {
      pass('Waitlist management page (auth check)');
    } else {
      fail(`Waitlist management page: Unexpected status ${response.status}`);
    }
  } catch (err) {
    fail(`Waitlist management page: ${err.message}`);
  }

  // Phase 16 page
  await testRoute('/demo/bookings-board', 'Bookings board page (Phase 16)', { checkContent: 'Same-Day Bookings Board' });
  
  // Phase 22 page
  await testRoute('/demo/inquiry-intake', 'Inquiry intake demo (Phase 22 heuristic extraction)', { checkContent: 'Demo Inquiry Intake' });
  await testRoute('/demo/inquiry-intake', 'Inquiry intake - fixtures mention', { checkContent: 'Load Sample Fixtures' });
  await testRoute('/demo/inquiry-intake', 'Inquiry intake - hard gates', { checkContent: 'DRAFT/fixtures only' });
  
  // Demo pages
  await testRoute('/demo/inquiry-intake', 'Inquiry intake demo', { checkContent: 'Inquiry' });
  await testRoute('/demo/quote-draft', 'Quote draft demo', { checkContent: 'Quote' });
  await testRoute('/demo/welcome-pack', 'Welcome pack demo', { checkContent: 'Welcome' });
  await testRoute('/demo/bookings-board', 'Bookings board (Phase 17)', { checkContent: 'Bookings' });
  await testRoute('/demo/daily-brief', 'Daily brief demo (Phase 17 dynamic)', { checkContent: 'Daily' });
  await testRoute('/demo/nightsbridge-import', 'NightsBridge import', { checkContent: 'NightsBridge' });
  await testRoute('/demo/tenant', 'Tenant switcher', { checkContent: 'Demo' });
  
  // Protected routes (may redirect to login or show auth page)
  try {
    const response = await fetch(`${BASE_URL}/demo/rate-card-upload`);
    if ([200, 401, 403].includes(response.status)) {
      pass('Rate card upload (auth check)');
    } else {
      fail(`Rate card upload: Unexpected status ${response.status}`);
    }
  } catch (err) {
    fail(`Rate card upload: ${err.message}`);
  }
  
  try {
    const response = await fetch(`${BASE_URL}/crm`);
    if ([200, 401, 403].includes(response.status)) {
      pass('CRM page (auth check)');
    } else {
      fail(`CRM page: Unexpected status ${response.status}`);
    }
  } catch (err) {
    fail(`CRM page: ${err.message}`);
  }
  
  // API routes
  info('\nTesting API routes...\n');
  
  await testRoute('/api/waitlist', 'Waitlist API (GET)', { expectedStatus: 200 });
  await testRoute('/api/tenants', 'Tenants API (GET)', { expectedStatus: 200 });
  await testRoute('/api/properties', 'Properties API (GET)', { expectedStatus: 200 });
  await testRoute('/api/rate-cards', 'Rate cards API (GET)', { expectedStatus: 200 });
  await testRoute('/api/bookings?tenant_id=1', 'Bookings API (GET with tenant)', { expectedStatus: 200 });
  
  // Test Phase 8 quote export API (POST)
  const sampleQuoteExport = {
    booking: {
      property: 'Test Property',
      guestName: 'Test Guest',
      checkIn: '2026-12-15',
      checkOut: '2026-12-17',
      nights: 2,
      room: 'Test Room'
    },
    quote: {
      ratePerNight: '[RATE CARD REQUIRED]',
      subtotal: '[PENDING RATE CARD]',
      tax: '[PENDING]',
      total: '[PENDING]',
      note: 'Test note'
    },
    format: 'markdown'
  };
  await testRoute('/api/quotes/export', 'Quote export API (POST markdown)', { 
    method: 'POST', 
    body: sampleQuoteExport,
    expectedStatus: 200
  });
  await testRoute('/api/quotes/export', 'Quote export API (POST html)', { 
    method: 'POST', 
    body: { ...sampleQuoteExport, format: 'html' },
    expectedStatus: 200
  });

  // Test Phase 9 demo seed API (POST with auth)
  const seedResponse = await fetch(`${BASE_URL}/api/demo/seed`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer demo2026',
      'Content-Type': 'application/json'
    }
  });
  if (seedResponse.status === 200) {
    const seedData = await seedResponse.json();
    if (seedData.success && seedData.summary) {
      pass('Demo seed API (POST with auth)');
    } else {
      fail('Demo seed API: Response missing expected fields');
    }
  } else {
    fail(`Demo seed API: Expected 200, got ${seedResponse.status}`);
  }

  // Test Phase 10 tenant-scoped APIs
  await testRoute('/api/leads?tenant_id=1', 'Leads API with tenant filter (Phase 10)', { expectedStatus: 200 });
  await testRoute('/api/rate-cards?tenant_id=1', 'Rate cards API with tenant filter (Phase 10)', { expectedStatus: 200 });
  
  // Test Phase 17 bookings API
  await testRoute('/api/bookings?tenant_id=1', 'Bookings API with tenant filter (Phase 17)', { expectedStatus: 200 });
  await testRoute('/api/bookings?tenant_id=1&date=2026-12-15', 'Bookings API with date filter (Phase 17)', { expectedStatus: 200 });

  // Test Phase 17 daily brief export API (POST)
  const sampleBriefExport = {
    tenantName: 'Test Tenant',
    targetDate: '2026-12-15',
    bookings: [
      {
        guestName: 'Test Guest',
        propertyName: 'Test Property',
        roomNumber: 'Suite 1',
        checkIn: '2026-12-15',
        checkOut: '2026-12-17',
        status: 'arriving',
        lateCheckIn: false,
        missingFields: [],
        adults: 2,
        children: 0
      }
    ],
    format: 'markdown'
  };
  await testRoute('/api/daily-brief/export', 'Daily brief export API (POST markdown)', { 
    method: 'POST', 
    body: sampleBriefExport,
    expectedStatus: 200
  });
  await testRoute('/api/daily-brief/export', 'Daily brief export API (POST text)', { 
    method: 'POST', 
    body: { ...sampleBriefExport, format: 'text' },
    expectedStatus: 200
  });

  // Test Phase 11 convert API (POST with validation)
  const convertTestMissingFields = await fetch(`${BASE_URL}/api/waitlist/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waitlistId: 1 })
  });
  if (convertTestMissingFields.status === 400) {
    pass('Waitlist convert API validation (missing tenantId)');
  } else {
    fail(`Waitlist convert API validation: Expected 400, got ${convertTestMissingFields.status}`);
  }

  const convertTestNotFound = await fetch(`${BASE_URL}/api/waitlist/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waitlistId: 999999, tenantId: 1 })
  });
  if (convertTestNotFound.status === 404) {
    pass('Waitlist convert API not found handling');
  } else {
    fail(`Waitlist convert API not found: Expected 404, got ${convertTestNotFound.status}`);
  }

  // Test Phase 12 notes API (GET with validation)
  const notesTestMissingParams = await fetch(`${BASE_URL}/api/leads/notes?lead_id=1`);
  if (notesTestMissingParams.status === 400) {
    pass('Lead notes API validation (missing tenant_id)');
  } else {
    fail(`Lead notes API validation: Expected 400, got ${notesTestMissingParams.status}`);
  }

  const notesTestNotFound = await fetch(`${BASE_URL}/api/leads/notes?lead_id=999999&tenant_id=1`);
  if (notesTestNotFound.status === 404) {
    pass('Lead notes API not found handling');
  } else {
    fail(`Lead notes API not found: Expected 404, got ${notesTestNotFound.status}`);
  }

  // Test Phase 12 notes API (POST with validation)
  const notesPostMissingFields = await fetch(`${BASE_URL}/api/leads/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: 1, tenant_id: 1 })
  });
  if (notesPostMissingFields.status === 400) {
    pass('Lead notes POST API validation (missing note_text)');
  } else {
    fail(`Lead notes POST API validation: Expected 400, got ${notesPostMissingFields.status}`);
  }

  // Test Phase 13 → 15 leave-behind export API with real data (POST)
  const leaveBehindMarkdownResponse = await fetch(`${BASE_URL}/api/leavebehind/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'markdown' })
  });
  if (leaveBehindMarkdownResponse.status === 200) {
    const markdown = await leaveBehindMarkdownResponse.text();
    if (markdown.includes('Total Waitlist Leads:') && markdown.includes('Status Breakdown:')) {
      pass('Leave-behind export API with real data (markdown)');
    } else {
      fail('Leave-behind export API: Missing waitlist data');
    }
  } else {
    fail(`Leave-behind export API: Expected 200, got ${leaveBehindMarkdownResponse.status}`);
  }

  const leaveBehindHtmlResponse = await fetch(`${BASE_URL}/api/leavebehind/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'html' })
  });
  if (leaveBehindHtmlResponse.status === 200) {
    const html = await leaveBehindHtmlResponse.text();
    if (html.includes('Total Waitlist Leads:') && html.includes('Status Breakdown:')) {
      pass('Leave-behind export API with real data (html)');
    } else {
      fail('Leave-behind export API (HTML): Missing waitlist data');
    }
  } else {
    fail(`Leave-behind export API (HTML): Expected 200, got ${leaveBehindHtmlResponse.status}`);
  }
  
  // Test Phase 18 welcome drafts page
  await testRoute('/demo/welcome-drafts', 'Welcome drafts page (Phase 18)', { checkContent: 'Welcome Message Drafts' });
  
  // Test Phase 18 welcome drafts API (GET with tenant filter)
  await testRoute('/api/welcome-drafts?tenant_id=1&as_of=2026-09-02&window_days=1', 
    'Welcome drafts API with tenant filter (Phase 18)', 
    { expectedStatus: 200 }
  );

  // Test Phase 20 CT-pack assembly page
  await testRoute('/demo/ct-pack', 'CT-pack assembly page (Phase 20)', { checkContent: 'Demo CT-Pack Assembly' });
  
  // Test Phase 19 late check-in queue page
  await testRoute('/demo/late-checkin-queue', 'Late check-in queue page (Phase 19)', { checkContent: 'Late / After-Hours Check-In Queue' });
  
  // Test Phase 19 late check-in export API (POST)
  const sampleLateCheckinExport = {
    tenantName: 'Test Tenant',
    targetDate: '2026-09-02',
    afterHoursThreshold: '15:00',
    lateBookings: [
      {
        guestName: 'Test Guest',
        propertyName: 'Test Property',
        checkIn: '2026-09-02',
        checkOut: '2026-09-04',
        roomNumber: 'Suite 1',
        adults: 2,
        children: 0,
        notes: 'Late arrival ETA 20:00',
        guestPhone: '+27 82 555 1234',
        estimatedArrival: '20:00',
        lateReason: 'after-hours',
        missingFields: []
      }
    ],
    stats: {
      totalLate: 1,
      afterHours: 1,
      unknownTime: 0,
      noteKeyword: 0,
      missingPhone: 0,
      missingETA: 0
    },
    format: 'markdown'
  };
  await testRoute('/api/late-checkin/export', 'Late check-in export API (POST markdown)', { 
    method: 'POST', 
    body: sampleLateCheckinExport,
    expectedStatus: 200
  });
  await testRoute('/api/late-checkin/export', 'Late check-in export API (POST text)', { 
    method: 'POST', 
    body: { ...sampleLateCheckinExport, format: 'text' },
    expectedStatus: 200
  });
  
  // Test 404 handling
  await testRoute('/nonexistent-page', '404 handling', { expectedStatus: 404 });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(colors.green + `✅ Passed: ${passed}` + colors.reset);
  console.log(colors.red + `❌ Failed: ${failed}` + colors.reset);
  console.log('='.repeat(60) + '\n');
  
  if (failed > 0) {
    console.log(colors.red + '❌ Some tests failed. Fix issues before deploying.' + colors.reset + '\n');
    process.exit(1);
  } else {
    console.log(colors.green + '✅ All tests passed! GuestFlow is ready.' + colors.reset + '\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  console.error(colors.red + '\n❌ Test runner error:' + colors.reset, err);
  process.exit(1);
});
