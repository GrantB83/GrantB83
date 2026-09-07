#!/usr/bin/env python3
"""
Career Apply Doc QC - Fail-closed offline gate (Efficiency maintains).
Exit 0 = PASS (apply allowed). Exit 1 = FAIL (do not apply).
No LLM. No browser. Deterministic checks only.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# Forbidden patterns - FAIL immediately if found
FORBIDDEN = [
    "Employee-Owner",
    "ESOP",
    "MBA Candidate",
    "701-470-4908",  # Retired phone number
    "Liana",
    "TODO",
    "TBD",
    "XXX",
    "[COMPANY]",
    "[ROLE]",
]

# Required resume content - must all be present
REQUIRED_RESUME = [
    "Grant",
    "Brown", 
    "grant830318@gmail.com",
    "512-406-4300",  # Will check multiple formats
]

# PDF page limit
PDF_MAX_PAGES = 3


class QCResult:
    """Container for QC check results."""
    
    def __init__(self):
        self.status = "PASS"
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.checks: Dict[str, str] = {}
        self.metadata: Dict[str, any] = {}
    
    def fail(self, message: str):
        """Add error and set status to FAIL."""
        self.errors.append(message)
        self.status = "FAIL"
    
    def warn(self, message: str):
        """Add warning (doesn't fail)."""
        self.warnings.append(message)
    
    def add_check(self, name: str, status: str):
        """Record check result."""
        self.checks[name] = status
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "status": self.status,
            "errors": self.errors,
            "warnings": self.warnings,
            "checks": self.checks,
            "metadata": self.metadata
        }


def extract_text(file_path: Path) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """
    Extract text from file. Returns (text, error_message, page_count).
    page_count is only for PDFs, None otherwise.
    """
    ext = file_path.suffix.lower()
    
    try:
        if ext in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read(), None, None
        
        elif ext == '.pdf':
            try:
                import PyPDF2
                text_parts = []
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    page_count = len(reader.pages)
                    for page in reader.pages:
                        text_parts.append(page.extract_text() or '')
                return '\n'.join(text_parts), None, page_count
            except ImportError:
                return None, "PyPDF2 not available (pip install PyPDF2)", None
            except Exception as e:
                return None, f"PDF extraction failed: {str(e)}", None
        
        elif ext == '.docx':
            try:
                import docx
                doc = docx.Document(str(file_path))
                text_parts = [para.text for para in doc.paragraphs]
                return '\n'.join(text_parts), None, None
            except ImportError:
                return None, "python-docx not available (pip install python-docx)", None
            except Exception as e:
                return None, f"DOCX extraction failed: {str(e)}", None
        
        else:
            return None, f"Unsupported format: {ext}", None
    
    except Exception as e:
        return None, f"Read error: {str(e)}", None


def check_forbidden(text: str, file_type: str, result: QCResult) -> bool:
    """Check for forbidden patterns. Returns True if clean, False if forbidden found."""
    text_lower = text.lower()
    found = []
    
    for pattern in FORBIDDEN:
        # Case-insensitive check
        if pattern.lower() in text_lower:
            found.append(pattern)
    
    if found:
        result.fail(f"{file_type}: Forbidden pattern(s) found: {', '.join(found)}")
        return False
    
    return True


def check_required_resume(text: str, result: QCResult) -> bool:
    """Check resume has required content. Returns True if all present."""
    missing = []
    text_lower = text.lower()
    
    for required in REQUIRED_RESUME:
        required_lower = required.lower()
        
        # Normalize phone format for checking (allow 512-406-4300, 512 406 4300, etc)
        if "512" in required_lower:
            # Check various phone formats (case doesn't matter for numbers)
            patterns = [
                "512-406-4300",
                "512 406 4300",
                "512.406.4300",
                "(512) 406-4300",
            ]
            # Check in original text since numbers are case-insensitive
            if not any(p in text for p in patterns):
                missing.append(required)
        elif required_lower not in text_lower:
            missing.append(required)
    
    if missing:
        result.fail(f"Resume missing required content: {', '.join(missing)}")
        return False
    
    return True


def check_format_smells(text: str, file_type: str, result: QCResult):
    """Check for suspicious formatting issues (warnings, not failures)."""
    # Check for excessive whitespace/empty lines
    lines = text.split('\n')
    non_empty = [line for line in lines if line.strip()]
    
    if len(lines) > 100 and len(non_empty) < len(lines) * 0.3:
        result.warn(f"{file_type}: Suspicious whitespace ratio")
    
    # Check for very long lines (>200 chars) that might indicate formatting issues
    long_lines = [line for line in lines if len(line) > 200]
    if len(long_lines) > 5:
        result.warn(f"{file_type}: {len(long_lines)} very long lines (possible format issue)")


def check_cover_customization(text: str, company: Optional[str], role: Optional[str], result: QCResult):
    """Check if cover letter mentions company/role. Warns if not found."""
    text_lower = text.lower()
    
    if company:
        company_lower = company.lower()
        if company_lower not in text_lower:
            result.warn(f"Cover: Company '{company}' not found")
    
    if role:
        role_lower = role.lower()
        # Check for role keywords (any word from role title)
        role_words = [w for w in re.split(r'\W+', role_lower) if len(w) > 3]
        found_words = [w for w in role_words if w in text_lower]
        
        if not found_words:
            result.warn(f"Cover: Role '{role}' keywords not found")


def write_outputs(result: QCResult, outdir: Path):
    """Write qc.json and qc.md output files."""
    outdir.mkdir(parents=True, exist_ok=True)
    
    # Write JSON
    json_path = outdir / "qc.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(result.to_dict(), f, indent=2)
    
    # Write Markdown
    md_path = outdir / "qc.md"
    lines = [
        f"# QC Result: {result.status}",
        "",
    ]
    
    if result.errors:
        lines.append("## Errors")
        lines.append("")
        for error in result.errors:
            lines.append(f"- ❌ {error}")
        lines.append("")
    
    if result.warnings:
        lines.append("## Warnings")
        lines.append("")
        for warning in result.warnings:
            lines.append(f"- ⚠️ {warning}")
        lines.append("")
    
    if result.checks:
        lines.append("## Checks")
        lines.append("")
        for check, status in result.checks.items():
            emoji = "✅" if status == "PASS" else "❌"
            lines.append(f"- {emoji} {check}: {status}")
        lines.append("")
    
    if result.metadata:
        lines.append("## Metadata")
        lines.append("")
        for key, value in result.metadata.items():
            lines.append(f"- {key}: {value}")
        lines.append("")
    
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def main():
    parser = argparse.ArgumentParser(
        description="Career Apply Doc QC - Fail-closed gate (Efficiency maintains)"
    )
    parser.add_argument('--resume', required=True, help='Resume file path')
    parser.add_argument('--cover', help='Cover letter file path (optional)')
    parser.add_argument('--company', help='Target company for cover check')
    parser.add_argument('--role', help='Target role for cover check')
    parser.add_argument('--outdir', default='./out', help='Output directory')
    
    args = parser.parse_args()
    
    result = QCResult()
    result.metadata['resume_file'] = args.resume
    if args.cover:
        result.metadata['cover_file'] = args.cover
    if args.company:
        result.metadata['company'] = args.company
    if args.role:
        result.metadata['role'] = args.role
    
    # Check resume
    resume_path = Path(args.resume)
    
    if not resume_path.exists():
        result.fail(f"Resume file not found: {args.resume}")
        write_outputs(result, Path(args.outdir))
        print(f"QC FAIL: Resume not found", file=sys.stderr)
        sys.exit(1)
    
    # Extract resume text
    resume_text, resume_error, resume_pages = extract_text(resume_path)
    
    if resume_error:
        result.fail(f"Resume: {resume_error}")
        write_outputs(result, Path(args.outdir))
        print(f"QC FAIL: {resume_error}", file=sys.stderr)
        sys.exit(1)
    
    if not resume_text or len(resume_text.strip()) < 200:
        result.fail(f"Resume too short: {len(resume_text.strip()) if resume_text else 0} chars")
        write_outputs(result, Path(args.outdir))
        print(f"QC FAIL: Resume too short", file=sys.stderr)
        sys.exit(1)
    
    result.metadata['resume_chars'] = len(resume_text.strip())
    if resume_pages:
        result.metadata['resume_pages'] = resume_pages
        if resume_pages > PDF_MAX_PAGES:
            result.fail(f"Resume PDF too long: {resume_pages} pages (max {PDF_MAX_PAGES})")
    
    result.add_check("resume_extracted", "PASS")
    
    # Check forbidden patterns in resume
    if not check_forbidden(resume_text, "Resume", result):
        write_outputs(result, Path(args.outdir))
        print(f"QC FAIL: Forbidden pattern in resume", file=sys.stderr)
        sys.exit(1)
    
    result.add_check("resume_no_forbidden", "PASS")
    
    # Check required content in resume
    if not check_required_resume(resume_text, result):
        write_outputs(result, Path(args.outdir))
        print(f"QC FAIL: Missing required resume content", file=sys.stderr)
        sys.exit(1)
    
    result.add_check("resume_required_content", "PASS")
    
    # Format smells (warnings only)
    check_format_smells(resume_text, "Resume", result)
    
    # Check cover letter if provided
    if args.cover:
        cover_path = Path(args.cover)
        
        if not cover_path.exists():
            result.fail(f"Cover file not found: {args.cover}")
            write_outputs(result, Path(args.outdir))
            print(f"QC FAIL: Cover not found", file=sys.stderr)
            sys.exit(1)
        
        cover_text, cover_error, cover_pages = extract_text(cover_path)
        
        if cover_error:
            result.fail(f"Cover: {cover_error}")
            write_outputs(result, Path(args.outdir))
            print(f"QC FAIL: {cover_error}", file=sys.stderr)
            sys.exit(1)
        
        if not cover_text or len(cover_text.strip()) < 100:
            result.fail(f"Cover too short: {len(cover_text.strip()) if cover_text else 0} chars")
            write_outputs(result, Path(args.outdir))
            print(f"QC FAIL: Cover too short", file=sys.stderr)
            sys.exit(1)
        
        result.metadata['cover_chars'] = len(cover_text.strip())
        if cover_pages:
            result.metadata['cover_pages'] = cover_pages
            if cover_pages > PDF_MAX_PAGES:
                result.fail(f"Cover PDF too long: {cover_pages} pages (max {PDF_MAX_PAGES})")
        
        result.add_check("cover_extracted", "PASS")
        
        # Check forbidden in cover
        if not check_forbidden(cover_text, "Cover", result):
            write_outputs(result, Path(args.outdir))
            print(f"QC FAIL: Forbidden pattern in cover", file=sys.stderr)
            sys.exit(1)
        
        result.add_check("cover_no_forbidden", "PASS")
        
        # Check cover customization (warnings only)
        check_cover_customization(cover_text, args.company, args.role, result)
        
        # Format smells
        check_format_smells(cover_text, "Cover", result)
    
    # Final status check
    if result.status == "FAIL":
        write_outputs(result, Path(args.outdir))
        print(f"QC FAIL: {len(result.errors)} error(s)", file=sys.stderr)
        for error in result.errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
    
    # Success
    write_outputs(result, Path(args.outdir))
    print(f"QC PASS: Apply allowed")
    if result.warnings:
        print(f"  ({len(result.warnings)} warning(s) - see qc.md)")
    sys.exit(0)


if __name__ == '__main__':
    main()
