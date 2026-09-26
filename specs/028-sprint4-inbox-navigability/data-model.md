# Data Model: Sprint 4 Inbox Navigability

**Feature**: 028-sprint4-inbox-navigability  
**Created**: 2026-09-26  
**Phase**: 1 (Design & Contracts)

## Overview

This feature is primarily UI layout improvements with no new data entities or database changes. Existing data models remain unchanged.

## Existing Entities (Unchanged)

### Thread
- **Purpose**: Represents a guest conversation
- **Key Attributes**: 
  - `id` (string): Unique thread identifier
  - `guestName` (string): Guest display name
  - `suiteName` (string): Accommodation suite
  - `checkIn` (date): Arrival date
  - `checkOut` (date): Departure date
  - `nbRef` (string): Nightsbridge booking reference
  - `lastChannel` (string): Last communication channel used
  - `windowClosed` (boolean): Whether booking window is closed
- **Relationships**: Has many Messages, has one Contact
- **Validation**: Required fields: id, guestName, suiteName, dates; nbRef format NB-XXXX
- **State**: No state transitions

### Contact
- **Purpose**: Staff-editable contact information for guest
- **Key Attributes**:
  - `staffPhone` (string, optional): Staff-entered phone number
  - `staffEmail` (string, optional): Staff-entered email address
- **Relationships**: Belongs to Thread
- **Validation**: Email format if provided; phone format if provided; both can be empty
- **State**: No state transitions

### Message
- **Purpose**: Individual message in thread
- **Key Attributes**:
  - `id` (string): Unique message identifier
  - `threadId` (string): Parent thread
  - `content` (string): Message text
  - `channel` (string): WhatsApp Cloud/Web, Email, SMS
  - `direction` (string): inbound/outbound
  - `timestamp` (date): Message timestamp
  - `deliveryStatus` (string, optional): sent/delivered/read/failed
- **Relationships**: Belongs to Thread
- **Validation**: Required fields: id, threadId, content, channel, direction, timestamp
- **State**: Delivery status transitions (draft → pending → sent → delivered → read) or (draft → failed)

## UI State (Client-Side Only)

### DetailsSheetState
- **Purpose**: Controls visibility of thread details/contact edit modal
- **Attributes**:
  - `isOpen` (boolean): Whether sheet is visible
  - `editedPhone` (string): Phone input value during edit
  - `editedEmail` (string): Email input value during edit
- **Lifecycle**: Opens on Details button click; closes on Save/Cancel/overlay click
- **Storage**: React component state (useState)

### ComposerDisclosureState
- **Purpose**: Controls visibility of template/care section in composer
- **Attributes**:
  - `isExpanded` (boolean): Whether template/care is visible
- **Lifecycle**: Toggles on button click
- **Storage**: React component state (useState); could persist to localStorage for user preference

## Data Flow

1. **Thread List → Thread Detail**: Existing UMI API routes unchanged (`/api/umi/inbox`, `/api/umi/threads/[id]`)
2. **Contact Edit**: Existing POST `/api/umi/threads/[id]/contacts` saves staffPhone and staffEmail
3. **Message Send**: Existing POST `/api/umi/threads/[id]/approve` with Approve&Send human gate
4. **Template Selection**: Existing template list API (if any) unchanged
5. **Care Notes**: Existing draft save API unchanged

## No Schema Changes

- No database migrations required
- No API contract changes
- No new tables or columns
- Existing validation rules unchanged

## Summary

Data model analysis confirms this is a pure UI refactoring feature. All existing data entities, relationships, validation rules, and API contracts remain unchanged. New UI state (DetailsSheetState, ComposerDisclosureState) is client-side only and does not require persistence beyond optional localStorage for user preferences.
