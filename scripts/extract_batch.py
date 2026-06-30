"""
extract_batch.py  —  PHASE 2: run extraction across several arXiv papers
------------------------------------------------------------------------
Takes the "Definitely Related" papers from filtered_papers.json, downloads
each one's PDF from arXiv, extracts the catalog fields (reusing the logic in
extract_paper.py), and writes everything to extracted_results.csv.

Capped at LIMIT papers so a test run stays cheap.
"""

import csv
import json
import ssl
import sys
import urllib.request
from pathlib import Path

import certifi

# Reuse the extraction engine from extract_paper.py (same folder).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_paper import extract, MODEL, DATA_DIR, EXTRACT_DIR  # noqa: E402

PROJECT_DIR = Path(__file__).resolve().parent.parent
PDF_DIR = PROJECT_DIR / "pdfs"
PDF_DIR.mkdir(exist_ok=True)
INPUT_FILE = DATA_DIR / "filtered_papers.json"
OUTPUT_CSV = DATA_DIR / "extracted_results.csv"

SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

# How many papers to process this run (keep small to control cost).
LIMIT = 3
# Which relevance levels to extract. (Both proceed per the instruction.)
EXTRACT_LEVELS = {"Definitely Related"}

# Columns written to the CSV (matches your catalog's Tier 1-2 schema).
COLUMNS = [
    "relevance_flag", "benchmark_name", "paper_link", "open_vs_closed_source",
    "month_year", "authors", "institutions", "journal_venue",
    "ground_truth_source", "size_of_benchmark", "what_assessed_skills",
    "tasks_assessed", "population_represented", "languages", "num_domains",
    "single_vs_multi_turn", "evaluation_method", "num_llms_assessed",
    "llms_evaluated", "mental_health_conditions", "performance_scores",
    "short_summary", "missing_or_uncertain_fields",
]


def download_pdf(url, dest):
    """Download a PDF to dest (skip if already there)."""
    if dest.exists():
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MH-Benchmark-Finder/1.0"})
        with urllib.request.urlopen(req, timeout=90, context=SSL_CONTEXT) as resp:
            dest.write_bytes(resp.read())
        return True
    except Exception as e:
        print(f"    ! Could not download PDF: {e}")
        return False


def flatten(value):
    """Make lists CSV-friendly."""
    if isinstance(value, list):
        return "; ".join(str(v) for v in value)
    return value


def main():
    papers = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    todo = [p for p in papers if p.get("relevance") in EXTRACT_LEVELS][:LIMIT]
    print(f"Extracting {len(todo)} '{', '.join(EXTRACT_LEVELS)}' papers "
          f"with {MODEL}.\n")

    rows, total_in, total_out = [], 0, 0
    for i, p in enumerate(todo, 1):
        print(f"[{i}/{len(todo)}] {p['title'][:65]}")
        pdf_path = PDF_DIR / f"{p['id']}.pdf"
        if not p.get("pdf_url") or not download_pdf(p["pdf_url"], pdf_path):
            print("    skipped (no PDF).")
            continue

        print("    extracting ...")
        try:
            data, usage = extract(pdf_path.read_bytes(), p.get("abstract_url", ""))
        except Exception as e:
            print(f"    ! extraction failed: {e}")
            continue
        total_in += usage.input_tokens
        total_out += usage.output_tokens

        (EXTRACT_DIR / f"{p['id']}.json").write_text(
            json.dumps(data, indent=2), encoding="utf-8")
        rows.append({c: flatten(data.get(c, "")) for c in COLUMNS})
        print(f"    done: {data.get('benchmark_name', '')[:60]}")

    # Write the combined spreadsheet.
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print("\n" + "=" * 70)
    print(f"Extracted {len(rows)} papers -> {OUTPUT_CSV}")
    print(f"Tokens: {total_in:,} in + {total_out:,} out")
    est = total_in / 1_000_000 * 3 + total_out / 1_000_000 * 15
    print(f"Approx. cost this run: ~${est:.2f} (Sonnet pricing estimate)")
    print("Open extracted_results.csv in Excel/Sheets to review.")


if __name__ == "__main__":
    main()
