<!--
Sync Impact Report
- Version change: unfilled template → 1.0.0
- Modified principles: placeholders → I–VI named GuestFlow / UMI principles
- Added sections: Safety Constraints; Development Workflow
- Removed sections: none (template slots replaced)
- Follow-up TODOs: none
-->

# GuestFlow Constitution

## Core Principles

### I. Human-Gated Guest Send (NON-NEGOTIABLE)

Staff MUST Approve&Send every guest WhatsApp, email, or SMS. The system MUST
NOT auto-send. Drafts MAY be generated automatically after a spam/marketing
filter; they MUST remain unsent until a human reviews, edits if needed, and
confirms. `OUTBOUND_MODE=redirect` sinks MUST stay in place until a separate
go-live CLEAR. Approve-only MUST NOT send. Cron MUST NOT send.

Rationale: Guest-tone and legal risk sit with humans. Auto-send recreates the
labour and the incident surface this programme exists to remove.

### II. Fail-Closed Facts

Agents and GuestFlow MUST NEVER invent guest PII, rates, ETAs, access codes,
or contact details. Missing data MUST be flagged for staff. Unknown codes or
unmatched inbound MUST ask staff, not guess. Fail-closed is the default for
auth, outbound sinks, and matching.

Rationale: Invented facts become guest-facing errors and legal risk.

### III. Booking SoR vs Comms SoR

Nightsbridge remains the booking source of record. GuestFlow UMI is the
communications source of record, mirrored from bookings. One conversation
thread per booking, contact = booker. UMI MUST NOT replace Nightsbridge and
MUST NOT invent booking lines.

Rationale: Dual SoRs prevent comms from rewriting stay facts.

### IV. Channel Identity Freeze

Official WhatsApp Cloud From MUST stay `+27600200825`. Personal
`+27836458313` is observe-only (WA Web); it MUST NOT be converted to Cloud
API. Redirect sinks (WA `+15124064300`, email `grant830318@gmail.com`) MUST
NOT become From identities. New Twilio numbers MUST NOT be purchased without
CoS/Grant. No multi-tenant or retail expansion in this constitution.

Rationale: Number conversion drops the personal phone; buying numbers is a
fleet decision.

### V. Extend Live Systems, Stay Cost-Conscious

Prefer extending live GuestFlow tables, routes, and inboxes over parallel
products. One Cloud Agent per work package. Cheap models for classify/file;
expensive models only for exception reasoning. Never scan a full inbox.
Never log or commit secrets.

Rationale: Parallel systems create dual-write bugs and burn token budget.

### VI. Retention and Lane Separation

Guest contact and comms records MUST be retained **5 years after last stay
then delete** (CLEARED PROPOSAL-v3). Family, hospitality, Perfect Water,
Heavy Metal, and trust data MUST stay in separate Drive / label / vault
lanes. Employment workflows are out of scope.

Rationale: Retention is already CLEARED; mixing lanes leaks family medical
or trust content into hospitality ops.

## Safety Constraints

- Default to draft / queue / flag. Auto-send is opt-in per template after a
  measured dry run and a standing `S*` or `H1`/`H2` gate.
- Never send a client, bank, attorney, or family message unless a gate in
  `docs/automation/approval-gates.md` is already approved for that class.
- Do not touch auth, JWT, payment, or env-secret handling without explicit
  Grant approval.
- Do not force-push, apply production schema migrations, or change production
  DNS without `APPROVE APPLY MIGRATION` / `APPROVE DEPLOY`.
- WhatsApp Coexistence and live-number registration remain `G4`/`N4`.
- Time zones: `America/Chicago` for household decisions;
  `Africa/Johannesburg` (SAST) for SA guest operations.

## Development Workflow

- Spec Kit phases run in order: constitution (if gaps block) → specify →
  plan → tasks → optional clarify/analyze → implement → converge until
  Converged.
- Docs-only packages: links resolve, YAML parses, STATUS updated.
- Code packages: lint/build/test for the touched repo; no production deploy
  without Grant.
- Email/Drive packages: dry-run on a labelled sample first.
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`,
  `docs(scope):`, `test(scope):`.
- A phase is incomplete until it names a ritual it removes and writes an
  artefact Grant can use that week.
- PRs stop at READY for GFM acceptance. Agents MUST NOT merge.

## Governance

This constitution supersedes informal practice for GuestFlow and control-plane
work in this repository. Amendments MUST update this file, bump the version
(MAJOR for incompatible principle changes, MINOR for new principles, PATCH
for clarifications), set Last Amended to the change date, and record the
reason in STATUS. All PRs that touch GuestFlow comms MUST verify Principles
I–IV. Complexity MUST be justified against Principle V. Runtime guidance
lives in `docs/automation/RUNTIME.md` and `docs/automation/approval-gates.md`.

**Version**: 1.0.0 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-09-24
