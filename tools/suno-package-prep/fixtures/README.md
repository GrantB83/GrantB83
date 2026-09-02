# Test Fixtures

Synthetic test data for Suno Package Prep CLI.

## Files

### `sample-lyrics.txt`

A classic children's song "Twinkle, Twinkle, Little Star" used as test lyrics.

**Characteristics:**
- Well-formatted with verse/chorus structure
- Appropriate length (~400 characters)
- Clean line breaks
- Family-friendly content
- No PII (kid names only in metadata)

### `sample-meta.json`

Sample metadata for the test song.

**Fields:**
- `title`: "Twinkle Star Dreams" (custom title)
- `kids`: ["Emma", "Liam"] (synthetic kid names)
- `artist`: "BrownieTunez" (studio name)
- `style`: "children's music, lullaby, gentle, acoustic"
- `mood`: "Calm and soothing bedtime vibe"
- `duration_hint`: "2 minutes"
- `negative_prompts`: ["loud", "aggressive", "fast-paced"]

## Usage

Run the fixture test with:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Generate a job package from the fixtures
3. Output to `test-out/`
4. Verify all files are created
5. Exit with success code

## Output Location

Test output goes to `test-out/` (gitignored, cleaned by `npm run clean`)

## Notes

- **No real kid PII** - Names are synthetic
- **Public domain content** - "Twinkle, Twinkle, Little Star" is public domain
- **Demonstrative metadata** - Shows all available fields
- **Realistic use case** - Represents typical Studio workflow
