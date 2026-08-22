# AGENTS.md — Brown Family & Owned-Business Ops

This repository is the **control plane** for Grok Bot and Cursor Cloud agents automating Grant and Liana Brown’s personal, family, and owned-business administration.

Employment-related workflows are out of scope. Do not add them.

## Who may act

- **Grok Bot** is the only orchestrator. It reads `docs/automation/SPEC.md`, updates `docs/automation/STATUS.md`, and launches one specialised Cursor Cloud agent per phase or work package.
- **Cursor Cloud agents** implement a single assigned work package, then stop.
- **Humans** (Grant, Liana) approve anything in `docs/automation/approval-gates.md`. Agents never bypass a gate.

## Hard rules

1. Edit only files listed in the assigned work package. Ask before widening scope.
2. Never commit, log, or print secrets. Use named environment secrets only.
3. Never send a client, bank, attorney, or family message unless a gate is already approved for that class of send.
4. Default to **draft / queue / flag**. Auto-send is opt-in per template after a measured dry run.
5. Keep family, hospitality, Perfect Water, Heavy Metal, and trust data in separate Drive / label / vault lanes.
6. Do not invent rates, stock levels, legal advice, or tax positions. Quote only from approved knowledge files.
7. Prefer extending existing repos and inboxes over new products.
8. Stay cost-conscious: one agent, one package, cheap models for classify/file, expensive models only for exception reasoning.
9. Time zones: operate as `America/Chicago` for household decisions and `Africa/Johannesburg` for SA operations. Never assume the Google Calendar primary timezone is current.
10. Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`, `docs(scope):`, `test(scope):`.

## Required reading before any implementation agent starts

1. `docs/automation/SPEC.md`
2. `docs/automation/entity-map.yaml`
3. `docs/automation/approval-gates.md`
4. `docs/automation/STATUS.md`
5. The launch prompt for the assigned phase in `docs/automation/launch-prompts.md`

## Quality gates

- Docs-only packages: links resolve, YAML parses, STATUS updated.
- Code packages: lint/build/test for the touched repo; no production deploy without Grant.
- Email/Drive packages: dry-run on a labelled sample first; never bulk-move or bulk-label the whole inbox on the first pass.

## Do-not-touch without explicit Grant approval

- Auth, JWT, payment, and env-secret handling in any app
- WhatsApp Cloud API number registration or Coexistence changes
- Bank payments, forex instructions, or attorney correspondence
- Family legal / tax-emigration / school medical files
- Force-push, schema migrations, or production DNS
