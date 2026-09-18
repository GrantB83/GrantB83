# Data Model: Staff Ops Copy-Only Approvals

**Feature**: 004-staff-ops-copy-only-approvals

## New entity: StaffOpsDraft

**Table**: `staff_ops_drafts`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| tenant_id | INTEGER FK | tenants(id) |
| brief_date | TEXT | YYYY-MM-DD |
| draft_content | TEXT | WhatsApp-ready text from brief lib |
| status | TEXT | `pending_approval` \| `approved` \| `rejected` |
| created_at | DATETIME | Default CURRENT_TIMESTAMP |
| updated_at | DATETIME | On status change |
| approved_at | DATETIME | Nullable |
| approved_by | TEXT | Nullable |
| rejected_at | DATETIME | Nullable |
| rejected_by | TEXT | Nullable |
| actor | TEXT | Enqueue actor (optional) |

**Indexes**:

- `idx_staff_ops_drafts_tenant_status` on `(tenant_id, status)`
- Partial unique: one pending per `(tenant_id, brief_date)`

## Approval queue projection

Union into GET `/api/approvals`:

| Field | staff_ops value |
|-------|-----------------|
| type | `staff_ops` |
| guest | `Daily brief {brief_date}` |
| guest_phone | `null` |
| metadata.copy_only | `true` |
| metadata.brief_date | ISO date string |
| source | `daily-brief` |

## Existing entities (unchanged)

- DailyBriefSnapshot / briefText — PR #187
- Guest approval types — unchanged; Send still guest-only
