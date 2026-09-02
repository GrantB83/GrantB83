# YouTube Upload Approval Gate

## Hard Rules

1. **CoS chat Drive link REQUIRED:** Grant bots must include Drive approval link before any YouTube upload request
2. **Grant must approve in CoS:** No auto-upload, ever
3. **Never auto-upload:** This tool and all Studio tools are offline only
4. **Studio owns paste workflow only:** Manual Chrome paste to Suno; no YouTube upload automation

## Approval Flow

```
1. Studio/BrownieTunez runs preflight (this tool)
2. If preflight passes → Studio prepares package
3. CoS bot shares Drive link in chat
4. Grant reviews and approves in CoS
5. Only then: Studio may upload to YouTube
```

## What This Tool Does NOT Do

- ❌ No YouTube API calls
- ❌ No Suno API calls
- ❌ No Drive uploads
- ❌ No WhatsApp sends
- ❌ No auto-upload of any kind
- ❌ No invention of lyrics, titles, or URLs

## What This Tool DOES

- ✅ Validates package files are present
- ✅ Checks validation report (if provided)
- ✅ Verifies Drive approval link is present
- ✅ Checks video file exists (optional)
- ✅ Scans for PII patterns in lyrics
- ✅ Generates preflight reports
- ✅ Works 100% offline

## Ownership

- **Studio/BrownieTunez:** Manual Chrome/Suno paste workflow
- **CoS:** Drive link sharing and Grant approval coordination
- **Grant:** Final YouTube upload approval decision

This tool is a **preflight checker only**. It does not replace human judgment or approval gates.
