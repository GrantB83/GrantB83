#!/usr/bin/env python3
"""
Career Apply Doc QC - Fail-closed offline gate for career application documents.
Owning desk: Career (Efficiency maintains gate)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class QCResult:
    """Container for QC check results."""
    
    def __init__(self):
        self.status = "PASS"
        self.checks: Dict[str, str] = {}
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.metadata: Dict[str, any] = {}
    
    def add_check(self, name: str, status: str):
        """Add a check result."""
        self.checks[name] = status
        if status == "FAIL":
            self.status = "FAIL"
    
    def add_warning(self, message: str):
        """Add a warning (doesn't fail QC)."""
        self.warnings.append(message)
    
    def add_error(self, message: str):
        """Add an error (fails QC)."""
        self.errors.append(message)
        self.status = "FAIL"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON output."""
        return {
            "status": self.status,
            "checks": self.checks,
            "warnings": self.warnings,
            "errors": self.errors,
            "metadata": self.metadata
        }


def extract_text(file_path: Path) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract text from a file based on its extension.
    Returns (text, error_message).
    """
    ext = file_path.suffix.lower()
    
    try:
        if ext in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read(), None
        
        elif ext == '.pdf':
            try:
                import PyPDF2
                text_parts = []
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text_parts.append(page.extract_text())
                return '\n'.join(text_parts), None
            except ImportError:
                return None, "PyPDF2 library not available. Install with: pip install PyPDF2"
            except Exception as e:
                return None, f"PDF extraction failed: {str(e)}"
        
        elif ext == '.docx':
            try:
                import docx
                doc = docx.Document(str(file_path))
                text_parts = [para.text for para in doc.paragraphs]
                return '\n'.join(text_parts), None
            except ImportError:
                return None, "python-docx library not available. Install with: pip install python-docx"
            except Exception as e:
                return None, f"DOCX extraction failed: {str(e)}"
        
        else:
            return None, f"Unsupported file format: {ext}"
    
    except Exception as e:
        return None, f"File read error: {str(e)}"


def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, strip punctuation)."""
    # Convert to lowercase
    text = text.lower()
    # Remove common punctuation but keep spaces
    text = re.sub(r'[^\w\s]', ' ', text)
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def check_file_exists(file_path: Path, file_type: str, result: QCResult) -> bool:
    """Check if file exists and is readable."""
    check_name = f"{file_type}_exists"
    
    if not file_path.exists():
        result.add_check(check_name, "FAIL")
        result.add_error(f"{file_type.capitalize()} file not found: {file_path}")
        return False
    
    if not file_path.is_file():
        result.add_check(check_name, "FAIL")
        result.add_error(f"{file_type.capitalize()} path is not a file: {file_path}")
        return False
    
    if not os.access(file_path, os.R_OK):
        result.add_check(check_name, "FAIL")
        result.add_error(f"{file_type.capitalize()} file is not readable: {file_path}")
        return False
    
    result.add_check(check_name, "PASS")
    return True


def check_file_format(file_path: Path, file_type: str, result: QCResult) -> bool:
    """Check if file has recognized extension."""
    check_name = f"{file_type}_format"
    valid_extensions = ['.pdf', '.docx', '.md', '.txt']
    
    ext = file_path.suffix.lower()
    if ext not in valid_extensions:
        result.add_check(check_name, "FAIL")
        result.add_error(
            f"{file_type.capitalize()} has unrecognized format: {ext}. "
            f"Allowed: {', '.join(valid_extensions)}"
        )
        return False
    
    result.add_check(check_name, "PASS")
    return True


def check_content(
    file_path: Path,
    file_type: str,
    min_length: int,
    result: QCResult
) -> Optional[str]:
    """
    Extract and validate content from file.
    Returns content text if successful, None otherwise.
    """
    check_readable = f"{file_type}_readable"
    check_length = f"{file_type}_length"
    
    # Extract text
    content, error = extract_text(file_path)
    
    if error:
        result.add_check(check_readable, "FAIL")
        result.add_error(f"{file_type.capitalize()}: {error}")
        return None
    
    result.add_check(check_readable, "PASS")
    
    # Check minimum length
    if not content or len(content.strip()) < min_length:
        result.add_check(check_length, "FAIL")
        result.add_error(
            f"{file_type.capitalize()} content too short: "
            f"{len(content.strip()) if content else 0} chars "
            f"(minimum {min_length} required)"
        )
        return None
    
    result.add_check(check_length, "PASS")
    result.metadata[f"{file_type}_chars"] = len(content.strip())
    
    return content


def check_company_role_mention(
    content: str,
    company: Optional[str],
    role: Optional[str],
    result: QCResult
):
    """
    Soft check for company/role mentions in cover letter.
    Warns but doesn't fail if not found.
    """
    normalized_content = normalize_text(content)
    
    # Check company mention
    if company:
        normalized_company = normalize_text(company)
        if normalized_company in normalized_content:
            result.add_check("company_mention", "PASS")
        else:
            result.add_check("company_mention", "WARN")
            result.add_warning(f"Company name '{company}' not found in cover letter")
    
    # Check role mention (keyword-based)
    if role:
        normalized_role = normalize_text(role)
        role_keywords = normalized_role.split()
        
        # Check if any role keywords appear in content
        found_keywords = [kw for kw in role_keywords if kw in normalized_content]
        
        if found_keywords:
            result.add_check("role_mention", "PASS")
        else:
            result.add_check("role_mention", "WARN")
            result.add_warning(f"Role keywords '{role}' not found in cover letter")


def write_report_json(result: QCResult, outdir: Path):
    """Write structured JSON report."""
    report_path = outdir / "qc-report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(result.to_dict(), f, indent=2)


def write_report_markdown(result: QCResult, outdir: Path):
    """Write human-readable markdown report."""
    report_path = outdir / "qc-report.md"
    
    lines = [
        "# Career Apply Doc QC Report",
        "",
        f"**Status:** {result.status}",
        "",
        "## Checks",
        ""
    ]
    
    for check_name, check_status in result.checks.items():
        emoji = "✅" if check_status == "PASS" else "⚠️" if check_status == "WARN" else "❌"
        lines.append(f"- {emoji} **{check_name}**: {check_status}")
    
    if result.warnings:
        lines.extend(["", "## Warnings", ""])
        for warning in result.warnings:
            lines.append(f"- ⚠️ {warning}")
    
    if result.errors:
        lines.extend(["", "## Errors", ""])
        for error in result.errors:
            lines.append(f"- ❌ {error}")
    
    lines.extend(["", "## Metadata", ""])
    for key, value in result.metadata.items():
        lines.append(f"- **{key}**: {value}")
    
    lines.append("")
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def write_gate_status(result: QCResult, outdir: Path):
    """Write simple gate status file."""
    gate_path = outdir / "APPLY-GATE.txt"
    with open(gate_path, 'w', encoding='utf-8') as f:
        f.write(f"{result.status}\n")
        if result.status == "FAIL":
            f.write("\nDO NOT APPLY - QC checks failed.\n")
            if result.errors:
                f.write("\nErrors:\n")
                for error in result.errors:
                    f.write(f"  - {error}\n")
        else:
            f.write("\nQC PASS - Apply allowed (Career bot final decision).\n")


def main():
    parser = argparse.ArgumentParser(
        description="Fail-closed offline QC gate for career application documents",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--resume',
        required=True,
        help='Path to resume file (PDF, DOCX, MD, TXT)'
    )
    
    parser.add_argument(
        '--cover',
        help='Path to cover letter file (PDF, DOCX, MD, TXT) [optional]'
    )
    
    parser.add_argument(
        '--company',
        help='Target company name for soft-check [optional]'
    )
    
    parser.add_argument(
        '--role',
        help='Target role for soft-check [optional]'
    )
    
    parser.add_argument(
        '--outdir',
        default='./out',
        help='Output directory for QC reports [default: ./out]'
    )
    
    args = parser.parse_args()
    
    # Initialize result
    result = QCResult()
    
    # Setup output directory
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    
    # Store metadata
    result.metadata['resume_file'] = args.resume
    if args.cover:
        result.metadata['cover_file'] = args.cover
    if args.company:
        result.metadata['company'] = args.company
    if args.role:
        result.metadata['role'] = args.role
    
    # Check resume
    resume_path = Path(args.resume)
    
    if not check_file_exists(resume_path, "resume", result):
        write_report_json(result, outdir)
        write_report_markdown(result, outdir)
        write_gate_status(result, outdir)
        print(f"QC FAIL: Resume file not found or unreadable", file=sys.stderr)
        sys.exit(1)
    
    if not check_file_format(resume_path, "resume", result):
        write_report_json(result, outdir)
        write_report_markdown(result, outdir)
        write_gate_status(result, outdir)
        print(f"QC FAIL: Resume format not recognized", file=sys.stderr)
        sys.exit(1)
    
    # Extract and validate resume content (minimum 500 chars)
    resume_content = check_content(resume_path, "resume", 500, result)
    if resume_content is None:
        write_report_json(result, outdir)
        write_report_markdown(result, outdir)
        write_gate_status(result, outdir)
        print(f"QC FAIL: Resume content validation failed", file=sys.stderr)
        sys.exit(1)
    
    # Check cover letter if provided
    cover_content = None
    if args.cover:
        cover_path = Path(args.cover)
        
        if not check_file_exists(cover_path, "cover", result):
            write_report_json(result, outdir)
            write_report_markdown(result, outdir)
            write_gate_status(result, outdir)
            print(f"QC FAIL: Cover letter file not found or unreadable", file=sys.stderr)
            sys.exit(1)
        
        if not check_file_format(cover_path, "cover", result):
            write_report_json(result, outdir)
            write_report_markdown(result, outdir)
            write_gate_status(result, outdir)
            print(f"QC FAIL: Cover letter format not recognized", file=sys.stderr)
            sys.exit(1)
        
        # Extract and validate cover content (minimum 100 chars)
        cover_content = check_content(cover_path, "cover", 100, result)
        if cover_content is None:
            write_report_json(result, outdir)
            write_report_markdown(result, outdir)
            write_gate_status(result, outdir)
            print(f"QC FAIL: Cover letter content validation failed", file=sys.stderr)
            sys.exit(1)
        
        # Soft check for company/role mentions (only warns, doesn't fail)
        if args.company or args.role:
            check_company_role_mention(cover_content, args.company, args.role, result)
    
    # Write reports
    write_report_json(result, outdir)
    write_report_markdown(result, outdir)
    write_gate_status(result, outdir)
    
    # Final status
    if result.status == "PASS":
        print(f"QC PASS: All checks passed. Apply allowed.")
        if result.warnings:
            print(f"Warnings: {len(result.warnings)} (see report)")
        sys.exit(0)
    else:
        print(f"QC FAIL: {len(result.errors)} error(s) found", file=sys.stderr)
        for error in result.errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
