# Spec Kit

This repository uses [GitHub Spec Kit](https://github.com/github/spec-kit) (free MIT license) for spec-driven development with Cursor Cloud Agents.

## Workflow

Spec Kit provides a structured outer-loop coding workflow:

1. **Spec** → Define requirements using `/speckit-specify`
2. **Plan** → Create implementation plan using `/speckit-plan`
3. **Tasks** → Generate actionable tasks using `/speckit-tasks`
4. **Implement** → Execute implementation using `/speckit-implement`
5. **Converge** → Assess and append remaining work using `/speckit-converge`

## Optional Enhancement Skills

- `/speckit-clarify` - Ask structured questions to de-risk ambiguous areas (before planning)
- `/speckit-analyze` - Cross-artifact consistency & alignment report (after tasks)
- `/speckit-checklist` - Generate quality checklists (after planning)

## Integration

This project is configured with the `cursor-agent` integration. Skills are installed in `.cursor/skills/speckit-*` and are automatically available to Cursor Cloud Agents.

## Directory Structure

- `.specify/` - Spec Kit infrastructure (scripts, templates, workflows)
- `.cursor/skills/speckit-*` - Cursor Agent skills for spec-driven workflow
- `.specify/memory/constitution.md` - Project principles and constraints (template; customize via `/speckit-constitution`)

## Usage

Cursor Cloud Agents can invoke any skill directly. For example:

```
/speckit-specify "Add user authentication to GuestFlow"
```

The agent will follow the spec-driven workflow automatically.

## References

- [Spec Kit GitHub](https://github.com/github/spec-kit)
- [Specify CLI Docs](https://github.com/github/specify-cli)
