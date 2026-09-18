# Data Model: Daily Brief Staff Enqueue

**Feature**: 003-daily-brief-staff-enqueue

## No new entities

This PR adds **no database tables or migrations**. Enqueue is blocked pending a future staff-ops draft entity.

## Existing entities (read-only reference)

### DailyBriefSnapshot / briefText

From PR #187 `src/lib/daily-brief.ts`. WhatsApp-ready plain text via `generateWhatsAppBrief()`.

### Approval queue items (unsuitable)

See `research.md` inventory. All current types assume guest phone destination for Send.

## API extension (response only)

```typescript
interface DailyBriefEnqueueGate {
  enqueueSupported: boolean
  enqueueBlocker: string | null
  approvalQueuePath: '/needs-approval'
  fallbackActions: ['copy', 'export_text', 'export_markdown']
}
```

GET `/api/daily-brief` appends gate fields to existing JSON response.
