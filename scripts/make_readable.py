"""
make_readable.py  —  turn the filter results into an Excel-friendly file
------------------------------------------------------------------------
Reads filtered_papers.json and writes results.csv (opens in Excel/Sheets),
sorted so the most relevant papers are at the top.
"""

import csv
import json
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
INPUT_FILE = DATA_DIR / "filtered_papers.json"
OUTPUT_FILE = DATA_DIR / "results.csv"

# Sort order: most relevant first.
ORDER = {"Definitely Related": 0, "Might Be Related": 1, "Not Related": 2}

papers = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
papers.sort(key=lambda p: ORDER.get(p.get("relevance"), 9))

with OUTPUT_FILE.open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Relevance", "Reason", "Title", "Published", "Authors",
        "Source", "Abstract link", "PDF link",
    ])
    for p in papers:
        authors = ", ".join(p.get("authors", [])[:4])
        if len(p.get("authors", [])) > 4:
            authors += " et al."
        writer.writerow([
            p.get("relevance", ""),
            p.get("relevance_reason", ""),
            p.get("title", ""),
            p.get("published", "")[:10],
            authors,
            p.get("source", ""),
            p.get("abstract_url", ""),
            p.get("pdf_url", ""),
        ])

print(f"Wrote {len(papers)} papers to: {OUTPUT_FILE}")
print("Open it by double-clicking in File Explorer (it opens in Excel).")
