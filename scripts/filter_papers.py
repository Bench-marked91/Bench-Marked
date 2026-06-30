"""
filter_papers.py  —  PHASE 1, part 2: FILTER
---------------------------------------------
Reads the papers found by find_papers.py and asks Claude (the cheap, fast
"Haiku" model) to classify each one's relevance to mental-health AI
benchmarking, using the relevance rules from the project's instruction doc.

Each paper is labelled one of:
    - Definitely Related
    - Might Be Related
    - Not Related
...with a one-sentence reason.

Input  (from ../data):  latest_findings.json
Output (to   ../data):  filtered_papers.json
"""

import json
import os
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

# ----------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------
PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
INPUT_FILE = DATA_DIR / "latest_findings.json"
OUTPUT_FILE = DATA_DIR / "filtered_papers.json"

# Load the API key from the .env file.
load_dotenv(PROJECT_DIR / ".env")

# The cheap, fast model — perfect for a quick relevance yes/no.
MODEL = "claude-haiku-4-5-20251001"

client = Anthropic()  # reads ANTHROPIC_API_KEY from the environment

# ----------------------------------------------------------------------
# The relevance rules (from "AI Bench Mark Instruction.txt", Step 1)
# ----------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert research assistant that screens academic papers for a catalog about AI / large language models (LLMs) being evaluated or benchmarked on mental-health tasks in a medical or clinical context.

Classify the paper into EXACTLY ONE of these labels:

"Definitely Related" — the paper meets ALL of:
  - involves at least one DSM-5 mental health condition (e.g. depression, anxiety, PTSD, autism, schizophrenia, eating disorders, substance use disorders), AND
  - involves an AI model being evaluated or tested on a task related to that condition, AND
  - the evaluation is clinical or healthcare-oriented (diagnosis, screening, therapy support, symptom assessment, clinical documentation, or patient monitoring).

"Might Be Related" — use when ANY of:
  - involves mental health broadly but does not clearly benchmark/evaluate an AI model, OR
  - evaluates AI on a dataset that could be mental-health-related but is not explicitly framed that way, OR
  - introduces a new mental-health dataset/benchmark resource but does not evaluate an AI model (a potential resource), OR
  - the condition is adjacent to mental health (stress, burnout, general wellbeing, or neurological disorders like dementia/MCI) rather than a core DSM-5 condition.

"Not Related" — use when ANY of:
  - does not involve mental health, OR
  - involves AI in healthcare but has no mental-health component, OR
  - is purely theoretical with no evaluation.

Respond with ONLY a JSON object, no other text, in exactly this form:
{"relevance": "Definitely Related" | "Might Be Related" | "Not Related", "reason": "<one short sentence>"}"""


def classify(paper):
    """Ask Claude to classify one paper. Returns (label, reason, usage)."""
    user_text = (
        f"Title: {paper['title']}\n\n"
        f"Abstract: {paper['summary']}"
    )
    resp = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_text}],
    )
    raw = resp.content[0].text.strip()

    # The model should return pure JSON; parse it defensively.
    try:
        # strip code fences if the model added them
        if raw.startswith("```"):
            raw = raw.split("```")[1].replace("json", "", 1).strip()
        data = json.loads(raw)
        label = data.get("relevance", "PARSE ERROR")
        reason = data.get("reason", "")
    except Exception:
        label, reason = "PARSE ERROR", raw[:120]

    return label, reason, resp.usage


def main():
    papers = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    print(f"Filtering {len(papers)} papers with {MODEL} ...\n")

    results = []
    total_in = total_out = 0

    for i, p in enumerate(papers, 1):
        label, reason, usage = classify(p)
        total_in += usage.input_tokens
        total_out += usage.output_tokens
        p_out = dict(p)
        p_out["relevance"] = label
        p_out["relevance_reason"] = reason
        results.append(p_out)
        print(f"[{i:>2}] {label:<18} | {p['title'][:60]}")
        print(f"      -> {reason}")

    OUTPUT_FILE.write_text(json.dumps(results, indent=2), encoding="utf-8")

    # Summary
    def count(lbl):
        return sum(1 for r in results if r["relevance"] == lbl)

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Definitely Related : {count('Definitely Related')}")
    print(f"  Might Be Related   : {count('Might Be Related')}")
    print(f"  Not Related        : {count('Not Related')}")
    print(f"\n  Tokens used: {total_in:,} in + {total_out:,} out "
          f"(a tiny fraction of a cent)")
    print(f"\n  Saved labelled results to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
