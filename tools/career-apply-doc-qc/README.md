# Career Apply Doc QC

**One-line:** Offline, token-cheap fail-closed QC for Career resume/cover files before apply.

**Owning desk(s):** Career (Efficiency maintains gate)

## Run
```bash
python3 qc.py --resume path/to/resume.pdf|docx|md|txt \
  [--cover path/to/cover.md|txt|docx|pdf] \
  [--company "Acme"] [--role "VP Operations"] \
  [--outdir out/]
```
Exit `0` = PASS (apply allowed). Exit `1` = FAIL (do not apply).

No LLM. No browser. Deterministic checks only.
