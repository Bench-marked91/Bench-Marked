# Mental Health AI Benchmark — Automated Review System
### Project Plan (living document)

*Last updated: 2026-06-25*

---

## 1. Goal (in plain language)

Build a system that runs by itself on a schedule, finds **newly released papers**
(preprints *and* published) about **AI/LLMs being evaluated or benchmarked on mental
health tasks**, reads them, pulls out the key facts in a consistent format, and
publishes short reviews to a website — with a human approving anything uncertain
before it goes live.

The owner is **not a programmer**. Therefore: Claude writes all the code, the owner
follows copy-paste setup steps once, and the system runs hands-off afterward.

---

## 2. Core design idea

This is a **pipeline (assembly line)**, not a swarm of chatty AIs. Most steps are
ordinary code (free, reliable). An AI model is called only where *judgment* is
needed. This keeps token costs to **cents per day**.

```
GitHub Actions  ── wakes daily, free, no server to manage ──┐
                                                            ▼
[1] DISCOVER   poll arXiv + PubMed + medRxiv APIs            (code, no AI)
[2] DEDUPE     check seen-papers.json (have we seen it?)     (code, no AI)
[3] FILTER     relevance check  → cheap model (Haiku)        (AI)
                 Definitely / Might-Be  → continue
                 Not Related            → log reason, stop
[4] ACCESS     fetch full text / PDF; if paywalled → queue   (code, no AI)
                 as "needs-PDF" for the owner
[5] EXTRACT    pull facts into the schema → smart model      (AI)
                 outputs human summary + structured JSON
[6] APPRAISE   HUMAN ONLY for now (quality grades).          (human)
                 Rubric not written yet — deferred.
[7] PUBLISH    confident  → commit to website repo → deploys (mostly code)
               borderline → open Pull Request → owner approves
               also mirror the row into the catalog/spreadsheet
```

---

## 3. Technology choices (and why)

| Need | Choice | Why |
|---|---|---|
| Scheduler / where code runs | **GitHub Actions** | Free, no server to rent or babysit, lives next to the website code |
| Website hosting | **Vercel (free plan)** | Owner already chose this; auto-deploys from GitHub |
| Website source | **GitHub repo** (not created yet) | Reviews get committed here; Vercel publishes them |
| "Database" / memory | **`seen-papers.json` file in the repo** | No paid database needed; human-readable; free |
| Paper sources | **arXiv, PubMed, medRxiv APIs** | Free, official, no scraping |
| Cheap AI (filtering) | **Claude Haiku** | Fast + cheap; only reads title + abstract |
| Smart AI (extraction) | **Claude Sonnet / Opus** | Reads full PDFs; higher accuracy where it matters |
| Approval workflow | **GitHub Pull Requests + Vercel preview** | Borderline reviews open a PR; Vercel builds a live preview; owner clicks "Merge" to publish |

**Approx. cost:** GitHub Actions $0 · Vercel $0 · Claude API a few cents/day.
Put ~$10 of API credit on the account to start; it lasts a long time.

---

## 4. The three agents

### Agent A — Filter (relevance check)
- **Source of logic:** the owner's instruction file, *Step 1*.
- Classifies each paper: **Definitely Related / Might Be Related / Not Related**.
- Relevance scope is intentionally broad: LLM/AI evaluation in mental health,
  psychiatry, or neurobehavioral/psychological domains (includes adjacent areas
  like Alzheimer's, MCI, wellbeing — the catalog already contains these).
- Runs on the cheap model (title + abstract only).

### Agent B — Extraction
- **Source of logic:** the owner's instruction file, *Steps 2–5*.
- Reads the full paper, fills the schema (Section 5), outputs:
  1. a human-readable summary + field table (as the instruction specifies), **and**
  2. a structured JSON version for the machine to publish automatically.
- Rule: **never guess.** Missing/unclear → leave blank (`""`) and list it under
  "Missing or Uncertain Fields." Accuracy beats completeness.

### Agent C — Evaluation / Appraisal  ⏸️ DEFERRED
- This is the someday-automated version of the human quality grading (Section 5,
  Tier 3). **Not built yet** — the grading rubric (what earns Strong vs. Moderate
  vs. Weak on each axis) is **not written down yet; still being worked out.**
- Until that rubric exists, **humans do appraisal by hand.** The AI leaves these
  columns blank.

---

## 5. Extraction schema (the fields)

Merged from the spreadsheet columns + the instruction file. Fields marked **(new)**
are in the instruction but not yet columns in the spreadsheet — recommend adding them.

**Tier 1 — Identity / metadata** *(factual; cheap model can handle)*
- Benchmark name *(= paper title, exactly)*
- Paper link
- Reviewer *(human initials; AI drafts get marked "AI-draft")*
- Open vs. Closed Source *(refers to the **model** tested: Open / Closed / Mixed / "")*
- Month / Year
- Authors
- Institutions
- Journal / Venue *(format: "Published — [journal]" or "Preprint — [platform]")*
- Language(s)

**Tier 2 — Benchmark characterization** *(needs full paper; smart model)*
- Ground-truth source
- Size of benchmark (# of items)
- What does the benchmark assess (skills)?
- Task(s) assessed **(new)** *(actual tasks; multiple → separate with semicolons)*
- Clinical use case
- Population represented
- # domains *(only if the paper explicitly names domains, else "")*
- Single vs. Multi-Turn *(interaction format with the LLM only)*
- Evaluation method *(how tested + metrics; always state Human / Automated / Both)*
- # of LLMs assessed *(count true LLMs only, not non-LLM baselines)*
- LLM(s) evaluated **(new)** *(names + versions)*
- Mental health condition(s) covered **(new)**
- Performance scores / key metrics **(new)**

**Priority fields (extract with highest accuracy):**
LLM(s) evaluated · Task(s) assessed · Evaluation method ·
Mental health condition(s) covered · Performance scores / key metrics

**Tier 3 — Quality appraisal** ⏸️ *(HUMAN ONLY for now — see Agent C)*
- Construct validity · Ground-truth quality · Population representativeness ·
  Ecological validity · Safety sensitivity · Contamination risk ·
  Reproducibility · Metric appropriateness · Overall grade ·
  Red flags / reviewer notes

---

## 6. Output format (per the instruction file)

For each related paper the Extraction agent produces, in order:
1. **Relevance Flag** — Definitely / Might Be / Not Related + one sentence. (If Not Related, stop.)
2. **Benchmark Catalog** — clean two-column table (Field | Value).
3. **Short Summary** — 4–6 plain-language sentences (what/why/models+tasks/how evaluated/key result).
4. **Missing or Uncertain Fields** — especially any priority field.

Plus a hidden **structured JSON** of the same data, for the machine to publish.

---

## 7. Build roadmap (phased, so it's never overwhelming)

- **Phase 1 — Discover + Filter. ✅ DONE (2026-06-25).** Robot finds papers and
  classifies relevance (Agent A). Output: a list the owner eyeballs. *Goal: it
  catches the right papers, rejects junk.*  — Working: `find_papers.py` +
  `filter_papers.py`, run via `run-pipeline.bat`. First run found 40 papers →
  14 Definitely / 20 Might-Be / 6 Not Related, all sensible.
- **Phase 2 — Extract. 🔄 IN PROGRESS (validated 2026-06-25).** Agent B
  (`extract_paper.py`) sends the full PDF to Claude Sonnet and returns structured
  catalog fields. Tested twice against the PsychiatryBench PDF: highly consistent,
  matched/beat the manual row 2, and correctly filled the priority fields the human
  left blank. Open tuning items: (a) `# domains` definition (AI counted 11 task types
  vs human's 6); (b) benchmark_name full-title vs short-name. Cost ~15-20c/paper.
  Still to do: run across real arXiv papers + fold into the pipeline.
- **Phase 3 — Publish.** Wire confident/borderline output into the Vercel site +
  mirror into the catalog. *Goal: end-to-end, hands-off with approval gate.*
- **Phase 4 — Schedule & walk away.** Turn on the daily timer.
- **Phase 5 (later) — Appraisal/Evaluation agent (Agent C).** Only after the Tier-3
  grading rubric is written down.

---

## 8. Decisions made

- Hosting for the AI system: **GitHub Actions** (free, sits with the website).
- Website: **Vercel free plan + GitHub repo** (repo not created yet — Phase 3).
- Autonomy: **Hybrid** — confident reviews auto-publish; borderline ones wait for
  owner approval via a Pull Request.
- Memory/dedup: **a JSON file in the repo** (no paid database).
- Appraisal: **human-only for now**; evaluation agent deferred until a rubric exists.
- **Data storage = TWO Google Sheets (decided 2026-06-25):**
  - **"AI Inbox" sheet** — bot has full write access; it dumps every new paper +
    the extracted facts (Tiers 1–2) here. Has a `Status` column (New / Promoted /
    Rejected) for reviewers to triage.
  - **"Master Catalog" sheet** — the team's existing, human-owned catalog incl.
    appraisal (Tier 3). The bot NEVER writes here.
  - **Handoff:** a reviewer promotes good rows from Inbox → Master and adds the
    appraisal grades. This IS the human review gate (the "Hybrid" approval).
  - Bot dedup memory (`seen-papers.json`) will be **seeded with the links already
    in the Master Catalog** so it never re-surfaces the ~46 already-catalogued papers.
  - Until the system runs autonomously (Phase 4), the local `results.csv` is the
    stand-in for the AI Inbox; the live Google Sheets connection is wired in Phase 4.

## 9. Open items / to do

- [ ] Create the website GitHub repo (Phase 3).
- [ ] Add the 4 "new" fields as columns in the master spreadsheet.
- [x] Data storage decided: two Google Sheets (AI Inbox + Master Catalog) — see §8.
- [ ] Create the "AI Inbox" Google Sheet (Phase 4, when wiring live Sheets).
- [ ] Seed `seen-papers.json` from the Master Catalog's existing paper links.
- [ ] Write the Tier-3 appraisal rubric (unblocks Agent C) — *in progress by team.*
- [x] Get an Anthropic (Claude) API key + add credit. (Done 2026-06-25.)

### Extraction conventions to settle with the team (affect consistency)
These surfaced while testing extraction; once decided, bake each into the instruction.
- [ ] **`# of LLMs assessed`** — count distinct *base models* or distinct *chatbot
      products/variants*? (Row 17: human said 1 = GPT-4o base; AI said 4 = four
      custom GPTs. Both defensible.)
- [ ] **`# domains`** — what counts as a "domain" vs. a "task type"? (PsychiatryBench:
      human 6 vs. AI 11 task types.)
- [ ] **`Language(s)`** — only languages *used in the benchmark*, or also languages the
      system was *capability-tested* on? (Row 17: human English; AI English + Spanish.)
- [ ] **`Benchmark name`** — full paper title or short benchmark name? (Instruction
      currently says full title; team often uses the short name.)

## 10. Reference inputs (provided by owner)

- Instruction file: `AI Bench Mark Instruction.txt` (the Filter + Extraction logic).
- Catalog/spreadsheet: `LLM Mental Health Benchmarks - Benchmark catalog.csv`
  (defines the schema + has worked examples).
- Example paper for testing: `PsychiatryBench ... .pdf` (matches catalog row 2).
