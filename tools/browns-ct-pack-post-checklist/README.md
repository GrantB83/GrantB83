# browns-ct-pack-post-checklist

**One-line:** Offline CLI tool to generate pre-WhatsApp post checklist from browns-ct-pack-assemble output folder before 20:00 / 09:00 / 21:00 CT Admin posts.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-ct-pack-post-checklist/`

## Purpose

Generates a pre-WhatsApp post checklist for CoS / SA Ops manual review **before** any CT timed Admin post for The Browns Dullstroom. Validates pack structure, flags warnings, and provides numbered go/no-go items. Never sends. Never invents guest phones/rates/ETAs. Dullstroom / The Browns only.

**Scope:**
- Validates `browns-ct-pack-assemble` output folder
- Checks for required files (PACK.md, APPROVAL.md)
- Warns if PACK.md timed checklist references missing sibling files
- Warns if welcome/ops/late files empty when slot expects them
- Reminds last-minute booking-change-check before post if changes.md absent
- Generates numbered checklist for CoS approval workflow
- **Never sends WhatsApp messages**
- **Never invents guest phones, rates, or ETAs**
- **Dullstroom / The Browns only**

**Safety:**
- ✅ **Offline only** - No WhatsApp Cloud API calls
- ✅ **Read-only** - Validates pack structure only
- ✅ **Never invents** - No guest phones, rates, or ETAs fabricated
- ✅ **CoS owns WhatsApp** - Never auto-sends
- ✅ **Scope boundary** - Dullstroom / The Browns only

## Install and Run

```bash
cd tools/browns-ct-pack-post-checklist
npm install
npm run build

# Basic usage
npm run checklist -- --pack ./ct-2026-09-20 --outdir out/

# With slot emphasis
npm run checklist -- --pack ./ct-2026-09-20 --outdir out/ --slot 20:00

# Test with fixtures
npm run test:fixtures
```

## CLI Options

### Required
- `--pack <dir>` — Path to pack folder from `browns-ct-pack-assemble`
- `--outdir <dir>` — Output directory for checklist files

### Optional
- `--slot <slot>` — Tailor checklist emphasis to specific slot: `20:00` | `09:00` | `21:00` | `all`

## Pack Structure Expected

The tool expects a pack directory with the following structure:

```
pack-dir/
├── PACK.md (required)
├── APPROVAL.md (required)
├── daily-ops.md (optional)
├── changes.md (optional)
├── queue.md (optional)
├── unknown-time.md (optional)
├── guest-*.md (optional)
└── welcome-*.md (optional)
```

## Output Files

The tool generates four files in the specified output directory:

1. **POST-CHECKLIST.md** — Numbered go/no-go checklist for CoS WhatsApp Admin - The Browns
2. **ISSUES.md** — Failures and warnings only (empty if all checks pass)
3. **APPROVAL.md** — CoS owns WhatsApp; Grant approval; never auto-send; never invent data; offline only
4. **manifest.json** — Machine-readable checklist metadata

## Checks Performed

The tool performs the following heuristic, read-only checks:

1. **Required files present:**
   - PACK.md exists
   - APPROVAL.md exists

2. **Timed checklist references:**
   - Warns if PACK.md references guest/welcome drafts but no guest-*.md or welcome-*.md files present
   - Warns if PACK.md references ops but daily-ops.md not present
   - Warns if PACK.md references changes but changes.md not present
   - Warns if PACK.md references late check-ins but queue.md/unknown-time.md not present

3. **Slot expectations (if --slot specified):**
   - 20:00 CT: Warns if no welcome or guest draft files present
   - 09:00 CT: Warns if no late check-in queue files present
   - 21:00 CT: Warns if no daily-ops.md file present

4. **Booking changes:**
   - Reminds to perform last-minute booking-change-check if changes.md absent
   - Warns if changes.md present but empty

## Critical Safety Notes

- ✅ **OFFLINE ONLY** — No WhatsApp APIs or network calls
- ✅ **READ-ONLY** — Validates pack structure only; never modifies files
- ✅ **NEVER INVENTS** — No guest phones, rates, or ETAs fabricated
- ✅ **DULLSTROOM / THE BROWNS ONLY** — Scope boundary
- ✅ **CoS OWNS WHATSAPP** — Never auto-sends; manual approval workflow only
- ⚠️ **MANUAL REVIEW REQUIRED** — Every checklist before WhatsApp posting

## Typical Workflow

1. **Generate CT pack:**
   ```bash
   cd tools/browns-ct-pack-assemble
   npm run assemble -- --day 2026-09-20 --outdir ct-2026-09-20/ \
     --bookings bookings.json \
     --before before.json \
     --after after.json
   ```

2. **Generate post checklist:**
   ```bash
   cd ../browns-ct-pack-post-checklist
   npm run checklist -- --pack ../browns-ct-pack-assemble/ct-2026-09-20 \
     --outdir checklist-2026-09-20/ \
     --slot 20:00
   ```

3. **Review outputs:**
   - Read `POST-CHECKLIST.md` for numbered go/no-go items
   - Review `ISSUES.md` for any failures or warnings
   - Check `APPROVAL.md` for CoS workflow gates

4. **CoS approval workflow:**
   - CoS reviews all checklist items
   - CoS obtains Grant authorization for WhatsApp posting
   - CoS manually drafts and sends WhatsApp Admin - The Browns messages
   - **Never** bypass manual approval gates

## Integration with browns-ct-pack-assemble

This tool is designed to run immediately after `browns-ct-pack-assemble`:

```bash
# Generate CT pack
cd tools/browns-ct-pack-assemble
npm run assemble -- --day 2026-09-20 --outdir ct-2026-09-20/ \
  --bookings bookings.json \
  --run-daily-ops \
  --run-welcome

# Validate pack before posting
cd ../browns-ct-pack-post-checklist
npm run checklist -- --pack ../browns-ct-pack-assemble/ct-2026-09-20 \
  --outdir checklist-2026-09-20/ \
  --slot all

# Review and post (manual)
# ... CoS reviews outputs and posts to WhatsApp Admin - The Browns ...
```

## Slot Emphasis

The `--slot` option tailors checklist warnings to specific CT time slots:

### 20:00 CT (Same-day morning guest drafts)
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir out/ --slot 20:00
```
- Emphasizes guest/welcome draft presence
- Warns if no guest-*.md or welcome-*.md files present
- Focuses on guest communications

### 09:00 CT (After-hours check-ins)
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir out/ --slot 09:00
```
- Emphasizes late check-in queue presence
- Warns if no queue.md or unknown-time.md files present
- Focuses on after-hours coordination

### 21:00 CT (Staff ops brief)
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir out/ --slot 21:00
```
- Emphasizes daily-ops.md presence
- Warns if daily-ops.md missing
- Focuses on team WhatsApp coordination

### All (No specific emphasis)
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir out/ --slot all
```
- Checks all slot expectations
- Comprehensive warnings for all time slots
- Default if --slot omitted

## Testing

### Run fixture tests
```bash
npm run test:fixtures
```

### Manual testing
```bash
# Test with healthy pack
npm run checklist -- --pack fixtures/healthy-pack --outdir test-healthy/

# Test with missing APPROVAL file (expect exit 1)
npm run checklist -- --pack fixtures/missing-approval-pack --outdir test-missing/
```

## Exit Codes

- **0** — Success (all critical checks passed, warnings OK)
- **1** — Failure (missing required files or pack path issues)

## Entity Context

- **Lane:** hospitality (The Browns / Dullstroom only)
- **Timezone:** America/Chicago (CT = Chicago Time for timed operations)
- **Target desk:** SA Ops / CoS
- **Automation:** Offline checklist validation only; CoS owns send path

## Project Structure

```
tools/browns-ct-pack-post-checklist/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── types.ts        # TypeScript type definitions
│   └── checker.ts      # Pack validation and checklist generation
├── fixtures/
│   ├── healthy-pack/           # Valid pack (all files present)
│   │   ├── PACK.md
│   │   ├── APPROVAL.md
│   │   ├── daily-ops.md
│   │   ├── guest-henderson.md
│   │   ├── welcome-queue.md
│   │   ├── queue.md
│   │   └── changes.md
│   └── missing-approval-pack/  # Invalid pack (APPROVAL.md missing)
│       ├── PACK.md
│       └── guest-doe.md
├── dist/               # Compiled JavaScript (generated by tsc)
├── test-out/           # Test outputs (generated by npm run test:fixtures)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md           # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No auto-send** - All outputs are drafts for manual review and send
- ❌ **No WhatsApp API** - Does not connect to WhatsApp Business API
- ❌ **No email sending** - Does not send emails
- ❌ **No data invention** - Never fabricates guest phones, rates, or ETAs
- ❌ **No browser automation** - Offline only
- ❌ **No API calls** - Offline validation only

### What This Tool Does

- ✅ **Validates pack structure** from browns-ct-pack-assemble
- ✅ **Checks required files** (PACK.md, APPROVAL.md)
- ✅ **Warns on missing sibling files** referenced in PACK.md
- ✅ **Tailors checklist to slot** (20:00 / 09:00 / 21:00 / all)
- ✅ **Generates POST-CHECKLIST.md** with numbered go/no-go items
- ✅ **Generates ISSUES.md** with failures and warnings
- ✅ **Generates APPROVAL.md** with CoS workflow and safety gates
- ✅ **Produces manifest.json** for machine-readable metadata

### Data Privacy

- **Never commit real guest data to git**
- Keep actual pack folders local only (e.g., `ct-2026-09-20/`)
- `.gitignore` already excludes `test-out/` and `out/` directories
- Fixtures use fictional names for testing

## Workflow: CoS CT Pack Daily Routine

### Recommended Flow

1. **Generate CT pack (before timed slots):**
   ```bash
   cd tools/browns-ct-pack-assemble
   npm run assemble -- --day $(date +%Y-%m-%d) --outdir ct-$(date +%Y-%m-%d)/ \
     --bookings bookings.json \
     --run-daily-ops \
     --run-welcome
   ```

2. **Validate pack before posting:**
   ```bash
   cd ../browns-ct-pack-post-checklist
   npm run checklist -- --pack ../browns-ct-pack-assemble/ct-$(date +%Y-%m-%d) \
     --outdir checklist-$(date +%Y-%m-%d)/ \
     --slot all
   ```

3. **Review checklist:**
   - Open `POST-CHECKLIST.md` for numbered go/no-go items
   - Review `ISSUES.md` for any failures or warnings
   - Check `APPROVAL.md` for CoS workflow gates

4. **Timed sends (manual):**
   - **20:00 CT**: Guest welcome messages (Liana vet / Grant approve)
   - **09:00 CT**: After-hours check-in review
   - **21:00 CT**: Staff ops brief to team WhatsApp

### Why Run Checklist Before Each Post?

**Reliability:** Catches missing files, empty drafts, and pack structure issues before CoS spends time drafting WhatsApp messages.

**Safety gates:** Reminds CoS of hard gates (never auto-send, never invent data, Grant approval required).

**Slot-specific warnings:** Tailors checklist emphasis to the specific CT time slot being posted.

**Cost-conscious:** One offline validator, minimal compute, offline-first.

## Troubleshooting

### "Error: --pack is required"

Provide the pack path:
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir out/
```

### "Error: --outdir is required"

Specify output directory:
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir checklist/
```

### "Error: --slot must be one of: 20:00, 09:00, 21:00, all"

Use valid slot value:
```bash
npm run checklist -- --pack ct-2026-09-20/ --outdir out/ --slot 20:00
```

### "Error: PACK.md not found in pack directory"

Check that pack path points to a valid browns-ct-pack-assemble output folder:
```bash
ls ct-2026-09-20/
# Should show: PACK.md, APPROVAL.md, ...
```

### "Error: APPROVAL.md not found in pack directory"

Ensure browns-ct-pack-assemble completed successfully:
```bash
cd tools/browns-ct-pack-assemble
npm run assemble -- --day 2026-09-20 --outdir ct-2026-09-20/ --bookings bookings.json
```

## Future Enhancements (Not in v1)

- **Slot-specific exit codes** - Different exit codes for different slot warnings
- **Multi-property support** - Rivendell, other Browns properties
- **WhatsApp pack preview** - Simulate what CoS will see before send
- **Automated pack archival** - Move completed packs to archive after send

**For now:** v1 is offline, validator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-ct-pack-assemble** - Assemble CoS Browns CT timed packs from sibling tool outputs
- **browns-nightsbridge-bookings-adapter** - Transform Nightsbridge exports to bookings.json
- **browns-daily-ops-brief** - Daily team ops brief
- **browns-guest-comms-draft** - Guest welcome messages
- **browns-late-checkin-queue** - Late check-in coordination queue
- **browns-welcome-draft-pack** - Welcome message drafts for same-day arrivals
- **browns-booking-change-check** - Diff two booking snapshots and report changes

## CoS CT Pack Workflow Overview

```
browns-ct-pack-assemble output
    ↓
ct-YYYY-MM-DD/
    ├── PACK.md (timed checklist)
    ├── APPROVAL.md (safety gates)
    ├── daily-ops.md
    ├── guest-*.md
    ├── welcome-*.md
    ├── queue.md
    ├── changes.md
    └── manifest.json
    ↓
browns-ct-pack-post-checklist (THIS TOOL)
    ↓
checklist-YYYY-MM-DD/
    ├── POST-CHECKLIST.md (go/no-go)
    ├── ISSUES.md (failures/warnings)
    ├── APPROVAL.md (CoS workflow)
    └── manifest.json
    ↓
Manual review by CoS
    ↓
WhatsApp Admin - The Browns (CoS)
    ↓
Timed sends:
  20:00 CT - Guest welcome drafts
  09:00 CT - After-hours check-ins
  21:00 CT - Staff ops brief
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` before every send. CoS owns WhatsApp. Never auto-send. Never invent guest phones/rates/ETAs. Dullstroom / The Browns only.
