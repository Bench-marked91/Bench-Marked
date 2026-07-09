# Study Naming System — Team Brief

*A one-page summary of how we plan to name studies on the website: what's decided, and what we still need to agree on.*

---

## Why we're doing this

Right now some studies on the website show their **full paper title**, e.g.
*"Advancing Alzheimer Disease Prediction With Large Language Model–Based Linguistic
Feature Analysis: Development and Validation Study."* That's far too long for a card.
We want every study to have a **short, readable name** plus simple **tags** for filtering —
while still keeping the full title on the study's detail page.

---

## How it will work (the process)

1. **Naming happens automatically during extraction.** When the bot reads a new paper's
   full PDF, it also produces a short **Display name** and **Topic tags** — not just the
   long title. (Because it reads the whole paper, it can spot the authors' real benchmark
   name if they gave one.)
2. **A human reviews every name** in the AI Inbox during the normal triage, and edits it
   if needed, *before* it's promoted to the Master Catalog. Nothing auto-publishes.
3. **The website shows the short name + tags** on cards; the **full title stays on the
   detail page** for accuracy and credit.

---

## ✅ What's already decided

| # | Decision | Rule |
|---|----------|------|
| 1 | **Descriptive names** | If the authors named the benchmark (e.g. `PsychiatryBench`, `VERA-MH`), use it exactly. If not, coin a short descriptive label of 1–3 words, ≤ ~25 characters (e.g. `Alzheimer Predictor`). *Not* citation style like "Hsu et al., 2026." |
| 3 | **Name collisions** | If two names clash or look too similar, add the **dataset / ground-truth source** in parentheses: `DepDetect (eRisk)` vs `DepDetect (Reddit)`. |
| 4 | **Multi-benchmark papers** | Use **one main name** plus a small **"⊕ Suite"** badge; list the sub-benchmarks on the detail page. |
| 6 | **Human review** | Every AI-suggested name is reviewed/edited by a person before going live — same approval gate as everything else. |

---

## 🧩 The tags (two dimensions)

Instead of one long list, each study gets tagged on **two** simple dimensions. This gives
richer filtering ("show all *Dementia* studies," or "show all *Diagnosis* benchmarks").

**A. Condition** — *what mental-health area it covers* (draft list):
`Depression` · `Anxiety` · `Suicide & Self-Harm` · `Dementia / Cognitive` ·
`Autism / Neurodevelopmental` · `Psychosis / Schizophrenia` · `PTSD / Trauma` ·
`Substance Use` · `Eating Disorders` · `ADHD` · `Personality` · `Well-Being` ·
`General / Multi-condition`

**B. Task** — *what the benchmark actually tests* (draft list):
`Diagnosis` · `Screening` · `Clinical Reasoning` · `Risk Detection` · `Crisis & Safety` ·
`Psychotherapy Quality` · `Emotion Recognition` · `Psychometrics` ·
`Medical Knowledge / Exam` · `Bias & Equity`

*Example: a study could be tagged `Depression` + `Screening`, or `Suicide & Self-Harm` + `Crisis & Safety`.*

---

## ❓ What we still need to decide

1. **Finalize the two tag lists above** — add, cut, or rename anything. These are just a
   starting draft built from our current 42 papers.
2. **One tag per dimension, or allow a few?** — e.g. can a study be both `Depression`
   *and* `Anxiety`, or must we pick the single best fit?
3. **Backfilling the existing 42 studies** — how do we give the current catalog its short
   names: (a) re-run them through the new extraction, or (b) a human fills them in from a
   verified draft list?

---

## What happens after the team signs off

Once the rules and tag lists are approved, the build is straightforward:
- Update the extraction so it outputs **Display name + tags** for every new paper.
- Add **Display name** and **Topic tag** columns to both Google Sheets.
- Update the website so cards show the short name + tag chips (full title on the detail page).

*No work starts until the team approves the items above.*
