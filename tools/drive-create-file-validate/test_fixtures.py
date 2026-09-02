#!/usr/bin/env python3
"""
Test fixtures for drive-create-file-validate

Generates synthetic valid and invalid create_file JSON payloads and validates the tool output.
"""

import base64
import json
import subprocess
import sys
from pathlib import Path


def create_valid_json(output_path: Path, size_hint: str = 'small'):
    """Create a valid create_file JSON payload."""
    if size_hint == 'small':
        # Small valid PDF (~2KB base64)
        pdf_content = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test Invoice) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n308\n%%EOF\n'
    elif size_hint == 'large':
        # Large valid PDF (will exceed default limit for testing)
        pdf_content = b'%PDF-1.4\n' + (b'Lorem ipsum dolor sit amet ' * 1000)
    else:
        pdf_content = b'%PDF-1.4\nMinimal PDF\n%%EOF\n'
    
    b64_content = base64.b64encode(pdf_content).decode('utf-8')
    
    payload = {
        "title": output_path.stem + ".pdf",
        "parentId": "TEST_PARENT_ID_ABC123",
        "contentMimeType": "application/pdf",
        "disableConversionToGoogleType": True,
        "base64Content": b64_content
    }
    
    with open(output_path, 'w') as f:
        json.dump(payload, f, indent=2)
    
    return len(b64_content)


def create_invalid_json(output_path: Path, error_type: str):
    """Create an invalid create_file JSON payload for testing."""
    if error_type == 'missing_key':
        payload = {
            "title": "missing-parentId.pdf",
            "contentMimeType": "application/pdf",
            "disableConversionToGoogleType": True,
            "base64Content": "VmFsaWQgYmFzZTY0"
        }
    elif error_type == 'wrong_type':
        payload = {
            "title": "wrong-type.pdf",
            "parentId": "PARENT_ID",
            "contentMimeType": "application/pdf",
            "disableConversionToGoogleType": "true",  # Should be bool
            "base64Content": "VmFsaWQgYmFzZTY0"
        }
    elif error_type == 'invalid_base64':
        payload = {
            "title": "invalid-base64.pdf",
            "parentId": "PARENT_ID",
            "contentMimeType": "application/pdf",
            "disableConversionToGoogleType": True,
            "base64Content": "Not@Valid#Base64!"
        }
    elif error_type == 'empty_title':
        payload = {
            "title": "   ",
            "parentId": "PARENT_ID",
            "contentMimeType": "application/pdf",
            "disableConversionToGoogleType": True,
            "base64Content": "VmFsaWQgYmFzZTY0"
        }
    elif error_type == 'not_pdf':
        payload = {
            "title": "not-pdf.pdf",
            "parentId": "PARENT_ID",
            "contentMimeType": "application/pdf",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(b"Not a PDF file").decode('utf-8')
        }
    elif error_type == 'oversized':
        # Create oversized base64 content
        large_content = b'x' * 20000
        payload = {
            "title": "oversized.pdf",
            "parentId": "PARENT_ID",
            "contentMimeType": "application/pdf",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(large_content).decode('utf-8')
        }
    else:
        raise ValueError(f"Unknown error_type: {error_type}")
    
    with open(output_path, 'w') as f:
        json.dump(payload, f, indent=2)


def run_tests():
    """Run fixture tests."""
    print("Running drive-create-file-validate fixture tests...")
    print()
    
    # Setup
    fixtures_dir = Path(__file__).parent / 'fixtures'
    fixtures_dir.mkdir(exist_ok=True)
    print(f"✓ Fixtures directory created: {fixtures_dir}")
    
    # Generate valid test files
    valid_small = fixtures_dir / 'valid-small.create_file.json'
    b64_size_small = create_valid_json(valid_small, size_hint='small')
    print(f"✓ Generated {valid_small.name} ({b64_size_small} bytes base64)")
    
    valid_medium = fixtures_dir / 'valid-medium.create_file.json'
    b64_size_medium = create_valid_json(valid_medium, size_hint='medium')
    print(f"✓ Generated {valid_medium.name} ({b64_size_medium} bytes base64)")
    
    # Generate invalid test files
    invalid_types = [
        'missing_key',
        'wrong_type',
        'invalid_base64',
        'empty_title',
        'not_pdf',
        'oversized'
    ]
    
    for error_type in invalid_types:
        invalid_path = fixtures_dir / f'invalid-{error_type}.create_file.json'
        create_invalid_json(invalid_path, error_type)
        print(f"✓ Generated {invalid_path.name} (error: {error_type})")
    
    print()
    
    # Run validate.py without --require-pdf-magic
    test_output = fixtures_dir / 'test-output'
    test_output.mkdir(exist_ok=True)
    
    print("✓ Running validate.py (without PDF magic check)...")
    try:
        result = subprocess.run([
            sys.executable,
            str(Path(__file__).parent / 'validate.py'),
            '--input-dir', str(fixtures_dir),
            '--outdir', str(test_output),
            '--max-b64', '15500'
        ], capture_output=True, text=True)
        
        print(result.stdout)
        
        # Should exit with code 1 (invalid files present)
        if result.returncode != 1:
            print(f"✗ Expected exit code 1, got {result.returncode}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"✗ validate.py failed: {e}", file=sys.stderr)
        return False
    
    # Validate outputs exist
    valid_json = test_output / 'valid.json'
    invalid_json = test_output / 'invalid.json'
    report_md = test_output / 'report.md'
    
    if not valid_json.exists():
        print("✗ valid.json not generated", file=sys.stderr)
        return False
    print(f"✓ valid.json generated")
    
    if not invalid_json.exists():
        print("✗ invalid.json not generated", file=sys.stderr)
        return False
    print(f"✓ invalid.json generated")
    
    if not report_md.exists():
        print("✗ report.md not generated", file=sys.stderr)
        return False
    print(f"✓ report.md generated")
    
    # Validate content
    with open(valid_json) as f:
        valid_data = json.load(f)
    
    with open(invalid_json) as f:
        invalid_data = json.load(f)
    
    # Without --require-pdf-magic, 'not_pdf' passes validation (3 valid, 5 invalid)
    if len(valid_data) != 3:
        print(f"✗ Expected 3 valid files (without PDF magic check), got {len(valid_data)}", file=sys.stderr)
        return False
    print(f"✓ Found {len(valid_data)} valid files")
    
    if len(invalid_data) != 5:
        print(f"✗ Expected 5 invalid files (without PDF magic check), got {len(invalid_data)}", file=sys.stderr)
        return False
    print(f"✓ Found {len(invalid_data)} invalid files")
    
    # Test with --require-pdf-magic (should catch 'not_pdf')
    print()
    print("✓ Running validate.py (with PDF magic check)...")
    test_output_strict = fixtures_dir / 'test-output-strict'
    test_output_strict.mkdir(exist_ok=True)
    
    try:
        result = subprocess.run([
            sys.executable,
            str(Path(__file__).parent / 'validate.py'),
            '--input-dir', str(fixtures_dir),
            '--outdir', str(test_output_strict),
            '--require-pdf-magic',
            '--max-b64', '15500'
        ], capture_output=True, text=True)
        
        print(result.stdout)
        
        if result.returncode != 1:
            print(f"✗ Expected exit code 1 with PDF magic check, got {result.returncode}", file=sys.stderr)
            return False
        
        # With --require-pdf-magic, should have 2 valid and 6 invalid
        with open(test_output_strict / 'valid.json') as f:
            valid_strict = json.load(f)
        with open(test_output_strict / 'invalid.json') as f:
            invalid_strict = json.load(f)
        
        if len(valid_strict) != 2:
            print(f"✗ Expected 2 valid files with PDF magic check, got {len(valid_strict)}", file=sys.stderr)
            return False
        
        if len(invalid_strict) != 6:
            print(f"✗ Expected 6 invalid files with PDF magic check, got {len(invalid_strict)}", file=sys.stderr)
            return False
        
        print(f"✓ PDF magic check correctly caught non-PDF content: {len(valid_strict)} valid, {len(invalid_strict)} invalid")
        
    except Exception as e:
        print(f"✗ validate.py with --require-pdf-magic failed: {e}", file=sys.stderr)
        return False
    
    print()
    print("✓ All tests passed")
    print()
    print("To inspect outputs:")
    print(f"  - Valid files: {valid_json}")
    print(f"  - Invalid files: {invalid_json}")
    print(f"  - Report: {report_md}")
    
    return True


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
