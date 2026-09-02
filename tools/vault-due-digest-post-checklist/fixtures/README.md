# Test Fixtures for vault-due-digest-post-checklist

This directory contains test fixtures for the vault-due-digest-post-checklist tool.

## Fixtures

### healthy-pack/

A complete, valid vault-due-digest-pack output directory with:
- DIGEST.md (overview)
- APPROVAL.md (required)
- by-entity/ directory with entity packs (gab-trust, sars)
- missing-signals.md (optional)

**Expected result:** All checks pass, exit code 0

### missing-approval/

A pack directory missing the required APPROVAL.md file:
- DIGEST.md present
- APPROVAL.md **missing** (critical failure)

**Expected result:** Approval check fails, exit code 1

## Usage

```bash
# Test healthy pack (should pass)
npm run checklist -- --pack fixtures/healthy-pack --outdir test-out/healthy

# Test missing approval (should fail)
npm run checklist -- --pack fixtures/missing-approval --outdir test-out/missing-approval
```
