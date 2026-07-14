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
# Task taxonomy (fixed) + the criteria for assigning each. A study is tagged with
# the task(s) whose criteria its evaluation actually matches.
TASK_CRITERIA = [
    ("Knowledge & Board Exams", "declarative clinical knowledge tested via MCQ / OSCE / board-prep items"),
    ("Diagnostic Reasoning", "case vignette -> diagnosis, differential, or clinical reasoning"),
    ("Risk & Crisis Response", "detect suicide / self-harm / crisis and respond safely; triage"),
    ("Therapeutic Conversation & Counseling", "quality of multi-turn counseling / psychotherapy dialogue"),
    ("Clinical Documentation & Extraction", "classify / extract from real clinical records"),
    ("Symptom Detection & Severity Assessment", "infer presence / severity from speech, interview, or text"),
    ("Patient Communication & Education", "quality / reliability / readability of patient-facing answers"),
    ("Safety, Bias & Robustness", "bias, hallucination, guardrail behavior"),
]
TASKS = [name for name, _ in TASK_CRITERIA]

SYSTEM = f"""You name mental-health AI benchmarks for a public catalog, following these rules.

DISPLAY NAME:
- If the authors gave the benchmark a real name (e.g. "PsychiatryBench", "VERA-MH"), use it EXACTLY.
- Otherwise coin a short, descriptive label of 1-3 words, <= ~25 characters (e.g. "Alzheimer Predictor", "Crisis Handler"). Be specific and human, NOT citation style ("Hsu et al."), NOT the full title.

CONDITION TAGS (multiple allowed) = the mental-health area(s). Prefer this vocab: {", ".join(CONDITIONS)}. Use "General / Multi-condition" only when it truly spans many conditions.

TASK TAGS (choose from THIS fixed list only — do not invent new task names). A study MAY and often DOES belong to several tasks: tag it with EVERY task whose criteria its evaluation genuinely matches — there is no cap, do not force a single best fit. Only leave a task out if the study does not actually evaluate it (don't over-tag with tasks it doesn't test). Criteria:
""" + "\n".join(f"- {name}: {desc}" for name, desc in TASK_CRITERIA) + """

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
