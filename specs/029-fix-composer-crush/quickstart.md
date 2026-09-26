# Quickstart Validation: Fix Composer Crush on Unmatched/Window-Closed Threads

**Date**: 2026-09-26  
**Feature**: [spec.md](./spec.md)

## Prerequisites

- Node.js 20+ installed
- Repository cloned: `GrantB83/GrantB83`
- Branch: `cursor/fix-composer-crush-f4a8`
- Working directory: `/workspace`

## Setup

### 1. Install Dependencies

```bash
cd /workspace/apps/guestflow
npm install
```

**Expected**: No errors, `node_modules/` populated

### 2. Verify Database

```bash
# Check if demo database exists
ls -lh guestflow-browns.db

# If missing, initialize demo data
npm run db:init
npm run seed:browns
```

**Expected**: `guestflow-browns.db` file exists (~100KB+)

### 3. Start Development Server

```bash
npm run dev
```

**Expected**: Server starts on `http://localhost:3100`

```
 ✓ Ready in 2.3s
 ○ Compiling /page ...
 ✓ Compiled /page in 1.2s
```

## Validation Scenarios

### Scenario 1: Desktop Unmatched Thread (Primary Fix)

**Purpose**: Verify composer is fully visible on unmatched + window-closed threads

**Viewport**: ~1280×800 (desktop)

**Steps**:
1. Open browser: `http://localhost:3100/?thread=28`
   - Thread 28 is unmatched temp (+27722219581) with window closed
2. Observe layout:
   - Header shows: phone number, "Last: whatsapp_web", "Window closed" badge
   - Unmatched panel: one-line strip "Unmatched — Link to booking ▾"
   - Transcript: metadata-only messages visible, scrolls independently
   - Composer: channel chips + textarea (≥2 lines) + "Approve & Send" button

**Expected Outcome**:
- ✅ Composer fully visible in viewport (no scrolling page needed)
- ✅ Unmatched panel collapsed by default (one line ~48px)
- ✅ ONE care window indicator (header badge only, no duplicate in composer)
- ✅ Transcript scrolls; chrome and composer fixed

**Pass Criteria**:
```
Composer min-height visible: YES
  - Channel chips row visible: YES
  - Textarea ≥2 lines visible: YES
  - Approve&Send button visible: YES
Chrome height: ≤150px (collapsed unmatched)
Transcript overflow-y: auto
```

**Fail Indicators**:
- ❌ Composer clipped below viewport (need to scroll page)
- ❌ Unmatched panel expanded by default (tall card ~140px)
- ❌ Duplicate "Window closed" notice in composer
- ❌ Chrome + transcript both scrollable

---

### Scenario 2: Desktop Unmatched Panel Expansion

**Purpose**: Verify expanded unmatched panel is capped at ~96px

**Viewport**: ~1280×800 (desktop)

**Steps**:
1. Continue from Scenario 1 (thread 28)
2. Click one-line unmatched strip
3. Observe expanded panel:
   - Dropdown with booking options
   - "Link to booking" button
   - Panel height capped at ~96px

**Expected Outcome**:
- ✅ Panel expands to show dropdown + button
- ✅ Panel max-height ~96px (`max-h-24`)
- ✅ If >5 booking options, panel scrolls internally (`overflow-y-auto`)
- ✅ Composer still fully visible (no push-off)

**Pass Criteria**:
```
Expanded panel height: ≤96px
Internal scroll if needed: YES
Composer still visible: YES
Chrome total height: ≤200px
```

**Fail Indicators**:
- ❌ Panel grows >120px uncapped
- ❌ Composer pushed below viewport
- ❌ No internal scroll (booking list truncated)

---

### Scenario 3: Desktop Matched Thread (Regression Test)

**Purpose**: Verify fix does not break matched thread composer

**Viewport**: ~1280×800 (desktop)

**Steps**:
1. Navigate to inbox: `http://localhost:3100/`
2. Click any matched thread (booking icon, not "Temp · " label)
   - Example: "Ilonka & Richard Stougie" or similar
3. Observe layout:
   - Header shows: guest name, suite, dates, "NB-XXXX", last channel
   - No unmatched panel (matched thread)
   - Transcript scrolls
   - Composer fully visible

**Expected Outcome**:
- ✅ Composer fully visible (no regression)
- ✅ Transcript scrolls independently
- ✅ If draft exists, draft notice + textarea + Approve&Send visible

**Pass Criteria**:
```
Composer visible: YES
No unmatched panel: YES (matched thread)
Transcript scroll: YES
No layout regression: YES
```

**Fail Indicators**:
- ❌ Composer clipped on matched thread
- ❌ Layout different from pre-fix behavior

---

### Scenario 4: Mobile Thread-Only View

**Purpose**: Verify composer usable on mobile viewport

**Viewport**: ~390×844 (iPhone SE / Android equivalent)

**Steps**:
1. Resize browser to ~390px width or use DevTools device emulation
2. Navigate to thread: `http://localhost:3100/?thread=28`
3. Observe layout:
   - Back button visible (top-left)
   - Thread-only view (list hidden)
   - Composer visible with reduced textarea rows

**Expected Outcome**:
- ✅ Composer usable (chips + textarea 2 rows + button)
- ✅ Transcript scrolls
- ✅ Back button restores list

**Pass Criteria**:
```
Composer visible: YES
Textarea rows: 2 (reduced for mobile)
Back button: YES
Tap Back → list restored: YES
```

**Fail Indicators**:
- ❌ Composer clipped on mobile
- ❌ Back button missing
- ❌ List not restored after Back

---

### Scenario 5: Keyboard Open (Mobile Simulation)

**Purpose**: Verify composer remains accessible when keyboard opens

**Viewport**: ~390×844 (mobile)

**Steps**:
1. Continue from Scenario 4 (mobile thread 28)
2. Focus textarea (click inside)
3. Simulate keyboard: append `?keyboard=1` to URL
   - URL: `http://localhost:3100/?thread=28&keyboard=1`
4. Observe layout with keyboard inset

**Expected Outcome**:
- ✅ Composer visible (may reduce textarea rows further)
- ✅ Approve&Send button still accessible
- ✅ Transcript reduced height but still scrollable

**Pass Criteria**:
```
Composer visible: YES
Textarea rows: 2 (or 1 if keyboardInsetPx > 150)
Approve&Send visible: YES
```

**Fail Indicators**:
- ❌ Composer or button clipped when keyboard shown
- ❌ No way to access Approve&Send

---

## Build & Lint Validation

### Build Check

```bash
cd /workspace/apps/guestflow
npm run build
```

**Expected Output**:
```
▲ Next.js 14.2.x
✓ Creating an optimized production build
✓ Compiled successfully
✓ Collecting page data
✓ Finalizing page optimization

Route (app)                  Size
┌ ○ /                        142 kB
...
```

**Pass Criteria**: No TypeScript errors, build succeeds

---

### Lint Check

```bash
npm run lint
```

**Expected Output**:
```
✔ No ESLint warnings or errors
```

**Pass Criteria**: No lint errors

---

## Visual Walkthrough Artifacts

### Screenshots to Capture

1. **Desktop Unmatched Collapsed** (`thread-28-desktop-collapsed.png`):
   - Thread 28, unmatched panel one-line strip, composer fully visible

2. **Desktop Unmatched Expanded** (`thread-28-desktop-expanded.png`):
   - Thread 28, unmatched panel expanded (~96px), composer still visible

3. **Desktop Matched Thread** (`matched-thread-desktop.png`):
   - Any matched thread, no unmatched panel, composer visible

4. **Mobile Thread-Only** (`thread-28-mobile.png`):
   - Thread 28, mobile viewport ~390px, composer usable

### Screen Recording (Optional)

**File**: `composer-fix-demo.mp4`

**Script**:
1. Start at inbox list (desktop ~1280×800)
2. Click thread 28 → composer visible
3. Scroll transcript → composer stays fixed
4. Click unmatched strip → expands, composer still visible
5. Resize to mobile ~390px → thread-only, composer usable
6. Tap Back → list restored

**Duration**: ~30 seconds

**Tools**: macOS QuickTime, Windows Game Bar, Chrome DevTools screen capture

---

## Success Criteria Summary

**Operator Job PASS**: Staff can read transcript and reply via composer on unmatched + window-closed threads without scrolling page or hunting clipped controls.

**Proxy ACs**:
- [x] Desktop ~1280×800 unmatched thread 28: composer min band fully visible (chips + ≥2-line textarea + Approve&Send)
- [x] Desktop matched thread: no regression, composer fully visible
- [x] Mobile ~390px thread-only: usable composer, Back restores list
- [x] Redirect behavior unchanged (no gold banner reintroduced)
- [x] Scroll floors from #235 preserved (transcript scrolls, chrome + composer fixed)

**Operator-Job AC**: Staff can triage → read → reply on unmatched/window-closed AND matched threads without clipped composer.

---

## Rollback Plan

If validation fails:

1. **Revert Changes**:
   ```bash
   git checkout main -- apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
   git checkout main -- apps/guestflow/src/app/page.tsx
   npm run dev
   ```

2. **Report Issue**: Document failing scenario (screenshot + steps) in PR comment

3. **Re-test**: After fix iteration, repeat validation scenarios

---

## Next Steps

**After Validation PASS**:
1. Capture walkthrough artifacts (screenshots + optional video)
2. Commit changes with message: `fix(guestflow): prevent composer crush on unmatched threads`
3. Push branch: `git push -u origin cursor/fix-composer-crush-f4a8`
4. Create draft PR with title: "Sprint 4: Fix composer crush on unmatched/window-closed threads"
5. PR body: link to spec.md, list proxy ACs, note operator-job AC testable on Preview
6. Mark PR ready for review after speckit-converge confirms implementation complete

**Merge Hold**: Do not merge until GFM ACCEPT gate (Coding/GFM review approval)
