# drive-pdf-upload-prep

**One-line:** Offline CLI to prepare PDF files for Google Drive MCP `create_file` by converting to base64 JSON payloads with auto-compression.

**Owning desk(s):** Perfect Water / CoS / Hospitality Ops

**Location:** `tools/drive-pdf-upload-prep/`

## Purpose

Hospitality Google Drive MCP `create_file` reliably accepts ~≤15KB base64 payloads but fails/stalls on full ~18–25KB invoice PDFs when embedded in `CallMcpTool` from subagents. This tool provides an offline prep step that:

1. Converts PDFs to base64-encoded JSON ready for Drive MCP `create_file`
2. Auto-compresses PDFs exceeding size limits (greyscale rasterization)
3. Generates a manifest tracking original vs compressed sizes
4. Never calls Drive API itself — purely offline preparation

## Install and Run

### System Dependencies

Install required system packages first:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ghostscript poppler-utils

# macOS
brew install ghostscript poppler

# Alpine (Cloud Agent VMs)
apk add ghostscript poppler-utils
```

### Python Setup

```bash
cd tools/drive-pdf-upload-prep

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### Basic Usage

```bash
# Process all PDFs in a directory
python upload_prep.py \
  --input-dir invoices/ \
  --parent-id 1A2B3C4D5E6F \
  --output-dir out/

# Process specific files
python upload_prep.py \
  --input-files invoice1.pdf invoice2.pdf \
  --parent-id 1A2B3C4D5E6F \
  --output-dir prepared/

# Custom size limit (default 15500 bytes)
python upload_prep.py \
  --input-dir invoices/ \
  --parent-id 1A2B3C4D5E6F \
  --max-b64 12000 \
  --output-dir out/

# Use glob pattern
python upload_prep.py \
  --input-dir "invoices/2026-*.pdf" \
  --parent-id 1A2B3C4D5E6F \
  --output-dir out/
```

### Test with Fixtures

```bash
# Run basic test with synthetic PDF
python test_fixtures.py
```

## Output Structure

The tool generates:

```
out/
├── manifest.json          # Processing summary with compression stats
├── invoice-001.json       # Drive create_file payload for invoice-001.pdf
├── invoice-002.json       # Drive create_file payload for invoice-002.pdf
└── ...
```

### Example JSON Payload

Each JSON file is ready for Drive MCP `create_file`:

```json
{
  "title": "invoice-001.pdf",
  "parentId": "1A2B3C4D5E6F",
  "contentMimeType": "application/pdf",
  "disableConversionToGoogleType": true,
  "base64Content": "JVBERi0xLjQKJeLjz9MK..."
}
```

### Example Manifest

`manifest.json` tracks compression outcomes:

```json
{
  "parent_id": "1A2B3C4D5E6F",
  "max_b64_bytes": 15500,
  "processed_count": 3,
  "files": [
    {
      "source_file": "invoice-001.pdf",
      "json_output": "invoice-001.json",
      "original_kb": 18.5,
      "original_b64_bytes": 24832,
      "final_b64_bytes": 14200,
      "compressed": true,
      "compression_note": "Compressed from 24832 to 14200 bytes"
    },
    {
      "source_file": "invoice-002.pdf",
      "json_output": "invoice-002.json",
      "original_kb": 8.2,
      "original_b64_bytes": 11008,
      "final_b64_bytes": 11008,
      "compressed": false
    }
  ]
}
```

## Compression Strategy

When a PDF's base64 encoding exceeds `--max-b64`:

1. **Try ghostscript** (preserves vector quality, smaller files)
   - Converts to greyscale
   - Applies `/ebook` quality preset
   - Image downsampling

2. **Fall back to rasterization** if ghostscript insufficient
   - Uses `pdftoppm` to rasterize pages at decreasing DPI (150 → 120 → 96 → 72)
   - Converts to greyscale JPEG (quality 85)
   - Re-wraps JPEGs as PDF with `img2pdf`

3. **Report failure** if still oversized
   - Includes original file in JSON with warning in manifest
   - User can manually reduce size or split PDF

## Bot Integration

Bots (Perfect Water, Coding, CoS) use this workflow:

### Step 1: Prep PDFs offline

```python
# In bot pre-processing step
import subprocess
subprocess.run([
    'python', 'tools/drive-pdf-upload-prep/upload_prep.py',
    '--input-dir', 'invoices-to-upload/',
    '--parent-id', '1A2B3C4D5E6F',
    '--output-dir', 'drive-payloads/'
])
```

### Step 2: Upload with Drive MCP (one at a time)

```python
import json
from pathlib import Path

# Read manifest
with open('drive-payloads/manifest.json') as f:
    manifest = json.load(f)

# Upload each JSON with Drive MCP create_file
for file_info in manifest['files']:
    if 'error' in file_info:
        print(f"Skipping {file_info['source_file']}: {file_info['error']}")
        continue
    
    json_path = Path('drive-payloads') / file_info['json_output']
    with open(json_path) as f:
        payload = json.load(f)
    
    # Use hospitality Google-drive MCP
    result = await mcp.call_tool(
        server='Google-drive',
        tool='create_file',
        arguments=payload
    )
    
    print(f"Uploaded {file_info['source_file']}: {result}")
```

### Step 3: Clean up

Original PDFs remain on disk. Remove prepared JSONs after successful upload:

```bash
rm -rf drive-payloads/
```

## Critical Safety Note

- ✅ **Offline only** - No Drive API calls from this tool
- ✅ **Never invents data** - Purely encodes existing PDFs
- ✅ **Read-only** - Never modifies original PDF files
- ✅ **Preserves originals** - Compressed PDFs are intermediate (not saved)
- ✅ **Compression is lossy** - Rasterizes to greyscale JPEG when needed
- ⚠️ **Base64 size limits** - Drive MCP may fail if JSON still exceeds ~15KB
- ⚠️ **One file at a time** - Upload JSONs sequentially with Drive MCP (not batch)
- ⚠️ **Review manifest** - Check `compressed: true` entries for quality before upload

## Arguments Reference

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--input-dir` | One of input-* | - | Directory or glob pattern for PDF files |
| `--input-files` | One of input-* | - | Specific PDF file paths |
| `--parent-id` | **Yes** | - | Google Drive folder ID for uploads |
| `--max-b64` | No | 15500 | Max base64 bytes before compression |
| `--output-dir` | No | `out` | Output directory for JSON files |

## Fixtures and Testing

The `test_fixtures.py` script creates a minimal synthetic PDF and tests the full workflow:

```bash
cd tools/drive-pdf-upload-prep
python test_fixtures.py
```

Expected output:

```
✓ Fixtures directory created
✓ Generated test-tiny.pdf (1 page, ~2KB)
✓ Running upload_prep.py...
✓ manifest.json generated
✓ test-tiny.json generated
✓ JSON structure validated
✓ All tests passed
```

## Known Limitations

1. **System dependencies required** - Ghostscript and poppler must be pre-installed
2. **Greyscale only** - Compression always converts to greyscale (acceptable for invoices)
3. **No OCR** - Does not extract or validate invoice text/amounts
4. **No batch upload** - Drive MCP must call `create_file` per JSON (tool generates payloads only)
5. **Quality trade-off** - Rasterization loses vector sharpness (but remains readable)

## Troubleshooting

### "ghostscript not found" or "pdftoppm not found"

Install system dependencies (see Install section above).

### "Failed to compress below 15500 bytes"

Options:
1. Increase `--max-b64` if Drive MCP actually supports larger payloads
2. Manually split PDF into smaller files before prep
3. Further reduce DPI in `upload_prep.py` (edit `dpi` list)

### Compressed PDFs are too blurry

Adjust compression quality in `upload_prep.py`:
- Increase JPEG quality (line: `img.save(..., quality=85)` → higher value)
- Increase DPI (line: `for dpi in [150, 120, 96, 72]` → higher values)

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
