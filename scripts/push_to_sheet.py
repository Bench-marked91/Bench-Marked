"""
push_to_sheet.py  —  PHASE 4: send extracted papers to the "AI Inbox" Google Sheet
-----------------------------------------------------------------------------------
Reads data/extracted_results.csv (made by extract_batch.py) and adds each paper as
a new row in your "AI Inbox" Google Sheet. It NEVER touches the Master Catalog.

Two safety features:
  * Dedupe  - a paper already in the sheet (same paper_link) is skipped, so re-running
              never creates duplicates.
  * Status  - every new row gets Status = "New" so a reviewer can triage
              (New / Promoted / Rejected), which is the human approval gate.

HOW IT LOGS IN (no password typing):
  It uses a Google "service account" - a robot Google account with its own key file.
  You create that key once (see SETUP-GOOGLE-SHEETS.md), share the Inbox sheet with the
  robot's email, and the script can then write to the sheet on a schedule, hands-off.

CONFIG - put these two lines in your .env file (next to ANTHROPIC_API_KEY):
    GOOGLE_CREDS_FILE=service_account.json     # the robot key file (in the project folder)
    INBOX_SHEET_ID=1AbC...xyz                  # the long id from your sheet's web address

USAGE:
    python scripts/push_to_sheet.py check      # test the connection only (writes nothing)
    python scripts/push_to_sheet.py            # push new papers from extracted_results.csv
"""

import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

# Make the console show special characters (em-dashes etc.) cleanly.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"
INPUT_CSV = DATA_DIR / "extracted_results.csv"

load_dotenv(PROJECT_DIR / ".env")

# Read-write access to Google Sheets (and Drive, so gspread can open by id).
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

# The columns extract_batch.py writes, in order. We add "status" and "date_added"
# at the front so reviewers can triage and see when the bot found each paper.
CSV_COLUMNS = [
    "relevance_flag", "benchmark_name", "paper_link", "open_vs_closed_source",
    "month_year", "authors", "institutions", "journal_venue",
    "ground_truth_source", "size_of_benchmark", "what_assessed_skills",
    "tasks_assessed", "population_represented", "languages", "num_domains",
    "single_vs_multi_turn", "evaluation_method", "num_llms_assessed",
    "llms_evaluated", "mental_health_conditions", "performance_scores",
    "short_summary", "missing_or_uncertain_fields",
]
SHEET_HEADER = ["status", "date_added"] + CSV_COLUMNS


def fail(message):
    """Print a plain-language error and stop."""
    print("\n[X] " + message)
    sys.exit(1)


def connect():
    """Log in as the robot account and open the Inbox sheet's first tab."""
    creds_name = os.getenv("GOOGLE_CREDS_FILE", "service_account.json")
    sheet_id = os.getenv("INBOX_SHEET_ID", "").strip()

    creds_path = (PROJECT_DIR / creds_name) if not os.path.isabs(creds_name) else Path(creds_name)
    if not creds_path.exists():
        fail(f"Robot key file not found: {creds_path}\n"
             f"    Follow SETUP-GOOGLE-SHEETS.md to download it, and set GOOGLE_CREDS_FILE in .env.")
    if not sheet_id:
        fail("INBOX_SHEET_ID is missing from .env.\n"
             "    Open your sheet; copy the long code between /d/ and /edit in the address bar.")

    creds = Credentials.from_service_account_file(str(creds_path), scopes=SCOPES)
    client = gspread.authorize(creds)
    try:
        spreadsheet = client.open_by_key(sheet_id)
    except gspread.exceptions.APIError as e:
        if "PERMISSION_DENIED" in str(e) or "403" in str(e):
            robot = getattr(creds, "service_account_email", "the robot account")
            fail(f"The robot can't open the sheet. Did you SHARE the sheet with it?\n"
                 f"    Share the Inbox sheet (Editor access) with: {robot}")
        fail(f"Could not open the sheet (id {sheet_id}): {e}")
    return spreadsheet.sheet1, creds


def get_header(ws):
    """Return the sheet's header row, writing the standard one if the sheet is blank."""
    existing = ws.row_values(1)
    if not existing:
        ws.update([SHEET_HEADER], "A1")
        print("    (Inbox was empty - wrote the column headers.)")
        return SHEET_HEADER
    return existing


def existing_links(ws, header):
    """Collect paper_link values already in the sheet, for dedupe."""
    if "paper_link" not in header:
        return set(), None
    col = header.index("paper_link") + 1  # gspread columns are 1-based
    values = ws.col_values(col)[1:]       # skip the header cell
    return {v.strip() for v in values if v.strip()}, col


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "push"

    ws, creds = connect()
    print(f"[OK] Connected to Inbox sheet: \"{ws.spreadsheet.title}\" (tab: {ws.title})")
    print(f"     Robot account: {creds.service_account_email}")

    header = get_header(ws)
    seen, _ = existing_links(ws, header)
    existing_count = max(0, len(ws.col_values(1)) - 1)  # rows under the header
    print(f"     Rows already in sheet: {existing_count} ({len(seen)} with a paper link).")

    if mode == "check":
        print("\n[OK] Connection test passed - nothing was written. "
              "Run without 'check' to push papers.")
        return

    if not INPUT_CSV.exists():
        fail(f"No extracted papers found at {INPUT_CSV}\n"
             f"    Run extract_batch.py first to create it.")

    with INPUT_CSV.open(encoding="utf-8-sig", newline="") as f:
        papers = list(csv.DictReader(f))

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_rows, skipped = [], 0
    for p in papers:
        link = (p.get("paper_link") or "").strip()
        if link and link in seen:
            skipped += 1
            continue
        if link:
            seen.add(link)  # guard against duplicates within this same CSV too
        row = {"status": "New", "date_added": stamp, **p}
        new_rows.append([row.get(col, "") for col in header])

    if not new_rows:
        print(f"\n[OK] Nothing new to add - all {len(papers)} papers are already in the Inbox.")
        return

    ws.append_rows(new_rows, value_input_option="RAW")
    print("\n" + "=" * 70)
    print(f"[OK] Added {len(new_rows)} new paper(s) to the Inbox (Status = New).")
    if skipped:
        print(f"     Skipped {skipped} that were already there.")
    print("     Open the sheet to review and promote good rows to the Master Catalog.")


if __name__ == "__main__":
    main()
