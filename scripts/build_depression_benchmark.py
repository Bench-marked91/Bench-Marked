"""
build_depression_benchmark.py
-----------------------------
Turns the raw Zenodo dataset (data/depression_subtype_dataset.csv) into a clean,
balanced, deterministic sample pool the website ships:  website/depression_benchmark.json

The full 14,996-row dataset is NOT shipped (too big / a visitor only runs a small
sample). We ship a balanced pool (default 100 items per class = 600 items); the
browser runner draws the visitor's chosen sample size from this pool.

Source: AlSaad, Alshakhs & Thomas (2026), Frontiers in Digital Health.
Data: Zenodo 10.5281/zenodo.14233292, CC-BY-4.0.

Usage:  python scripts/build_depression_benchmark.py [per_class]
"""

import csv
import json
import random
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
SRC = PROJECT_DIR / "data" / "depression_subtype_dataset.csv"
OUT = PROJECT_DIR / "website" / "depression_benchmark.json"

# Map the raw CSV label strings -> our canonical class keys + display names.
LABEL_MAP = {
    "postpartum": ("postpartum", "Postpartum depression"),
    "major depressive": ("major", "Major depressive disorder"),
    "bipolar": ("bipolar", "Bipolar (depression)"),
    "psychotic": ("psychotic", "Psychotic depression"),
    "atypical": ("atypical", "Atypical depression"),
    "no": ("none", "No depression"),
}
# Stable option order (letters A-F assigned in this order by the runner).
CLASS_ORDER = ["postpartum", "major", "bipolar", "psychotic", "atypical", "none"]
DISPLAY = {
    "postpartum": "Postpartum depression",
    "major": "Major depressive disorder",
    "bipolar": "Bipolar (depression)",
    "psychotic": "Psychotic depression",
    "atypical": "Atypical depression",
    "none": "No depression",
}

SEED = 20260706  # deterministic sample


def main():
    per_class = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    if not SRC.exists():
        print(f"Source CSV not found: {SRC}")
        return

    # Bucket cleaned rows by canonical class.
    buckets = {k: [] for k in CLASS_ORDER}
    dropped = 0
    with SRC.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            text = (row.get("Tweets") or "").strip()
            raw = (row.get("Labels") or "").strip().lower()
            if not text or raw not in LABEL_MAP:
                dropped += 1
                continue
            key = LABEL_MAP[raw][0]
            buckets[key].append(text)

    rng = random.Random(SEED)
    items = []
    counts = {}
    idx = 0
    for key in CLASS_ORDER:
        pool = buckets[key]
        rng.shuffle(pool)
        take = pool[:per_class]
        counts[key] = len(take)
        for text in take:
            items.append({"id": idx, "text": text, "label": key})
            idx += 1
    rng.shuffle(items)  # mix classes so the runner shows them in random order

    out = {
        "benchmark": "Depression subtype classification (recreation)",
        "sourcePaper": "AlSaad, Alshakhs & Thomas (2026), Frontiers in Digital Health",
        "sourcePaperUrl": "https://doi.org/10.3389/fdgth.2026.1790533",
        "dataset": "Zenodo 10.5281/zenodo.14233292 (CC-BY-4.0)",
        "task": "Given a tweet, classify which depression subtype it expresses.",
        "classOrder": CLASS_ORDER,
        "classDisplay": DISPLAY,
        "poolPerClass": per_class,
        "items": items,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"Dropped {dropped} bad rows (blank text/label).")
    print("Pool per class:", {DISPLAY[k]: counts[k] for k in CLASS_ORDER})
    print(f"Total items in pool: {len(items)}")
    print(f"Wrote: {OUT}  ({round(OUT.stat().st_size/1024)} KB)")


if __name__ == "__main__":
    main()
