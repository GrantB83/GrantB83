# Studio Lyric Package Stub — Approval Gates

This stub package is **offline only**. No YouTube upload. No Suno API spend. No invented lyrics.

## Hard Rules

1. **Never uploads to YouTube** — No YouTube API calls, no browser automation
2. **Never invents lyrics** — Exact copy from input only
3. **Manual paste workflow** — Human paste in Suno UI required
4. **Drive approval required** — Finished video → thebrownsusa Drive
5. **Grant approval required** — Grant must approve in CoS chat before any YouTube upload

## Workflow

1. **Stub created** ← You are here
2. **Validate package** — Run studio-suno-package-validate
3. **Manual paste** — Human paste lyrics into Suno UI
4. **Video production** — Suno generates, human downloads
5. **Upload to Drive** — Finished video → thebrownsusa Drive (REQUIRED)
6. **Request approval** — Share Drive link with Grant in CoS chat
7. **Grant reviews** — Grant approves or requests changes
8. **YouTube upload** — Only after Grant approval (NEVER AUTO-UPLOAD)

## What This Tool Does NOT Do

- ❌ No YouTube uploads
- ❌ No Suno API calls (official or unofficial)
- ❌ No Google Drive uploads
- ❌ No browser automation
- ❌ No lyrics invention (exact copy from input file)
- ❌ No file modifications (read-only on source)

## What This Tool DOES

- ✅ Creates stub package folders from lyric text files
- ✅ Copies lyrics exactly (never rewrites meaning)
- ✅ Generates required package files
- ✅ Derives safe stub title from first lyric line if title not provided
- ✅ Supports optional metadata (title, artist, mood, notes)
- ✅ Works 100% offline
- ✅ Exits with error if lyrics are empty
