# Family filter dry-run — 22 Aug 2026

## Labels created (live on grant830318@gmail.com)

| Label | Id |
| --- | --- |
| Family/School | Label_51 |
| Family/Medical | Label_52 |
| Family/Finance | Label_53 |
| Family/Budget | Label_54 |
| Family/Calendar | Label_55 |
| Family/FileOnly | Label_56 |
| Family/Action | Label_57 |

`Personal/Family` (Label_47) left in place.

## Filters

`create_filter` returned **403** (Gmail settings scope not granted to this Cloud Agent). Filters are specified in `docs/automation/family-filters.yaml` for Grant to add in Gmail Settings → Filters, or after `APPROVE` of settings scope.

**Create the AISD filters on `thebrownsusa@gmail.com` (and Liana if that is a third mailbox).** The hub (`grant830318@gmail.com`) had zero `from:austinisd.org` in 90 days. Hub-only filters will not catch school mail.

Manual equivalents (on **each** mailbox that receives the mail):

1. From `austinisd.org` → apply Family/School (routing only)
2. From `wesbank.co.za` → Family/Finance

Do **not** create the old action-word → Family/Action filter. Family Bot AI classifies labelled School threads (`DIGEST CLASSIFY: ai`, 2026-08-23).

Do not skip Inbox until `APPROVE FAMILY FILE`.

## Backfill

- WesBank thread `1a0249e97983de43` labelled Family/Finance.
- No `from:austinisd.org` hits on this mailbox in 90 days — school mail may arrive on another account (Liana / thebrownsusa) or as Drive shares. `G1` if a second mailbox is needed.

## Bodies

None quoted.
