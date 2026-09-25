# Contracts

**Feature**: Alert Noise Filter for Test and Empty Threads

## No External Contracts

This feature modifies internal staff alert evaluation logic only. There are no external interfaces, public APIs, or user-facing contracts.

The alert exclusion behavior is an internal implementation detail of the GuestFlow staff alert system and does not expose any new interfaces to:
- External systems
- Other services
- Guest-facing applications
- Staff UI (alerts simply don't appear for excluded threads)

## Internal Interfaces (Modified)

### `evaluateUnanswered()` Function

**Module**: `apps/guestflow/src/lib/staff-alerts.ts`

**Purpose**: Evaluate pending threads and dispatch unanswered alerts to staff

**Modified Behavior**: 
- Now excludes three additional categories of threads before alert dispatch
- Exclusion is transparent to callers (no signature changes)

**No Breaking Changes**: Existing calls from cron route `/api/cron/alerts-evaluate` continue to work without modification.

### New Internal Helpers (Non-Public)

Module `staff-alert-filters.ts` exports helper functions for internal use only:

```typescript
// These are NOT public contracts - internal implementation only
export function isSmokeTestThread(thread): boolean
export function isEmptyBlockBooking(db, thread): Promise<boolean>
export function shouldExcludeFromAlerts(db, thread, staffEmails): Promise<boolean>
```

These helpers are subject to change and should not be considered stable interfaces outside of the staff-alerts module.

## Summary

No public contracts. No external interface changes. This is an internal logic enhancement only.
