#!/usr/bin/env python3
"""
drive-create-file-validate: Offline validator for Drive create_file JSON payloads

Validates *.create_file.json files before calling hospitality Drive MCP create_file.
Catches bad payloads (malformed base64, oversized, missing fields) before hitting the connector.
"""

import argparse
import base64
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def validate_base64_strict(b64_content: str) -> Tuple[bool, str]:
    """
    Validate that base64 content is strict standard base64 (A-Za-z0-9+/= only).
    Returns (is_valid, error_message).
    """
    # Check for strict base64 alphabet
    if not re.match(r'^[A-Za-z0-9+/]*={0,2}$', b64_content):
        return False, "Contains characters outside standard base64 alphabet (A-Za-z0-9+/=)"
    
    # Validate can decode
    try:
        decoded = base64.b64decode(b64_content, validate=True)
        return True, ""
    except Exception as e:
        return False, f"Failed base64 decode: {e}"


def validate_pdf_magic(b64_content: str, content_mime_type: str) -> Tuple[bool, str]:
    """
    Validate that decoded content starts with %PDF when mime type is application/pdf.
    Returns (is_valid, error_message).
    """
    if content_mime_type != "application/pdf":
        return True, ""  # Not a PDF, skip check
    
    try:
        decoded = base64.b64decode(b64_content, validate=True)
        if not decoded.startswith(b'%PDF'):
            return False, "Decoded content does not start with %PDF magic bytes"
        return True, ""
    except Exception as e:
        return False, f"Cannot decode base64 to check PDF magic: {e}"


def validate_create_file_json(json_path: Path, max_b64: int, require_pdf_magic: bool) -> Tuple[bool, List[str]]:
    """
    Validate a single create_file JSON payload.
    Returns (is_valid, list_of_errors).
    """
    errors = []
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except Exception as e:
        return False, [f"Cannot read file: {e}"]
    
    # Check required keys
    required_keys = {
        'title': str,
        'parentId': str,
        'contentMimeType': str,
        'disableConversionToGoogleType': bool,
        'base64Content': str
    }
    
    for key, expected_type in required_keys.items():
        if key not in data:
            errors.append(f"Missing required key: {key}")
        elif not isinstance(data[key], expected_type):
            errors.append(f"Key '{key}' has wrong type: expected {expected_type.__name__}, got {type(data[key]).__name__}")
    
    # If missing required keys, stop here
    if errors:
        return False, errors
    
    # Check title non-empty
    if not data['title'].strip():
        errors.append("title is empty")
    
    # Check parentId non-empty
    if not data['parentId'].strip():
        errors.append("parentId is empty")
    
    # Validate base64Content
    b64_content = data['base64Content']
    
    # Check base64 strict validation
    is_valid_b64, b64_error = validate_base64_strict(b64_content)
    if not is_valid_b64:
        errors.append(f"base64Content invalid: {b64_error}")
    
    # Check length
    b64_len = len(b64_content)
    if b64_len > max_b64:
        errors.append(f"base64Content exceeds max length: {b64_len} > {max_b64}")
    
    # Optional: Check PDF magic bytes
    if require_pdf_magic and is_valid_b64:
        is_valid_pdf, pdf_error = validate_pdf_magic(b64_content, data['contentMimeType'])
        if not is_valid_pdf:
            errors.append(f"PDF validation failed: {pdf_error}")
    
    return len(errors) == 0, errors


def generate_report_md(valid_files: List[Dict], invalid_files: List[Dict], output_path: Path):
    """Generate markdown report of validation results."""
    with open(output_path, 'w') as f:
        f.write("# Drive create_file Validation Report\n\n")
        
        f.write(f"**Summary:** {len(valid_files)} valid, {len(invalid_files)} invalid\n\n")
        
        if invalid_files:
            f.write("## Invalid Files\n\n")
            for idx, item in enumerate(invalid_files, 1):
                f.write(f"{idx}. **{item['filename']}**\n")
                for error in item['errors']:
                    f.write(f"   - {error}\n")
                f.write("\n")
        
        if valid_files:
            f.write("## Valid Files\n\n")
            for idx, item in enumerate(valid_files, 1):
                f.write(f"{idx}. {item['filename']}\n")
            f.write("\n")


def main():
    parser = argparse.ArgumentParser(
        description='Validate Drive create_file JSON payloads before MCP upload',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate all JSONs in a directory
  %(prog)s --input-dir out/prepared/

  # Validate specific files with custom size limit
  %(prog)s --input-files a.create_file.json b.create_file.json --max-b64 12000

  # Validate with PDF magic byte check
  %(prog)s --input-dir prepared/ --require-pdf-magic

  # Custom output directory
  %(prog)s --input-dir prepared/ --outdir reports/
"""
    )
    
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument('--input-dir', type=str, help='Directory containing *.create_file.json or *.json files')
    input_group.add_argument('--input-files', nargs='+', type=str, help='Specific JSON files to validate')
    
    parser.add_argument('--max-b64', type=int, default=15500,
                        help='Maximum base64 payload size in bytes (default: 15500)')
    parser.add_argument('--require-pdf-magic', action='store_true',
                        help='Require %PDF magic bytes for application/pdf mime types')
    parser.add_argument('--outdir', type=str, default='reports',
                        help='Output directory for validation reports (default: reports/)')
    
    args = parser.parse_args()
    
    # Collect JSON files
    json_files: List[Path] = []
    
    if args.input_dir:
        input_path = Path(args.input_dir)
        if not input_path.is_dir():
            print(f"Error: {args.input_dir} is not a directory", file=sys.stderr)
            sys.exit(1)
        
        # Prefer *.create_file.json, fallback to *.json
        json_files = list(input_path.glob('*.create_file.json'))
        if not json_files:
            json_files = list(input_path.glob('*.json'))
    else:
        json_files = [Path(f) for f in args.input_files]
    
    json_files = [f for f in json_files if f.is_file()]
    
    if not json_files:
        print("Error: No JSON files found", file=sys.stderr)
        sys.exit(1)
    
    # Create output directory
    output_dir = Path(args.outdir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Validating {len(json_files)} JSON file(s)...")
    print(f"Max base64 size: {args.max_b64} bytes")
    print(f"PDF magic check: {'enabled' if args.require_pdf_magic else 'disabled'}")
    print(f"Output directory: {output_dir}")
    print()
    
    # Validate each file
    valid_files = []
    invalid_files = []
    
    for json_path in json_files:
        print(f"Validating {json_path.name}...", end=' ')
        is_valid, errors = validate_create_file_json(json_path, args.max_b64, args.require_pdf_magic)
        
        if is_valid:
            print("✓ valid")
            valid_files.append({
                'filename': json_path.name,
                'path': str(json_path)
            })
        else:
            print("✗ invalid")
            for error in errors:
                print(f"  → {error}")
            invalid_files.append({
                'filename': json_path.name,
                'path': str(json_path),
                'errors': errors
            })
    
    print()
    
    # Write outputs
    valid_json_path = output_dir / 'valid.json'
    with open(valid_json_path, 'w') as f:
        json.dump(valid_files, f, indent=2)
    
    invalid_json_path = output_dir / 'invalid.json'
    with open(invalid_json_path, 'w') as f:
        json.dump(invalid_files, f, indent=2)
    
    report_path = output_dir / 'report.md'
    generate_report_md(valid_files, invalid_files, report_path)
    
    print(f"✓ Validation complete!")
    print(f"  Valid: {len(valid_files)} → {valid_json_path}")
    print(f"  Invalid: {len(invalid_files)} → {invalid_json_path}")
    print(f"  Report: {report_path}")
    print()
    
    if invalid_files:
        print("⚠️  Some files failed validation. Review report.md for details.")
        sys.exit(1)
    else:
        print("✓ All files valid! Safe to proceed with Drive MCP upload.")
        sys.exit(0)


if __name__ == '__main__':
    main()
