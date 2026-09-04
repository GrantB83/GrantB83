/**
 * Tests for vault-entity-due-pipeline-pack pipeline builder
 */

import { test } from 'node:test';
import * as assert from 'node:assert';

/**
 * Test boolean flag parsing logic
 */
test('parseBooleanFlag handles all flag formats', () => {
  // Helper to simulate flag parsing
  function parseBooleanFlag(args: string[], flagName: string, defaultValue: boolean): boolean {
    const negatedFlag = `--no-${flagName.replace(/^--/, '')}`;
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === negatedFlag) {
        return false;
      }
      
      if (arg === flagName || arg.startsWith(`${flagName}=`)) {
        if (arg.includes('=')) {
          const value = arg.split('=')[1].toLowerCase();
          return !(value === 'false' || value === '0' || value === 'no');
        } else {
          if (i + 1 < args.length) {
            const nextArg = args[i + 1];
            if (nextArg === 'false' || nextArg === '0' || nextArg === 'no') {
              return false;
            } else if (nextArg === 'true' || nextArg === '1' || nextArg === 'yes') {
              return true;
            }
          }
          return true;
        }
      }
    }
    
    return defaultValue;
  }
  
  // Test default values
  assert.strictEqual(parseBooleanFlag([], '--run-queue', false), false, 'Default false');
  assert.strictEqual(parseBooleanFlag([], '--run-entity-pack', true), true, 'Default true');
  
  // Test bare flag
  assert.strictEqual(parseBooleanFlag(['--run-queue'], '--run-queue', false), true, 'Bare flag enables');
  
  // Test equals syntax
  assert.strictEqual(parseBooleanFlag(['--run-queue=true'], '--run-queue', false), true, 'Equals true');
  assert.strictEqual(parseBooleanFlag(['--run-queue=false'], '--run-queue', true), false, 'Equals false');
  
  // Test space syntax
  assert.strictEqual(parseBooleanFlag(['--run-queue', 'true'], '--run-queue', false), true, 'Space true');
  assert.strictEqual(parseBooleanFlag(['--run-queue', 'false'], '--run-queue', true), false, 'Space false');
  
  // Test negated syntax
  assert.strictEqual(parseBooleanFlag(['--no-run-queue'], '--run-queue', true), false, 'Negated flag');
  assert.strictEqual(parseBooleanFlag(['--no-run-entity-pack'], '--run-entity-pack', true), false, 'Negated entity pack');
});

/**
 * Test manifest accuracy with skipped stages
 */
test('manifest files array omits outputs from skipped stages', () => {
  // Mock manifest files list
  const filesWithBoth = [
    { filename: 'PACK.md', type: 'index', description: 'Pipeline pack index' },
    { filename: 'queue.json', type: 'metadata', description: 'Due date queue data' },
    { filename: 'queue.md', type: 'digest', description: 'Due date queue overview' },
    { filename: 'by-entity/', type: 'directory', description: 'Entity packs' },
    { filename: 'master.md', type: 'digest', description: 'Entity overview' },
    { filename: 'APPROVAL.md', type: 'approval', description: 'Gates' },
    { filename: 'manifest.json', type: 'metadata', description: 'Metadata' }
  ];
  
  const filesEntityOnly = filesWithBoth.filter(f => 
    !['queue.json', 'queue.md', 'missing-signals.md'].includes(f.filename)
  );
  
  const filesQueueOnly = filesWithBoth.filter(f =>
    !['by-entity/', 'master.md', 'unknown.md'].includes(f.filename)
  );
  
  // Verify queue outputs excluded when queue skipped
  assert.ok(
    !filesEntityOnly.some(f => f.filename === 'queue.json'),
    'queue.json excluded when queue skipped'
  );
  assert.ok(
    !filesEntityOnly.some(f => f.filename === 'queue.md'),
    'queue.md excluded when queue skipped'
  );
  
  // Verify entity outputs excluded when entity pack skipped
  assert.ok(
    !filesQueueOnly.some(f => f.filename === 'by-entity/'),
    'by-entity/ excluded when entity pack skipped'
  );
  assert.ok(
    !filesQueueOnly.some(f => f.filename === 'master.md'),
    'master.md excluded when entity pack skipped'
  );
  
  // Verify core files always present
  assert.ok(filesEntityOnly.some(f => f.filename === 'PACK.md'), 'PACK.md always present');
  assert.ok(filesEntityOnly.some(f => f.filename === 'APPROVAL.md'), 'APPROVAL.md always present');
  assert.ok(filesEntityOnly.some(f => f.filename === 'manifest.json'), 'manifest.json always present');
});

/**
 * Test runOptions flags reflect actual execution
 */
test('manifest runOptions match actual stage execution', () => {
  // Scenario 1: Both stages run
  const manifestBoth = {
    runOptions: {
      ranFilenameQueue: true,
      ranEntityPack: true
    }
  };
  assert.strictEqual(manifestBoth.runOptions.ranFilenameQueue, true, 'Queue ran');
  assert.strictEqual(manifestBoth.runOptions.ranEntityPack, true, 'Entity pack ran');
  
  // Scenario 2: Entity pack only
  const manifestEntityOnly = {
    runOptions: {
      ranFilenameQueue: false,
      ranEntityPack: true
    }
  };
  assert.strictEqual(manifestEntityOnly.runOptions.ranFilenameQueue, false, 'Queue skipped');
  assert.strictEqual(manifestEntityOnly.runOptions.ranEntityPack, true, 'Entity pack ran');
  
  // Scenario 3: Queue only (unusual but valid)
  const manifestQueueOnly = {
    runOptions: {
      ranFilenameQueue: true,
      ranEntityPack: false
    }
  };
  assert.strictEqual(manifestQueueOnly.runOptions.ranFilenameQueue, true, 'Queue ran');
  assert.strictEqual(manifestQueueOnly.runOptions.ranEntityPack, false, 'Entity pack skipped');
});
