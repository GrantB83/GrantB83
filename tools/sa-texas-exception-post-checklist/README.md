# sa-texas-exception-post-checklist

**One-line:** Offline CLI to generate pre-WhatsApp post checklist from sa-texas-morning-exception-pack output folder.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/sa-texas-exception-post-checklist/`

## Purpose

Generates a pre-WhatsApp post checklist for CoS / SA Ops manual review **before** any Texas-morning Admin/exception post. Validates pack structure, flags warnings, and provides numbered go/no-go items.

**Scope:**
- Validates `sa-texas-morning-exception-pack` output folder
- Checks for required files (PACK.md, hospitality.md, heavy-metal.md, APPROVAL.md)
- Warns if PACK.md lists warnings/missing inputs without corresponding notes
- Generates numbered checklist for CoS approval workflow
- **Never sends WhatsApp messages**
- **Never invents Heavy Metal rates/volumes or Browns guest facts**
- **Perfect Water excluded from scope**

**Safety:**
- ✅ **Offline only** - No WhatsApp Cloud API calls
- ✅ **Read-only** - Validates pack structure only
- ✅ **Never invents** - No rates, volumes, or guest facts fabricated
- ✅ **CoS owns WhatsApp** - Never auto-sends

## Install and Run

```bash
cd tools/sa-texas-exception-post-checklist
npm install
npm run build

# Basic usage
npm run checklist -- --pack ./pack-2026-09-02 --outdir out/

# With date label
npm run checklist -- --pack ./pack-2026-09-02 --outdir out/ --date 2026-09-02

# Test with fixtures
npm run test:fixtures
```

## CLI Options

### Required
- `--pack <dir>` — Path to pack folder from `sa-texas-morning-exception-pack`
- `--outdir <dir>` — Output directory for checklist files

### Optional
- `--date YYYY-MM-DD` — Date label for checklist header (optional)

## Pack Structure Expected

The tool expects a pack directory with the following structure:

```
pack-dir/
├── PACK.md
├── hospitality.md
├── heavy-metal.md
└── APPROVAL.md
```

## Output Files

The tool generates four files in the specified output directory:

1. **POST-CHECKLIST.md** — Numbered go/no-go checklist for SA Ops / CoS
2. **ISSUES.md** — Failures and warnings only (empty if all checks pass)
3. **APPROVAL.md** — CoS workflow, safety gates, scope boundaries
4. **manifest.json** — Machine-readable checklist metadata

## Checks Performed

The tool performs the following heuristic, read-only checks:

1. **Required files present:**
   - PACK.md exists
   - hospitality.md exists (may be empty with header only)
   - heavy-metal.md exists (may be empty with header only)
   - APPROVAL.md exists

2. **Hospitality section:**
   - hospitality.md file is readable
   - File may be empty (header only) without failing

3. **Heavy Metal section:**
   - heavy-metal.md file is readable
   - File may be empty (header only) without failing

4. **APPROVAL.md present:**
   - APPROVAL.md file exists and contains approval-related keywords

5. **PACK.md warnings:**
   - Warns if PACK.md contains "warning" or "missing" keywords
   - Suggests reviewing corresponding notes in pack

## Critical Safety Notes

- ✅ **OFFLINE ONLY** — No WhatsApp APIs or network calls
- ✅ **READ-ONLY** — Validates pack structure only; never modifies files
- ✅ **NEVER INVENTS** — No Heavy Metal rates/volumes or Browns guest facts fabricated
- ✅ **PERFECT WATER EXCLUDED** — Not in scope for this checklist
- ✅ **CoS OWNS WHATSAPP** — Never auto-sends; manual approval workflow only
- ⚠️ **MANUAL REVIEW REQUIRED** — Every checklist before WhatsApp posting

## Typical Workflow

1. **Generate exception pack:**
   ```bash
   cd tools/sa-texas-morning-exception-pack
   npm run pack -- --date 2026-09-02 --outdir pack-2026-09-02/ \
     --browns-bookings bookings.json \
     --hm-quotes-dir hm-open/ \
     --notes notes.md
   ```

2. **Generate post checklist:**
   ```bash
   cd tools/sa-texas-exception-post-checklist
   npm run checklist -- --pack ../sa-texas-morning-exception-pack/pack-2026-09-02 \
     --outdir checklist-2026-09-02/ \
     --date 2026-09-02
   ```

3. **Review outputs:**
   - Read `POST-CHECKLIST.md` for numbered go/no-go items
   - Review `ISSUES.md` for any failures or warnings
   - Check `APPROVAL.md` for CoS workflow gates

4. **CoS approval workflow:**
   - CoS reviews all checklist items
   - CoS obtains authorization for WhatsApp posting
   - CoS manually drafts and sends WhatsApp Admin messages
   - **Never** bypass manual approval gates

## Integration with Other Tools

- **Input from:** `sa-texas-morning-exception-pack` (pack folder)
- **Workflow:** Exception pack → post checklist → manual CoS WhatsApp posting
- **Complements:** `browns-daily-ops-brief` (routine operations, not exceptions)
- **Downstream:** CoS manual WhatsApp Admin workflow (never automated)

## Scope Boundaries

### In Scope
- Heavy Metal Sand & Stone: open quotes (filename validation only)
- The Browns: exceptional bookings validation
- Pack structure validation
- Pre-WhatsApp post go/no-go checklist

### Out of Scope
- Perfect Water operations (excluded entirely)
- Automated WhatsApp sending (CoS manual workflow only)
- Inventing rates, volumes, or guest facts (source data only)
- Network operations or API calls (offline only)

## Testing

### Run fixture tests
```bash
npm run test:fixtures
```

### Manual testing
```bash
# Test with healthy pack
npm run checklist -- --pack fixtures/healthy-pack --outdir test-healthy/

# Test with missing hospitality file (expect exit 1)
npm run checklist -- --pack fixtures/missing-hospitality --outdir test-missing/
```

## Exit Codes

- **0** — Success (all critical checks passed)
- **1** — Failure (missing required files or pack path issues)

## Entity Context

- **Lanes:** heavy-metal, hospitality (The Browns only)
- **Timezone:** America/Chicago (Texas morning workflow context)
- **Target desk:** SA Ops / CoS
- **Automation:** Offline checklist validation only; CoS owns send path

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
