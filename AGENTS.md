# AGENTS.md — Brown Family & Owned-Business Ops

This repository is the **control plane** for Grok Bot and Cursor Cloud agents automating Grant and Liana Brown’s personal, family, and owned-business administration.

Employment-related workflows are out of scope. Do not add them.

## Who may act

- **Grok Bot** is the only orchestrator. The live Bot is the one Grant already set up in the Grok Bot desktop app (`docs/automation/bot-roster.yaml`, [x.ai/bot](https://x.ai/bot)). Do not recreate the retired six-role team. It reads `docs/automation/BUSINESS-REQUIREMENTS.md` and `docs/automation/SPEC.md`, updates `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`, and launches one specialised Cursor Cloud agent per phase or work package.
- **Google identities** are many. Agents must use every approved login in `docs/automation/google-accounts.yaml` (Gmail, Drive, Calendar). Hub-only (`grant830318@gmail.com`) is not sufficient — school and several Drive roots live elsewhere.
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

1. `docs/automation/RUNTIME.md` (which product, cost, standing approvals)
2. `docs/automation/BUSINESS-REQUIREMENTS.md`
3. `docs/automation/SPEC.md`
4. `docs/automation/FAMILY-COMMAND-CENTER.md` if the package touches school/medical/household money
5. `docs/automation/entity-map.yaml`
6. `docs/automation/GROK-BOT-AMENDMENTS.md` and `docs/automation/bot-roster.yaml` if the package touches Grok Bots
7. `docs/automation/GOOGLE-ACCOUNTS.md` and `docs/automation/google-accounts.yaml` if the package touches mail, Drive, or calendar
8. `docs/automation/approval-gates.md`
9. `docs/automation/STATUS.md`
10. `docs/automation/labor-ledger.md`
11. The launch prompt for the assigned phase in `docs/automation/launch-prompts.md`

Prefer Gmail filters and Grok Bot routines over daily Cloud Automations. Prefer standing `S*` approvals over per-item `H*` once a sample is green. Never scan the full inbox.

A phase is incomplete until it names a ritual it removes and writes an artefact Grant can use that week.

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
