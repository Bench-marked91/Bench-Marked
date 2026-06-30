"""
extract_paper.py  —  PHASE 2: EXTRACTION
-----------------------------------------
Reads a paper's PDF and uses Claude (the smart "Sonnet" model) to extract the
benchmark-catalog fields, following Steps 2-5 of "AI Bench Mark Instruction.txt".

It sends the actual PDF to Claude (Claude can read PDFs natively), and forces a
structured result via a tool, so the output is always clean, parseable data.

This file runs a TEST on the PsychiatryBench PDF (which matches the human-made
row 2 of the catalog) and prints the AI's answers next to the human's, so you
can judge accuracy.
"""

import base64
import json
import sys
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

# Make the console show special characters (em-dashes etc.) cleanly.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
EXTRACT_DIR = DATA_DIR / "extractions"
EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(PROJECT_DIR / ".env")

# Smart model for careful reading/extraction.
MODEL = "claude-sonnet-4-6"
client = Anthropic()

# ----------------------------------------------------------------------
# The extraction rules (from the instruction doc, Steps 2-5).
# Appraisal/quality grading is intentionally NOT included here.
# ----------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert research assistant extracting benchmark-catalog information from a mental-health AI paper. Follow these rules exactly:

- Analyze ONLY the provided paper.
- Use "" (empty string) for any field that is missing, unclear, not explicitly stated, or not confirmable from the paper. Do NOT guess or infer.
- Prefer literal extraction from the paper. Keep values short and spreadsheet-friendly.
- "Open vs. Closed Source" refers to the MODEL(s) being tested, not the dataset. Use Open, Closed, Mixed, or "".
- "Single vs. Multi-Turn" refers ONLY to the benchmark interaction format with the LLM. Single-Turn = full input in one prompt, no back-and-forth. Multi-Turn = iterative, stateful exchanges.
- "Evaluation method": briefly describe how the AI was tested and what metrics were used; ALWAYS state whether evaluation was done by Human, Automated, or Both.
- For the LLM count, count only true LLMs, not non-LLM baselines.
- Priority fields (extract with HIGHEST accuracy): LLMs evaluated, Tasks assessed, Evaluation method, Mental health conditions covered, Performance scores / key metrics. If any priority field is missing or uncertain, name it in missing_or_uncertain_fields.
- Accuracy is more important than completeness.

Call the save_benchmark_extraction tool with your results."""

# A "tool" whose schema forces Claude to return every field in clean form.
EXTRACTION_TOOL = {
    "name": "save_benchmark_extraction",
    "description": "Save the extracted benchmark-catalog fields for one paper.",
    "input_schema": {
        "type": "object",
        "properties": {
            "relevance_flag": {"type": "string", "description": "Definitely Related, Might Be Related, or Not Related"},
            "benchmark_name": {"type": "string", "description": "The paper title, exactly"},
            "paper_link": {"type": "string"},
            "open_vs_closed_source": {"type": "string", "description": "Open / Closed / Mixed / '' — refers to the MODEL tested, not the dataset"},
            "month_year": {"type": "string"},
            "authors": {"type": "array", "items": {"type": "string"}, "description": "All author names exactly as listed"},
            "institutions": {"type": "string", "description": "Institutions as listed"},
            "journal_venue": {"type": "string", "description": "'Published — [journal]' or 'Preprint — [platform]'"},
            "ground_truth_source": {"type": "string", "description": "As literally as possible from the paper"},
            "size_of_benchmark": {"type": "string", "description": "Reported size and unit (# of items)"},
            "what_assessed_skills": {"type": "string", "description": "Capability or skills being evaluated"},
            "tasks_assessed": {"type": "string", "description": "Actual tasks tested; multiple separated by semicolons"},
            "population_represented": {"type": "string"},
            "languages": {"type": "string"},
            "num_domains": {"type": "string", "description": "Only if the paper explicitly names domains, else ''"},
            "single_vs_multi_turn": {"type": "string", "description": "Single-Turn or Multi-Turn"},
            "evaluation_method": {"type": "string", "description": "How tested + metrics; state Human / Automated / Both"},
            "num_llms_assessed": {"type": "string", "description": "Count of true LLMs only"},
            "llms_evaluated": {"type": "string", "description": "LLM names and versions"},
            "mental_health_conditions": {"type": "string", "description": "Mental health condition(s) covered"},
            "performance_scores": {"type": "string", "description": "Key metrics / main results"},
            "short_summary": {"type": "string", "description": "4-6 plain-language sentences: what/why/models+tasks/how evaluated/key result"},
            "missing_or_uncertain_fields": {"type": "array", "items": {"type": "string"}, "description": "Fields that could not be confirmed, especially priority fields"},
        },
        "required": [
            "relevance_flag", "benchmark_name", "paper_link", "open_vs_closed_source",
            "month_year", "authors", "institutions", "journal_venue", "ground_truth_source",
            "size_of_benchmark", "what_assessed_skills", "tasks_assessed",
            "population_represented", "languages", "num_domains", "single_vs_multi_turn",
            "evaluation_method", "num_llms_assessed", "llms_evaluated",
            "mental_health_conditions", "performance_scores", "short_summary",
            "missing_or_uncertain_fields",
        ],
    },
}


def extract(pdf_bytes, paper_link=""):
    """Send a PDF to Claude and get back the structured extraction."""
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    resp = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        system=SYSTEM_PROMPT,
        tools=[EXTRACTION_TOOL],
        tool_choice={"type": "tool", "name": "save_benchmark_extraction"},
        messages=[{
            "role": "user",
            "content": [
                {"type": "document",
                 "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                {"type": "text",
                 "text": f"Extract the benchmark catalog from this paper. "
                         f"Known link (use for paper_link): {paper_link}"},
            ],
        }],
    )
    for block in resp.content:
        if block.type == "tool_use":
            return block.input, resp.usage
    return None, resp.usage


# ----------------------------------------------------------------------
# TEST: run on the PsychiatryBench PDF and compare to the human row 2.
# ----------------------------------------------------------------------
HUMAN_ROW_2 = {  # what your team extracted by hand (the "answer key")
    "benchmark_name": "PsychiatryBench",
    "open_vs_closed_source": "restricted (may be able to ask for it)",
    "month_year": "2026",
    "journal_venue": "npj Digital Medicine",
    "ground_truth_source": "Authoritative psychiatric casebooks, diagnostic manuals, specialized clinical guides",
    "size_of_benchmark": "5188",
    "what_assessed_skills": "Psychiatric reasoning",
    "population_represented": "Adults (including geriatrics)",
    "languages": "English",
    "num_domains": "6",
    "single_vs_multi_turn": "single",
    "evaluation_method": "LLM-evaluated",
}


def print_all_fields(data):
    """Print every extracted field, one per line."""
    for key, val in data.items():
        print(f"\n* {key}\n    {val}")


def main():
    # If a PDF path is given on the command line, extract THAT paper.
    #   Usage:  python extract_paper.py "C:\\path\\to\\paper.pdf" "optional link"
    args = sys.argv[1:]
    if args:
        pdf_path = Path(args[0])
        if not pdf_path.exists():
            print(f"Could not find that PDF:\n  {pdf_path}")
            return
        link = args[1] if len(args) > 1 else ""
        print(f"Reading PDF: {pdf_path.name}")
        print(f"Extracting with {MODEL} ... (this takes ~20-40 seconds)\n")
        data, usage = extract(pdf_path.read_bytes(), link)
        out_file = EXTRACT_DIR / (pdf_path.stem + ".json")
        out_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
        print("=" * 78)
        print(f"EXTRACTION RESULT for: {pdf_path.name}")
        print("=" * 78)
        print_all_fields(data)
        print(f"\nTokens used: {usage.input_tokens:,} in + {usage.output_tokens:,} out")
        print(f"Saved full extraction to: {out_file}")
        return

    # Otherwise, run the built-in PsychiatryBench accuracy test.
    test_pdf = Path(r"C:\Users\datvu\Downloads\PsychiatryBench a multi-task benchmark for LLMs in psychiatry.pdf")
    if not test_pdf.exists():
        print(f"Could not find the test PDF at:\n  {test_pdf}")
        return

    print(f"Reading PDF: {test_pdf.name}")
    print(f"Extracting with {MODEL} ... (this takes ~20-40 seconds)\n")
    data, usage = extract(test_pdf.read_bytes(),
                          "https://www.nature.com/articles/s41746-026-02582-w")

    out_file = EXTRACT_DIR / "psychiatrybench_test.json"
    out_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # Side-by-side comparison on the fields the human filled in.
    print("=" * 78)
    print("ACCURACY CHECK  —  AI extraction vs. your team's manual row 2")
    print("=" * 78)
    for field, human_val in HUMAN_ROW_2.items():
        ai_val = str(data.get(field, ""))
        print(f"\n* {field}")
        print(f"    HUMAN: {human_val}")
        print(f"    AI   : {ai_val}")

    # Show the extra fields the AI also captured (that row 2 left blank).
    print("\n" + "=" * 78)
    print("EXTRA FIELDS the AI captured (beyond what row 2 had):")
    print("=" * 78)
    for field in ["tasks_assessed", "num_llms_assessed", "llms_evaluated",
                  "mental_health_conditions", "performance_scores"]:
        print(f"\n* {field}\n    {data.get(field, '')}")

    print("\n" + "=" * 78)
    print("SHORT SUMMARY (AI-written):")
    print("=" * 78)
    print(data.get("short_summary", ""))

    print("\n" + "=" * 78)
    print("Fields the AI flagged as missing/uncertain:")
    print(f"  {data.get('missing_or_uncertain_fields', [])}")
    print(f"\nTokens used: {usage.input_tokens:,} in + {usage.output_tokens:,} out")
    print(f"Saved full extraction to: {out_file}")


if __name__ == "__main__":
    main()
