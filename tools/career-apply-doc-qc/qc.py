#!/usr/bin/env python3
"""Offline fail-closed QC for Career resume/cover docs. No LLM."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

FORBIDDEN = [
    (r"\bEmployee-Owner\b", "forbidden: Employee-Owner"),
    (r"\bESOP\b", "forbidden: ESOP (plan on hold)"),
    (r"\bMBA Candidate\b", "forbidden: MBA Candidate"),
    (r"701[^\d]*470[^\d]*4908", "forbidden: retired phone +1 701 470 4908"),
    (r"\bLiana\b", "forbidden: Liana CV contamination"),
    (r"\[Company\]|\[Role\]|\[Your Name\]|\{company\}|\{role\}", "placeholder token"),
    (r"\bTODO\b|\bTBD\b|\bFIXME\b", "placeholder TODO/TBD/FIXME"),
    (r"\blorem ipsum\b", "lorem ipsum"),
    (r"insert (company|role|here)", "insert-here placeholder"),
    (r"XXXX+|___+", "placeholder XXXX/underscores"),
    (r"awarded August 2026", "MBA not awarded"),
]

REQUIRED_RESUME = [
    (r"\bGrant(?:\s+Angus)?\s+Brown\b", "missing name Grant Brown"),
    (r"grant830318@gmail\.com", "missing apply email grant830318@gmail.com"),
    (r"512[^\d]*406[^\d]*4300", "missing phone +1 512 406 4300"),
]


def extract_text(path: Path) -> str:
    suf = path.suffix.lower()
    if suf in {".txt", ".md", ".markdown"}:
        return path.read_text(errors="ignore")
    if suf == ".pdf":
        try:
            out = subprocess.check_output(
                ["pdftotext", "-layout", str(path), "-"],
                stderr=subprocess.DEVNULL,
            )
            return out.decode(errors="ignore")
        except Exception:
            return path.read_bytes().decode("latin-1", errors="ignore")
    if suf == ".docx":
        with zipfile.ZipFile(path) as zf:
            xml = zf.read("word/document.xml")
        root = ET.fromstring(xml)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        parts = [t.text or "" for t in root.findall(".//w:t", ns)]
        return " ".join(parts)
    return path.read_text(errors="ignore")


def check_format_smells(text: str, label: str) -> list[str]:
    fails = []
    if not text or not text.strip():
        return [f"{label}: empty extract"]
    if len(text.strip()) < 80:
        fails.append(f"{label}: extract too short (<80 chars) — likely bad export")
    if re.search(r"\n{4,}", text):
        fails.append(f"{label}: broken formatting (4+ blank lines)")
    if text.count("\t") > 20:
        fails.append(f"{label}: excessive tabs (broken layout)")
    # garbage long tokens
    for tok in re.findall(r"\S{80,}", text):
        if not tok.startswith("http"):
            fails.append(f"{label}: garbage long token (export corruption)")
            break
    empty_bullets = len(re.findall(r"(?m)^\s*[•\-\*]\s*$", text))
    if empty_bullets >= 3:
        fails.append(f"{label}: empty bullets (broken formatting)")
    return fails


def check_patterns(text: str, label: str) -> list[str]:
    fails = []
    for pat, msg in FORBIDDEN:
        if re.search(pat, text, re.I):
            fails.append(f"{label}: {msg}")
    return fails


def check_resume_required(text: str) -> list[str]:
    fails = []
    for pat, msg in REQUIRED_RESUME:
        if not re.search(pat, text, re.I):
            fails.append(f"resume: {msg}")
    return fails


def check_cover(text: str, company: str | None, role: str | None) -> list[str]:
    fails = []
    words = re.findall(r"[A-Za-z0-9']+", text)
    if len(words) < 40:
        fails.append("cover: too short (<40 words) — missing real customization")
    if len(words) > 900:
        fails.append("cover: too long (>900 words)")
    if company:
        # require a substantial company token (skip tiny words)
        tokens = [t for t in re.findall(r"[A-Za-z0-9&]+", company) if len(t) >= 3]
        if tokens and not any(re.search(re.escape(t), text, re.I) for t in tokens):
            fails.append(f"cover: missing company customization ({company})")
    if role:
        role_tokens = [t for t in re.findall(r"[A-Za-z0-9]+", role) if len(t) >= 4]
        if role_tokens and not any(re.search(re.escape(t), text, re.I) for t in role_tokens):
            fails.append(f"cover: missing role customization ({role})")
    # generic uncustomized smell
    if re.search(r"I am writing to express (my )?interest", text, re.I) and company:
        if company.split()[0].lower() not in text.lower():
            fails.append("cover: generic opener without company name")
    return fails


def pdf_page_count(path: Path) -> int | None:
    if path.suffix.lower() != ".pdf":
        return None
    try:
        out = subprocess.check_output(["pdfinfo", str(path)], stderr=subprocess.DEVNULL).decode()
        m = re.search(r"Pages:\s+(\d+)", out)
        return int(m.group(1)) if m else None
    except Exception:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Career apply doc QC (offline, fail-closed)")
    ap.add_argument("--resume", required=True)
    ap.add_argument("--cover")
    ap.add_argument("--company")
    ap.add_argument("--role")
    ap.add_argument("--outdir", default="out")
    args = ap.parse_args()

    resume = Path(args.resume)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    fails: list[str] = []
    warns: list[str] = []

    if not resume.is_file():
        fails.append(f"resume: file missing ({resume})")
    else:
        if resume.stat().st_size < 500:
            fails.append("resume: file too small (<500 bytes)")
        text = extract_text(resume)
        fails.extend(check_format_smells(text, "resume"))
        fails.extend(check_patterns(text, "resume"))
        fails.extend(check_resume_required(text))
        pages = pdf_page_count(resume)
        if pages is not None and pages > 3:
            fails.append(f"resume: too many pages ({pages}>3)")
        if pages == 1:
            warns.append("resume: 1 page OK")

    cover_text = ""
    if args.cover:
        cover = Path(args.cover)
        if not cover.is_file():
            fails.append(f"cover: file missing ({cover})")
        else:
            cover_text = extract_text(cover)
            fails.extend(check_format_smells(cover_text, "cover"))
            fails.extend(check_patterns(cover_text, "cover"))
            fails.extend(check_cover(cover_text, args.company, args.role))
    elif args.company or args.role:
        warns.append("cover: not provided (ok if ATS has no cover field)")

    # dedupe
    fails = list(dict.fromkeys(fails))
    warns = list(dict.fromkeys(warns))
    verdict = "FAIL" if fails else "PASS"

    result = {
        "verdict": verdict,
        "resume": str(resume),
        "cover": args.cover,
        "company": args.company,
        "role": args.role,
        "fails": fails,
        "warns": warns,
        "apply_allowed": verdict == "PASS",
    }
    (outdir / "qc.json").write_text(json.dumps(result, indent=2) + "\n")
    lines = [
        f"# Career apply doc QC: **{verdict}**",
        "",
        f"- Resume: `{resume}`",
        f"- Cover: `{args.cover or '(none)'}`",
        f"- Company/role: {args.company or '—'} / {args.role or '—'}",
        "",
    ]
    if fails:
        lines.append("## Fails (do not apply)")
        lines.extend(f"- {f}" for f in fails)
        lines.append("")
    if warns:
        lines.append("## Warns")
        lines.extend(f"- {w}" for w in warns)
        lines.append("")
    lines.append(
        "Fail-closed: Career must not submit while verdict is FAIL. "
        "Re-run after fixing docs. Prefer this CLI over LLM review."
    )
    (outdir / "qc.md").write_text("\n".join(lines) + "\n")
    print(f"{verdict}: {len(fails)} fail(s), {len(warns)} warn(s) → {outdir}/qc.md")
    for f in fails:
        print(f"  FAIL {f}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
