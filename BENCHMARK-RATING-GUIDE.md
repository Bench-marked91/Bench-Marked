# Benchmark Rating Guide (Three-Score Rubric)

This document teaches an AI assistant (e.g. Claude) how to rate a mental-health
LLM benchmark exactly the way the current catalog was rated, so new papers can be
rated consistently and, eventually, automatically.

**Goal:** given a benchmark (from a paper), assign **three independent ratings** —
**Safety**, **Clinical Relevance**, **Methodological Quality** — each **Strong /
Moderate / Weak**. There is **no composite/average score.** A benchmark can be
Strong on one and Weak on another; that is expected and desirable.

---

## 1. What you produce (output format)

Ratings live in DOI-keyed companion files next to the website so they survive the
weekly pipeline refresh of `website/benchmarks.json`. **Do not add ratings inside
`benchmarks.json`** — it is regenerated from the Google Sheet and your edits would
be wiped.

### Single-benchmark paper → `website/benchmark_ratings.json`

One entry, keyed by the paper's **exact `paperLink`** (copy it verbatim from
`benchmarks.json`, including any `?utm_...` or `#fragment`):

```json
"https://pmc.ncbi.nlm.nih.gov/articles/PMC11978496/": { "safety": "Weak", "clinical": "Moderate", "methodology": "Strong" }
```

Rules:
- Values are **capitalized**: `"Strong"`, `"Moderate"`, `"Weak"` (the UI maps these
  to colors: Strong = green `#3C6E5A`, Moderate = tan `#8A6D3B`, Weak = rust `#B5502E`).
- Use keys `safety`, `clinical`, `methodology`.
- Never overwrite an existing entry unless you are deliberately re-rating.
- After editing, validate: `python -m json.tool website/benchmark_ratings.json`.

### Multi-benchmark paper → `website/benchmark_components.json`

If one paper bundles several distinct benchmarks (separate datasets/tasks that each
stand alone, e.g. PsyEval or CounselBench), rate **each component separately**.
Add a `ratings` object to each component entry (keyed by the paper's `paperLink`):

```json
"https://arxiv.org/abs/2506.08584": [
  { "name": "CounselBench-Eval", "tasks": [...], "items": "100", "lang": "EN", "turn": "Single",
    "dataSource": "...", "groundTruth": "...", "evaluation": "...", "population": "...",
    "ratings": { "safety": "Moderate", "clinical": "Strong", "methodology": "Strong" } }
]
```

**How to decide single vs. multi:** it is multi-benchmark only if the paper presents
two or more *independently usable* benchmarks/datasets/tasks. A single benchmark that
happens to have sub-scores or several metrics is still **one** benchmark → rate it in
`benchmark_ratings.json`.

---

## 2. Where the evidence comes from

1. **Start with the extracted row in `website/benchmarks.json`.** These fields map
   directly onto the rubric:
   - `groundTruth` → ground-truth quality (Method)
   - `evaluation` → evaluation method (Method)
   - `population` → population represented (Method) + clinical realism (Clinical)
   - `measures`, `clinicalUseCase` → what it tests (Safety + Clinical)
   - `turn` / `turnRaw` → interaction structure (Method)
   - `size` / `sizeNum` → scale (a minor Method signal)
   - `language`, `venue`, `authors` → context
2. **If the key fields are blank or too thin to judge a dimension, read the paper**
   (`paperLink`). Pull: what it evaluates, whether it tests any safety/harm behavior,
   who created the ground truth and how many experts, how responses are scored, what
   population/data was used, sample size, and single vs. multi-turn.
3. Rate from evidence only. If a dimension is genuinely undeterminable, make the
   **conservative** call and note the uncertainty (for Safety, "conservative" = lower).

---

## 3. The rubric

### Score 1 — Safety · *"Does it test for patient harm?"*

Does the benchmark evaluate the model's ability to recognize, avoid, and appropriately
respond to behaviors that could cause patient harm? This is about **harm-relevant
evaluation**, not overall model capability.

- **Strong** — Comprehensive: assesses multiple safety dimensions, including high-risk
  clinical scenarios (crisis/suicide/self-harm) and/or broad model-safety behaviors
  (reliability, hallucination, robustness/adversarial, bias, privacy).
- **Moderate** — Evaluates one or a few safety concepts but with limited breadth/depth.
- **Weak** — Minimal or no explicit safety evaluation; measures general performance
  without assessing harm-relevant risks.

Scoring checklist (each item the benchmark evaluates = a point; more points → higher tier):
- *Clinical safety (0–3):* (a) recognizes crisis / high-risk situations; (b) appropriateness
  and safety of the clinical response (treatment, escalation, referral, avoiding harmful
  guidance); (c) demographic/racial/cultural/clinical **bias**.
- *Functional safety (0–4):* (a) reliability/consistency across repeated queries;
  (b) hallucination/fabrication; (c) robustness to adversarial/misleading/boundary inputs;
  (d) privacy/confidentiality/inappropriate disclosure.

> Default to **Weak** unless the benchmark clearly tests a harm/safety behavior. Most
> diagnosis, knowledge, and symptom-detection benchmarks are Weak on Safety.

### Score 2 — Clinical Relevance · *"Is it relevant to real care?"*

Does it measure capabilities directly applicable to real-world mental-health care
(not just psychiatric knowledge)?

- **Strong** — Realistic clinical workflow, patient interaction, or decision-making
  spanning multiple clinically relevant tasks; clear patient-centered utility (e.g.
  multi-turn therapy/counseling, crisis-response conversation, diagnostic reasoning on
  real patient interviews, ED triage workflow).
- **Moderate** — A **single** clinically relevant task: diagnosis, risk assessment,
  treatment selection, therapeutic response, symptom/severity scoring, or clinical
  documentation/extraction.
- **Weak** — Theoretical knowledge (board exams, MCQs) **or** abstract/technical
  properties (embeddings, perplexity, genetic/value alignment) with no direct clinical
  connection. Social-media classification with content-based (non-clinical) labels also
  tends Weak.

### Score 3 — Methodological Quality · *"Can the results be trusted?"*

Scientific rigor and trustworthiness of the benchmark's design. Judge it holistically
across four sub-scales; **ground-truth quality is the strongest single signal.**

- **Ground-truth quality:** 3 = independent multi-expert consensus (2+ experts); 2 =
  qualified study team or single qualified expert; 1 = existing reference dataset with
  documented provenance; 0 = LLM-generated or unclear ground truth without expert validation.
- **Evaluation — objective tasks (MCQ/classification):** 3 = appropriate deterministic
  scoring with a validated answer key; 2 = mostly objective, minor limits; 1 = partially
  unclear; 0 = inappropriate/poorly described.
- **Evaluation — conversational/open-ended:** 3 = multiple qualified human reviewers with
  a rubric and agreement/adjudication; 2 = one qualified human reviewer; 1 = validated LLM
  judge calibrated against humans; 0 = unvalidated LLM judge or unclear.
- **Population represented:** 3 = diverse real clinical population (complex/high-risk or
  multisite); 2 = real patient-derived but narrower; 1 = curated or simulated cases;
  0 = unspecified or generic synthetic personas.
- **Interaction structure:** 1 = genuine multi-turn where appropriate; 0 = single-turn only.

Holistic mapping:
- **Strong** — mostly 3s: gold-standard/expert-consensus ground truth, rigorous/validated
  evaluation, representative real population.
- **Moderate** — the common case: sound but limited (single-expert or reference-dataset
  ground truth, self-report labels, simulated/narrow population, validated-but-imperfect
  evaluation, modest N).
- **Weak** — LLM-generated/unclear ground truth, unvalidated evaluation, tiny N, or an
  unrepresentative population with multiple gaps.

---

## 4. Calibration table (fast archetype lookups)

Use these as anchors, then adjust with the specifics of the paper. `S/C/M` = Safety /
Clinical / Methodological Quality.

| Benchmark archetype | S | C | M |
|---|---|---|---|
| Board exam / MCQ knowledge, validated answer key, decent N | Weak | Weak | Moderate |
| Board exam, tiny N (< ~20 psych items) | Weak | Weak | Weak |
| General medical MCQ, rigorous method (not MH-specific) | Weak | Weak | Strong |
| Diagnosis from **real** patient interviews, gold/expert ground truth | Weak¹ | Moderate | Strong |
| Diagnosis from synthetic/AI-generated or vignette cases | Weak | Moderate | Moderate |
| Symptom-severity scoring, validated instrument, real data | Weak | Moderate | Moderate–Strong |
| Social-media symptom classification, established dataset (e.g. eRisk, SMHD) | Weak | Moderate | Moderate |
| Social-media classification, content-based (non-clinical) labels | Weak | Weak | Moderate |
| Suicide/crisis **risk classification**, real data + validated scale | Strong | Strong | Strong–Moderate |
| Crisis **response generation**, scored for safety/appropriateness | Strong | Strong | Moderate |
| Multi-turn therapy/counseling chatbot, human-rubric evaluation | Moderate² | Strong | Moderate |
| Adversarial hallucination / jailbreak / safety guardrail | Strong | Weak–Moderate | Moderate |
| Self-harm detection from clinical notes, multi-expert annotation | Moderate | Moderate | Strong |
| Clinical documentation / guideline-adherence extraction, multi-expert | Weak | Moderate | Strong |
| Patient-education / FAQ reliability, expert raters + validated rubrics | Weak | Moderate | Moderate |
| Abstract/technical (embeddings, perplexity, genetics, value alignment) | Weak | Weak | Moderate |

¹ Bump Safety to **Moderate** if the paper explicitly analyzes demographic/subgroup **bias**.
² Bump Safety to **Strong** if the chatbot evaluation is genuinely safety-focused (e.g. suicide-risk handling).

---

## 5. Worked examples (from the current catalog)

- **MindBench.ai → Strong / Strong / Strong.** Uses the validated Suicide Intervention
  Response Inventory plus expert-written clinical cases (safety + multiple clinical
  dimensions), multi-expert evaluation → strong on all three.
- **PsyCrisisBench → Strong / Strong / Strong.** Suicidal ideation/plan/risk classification
  on 540 **real** hotline calls, ground truth via a validated questionnaire, deterministic
  scoring.
- **ADHD Guideline Adherence → Weak / Moderate / Strong.** No model-safety testing (Weak);
  a single real clinical documentation-extraction task (Moderate Clinical); ground truth =
  two independent physicians, κ 0.86–0.93, 864 real notes (Strong Method).
- **Psychiatry Test Prep manual → Weak / Weak / Moderate.** Board-style MCQs: no safety, pure
  knowledge, but a clean validated answer key.
- **Depression Subtype from Tweets → Weak / Weak / Moderate.** Tweets with content-based
  labels: no safety, no clinical grounding, but a large systematically annotated dataset
  with objective scoring.
- **VERA-MH → Strong / Strong / Moderate.** Suicide-safety benchmark with clinician-built
  rubric and realistic multi-turn simulated conversations (Strong safety + clinical), but
  simulated users and an as-yet-unvalidated LLM judge (Moderate method).
- **4 LLM Mental Health Safety Benchmarks → Strong / Weak / Moderate.** Comprehensive safety
  (suicide calibration, harmful content, refusal, jailbreak robustness), but isolated
  synthetic prompts rather than clinical care, mostly LLM judges.

The full set of assigned ratings is in `website/benchmark_ratings.json` (single-benchmark
papers) and `website/benchmark_components.json` (multi-benchmark papers). Treat those as the
living calibration reference.

---

## 6. Step-by-step procedure

1. **Locate the benchmark** in `website/benchmarks.json` and read its fields.
2. **Decide single vs. multi-benchmark** (Section 1).
3. **Read the paper if metadata is thin** on any rubric-relevant field.
4. **Score each dimension independently** using Section 3, then sanity-check against the
   Section 4 archetypes and the existing entries. Keep the scores independent — do not let
   a Strong safety score pull up clinical/method, or vice versa.
5. **Write the entry** in the correct file, keyed by the exact `paperLink`, capitalized tiers.
6. **Validate JSON** (`python -m json.tool …`) and confirm the paperLink matches
   `benchmarks.json` character-for-character (otherwise the site won't attach the rating).
7. The website auto-loads it (`b.ratings` for single-benchmark papers; per-component for
   multi). No code change is needed to display a new rating.

---

## 7. Consistency guardrails

- **Safety skews Weak** across the field — most benchmarks (diagnosis, knowledge, symptom
  detection) do not test harm. Reserve Strong for benchmarks whose purpose is safety/crisis
  or that probe multiple model-safety failure modes.
- **Clinical is usually Moderate** — most benchmarks measure exactly one clinical task.
  Strong requires realistic interaction or multiple clinical tasks; Weak means knowledge or
  abstract/technical.
- **Method is usually Moderate** — Strong needs expert-consensus/gold-standard ground truth
  and rigorous evaluation on a real population; Weak needs a real deficiency (LLM/unclear
  ground truth, tiny N, unvalidated evaluation).
- These are **expert appraisals, not mechanical scores.** When two tiers are defensible,
  pick the one better supported by the ground-truth quality and the population.

---

## 8. Automating this later (optional)

The paper pipeline today runs `find_papers.py → filter_papers.py → extract_batch.py →
push_to_sheet.py` (see `.github/workflows/pipeline.yml`). A future rating step could:

1. Run after extraction, once a benchmark exists in `benchmarks.json`.
2. Feed this guide + the benchmark's extracted fields (and, if thin, the fetched paper) to
   an LLM and request a strict JSON object `{ "safety", "clinical", "methodology" }`.
3. Merge the result into `benchmark_ratings.json` (or `benchmark_components.json`) keyed by
   `paperLink`, **without** overwriting human-reviewed entries.
4. Keep a human-review gate before publishing, consistent with the rest of the pipeline.

Until then, this guide is the reference for rating new benchmarks by hand or in a one-off
assistant run.
