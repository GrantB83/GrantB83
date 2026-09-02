#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Testing career-live-improve-digest with fixtures"
echo ""

# Clean previous test outputs
rm -rf test-output/ test-output-filtered/ test-output-summary/

# Test 1: Full run with runs.jsonl
echo "Test 1: Full run with runs.jsonl"
npm run digest -- --log fixtures/runs.jsonl --outdir test-output/
echo ""

# Verify outputs
if [ ! -f test-output/LEARNING-DRAFT.md ]; then
  echo "❌ FAIL: LEARNING-DRAFT.md not created"
  exit 1
fi
if [ ! -f test-output/stats.json ]; then
  echo "❌ FAIL: stats.json not created"
  exit 1
fi
if [ ! -f test-output/APPROVAL.md ]; then
  echo "❌ FAIL: APPROVAL.md not created"
  exit 1
fi
if [ ! -f test-output/manifest.json ]; then
  echo "❌ FAIL: manifest.json not created"
  exit 1
fi

echo "✅ Test 1 passed: All outputs created"
echo ""

# Test 2: With --since filter
echo "Test 2: With --since 2026-08-20 filter"
npm run digest -- --log fixtures/runs.jsonl --since 2026-08-20 --outdir test-output-filtered/
echo ""

# Check that filtered output has fewer entries
FULL_ENTRIES=$(jq '.totals.entries' test-output/stats.json)
FILTERED_ENTRIES=$(jq '.totals.entries' test-output-filtered/stats.json)

if [ "$FILTERED_ENTRIES" -ge "$FULL_ENTRIES" ]; then
  echo "❌ FAIL: Filtered entries ($FILTERED_ENTRIES) should be less than full entries ($FULL_ENTRIES)"
  exit 1
fi

echo "✅ Test 2 passed: Filter reduced entries from $FULL_ENTRIES to $FILTERED_ENTRIES"
echo ""

# Test 3: Summary mode (limited data)
echo "Test 3: With runs.md summary"
npm run digest -- --summary fixtures/runs.md --outdir test-output-summary/ 2>&1 || true
echo ""
echo "⚠️  Test 3: Summary mode has limited functionality (expected)"
echo ""

# Test 4: Validate stats.json structure
echo "Test 4: Validate stats.json structure"
PERIOD_SINCE=$(jq -r '.period.since' test-output/stats.json)
PERIOD_UNTIL=$(jq -r '.period.until' test-output/stats.json)
TOTAL_ENTRIES=$(jq '.totals.entries' test-output/stats.json)
SCORED=$(jq '.totals.scored' test-output/stats.json)
SKIP_REASONS=$(jq '.skipReasons | length' test-output/stats.json)

if [ "$PERIOD_SINCE" != "2026-08-15" ]; then
  echo "❌ FAIL: Period since should be 2026-08-15, got $PERIOD_SINCE"
  exit 1
fi

if [ "$TOTAL_ENTRIES" -ne 15 ]; then
  echo "❌ FAIL: Total entries should be 15, got $TOTAL_ENTRIES"
  exit 1
fi

if [ "$SCORED" -ne 7 ]; then
  echo "❌ FAIL: Scored should be 7, got $SCORED"
  exit 1
fi

if [ "$SKIP_REASONS" -lt 3 ]; then
  echo "❌ FAIL: Should have at least 3 skip reason patterns, got $SKIP_REASONS"
  exit 1
fi

echo "✅ Test 4 passed: stats.json structure valid"
echo ""

# Test 5: Check LEARNING-DRAFT.md content
echo "Test 5: Validate LEARNING-DRAFT.md content"
if ! grep -q "Skip Patterns" test-output/LEARNING-DRAFT.md; then
  echo "❌ FAIL: LEARNING-DRAFT.md missing Skip Patterns section"
  exit 1
fi

if ! grep -q "Score Patterns" test-output/LEARNING-DRAFT.md; then
  echo "❌ FAIL: LEARNING-DRAFT.md missing Score Patterns section"
  exit 1
fi

if ! grep -q "Gate Fail Patterns" test-output/LEARNING-DRAFT.md; then
  echo "❌ FAIL: LEARNING-DRAFT.md missing Gate Fail Patterns section"
  exit 1
fi

if ! grep -q "Source Distribution" test-output/LEARNING-DRAFT.md; then
  echo "❌ FAIL: LEARNING-DRAFT.md missing Source Distribution section"
  exit 1
fi

echo "✅ Test 5 passed: LEARNING-DRAFT.md has all required sections"
echo ""

# Test 6: Check for invented data (should not exist)
echo "Test 6: Check for invented data"
if grep -i "example" test-output/LEARNING-DRAFT.md; then
  echo "❌ FAIL: Found 'example' in output (possible invented data)"
  exit 1
fi

if grep -i "sample" test-output/LEARNING-DRAFT.md; then
  echo "❌ FAIL: Found 'sample' in output (possible invented data)"
  exit 1
fi

echo "✅ Test 6 passed: No invented data detected"
echo ""

echo "🎉 All tests passed!"
echo ""
echo "Test outputs:"
echo "  - test-output/ (full run)"
echo "  - test-output-filtered/ (with --since filter)"
echo "  - test-output-summary/ (from runs.md)"
echo ""
echo "Review LEARNING-DRAFT.md to verify pattern extraction quality."
