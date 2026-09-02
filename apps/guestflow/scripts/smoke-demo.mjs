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
    'tailwind.config.ts'
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
  
  // Demo hub
  await testRoute('/demo', 'Demo hub', { checkContent: 'Interactive Demo' });
  
  // Phase 5 pages
  await testRoute('/demo/walkthrough', 'Demo walkthrough script', { checkContent: 'Walkthrough' });
  await testRoute('/demo/leavebehind', 'Sales leave-behind', { checkContent: 'GuestFlow' });
  
  // Phase 6 page
  await testRoute('/demo/hosting-readiness', 'Hosting readiness page', { checkContent: 'Hosting' });
  
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
  
  // Demo pages
  await testRoute('/demo/inquiry-intake', 'Inquiry intake demo', { checkContent: 'Inquiry' });
  await testRoute('/demo/quote-draft', 'Quote draft demo', { checkContent: 'Quote' });
  await testRoute('/demo/welcome-pack', 'Welcome pack demo', { checkContent: 'Welcome' });
  await testRoute('/demo/daily-brief', 'Daily brief demo', { checkContent: 'Daily' });
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
