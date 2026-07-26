"""
export_catalog_to_website.py  —  Sheet -> website/benchmarks.json
------------------------------------------------------------------
Reads the human-owned "Benchmark catalog" tab of the Master Catalog Google
Sheet and writes a clean JSON file the website loads. Read-only: it never
writes back to the sheet.

Only the columns useful for the public website are exported (identity +
characterization + the appraisal grade). Internal columns like "Reviewer" and
"Red flags / reviewer notes" are intentionally left out.

Messy free-text values (e.g. open/Open/Closed/Close/Both) are normalized so the
site can filter on them.

USAGE (project Python):
    python scripts/export_catalog_to_website.py
"""

import json
import re
import sys
from pathlib import Path

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_DIR / ".env")

# The Master Catalog sheet + the "Benchmark catalog" tab.
SHEET_ID = "1RhroAr46PBWK-psablParlbfgb6VPODN6nlIVNq3t0Q"
TAB_NAME = "Benchmark catalog"
OUT_FILE = PROJECT_DIR / "website" / "benchmarks.json"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

# Sheet header -> JSON key. Only these columns are exported.
FIELD_MAP = {
    "Benchmark name": "name",
    "Paper link": "paperLink",
    "Open vs. Closed Source": "sourceRaw",
    "Month / Year": "year",
    "Authors / Institutions": "authors",
    "Journal/Venue": "venue",
    "Ground-truth source": "groundTruth",
    "Size of benchmark (# of items)": "size",
    "What does the benchmark assess (skills)?": "measures",
    "Clinical use case": "clinicalUseCase",
    "Population represented": "population",
    "Language(s)": "language",
    "# domains": "numDomains",
    "Single vs. Multi-Turn": "turnRaw",
    "Evaluation method": "evaluation",
    "# of LLMs assessed in paper": "numLLMs",
    "Construct validity": "constructValidity",
    "Overall grade": "overallGrade",
}


def normalize_source(raw):
    """open/Open/.. -> Open ; Closed/Close/closed -> Closed ; Both/mixed -> Mixed."""
    s = (raw or "").strip().lower()
    if not s:
        return ""
    if s.startswith("open"):
        return "Open"
    if s.startswith("clos") or s.startswith("close"):
        return "Closed"
    if s.startswith("both") or s.startswith("mix"):
        return "Mixed"
    if s.startswith("restrict"):
        return "Restricted"
    return raw.strip().split()[0].capitalize()


def normalize_turn(raw):
    s = (raw or "").strip().lower()
    if not s:
        return ""
    if s.startswith("multi"):
        return "Multi-turn"
    if s.startswith("mix") or s.startswith("multiple"):
        return "Mixed"
    if s.startswith("single") or s.startswith("singl"):
        return "Single-turn"
    return ""


def first_int(text):
    """Pull the first integer out of a size string like '5,188 items' -> 5188."""
    m = re.search(r"\d[\d,]*", text or "")
    return int(m.group(0).replace(",", "")) if m else None


def slugify(name, idx):
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return f"{base[:40] or 'benchmark'}-{idx}"


def main():
    creds = Credentials.from_service_account_file(
        str(PROJECT_DIR / "service_account.json"), scopes=SCOPES)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws = sh.worksheet(TAB_NAME)

    rows = ws.get_all_values()
    header = rows[0]
    col_idx = {name: header.index(name) for name in FIELD_MAP if name in header}

    missing = [c for c in FIELD_MAP if c not in col_idx]
    if missing:
        print("! Warning: these expected columns were not found:", missing)

    # Safety: the name column is essential. If the header changed or the read
    # came back malformed, abort rather than silently exporting an empty catalog.
    if "Benchmark name" not in col_idx:
        print("[ABORT] 'Benchmark name' column not found in the sheet header "
              "(the header may have changed or the read failed). "
              "Refusing to overwrite website/benchmarks.json.")
        sys.exit(1)

    records = []
    for i, row in enumerate(rows[1:], start=2):
        def get(name):
            j = col_idx.get(name)
            return row[j].strip() if (j is not None and j < len(row)) else ""

        name = get("Benchmark name")
        if not name:
            continue  # skip blank / spacer rows

        rec = {key: get(sheet_col) for sheet_col, key in FIELD_MAP.items()}
        rec["id"] = slugify(name, i)
        rec["source"] = normalize_source(rec.get("sourceRaw", ""))
        rec["turn"] = normalize_turn(rec.get("turnRaw", ""))
        rec["sizeNum"] = first_int(rec.get("size", ""))
        records.append(rec)

    # --- Safety guards: never overwrite a good catalog with an empty/gutted export.
    # A transient sheet-read failure once wrote an empty [] and blanked the site.
    if not records:
        print("[ABORT] Export produced 0 benchmarks; refusing to overwrite "
              "website/benchmarks.json (likely a transient sheet-read failure). "
              "The existing catalog is left untouched.")
        sys.exit(1)

    if OUT_FILE.exists():
        try:
            prev = json.loads(OUT_FILE.read_text(encoding="utf-8"))
        except Exception:
            prev = []
        if len(prev) >= 5 and len(records) < len(prev) * 0.5:
            print(f"[ABORT] New export has {len(records)} benchmarks vs {len(prev)} in the "
                  f"current file (a drop of more than 50%). Refusing to overwrite as a safety "
                  f"measure. If this deletion is intentional, run the script locally to confirm.")
            sys.exit(1)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Always write LF (no trailing CRLF on Windows) so local and CI output match.
    OUT_FILE.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")

    graded = sum(1 for r in records if r.get("overallGrade"))
    with_source = sum(1 for r in records if r.get("source"))
    print(f"[OK] Exported {len(records)} benchmarks -> {OUT_FILE}")
    print(f"     {with_source} have a normalized source; {graded} have an Overall grade.")


if __name__ == "__main__":
    main()
