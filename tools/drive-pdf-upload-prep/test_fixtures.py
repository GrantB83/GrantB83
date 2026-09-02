#!/usr/bin/env python3
"""
Test fixtures for drive-pdf-upload-prep

Generates a minimal synthetic PDF and validates the tool output.
"""

import json
import subprocess
import sys
from pathlib import Path
import base64


def create_synthetic_pdf(output_path: Path, size_hint: str = 'tiny'):
    """
    Create a minimal synthetic PDF for testing.
    Uses ghostscript to generate a simple single-page PDF.
    """
    if size_hint == 'tiny':
        # Single page, minimal content (~2KB)
        ps_content = """%!PS-Adobe-3.0
%%BoundingBox: 0 0 612 792
%%Pages: 1
%%EndComments

%%Page: 1 1
/Times-Roman findfont 12 scalefont setfont
72 720 moveto
(Invoice #TEST-001) show
72 700 moveto
(Date: 2026-09-02) show
72 680 moveto
(Amount: R 1,234.56) show
72 660 moveto
(Description: Test fixture invoice) show
showpage
%%EOF
"""
    elif size_hint == 'large':
        # Multiple pages with repetitive content (~25KB base64)
        ps_content = """%!PS-Adobe-3.0
%%BoundingBox: 0 0 612 792
%%Pages: 3
%%EndComments

%%Page: 1 1
/Times-Roman findfont 12 scalefont setfont
"""
        for i in range(50):
            ps_content += f"72 {720 - i*10} moveto\n"
            ps_content += f"(Line {i}: Lorem ipsum dolor sit amet consectetur) show\n"
        ps_content += "showpage\n"
        
        ps_content += "%%Page: 2 2\n"
        for i in range(50):
            ps_content += f"72 {720 - i*10} moveto\n"
            ps_content += f"(Page 2 Line {i}: Additional invoice details here) show\n"
        ps_content += "showpage\n"
        
        ps_content += "%%Page: 3 3\n"
        for i in range(50):
            ps_content += f"72 {720 - i*10} moveto\n"
            ps_content += f"(Page 3 Line {i}: More content to increase size) show\n"
        ps_content += "showpage\n%%EOF\n"
    
    # Write PostScript file
    ps_path = output_path.with_suffix('.ps')
    with open(ps_path, 'w') as f:
        f.write(ps_content)
    
    # Convert to PDF using ghostscript
    try:
        subprocess.run([
            'gs',
            '-dBATCH',
            '-dNOPAUSE',
            '-dQUIET',
            '-sDEVICE=pdfwrite',
            f'-sOutputFile={output_path}',
            str(ps_path)
        ], check=True, capture_output=True)
        
        ps_path.unlink()  # Clean up PostScript file
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Error: Could not generate PDF: {e}", file=sys.stderr)
        print("Ensure ghostscript (gs) is installed", file=sys.stderr)
        return False


def run_tests():
    """Run fixture tests."""
    print("Running drive-pdf-upload-prep fixture tests...")
    print()
    
    # Setup
    fixtures_dir = Path(__file__).parent / 'fixtures'
    fixtures_dir.mkdir(exist_ok=True)
    print(f"✓ Fixtures directory created: {fixtures_dir}")
    
    # Generate test PDFs
    tiny_pdf = fixtures_dir / 'test-tiny.pdf'
    if not create_synthetic_pdf(tiny_pdf, size_hint='tiny'):
        print("✗ Failed to generate test PDF", file=sys.stderr)
        return False
    
    pdf_size_kb = tiny_pdf.stat().st_size / 1024
    print(f"✓ Generated {tiny_pdf.name} (1 page, ~{pdf_size_kb:.1f}KB)")
    
    # Generate large PDF for compression testing
    large_pdf = fixtures_dir / 'test-large.pdf'
    if not create_synthetic_pdf(large_pdf, size_hint='large'):
        print("Warning: Could not generate large test PDF (optional)", file=sys.stderr)
    else:
        large_size_kb = large_pdf.stat().st_size / 1024
        print(f"✓ Generated {large_pdf.name} (3 pages, ~{large_size_kb:.1f}KB)")
    
    # Run upload_prep.py
    test_output = fixtures_dir / 'test-output'
    test_output.mkdir(exist_ok=True)
    
    print()
    print("✓ Running upload_prep.py...")
    
    try:
        result = subprocess.run([
            sys.executable,
            str(Path(__file__).parent / 'upload_prep.py'),
            '--input-dir', str(fixtures_dir),
            '--parent-id', 'TEST_PARENT_FOLDER_ID',
            '--output-dir', str(test_output),
            '--max-b64', '15500'
        ], capture_output=True, text=True, check=True)
        
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("✗ upload_prep.py failed:", file=sys.stderr)
        print(e.stdout, file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        return False
    
    # Validate outputs
    manifest_path = test_output / 'manifest.json'
    if not manifest_path.exists():
        print("✗ manifest.json not generated", file=sys.stderr)
        return False
    print(f"✓ manifest.json generated")
    
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    if manifest['parent_id'] != 'TEST_PARENT_FOLDER_ID':
        print("✗ manifest.json has wrong parent_id", file=sys.stderr)
        return False
    
    if manifest['processed_count'] < 1:
        print("✗ manifest.json shows no files processed", file=sys.stderr)
        return False
    
    # Validate JSON structure for tiny PDF
    tiny_json = test_output / 'test-tiny.json'
    if not tiny_json.exists():
        print("✗ test-tiny.json not generated", file=sys.stderr)
        return False
    print(f"✓ test-tiny.json generated")
    
    with open(tiny_json) as f:
        payload = json.load(f)
    
    # Validate required fields
    required_fields = ['title', 'parentId', 'contentMimeType', 'disableConversionToGoogleType', 'base64Content']
    for field in required_fields:
        if field not in payload:
            print(f"✗ Missing field in JSON: {field}", file=sys.stderr)
            return False
    
    if payload['contentMimeType'] != 'application/pdf':
        print("✗ Wrong contentMimeType", file=sys.stderr)
        return False
    
    if not payload['disableConversionToGoogleType']:
        print("✗ disableConversionToGoogleType should be true", file=sys.stderr)
        return False
    
    # Validate base64 content is valid
    try:
        decoded = base64.b64decode(payload['base64Content'])
        if not decoded.startswith(b'%PDF'):
            print("✗ base64Content does not decode to valid PDF", file=sys.stderr)
            return False
    except Exception as e:
        print(f"✗ Invalid base64Content: {e}", file=sys.stderr)
        return False
    
    print("✓ JSON structure validated")
    
    # Check if large PDF was compressed
    if large_pdf.exists():
        large_json = test_output / 'test-large.json'
        if large_json.exists():
            large_entry = next((f for f in manifest['files'] if f['source_file'] == 'test-large.pdf'), None)
            if large_entry and large_entry.get('compressed'):
                print(f"✓ Large PDF was compressed: {large_entry.get('compression_note', 'no note')}")
            else:
                print("  (Large PDF did not require compression)")
    
    print()
    print("✓ All tests passed")
    print()
    print("To inspect outputs:")
    print(f"  - Manifest: {manifest_path}")
    print(f"  - JSON: {tiny_json}")
    
    return True


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
