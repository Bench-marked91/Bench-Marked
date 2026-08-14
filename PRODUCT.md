# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two confirmed audiences (owner's words, 2026-08-11):

1. **Model developers** looking for good psychology / mental-health benchmarks to evaluate their models against.
2. **Providers** (organizations deploying/serving models) looking for benchmarks to stress-test the models they are already using.

The owner maintains the catalog and is not a programmer; the site must stay understandable and maintainable through automated pipelines.

## Product Purpose

BENCHLY is a curated, continuously updated catalog of AI/LLM benchmarks in mental health, psychiatry, and neurobehavioral domains. An automated weekly pipeline (GitHub Actions) discovers newly released papers (arXiv, PubMed, medRxiv), filters for relevance, extracts structured facts, and publishes reviews — with human approval for anything uncertain. Success = a developer or provider can quickly find a benchmark that fits their evaluation need and judge its quality at a glance.

## Positioning

Not a generic leaderboard: a domain-specific (mental health) benchmark review catalog with structured quality ratings per benchmark (see BENCHMARK-RATING-GUIDE.md) and machine-extracted, human-approved metadata. Neighboring products (HELM, PapersWithCode) don't offer curated mental-health-specific quality appraisal.

## Operating Context

- Catalog data lives in `website/*.json` (benchmarks.json, benchmark_ratings.json, benchmark_components.json, benchmark_meta.json, benchmark_names.json), produced by the Python pipeline and mirrored to a Google Sheet.
- The site is a single React component (`website/MHBenchCatalog.jsx`) rendered without a build step: `website/index.html` loads React 18 + Babel + lucide-react from CDN and transpiles the JSX in the browser. Served locally by `website/serve.ps1` at http://localhost:8000/.
- A separate `run.html` / `BenchmarkRunner.jsx` surface exists for running a benchmark (depression_benchmark.json).
- Weekly pipeline: `.github/workflows/pipeline.yml`; private repo `DzMai/mental-health-benchmark-system`.

## Capabilities and Constraints

- No Node/npm build toolchain on the owner's machine; the browser-Babel setup is a hard constraint — the site must remain a single JSX file transpiled at runtime (Babel classic runtime), loading libraries from CDN only.
- Icons: lucide-react 0.460 (CDN). React 18 UMD.
- Benchmark quality grades follow BENCHMARK-RATING-GUIDE.md; naming follows NAMING-SYSTEM.md.
- Undecided: public hosting/deployment of the catalog (Vercel planned in PLAN.md; not confirmed live).

## Evidence on Hand

- Real benchmark data: ~40+ benchmarks in `website/benchmarks.json` with ratings in `benchmark_ratings.json`; publisher logos under `website/logos/`.
- Rating rubric: `BENCHMARK-RATING-GUIDE.md`. Pipeline design: `PLAN.md`. Do not fabricate testimonials, usage numbers, or institutional endorsements — none exist.

## Product Principles

1. Trust through transparency: every benchmark entry traces back to a real paper and a documented rating rubric.
2. Scan-first: developers and providers arrive with a task in mind; filtering and comparison beat storytelling.
3. Zero-build durability: anything shipped must work as static files + CDN, with no install step for the owner.
4. Human-in-the-loop: automation drafts, the owner approves; the UI should never imply more certainty than the rating grants.
