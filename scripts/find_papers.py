"""
find_papers.py  —  PHASE 1, part 1: FIND
-----------------------------------------
Searches arXiv for recent papers about AI / large language models being
evaluated or benchmarked on mental-health topics, drops any we've already
seen, and saves the new ones.

This script uses ONLY Python's built-in libraries, so nothing extra needs to
be installed. It does NOT use any AI yet (that's the next step, the Filter).

What it produces (in the ../data folder):
  - latest_findings.json : the new papers found on this run (full details)
  - seen-papers.json     : a running memory of every paper ID we've processed,
                           so we never show the same paper twice.
"""

import json
import ssl
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import certifi  # provides the security certificates for HTTPS connections

# Use certifi's certificate bundle so HTTPS requests are trusted on Windows.
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

# ----------------------------------------------------------------------
# 1. SETTINGS  (you can tweak these later)
# ----------------------------------------------------------------------

# How many recent papers to pull from arXiv per run.
MAX_RESULTS = 40

# arXiv subject categories to look in (CS + quantitative biology).
CATEGORIES = ["cs.CL", "cs.AI", "cs.LG", "cs.HC", "q-bio.NC"]

# A paper must mention at least one MENTAL-HEALTH term ...
MENTAL_HEALTH_TERMS = [
    "mental health", "psychiatry", "psychiatric", "depression", "anxiety",
    "PTSD", "suicide", "self-harm", "psychotherapy", "schizophrenia",
    "bipolar", "eating disorder", "substance use", "autism", "mental disorder",
    "counseling", "wellbeing", "well-being", "cognitive impairment", "dementia",
]

# ... AND at least one AI / EVALUATION term.
AI_TERMS = [
    "large language model", "LLM", "language model", "benchmark",
    "evaluation", "GPT", "chatbot", "artificial intelligence",
]

# ----------------------------------------------------------------------
# 2. FILE LOCATIONS
# ----------------------------------------------------------------------
PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
SEEN_FILE = DATA_DIR / "seen-papers.json"
OUTPUT_FILE = DATA_DIR / "latest_findings.json"

ARXIV_API = "http://export.arxiv.org/api/query"
ATOM = "{http://www.w3.org/2005/Atom}"  # XML namespace used by arXiv


# ----------------------------------------------------------------------
# 3. HELPER FUNCTIONS
# ----------------------------------------------------------------------
def build_query():
    """Build the arXiv search string: (categories) AND (MH term) AND (AI term)."""
    cats = " OR ".join(f"cat:{c}" for c in CATEGORIES)
    mh = " OR ".join(f'abs:"{t}"' for t in MENTAL_HEALTH_TERMS)
    ai = " OR ".join(f'abs:"{t}"' for t in AI_TERMS)
    return f"({cats}) AND ({mh}) AND ({ai})"


def fetch_arxiv():
    """Call the arXiv API and return the raw Atom XML text."""
    params = {
        "search_query": build_query(),
        "start": 0,
        "max_results": MAX_RESULTS,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    url = f"{ARXIV_API}?{urllib.parse.urlencode(params)}"
    print(f"Querying arXiv ...\n  {url}\n")
    req = urllib.request.Request(url, headers={"User-Agent": "MH-Benchmark-Finder/1.0"})
    with urllib.request.urlopen(req, timeout=60, context=SSL_CONTEXT) as resp:
        return resp.read().decode("utf-8")


def parse_entries(xml_text):
    """Turn the Atom XML into a list of simple paper dictionaries."""
    root = ET.fromstring(xml_text)
    papers = []
    for entry in root.findall(f"{ATOM}entry"):
        arxiv_url = entry.findtext(f"{ATOM}id", "").strip()
        # arxiv id like http://arxiv.org/abs/2506.08584v1 -> keep the bare id
        paper_id = arxiv_url.split("/abs/")[-1]

        # find the PDF link
        pdf_url = ""
        for link in entry.findall(f"{ATOM}link"):
            if link.get("title") == "pdf":
                pdf_url = link.get("href", "")

        authors = [a.findtext(f"{ATOM}name", "").strip()
                   for a in entry.findall(f"{ATOM}author")]

        papers.append({
            "id": paper_id,
            "title": " ".join(entry.findtext(f"{ATOM}title", "").split()),
            "summary": " ".join(entry.findtext(f"{ATOM}summary", "").split()),
            "published": entry.findtext(f"{ATOM}published", "").strip(),
            "authors": authors,
            "abstract_url": arxiv_url,
            "pdf_url": pdf_url,
            "source": "arXiv",
        })
    return papers


def load_seen():
    if SEEN_FILE.exists():
        return set(json.loads(SEEN_FILE.read_text(encoding="utf-8")))
    return set()


def save_seen(seen):
    SEEN_FILE.write_text(json.dumps(sorted(seen), indent=2), encoding="utf-8")


# ----------------------------------------------------------------------
# 4. MAIN
# ----------------------------------------------------------------------
def main():
    seen = load_seen()
    print(f"Memory: {len(seen)} papers already processed in past runs.\n")

    xml_text = fetch_arxiv()
    all_papers = parse_entries(xml_text)
    print(f"arXiv returned {len(all_papers)} recent papers matching the search.\n")

    new_papers = [p for p in all_papers if p["id"] not in seen]

    # Save the new findings for the next step (the Filter) to read.
    OUTPUT_FILE.write_text(json.dumps(new_papers, indent=2), encoding="utf-8")

    # Update memory so we don't re-show these next time.
    for p in all_papers:
        seen.add(p["id"])
    save_seen(seen)

    # Print a readable summary.
    print("=" * 70)
    print(f"NEW PAPERS THIS RUN: {len(new_papers)}")
    print("=" * 70)
    for i, p in enumerate(new_papers, 1):
        authors = ", ".join(p["authors"][:3])
        if len(p["authors"]) > 3:
            authors += " et al."
        print(f"\n[{i}] {p['title']}")
        print(f"    {p['published'][:10]}  |  {authors}")
        print(f"    {p['abstract_url']}")
        print(f"    Abstract: {p['summary'][:240]}...")

    print(f"\n\nSaved {len(new_papers)} new papers to: {OUTPUT_FILE}")
    print(f"Updated memory file:                 {SEEN_FILE}")


if __name__ == "__main__":
    main()
