"""
verify_study17.py  —  §12 DEEP-CHECK for the "Run this benchmark" prototype
---------------------------------------------------------------------------
One-off: reads study #17's PDF (Evaluating Diagnostic Accuracy and Clinical
Reasoning of Multiple LLMs in Psychiatry, 196 cases) and answers the exact
questions that decide whether it can be turned into a browser-only,
BYOK, auto-graded benchmark.

Usage:  python scripts/verify_study17.py
"""

import base64
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

MODEL = "claude-sonnet-4-6"
PDF = PROJECT_DIR / "pdfs" / "study17-diagnostic-accuracy.pdf"

QUESTIONS = """You are helping decide whether this study's benchmark can be RECREATED as a
self-serve, browser-based test where a visitor supplies their own LLM API key, the 196
cases are sent to their model, and the answers are graded AUTOMATICALLY (no human, no
server). Read the paper carefully and answer each numbered question concretely. Quote the
paper where it matters. Say "NOT STATED" if the paper does not say.

1. DATA AVAILABILITY: Is the dataset of 196 cases publicly downloadable? Quote the exact
   Data/Code Availability statement. Give any URL/DOI/repo (GitHub, OSF, supplement). If
   the cases are only in a supplementary file or on request, say so explicitly.

2. LICENSE: What license is the paper/dataset under (e.g. CC-BY, CC-BY-NC-ND)? Does it
   permit republishing the test questions on a public website?

3. THE CASES (INPUT): What exactly is one case? A clinical vignette? How long? Where did
   the cases come from (which casebook/source)? Are the full case texts printed in the
   paper or supplement?

4. GROUND TRUTH: For each case, what is the correct answer? A single gold diagnosis? A DSM
   code? A list of acceptable diagnoses? Is the gold answer provided per case?

5. GRADING METHOD: Exactly how was each model's answer scored? Break it into parts:
   (a) diagnostic accuracy — was correctness judged by automated string/code matching, by
       an AI judge, or by human psychiatrists?
   (b) clinical reasoning quality — who/what scored it and on what scale?
   For EACH part say clearly whether it could be reproduced AUTOMATICALLY without a human.

6. THE PROMPT: What prompt/instruction was given to the models? Is the exact prompt text
   provided so we can reuse it?

7. MODELS: Which 4 LLMs were tested, and what headline accuracy did each get?

8. BOTTOM LINE: In 3-4 sentences — can the diagnostic-accuracy portion be recreated as an
   automatically-graded, browser-only benchmark? What is the single biggest blocker
   (data access, licensing, or human-only grading)?
"""


def main():
    if not PDF.exists():
        print(f"PDF not found: {PDF}")
        return
    b64 = base64.standard_b64encode(PDF.read_bytes()).decode("utf-8")
    client = Anthropic()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "document",
                 "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                {"type": "text", "text": QUESTIONS},
            ],
        }],
    )
    print("=" * 78)
    print("STUDY #17 — §12 DEEP-CHECK (from the paper itself)")
    print("=" * 78)
    for block in resp.content:
        if block.type == "text":
            print(block.text)
    print("\n" + "=" * 78)
    print(f"Tokens: {resp.usage.input_tokens:,} in + {resp.usage.output_tokens:,} out")


if __name__ == "__main__":
    main()
