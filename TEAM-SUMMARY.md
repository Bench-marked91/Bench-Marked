# Automated Mental Health AI Benchmark Review System
### Team Briefing — 2026-06-25

## The idea in one sentence
We're building a system that automatically finds newly released papers (preprints
and published) on AI/LLMs being benchmarked for mental health tasks, reads them,
extracts the key facts into our catalog format, and publishes short reviews to our
website — with a human approving anything uncertain before it goes live.

## Why this helps us
- Keeps our benchmark catalog current **without manual monitoring** of arXiv, PubMed, etc.
- Does the repetitive fact-extraction automatically, so reviewers spend their time on
  the part that needs expertise: **judging benchmark quality.**
- Runs on a schedule (e.g. every morning) with no one babysitting it.

## How it works (plain language)
Think of it as an assembly line. Most steps are ordinary automation; AI is used only
where reading and judgment are needed.

1. **Find** new papers from arXiv, PubMed, and medRxiv (free, official sources).
2. **Skip duplicates** we've already processed.
3. **Filter** for relevance using our existing relevance rules (mental-health AI
   benchmarking). Off-topic papers are dropped with a logged reason.
4. **Get the full text / PDF.** If it's paywalled, it's flagged for a human instead.
5. **Extract** the facts into our catalog fields + write a short plain-language summary.
6. **Quality appraisal stays with our human reviewers** (for now — see below).
7. **Publish** to the website: confident results go live automatically; uncertain ones
   wait for a reviewer to click "approve."

## What's automated vs. what stays human
| Task | Who |
|---|---|
| Finding papers, removing duplicates | Automated |
| Relevance filtering | Automated (uses our written rules) |
| Downloading PDFs | Automated |
| Extracting facts (size, authors, tasks, models, metrics, etc.) | Automated |
| **Quality appraisal** (construct validity, ecological validity, overall grade, etc.) | **Human reviewers** |
| Final approval before publishing uncertain reviews | **Human** |

## Important: the "appraisal" piece is intentionally NOT automated yet
Extracting *facts* from a paper is reliable for AI. But *grading benchmark quality*
(Strong / Moderate / Weak on validity, safety, reproducibility, etc.) is expert
judgment. An AI can only do that reliably once we have a **written rubric** defining
what earns each grade — which the team is still developing. Until then, reviewers do
the grading by hand, and the AI leaves those columns blank. Automating appraisal is a
**later, separate phase** once the rubric exists.

## Cost
Essentially free to run: the scheduler (GitHub Actions) and website hosting (Vercel)
are on free plans; the AI usage costs only a few cents per day. ~$10 of starter API
credit lasts a long time.

## Foundations we already have
- A **written instruction document** that defines the relevance check and the
  field-by-field extraction rules — this becomes the system's "brain" directly.
- An existing **benchmark catalog spreadsheet** that defines our schema and provides
  worked examples (used to verify the AI's accuracy against human work).

## Rollout plan (phased, low-risk)
1. **Find + Filter** — confirm it surfaces the right papers and rejects junk.
2. **Extract** — test accuracy against a paper we've already catalogued by hand.
3. **Publish** — connect to the website with the human approval gate.
4. **Schedule** — turn on the daily timer; runs hands-off.
5. **Later: Evaluation agent** — automate appraisal *after* the grading rubric is written.

## What we need / open decisions
- Write the **quality-appraisal rubric** (unblocks future automation of grading).
- Add a few extraction fields to the master spreadsheet (tasks, LLMs evaluated,
  conditions covered, performance scores).
- Set up the website's code repository (a later step).
- Decide whether Google Sheets stays our dashboard or the system uses its own file
  as the source of truth (with Sheets as an optional mirror).
- Obtain a Claude (Anthropic) API key with a small amount of credit.

## Status
Planning is complete. Next step is to build Phase 1 (Find + Filter).
