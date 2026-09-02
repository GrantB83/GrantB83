# sa-texas-morning-exception-pack

**One-line:** Offline CLI to assemble SA Ops / CoS weekday Texas-morning exception digest for Heavy Metal + hospitality / The Browns.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/sa-texas-morning-exception-pack/`

## Purpose

Generates a dated DRAFT exception pack for Chief of Staff (CoS) manual review and WhatsApp workflow. Assembles exception notes, booking snapshots, and Heavy Metal open quote filenames into structured markdown outputs.

**Scope:**
- Heavy Metal Sand & Stone: open quotes (filenames only)
- The Browns: exceptional bookings with special requests or timing flags
- **Perfect Water: EXCLUDED** (not in scope)

**Timezone context:** America/Chicago (Texas morning SA Ops workflow)

## Install and Run

```bash
cd tools/sa-texas-morning-exception-pack
npm install
npm run build

# Minimal usage (with warnings for missing inputs)
npm run pack -- --date 2026-09-02 --outdir out/

# With Browns bookings
npm run pack -- --date 2026-09-02 --outdir out/ --browns-bookings bookings.json

# With Heavy Metal quotes directory
npm run pack -- --date 2026-09-02 --outdir out/ --hm-quotes-dir ./hm-open/

# Full usage with all inputs
npm run pack -- --date 2026-09-02 --outdir out/ \
  --browns-bookings bookings.json \
  --hm-quotes-dir ./hm-open/ \
  --notes notes.md

# Test with fixtures
npm run test:fixtures
```

## CLI Options

### Required
- `--date YYYY-MM-DD` — Target date for exception pack
- `--outdir <dir>` — Output directory for pack files

### Optional
- `--browns-bookings <file>` — Path to Browns bookings JSON file
- `--hm-quotes-dir <dir>` — Path to Heavy Metal open quotes directory
- `--notes <file>` — Path to exception notes markdown file

## Output Files

The tool generates five files in the specified output directory:

1. **PACK.md** — Pack index with contents, data sources, warnings, and next steps
2. **hospitality.md** — The Browns exceptional bookings (special requests, timing notes)
3. **heavy-metal.md** — Heavy Metal open quotes (filenames only, never invents rates/volumes)
4. **APPROVAL.md** — Safety gates, CoS workflow, scope boundaries
5. **manifest.json** — Machine-readable pack metadata

## Critical Safety Note

- ✅ **DRAFT ONLY** — Never auto-sends WhatsApp or email
- ✅ **CoS owns WhatsApp** — All sends via Coexistence of Service only
- ✅ **Never invents rates** — Heavy Metal pricing stays manual
- ✅ **Never invents volumes** — Heavy Metal quantities from source only
- ✅ **Never invents guest facts** — Browns data from bookings only
- ✅ **Flags missing inputs** — Warnings reported in PACK.md and manifest.json
- ✅ **Offline only** — No APIs or network calls
- ✅ **Perfect Water excluded** — Not in scope for this pack
- ⚠️ **Manual review required** — Every pack before WhatsApp posting

## Exceptional Bookings Detection

For The Browns hospitality section, the tool identifies bookings as exceptional if they have:

1. Non-empty `specialRequests` field, OR
2. Notes containing keywords: `late`, `early`, `exception`, `urgent`, `important`

Standard arrivals/departures without special flags are **excluded** — use `browns-daily-ops-brief` for routine operations.

## Heavy Metal Quote Files

The tool scans the provided `--hm-quotes-dir` for `.txt`, `.md`, and `.json` files, listing them by filename in `heavy-metal.md`. It **never** reads file contents or invents rates/volumes.

## Exception Notes Format

The `--notes` file should be plain markdown with bullet points or paragraphs. The tool normalizes formatting and includes all non-header lines in the pack.

Example:
```markdown
# SA Ops Exception Notes — 2026-09-02

- Follow up on Mpumalanga delivery quote
- WiFi router replacement scheduled for Suite 4
- CoS off-site meeting 14:00-16:00 CT
```

## Typical Workflow

1. **Export data:**
   - Export Browns bookings from Nightsbridge → `bookings.json`
   - Collect Heavy Metal open quote filenames → `hm-open/` directory
   - Draft exception notes → `notes.md`

2. **Generate pack:**
   ```bash
   npm run pack -- --date 2026-09-02 --outdir pack-2026-09-02/ \
     --browns-bookings bookings.json \
     --hm-quotes-dir hm-open/ \
     --notes notes.md
   ```

3. **Review outputs:**
   - Read `PACK.md` for overview and warnings
   - Review `hospitality.md` for Browns exceptions
   - Review `heavy-metal.md` for HM quote count
   - Check `APPROVAL.md` for safety gates

4. **Manual WhatsApp workflow:**
   - CoS drafts WhatsApp messages from pack content
   - CoS posts via Coexistence of Service
   - **Never** bypass manual approval gates

## Integration with Other Tools

- **Input from:** `browns-nightsbridge-bookings-adapter` (bookings.json)
- **Complements:** `browns-daily-ops-brief` (routine operations, not exceptions)
- **Complements:** `browns-ct-pack-assemble` (CT timezone workflow orchestration)
- **Complements:** `hm-quote-intake` (structured quote extraction)

This tool is **exception-focused** — standard operations are handled by sibling tools.

## Scope Boundaries

### In Scope
- Heavy Metal Sand & Stone open quotes (filename inventory only)
- The Browns exceptional bookings (special requests, timing coordination)
- Exception notes from CoS/SA Ops team

### Out of Scope
- Perfect Water operations (excluded entirely)
- Standard Browns arrivals/departures (use `browns-daily-ops-brief`)
- Heavy Metal quote details/rates/volumes (manual review required)
- Automated WhatsApp sending (CoS manual workflow only)

## Testing

### Run fixture tests
```bash
npm run test:fixtures
```

### Run unit tests
```bash
npm test
```

### Manual testing
```bash
# Test with minimal inputs (expect warnings)
npm run pack -- --date 2026-09-02 --outdir test-minimal/

# Test with full inputs
npm run pack -- --date 2026-09-02 --outdir test-full/ \
  --browns-bookings fixtures/sample-bookings.json \
  --hm-quotes-dir fixtures/hm-quotes \
  --notes fixtures/sample-notes.md
```

## Exit Codes

- **0** — Success (even if warnings present)
- **1** — Error (missing required args, file not found, parse failure)

## Entity Context

- **Lanes:** heavy-metal, hospitality (The Browns only)
- **Timezone:** America/Chicago (Texas morning workflow context)
- **Target desk:** SA Ops / CoS
- **Automation:** Offline pack assembly only; CoS owns send path

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
