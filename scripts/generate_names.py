"""
generate_names.py  —  STUDY NAMING SYSTEM (backfill)
----------------------------------------------------
Reads website/benchmarks.json and asks Claude to produce, for each study, a short
Display name + Condition/Task tags following NAMING-SYSTEM.md. Writes a companion
file website/benchmark_names.json keyed by the paper's stable link (DOI/URL), so it
survives the weekly pipeline refresh of benchmarks.json.

Tags are ALLOWED TO BE MULTIPLE per dimension. The draft vocab below is a starting
point (not final) — the model prefers it but may add a close term if nothing fits.
The output file is meant to be hand-editable afterwards (human review).

Usage:  python scripts/generate_names.py
"""

import json
import sys
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_DIR / ".env")

CATALOG = PROJECT_DIR / "website" / "benchmarks.json"
OUT = PROJECT_DIR / "website" / "benchmark_names.json"

MODEL = "claude-sonnet-4-6"
CHUNK = 20  # studies per API call

CONDITIONS = [
    "Depression", "Anxiety", "Suicide & Self-Harm", "Dementia / Cognitive",
    "Autism / Neurodevelopmental", "Psychosis / Schizophrenia", "PTSD / Trauma",
    "Substance Use", "Eating Disorders", "ADHD", "Personality", "Well-Being",
    "General / Multi-condition",
]
TASKS = [
    "Diagnosis", "Screening", "Clinical Reasoning", "Risk Detection", "Crisis & Safety",
    "Psychotherapy Quality", "Emotion Recognition", "Psychometrics",
    "Medical Knowledge / Exam", "Bias & Equity",
]

SYSTEM = f"""You name mental-health AI benchmarks for a public catalog, following these rules.

DISPLAY NAME:
- If the authors gave the benchmark a real name (e.g. "PsychiatryBench", "VERA-MH"), use it EXACTLY.
- Otherwise coin a short, descriptive label of 1-3 words, <= ~25 characters (e.g. "Alzheimer Predictor", "Crisis Handler"). Be specific and human, NOT citation style ("Hsu et al."), NOT the full title.

TAGS (multiple allowed per dimension):
- Condition = the mental-health area(s). Prefer this vocab: {", ".join(CONDITIONS)}.
- Task = what the benchmark actually tests. Prefer this vocab: {", ".join(TASKS)}.
- Choose ALL that genuinely apply (usually 1-2 each). Use "General / Multi-condition" only when it truly spans many conditions. If nothing in the vocab fits, add the closest short term.

Call the save_names tool with one entry per study, echoing its index."""

TOOL = {
    "name": "save_names",
    "description": "Save the display name and tags for each study.",
    "input_schema": {
        "type": "object",
        "properties": {
            "studies": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "index": {"type": "integer"},
                        "display_name": {"type": "string"},
                        "conditions": {"type": "array", "items": {"type": "string"}},
                        "tasks": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["index", "display_name", "conditions", "tasks"],
                },
            }
        },
        "required": ["studies"],
    },
}


def compact(b, i):
    """A small dict of the fields useful for naming/tagging."""
    keep = {
        "index": i,
        "title": b.get("name", ""),
        "measures": b.get("measures", ""),
        "ground_truth": b.get("groundTruth", ""),
        "population": b.get("population", ""),
        "clinical_use_case": b.get("clinicalUseCase", ""),
        "venue": b.get("venue", ""),
    }
    return {k: v for k, v in keep.items() if v}


def name_chunk(client, chunk):
    resp = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM,
        tools=[TOOL],
        tool_choice={"type": "tool", "name": "save_names"},
        messages=[{"role": "user", "content":
                   "Name and tag these studies:\n" + json.dumps(chunk, ensure_ascii=False)}],
    )
    for block in resp.content:
        if block.type == "tool_use":
            return block.input.get("studies", []), resp.usage
    return [], resp.usage


def main():
    if not CATALOG.exists():
        print(f"Catalog not found: {CATALOG}")
        return
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    client = Anthropic()

    results = {}
    in_tok = out_tok = 0
    for start in range(0, len(catalog), CHUNK):
        batch = catalog[start:start + CHUNK]
        payload = [compact(b, start + j) for j, b in enumerate(batch)]
        print(f"Naming studies {start + 1}-{start + len(batch)} of {len(catalog)} ...")
        named, usage = name_chunk(client, payload)
        in_tok += usage.input_tokens
        out_tok += usage.output_tokens
        for item in named:
            b = catalog[item["index"]]
            key = b.get("paperLink") or b.get("id")
            if not key:
                continue
            results[key] = {
                "displayName": item.get("display_name", "").strip() or b.get("name", ""),
                "conditions": [c for c in item.get("conditions", []) if c],
                "tasks": [t for t in item.get("tasks", []) if t],
                "fullTitle": b.get("name", ""),
            }

    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nWrote {len(results)} named studies to {OUT}")
    print(f"Tokens: {in_tok:,} in + {out_tok:,} out")
    # quick preview
    for k, v in list(results.items())[:8]:
        print(f"  • {v['displayName']}  [{', '.join(v['conditions'])}] / [{', '.join(v['tasks'])}]")


if __name__ == "__main__":
    main()
