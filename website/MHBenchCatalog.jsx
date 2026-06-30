import React, { useState, useMemo, useEffect } from "react";
import { ExternalLink, X, ArrowUpDown, Search, ArrowRight, ShieldCheck, Layers } from "lucide-react";

/* ------------------------------------------------------------------ *
 *  MH-LLM Benchmark Catalog — prototype
 *  Audience: LLM safety / eval teams ("what can I test against, is it good?")
 *  Spine: task type · Unit: benchmark · Two modes: Browse / Rigor
 *  NOTE: all entries below are ILLUSTRATIVE SAMPLE DATA pending final
 *  inclusion/exclusion criteria. Swap `BENCHMARKS` for the real catalog.
 * ------------------------------------------------------------------ */

const C = {
  paper: "#F4F6F5",
  surface: "#FFFFFF",
  ink: "#14201C",
  muted: "#61716B",
  line: "#DCE3DF",
  brand: "#1C4F47",
  accent: "#C75B39",
  strong: "#1C4F47",
  moderate: "#5E9B91",
  limited: "#A9C4BE",
};

const FONT_SERIF = "'IBM Plex Serif', Georgia, serif";
const FONT_SANS = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

const TASK_TYPES = [
  { id: "crisis", label: "Crisis & suicidality response" },
  { id: "depression", label: "Depression detection" },
  { id: "anxiety", label: "Anxiety detection" },
  { id: "counseling", label: "Therapeutic response quality" },
  { id: "diagnosis", label: "Psychiatric diagnostic reasoning" },
  { id: "severity", label: "Symptom severity assessment" },
  { id: "empathy", label: "Empathy & alliance" },
  { id: "safety", label: "Harmful-response avoidance" },
  { id: "bias", label: "Sociodemographic bias & fairness" },
  { id: "psychoed", label: "Psychoeducation accuracy" },
];

const ROLE = {
  instrument: "Measurement instrument",
  actor: "Clinical actor",
  rater: "Psychometric rater",
  predictive: "Predictive model",
};

const TIER = {
  strong: { label: "Strong", color: C.strong, ticks: 4 },
  moderate: { label: "Moderate", color: C.moderate, ticks: 3 },
  limited: { label: "Limited", color: C.limited, ticks: 1 },
};

// --- SAMPLE DATA (illustrative) -----------------------------------
const BENCHMARKS = [
  {
    id: "b1", name: "CrisisProbe", task: "crisis", role: "actor",
    measures: "Model response appropriateness to disclosed suicidal ideation in chat.",
    groundTruth: "Clinician-labeled", clinicians: 3, validity: "Weak",
    population: "EN · synthetic personas", n: 220, source: "closed", tier: "limited",
    paper: "Sample et al., 2024",
  },
  {
    id: "b2", name: "PHQ-Bench", task: "depression", role: "instrument",
    measures: "Agreement of model-inferred depression screen with PHQ-9 anchors.",
    groundTruth: "Structured instrument (PHQ-9)", clinicians: 6, validity: "Strong",
    population: "EN · clinical sample", n: 1840, source: "open", tier: "strong",
    paper: "Sample et al., 2025",
  },
  {
    id: "b3", name: "RedditDep", task: "depression", role: "predictive",
    measures: "Classification of depression from social-media text.",
    groundTruth: "Proxy (self-disclosure)", clinicians: 0, validity: "Weak",
    population: "EN · social media", n: 9400, source: "open", tier: "limited",
    paper: "Sample et al., 2023",
  },
  {
    id: "b4", name: "ClinDep-Dx", task: "depression", role: "rater",
    measures: "Severity rating concordance against psychiatrist consensus.",
    groundTruth: "Clinician consensus", clinicians: 4, validity: "Moderate",
    population: "EN · outpatient", n: 610, source: "partial", tier: "moderate",
    paper: "Sample et al., 2025",
  },
  {
    id: "b5", name: "GAD-Eval", task: "anxiety", role: "instrument",
    measures: "Model alignment with GAD-7 derived anxiety severity bands.",
    groundTruth: "Structured instrument (GAD-7)", clinicians: 2, validity: "Moderate",
    population: "EN · mixed", n: 540, source: "partial", tier: "moderate",
    paper: "Sample et al., 2024",
  },
  {
    id: "b6", name: "TherapyTurn", task: "counseling", role: "actor",
    measures: "Quality of counseling responses scored on a validated fidelity rubric.",
    groundTruth: "Clinician-rated rubric", clinicians: 8, validity: "Strong",
    population: "EN · simulated sessions", n: 1200, source: "open", tier: "strong",
    paper: "Sample et al., 2025",
  },
  {
    id: "b7", name: "MI-Skills", task: "counseling", role: "rater",
    measures: "Motivational-interviewing adherence coding of model utterances.",
    groundTruth: "Trained-coder labels", clinicians: 3, validity: "Moderate",
    population: "EN · transcripts", n: 430, source: "partial", tier: "moderate",
    paper: "Sample et al., 2024",
  },
  {
    id: "b8", name: "PsychReason", task: "diagnosis", role: "actor",
    measures: "Differential-diagnosis accuracy on standardized psychiatric vignettes.",
    groundTruth: "Expert-authored key", clinicians: 5, validity: "Moderate",
    population: "EN · vignettes", n: 300, source: "open", tier: "moderate",
    paper: "Sample et al., 2025",
  },
  {
    id: "b9", name: "DSM-MatchQA", task: "diagnosis", role: "instrument",
    measures: "DSM-criterion matching from short case descriptions.",
    groundTruth: "Criterion mapping", clinicians: 1, validity: "Weak",
    population: "EN · synthetic", n: 260, source: "closed", tier: "limited",
    paper: "Sample et al., 2023",
  },
  {
    id: "b10", name: "SeverityScale", task: "severity", role: "rater",
    measures: "Continuous symptom-severity scoring vs. clinician gold ratings.",
    groundTruth: "Clinician gold ratings", clinicians: 7, validity: "Strong",
    population: "EN+ES · clinical", n: 980, source: "open", tier: "strong",
    paper: "Sample et al., 2025",
  },
  {
    id: "b11", name: "EmpathyRate", task: "empathy", role: "rater",
    measures: "Perceived-empathy scoring of model replies on a psychometric scale.",
    groundTruth: "Rater panel", clinicians: 2, validity: "Moderate",
    population: "EN · chat", n: 700, source: "partial", tier: "moderate",
    paper: "Sample et al., 2024",
  },
  {
    id: "b12", name: "SafeRefuse-MH", task: "safety", role: "actor",
    measures: "Avoidance of harmful guidance under adversarial MH prompts.",
    groundTruth: "Red-team labels", clinicians: 1, validity: "Weak",
    population: "EN · adversarial", n: 350, source: "closed", tier: "limited",
    paper: "Sample et al., 2025",
  },
  {
    id: "b13", name: "DemoBias-MH", task: "bias", role: "predictive",
    measures: "Sociodemographic disparity in model MH outputs across matched cases.",
    groundTruth: "Matched-pair design", clinicians: 4, validity: "Strong",
    population: "EN · multi-group", n: 2600, source: "open", tier: "strong",
    paper: "Sample et al., 2025",
  },
  // psychoed: intentionally empty -> demonstrates a coverage gap
];

const SRC_LABEL = { open: "Open", partial: "Partial", closed: "Closed" };

// --- Coverage / gap model -----------------------------------------
// A "gap" is graded, not binary. For a safety/eval engineer a task can
// have benchmarks yet still be missing the rigor / accessibility /
// real-world grounding that makes an eval actually usable.
function isRealPop(b) {
  // "real" = drawn from actual patients, not synthetic / social / simulated
  return /clinical|outpatient|inpatient|patient/i.test(b.population);
}

const GAP_DIMS = [
  { key: "any", label: "Any benchmark", phrase: "benchmark", test: (it) => it.length > 0 },
  { key: "strong", label: "Strong-tier eval", phrase: "Strong-tier eval", test: (it) => it.some((b) => b.tier === "strong") },
  { key: "open", label: "Open-source eval", phrase: "Open-source eval", test: (it) => it.some((b) => b.source === "open") },
  { key: "realpop", label: "Real-population eval", phrase: "real-population eval", test: (it) => it.some((b) => isRealPop(b)) },
];

function coverageOf(items) {
  const flags = {};
  GAP_DIMS.forEach((d) => (flags[d.key] = d.test(items)));
  const missing = GAP_DIMS.filter((d) => !flags[d.key]);
  return { flags, missing, full: missing.length === 0, empty: items.length === 0 };
}

// Computed once and shared across pages (BENCHMARKS is static).
const BY_TASK = (() => {
  const m = Object.fromEntries(TASK_TYPES.map((t) => [t.id, []]));
  BENCHMARKS.forEach((b) => m[b.task]?.push(b));
  return m;
})();
const COVERAGE = Object.fromEntries(TASK_TYPES.map((t) => [t.id, coverageOf(BY_TASK[t.id])]));
const STATS = {
  total: TASK_TYPES.length,
  benchmarks: BENCHMARKS.length,
  fullyCovered: TASK_TYPES.filter((t) => COVERAGE[t.id].full).length,
  empty: TASK_TYPES.filter((t) => COVERAGE[t.id].empty).length,
  get gapped() { return this.total - this.fullyCovered; },
};

/* ------------------------------------------------------------------ *
 *  RIGOR RUBRIC — DRAFT PROPOSAL (edit freely)
 *  Each dimension is scored 2 (Strong) / 1 (Moderate) / 0 (Limited).
 *  Proposed tier rule lives in `tierFromScore` below. These thresholds
 *  are placeholders pending the team's final methodology.
 * ------------------------------------------------------------------ */
const RUBRIC = [
  {
    dim: "Construct validity",
    why: "Does the benchmark actually measure the clinical construct it claims to?",
    strong: "Validated against an established clinical construct (reported validity: Strong).",
    moderate: "Partial or under-tested validity.",
    limited: "Weak or unestablished construct validity.",
  },
  {
    dim: "Ground truth",
    why: "What is the label compared against — and how authoritative is it?",
    strong: "Structured instrument, clinician consensus, or expert-authored key.",
    moderate: "Trained-coder labels or a single clinician.",
    limited: "Proxy signals (e.g. self-disclosure) or automated labels.",
  },
  {
    dim: "Clinical expertise",
    why: "Were qualified clinicians involved in design and labeling?",
    strong: "Three or more clinicians involved.",
    moderate: "One or two clinicians.",
    limited: "No clinician involvement.",
  },
  {
    dim: "Sample size",
    why: "Is the dataset large enough for stable, generalizable estimates?",
    strong: "n ≥ 1,000.",
    moderate: "n between 300 and 999.",
    limited: "n < 300.",
  },
  {
    dim: "Population realism",
    why: "Does the data come from real patients, or from synthetic/proxy sources?",
    strong: "Real clinical population (patients / outpatient / inpatient).",
    moderate: "Mixed, simulated sessions, or transcripts.",
    limited: "Synthetic personas or social-media proxy.",
  },
  {
    dim: "Transparency",
    why: "Can an external team actually access and reproduce the eval?",
    strong: "Open data and code.",
    moderate: "Partially available.",
    limited: "Closed or unavailable.",
  },
];

// DRAFT scoring of one benchmark against the rubric (illustrative).
function scoreBenchmark(b) {
  const s = {};
  s["Construct validity"] = b.validity === "Strong" ? 2 : b.validity === "Moderate" ? 1 : 0;
  s["Ground truth"] = /instrument|consensus|expert|key|gold/i.test(b.groundTruth) ? 2
    : /coder|clinician/i.test(b.groundTruth) ? 1 : 0;
  s["Clinical expertise"] = b.clinicians >= 3 ? 2 : b.clinicians >= 1 ? 1 : 0;
  s["Sample size"] = b.n >= 1000 ? 2 : b.n >= 300 ? 1 : 0;
  s["Population realism"] = isRealPop(b) ? 2 : /mixed|simulated|transcript/i.test(b.population) ? 1 : 0;
  s["Transparency"] = b.source === "open" ? 2 : b.source === "partial" ? 1 : 0;
  const total = Object.values(s).reduce((a, c) => a + c, 0);
  return { perDim: s, total, max: RUBRIC.length * 2, tier: tierFromScore(total) };
}

// Proposed tier rule (placeholder thresholds).
function tierFromScore(total) {
  if (total >= 9) return "strong";
  if (total >= 5) return "moderate";
  return "limited";
}

function Ticks({ tier, size = 4 }) {
  const t = TIER[tier];
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-hidden>
      {Array.from({ length: size }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 6, height: 12, borderRadius: 1,
            background: i < t.ticks ? t.color : "transparent",
            border: `1px solid ${i < t.ticks ? t.color : C.line}`,
          }}
        />
      ))}
    </span>
  );
}

function TierBadge({ tier }) {
  const t = TIER[tier];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Ticks tier={tier} />
      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: t.color, fontWeight: 600 }}>
        {t.label}
      </span>
    </span>
  );
}

/* ================================================================== *
 *  APP SHELL — hash router + persistent chrome
 * ================================================================== */
const NAV = [
  { id: "landing", label: "Overview", hash: "#/" },
  { id: "method", label: "Methodology", hash: "#/method" },
  { id: "catalog", label: "Catalog", hash: "#/catalog" },
];

function hashToPage() {
  const h = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#/, "");
  if (h.startsWith("/method")) return "method";
  if (h.startsWith("/catalog")) return "catalog";
  return "landing";
}

export default function App() {
  const [page, setPage] = useState(hashToPage());

  useEffect(() => {
    const onHash = () => setPage(hashToPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (p) => {
    const hash = NAV.find((n) => n.id === p)?.hash || "#/";
    if (window.location.hash !== hash) window.location.hash = hash;
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  return (
    <div style={{ fontFamily: FONT_SANS, background: C.paper, color: C.ink, minHeight: "100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        a { color: ${C.brand}; }
        @media (prefers-reduced-motion: no-preference){ .lift{ transition: transform .12s ease, box-shadow .12s ease; } }
      `}</style>

      {/* Sample-data banner */}
      <div style={{ background: C.brand, color: "#EAF2EF", fontFamily: FONT_MONO, fontSize: 11, padding: "6px 20px", letterSpacing: ".02em" }}>
        ILLUSTRATIVE SAMPLE DATA · entries & scores are placeholders pending final inclusion criteria
      </div>

      <TopNav page={page} go={go} />

      {page === "landing" && <LandingPage go={go} />}
      {page === "method" && <MethodPage go={go} />}
      {page === "catalog" && <CatalogPage />}
    </div>
  );
}

function TopNav({ page, go }) {
  return (
    <nav style={{ borderBottom: `1px solid ${C.line}`, background: C.surface, position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button
          onClick={() => go("landing")}
          style={{ display: "flex", alignItems: "baseline", gap: 7, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 17, color: C.ink }}>MH-Bench</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.accent, letterSpacing: ".1em", textTransform: "uppercase" }}>Catalog</span>
        </button>
        <div style={{ display: "flex", gap: 2 }}>
          {NAV.map((n) => {
            const on = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={on ? "page" : undefined}
                style={{
                  fontFamily: FONT_SANS, fontSize: 13, fontWeight: on ? 600 : 500,
                  color: on ? C.brand : C.muted, background: "transparent",
                  border: "none", borderBottom: `2px solid ${on ? C.accent : "transparent"}`,
                  padding: "6px 12px", cursor: "pointer",
                }}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE 1 — Landing (editorial)
 * ------------------------------------------------------------------ */
function LandingPage({ go }) {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px" }}>
      {/* Hero */}
      <section style={{ padding: "44px 0 32px", maxWidth: 720 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.accent, letterSpacing: ".12em", textTransform: "uppercase" }}>
          Mental-health LLM evaluation
        </div>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 42, lineHeight: 1.08, margin: "10px 0 0" }}>
          A map of what we can — and can't — test mental-health LLMs against.
        </h1>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.55, margin: "16px 0 0" }}>
          MH-Bench Catalog is a curated index of benchmarks for evaluating large language models on
          clinical mental-health tasks. For each task we ask two questions a safety team actually has:
          <em> what can I test against here, and how much should I trust that test?</em>
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => go("catalog")}>
            Browse the catalog <ArrowRight size={15} />
          </PrimaryButton>
          <GhostButton onClick={() => go("method")}>
            How we rate rigor
          </GhostButton>
        </div>
      </section>

      {/* Live finding */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "28px 0" }}>
        <SectionLabel>The headline finding</SectionLabel>
        <div style={{ display: "flex", gap: 30, marginTop: 14, flexWrap: "wrap" }}>
          <Stat n={STATS.benchmarks} label="benchmarks cataloged" />
          <Stat n={`${STATS.fullyCovered}/${STATS.total}`} label="tasks fully covered · Strong + Open + real-pop" />
          <Stat n={STATS.gapped} label="tasks with a coverage gap" accent />
        </div>
        <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.55, margin: "16px 0 0", maxWidth: 680 }}>
          Most clinical tasks have <em>something</em> to test against — but far fewer have an evaluation that is
          rigorous, openly available, and grounded in a real clinical population at the same time. That gap is the
          point of this catalog.{" "}
          <button onClick={() => go("catalog")} style={linkBtn}>See where the gaps are →</button>
        </p>
      </section>

      {/* What this is / why it matters */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "28px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
        <InfoBlock icon={<Layers size={18} color={C.brand} />} title="What this is">
          A structured, browsable catalog of mental-health LLM benchmarks — organized by clinical task
          (crisis response, depression detection, therapeutic quality, and more) and annotated with what each
          benchmark measures, its ground truth, population, and source availability.
        </InfoBlock>
        <InfoBlock icon={<ShieldCheck size={18} color={C.brand} />} title="Why it matters">
          Mental-health is a high-stakes setting where a confident-but-wrong model can cause real harm. Yet the
          evaluation landscape is uneven and hard to navigate. This catalog makes the strengths, weaknesses, and
          outright gaps legible — so teams test against the right thing and know how far to trust the result.
        </InfoBlock>
      </section>

      {/* Who made it (placeholder) */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "28px 0 48px" }}>
        <SectionLabel>Who made it</SectionLabel>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, margin: "12px 0 0", maxWidth: 680 }}>
          [Placeholder] Add a short note here about the team or organization behind the catalog, the inclusion
          criteria, and how to contribute or suggest a benchmark.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE 2 — Methodology (draft rubric)
 * ------------------------------------------------------------------ */
function MethodPage({ go }) {
  const example = BENCHMARKS.find((b) => b.id === "b2") || BENCHMARKS[0];
  const scored = scoreBenchmark(example);
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px" }}>
      <section style={{ padding: "40px 0 8px" }}>
        <SectionLabel>Methodology</SectionLabel>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 34, lineHeight: 1.12, margin: "10px 0 0" }}>
          How we rate rigor
        </h1>
        <p style={{ fontSize: 15.5, color: C.muted, lineHeight: 1.55, margin: "14px 0 0", maxWidth: 660 }}>
          Every benchmark in the catalog carries a single rigor tier — <TierWord t="strong" />,
          {" "}<TierWord t="moderate" />, or <TierWord t="limited" /> — shown in the Rigor view. That tier is a
          deliberate simplification of several underlying dimensions. This page makes the rule explicit so you can
          judge it (and disagree) for yourself.
        </p>
        <div style={{ marginTop: 16, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`, background: "#FBF1EC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.ink }}>
          <strong style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.accent, letterSpacing: ".06em" }}>DRAFT</strong>
          <span style={{ marginLeft: 8 }}>This rubric is a proposal under active development — thresholds and weights are not final. Feedback welcome.</span>
        </div>
      </section>

      {/* The dimensions */}
      <section style={{ padding: "26px 0" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>The six dimensions</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 16px" }}>
          We assess each benchmark on six dimensions. Each scores <b>2 (Strong)</b>, <b>1 (Moderate)</b>, or <b>0 (Limited)</b>.
        </p>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          {RUBRIC.map((r, i) => (
            <div key={r.dim} style={{ padding: "14px 16px", background: i % 2 ? C.paper : C.surface, borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, margin: 0 }}>{r.dim}</h3>
                <span style={{ fontSize: 12.5, color: C.muted }}>{r.why}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 10 }}>
                <ScoreCell tier="strong" pts={2} text={r.strong} />
                <ScoreCell tier="moderate" pts={1} text={r.moderate} />
                <ScoreCell tier="limited" pts={0} text={r.limited} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Combination rule */}
      <section style={{ padding: "8px 0 26px" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 10px" }}>From dimensions to a tier</h2>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.55, margin: "0 0 14px" }}>
          We sum the six dimension scores (max {RUBRIC.length * 2}) and map the total to a tier. Proposed thresholds:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <ThresholdCard tier="strong" range={`9–${RUBRIC.length * 2}`} desc="Trustworthy enough to anchor a safety claim." />
          <ThresholdCard tier="moderate" range="5–8" desc="Useful signal, but read with caveats." />
          <ThresholdCard tier="limited" range="0–4" desc="Indicative only; don't rely on it alone." />
        </div>
      </section>

      {/* Worked example */}
      <section style={{ padding: "8px 0 26px" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 10px" }}>Worked example</h2>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.55, margin: "0 0 14px" }}>
          Scoring <b style={{ fontFamily: FONT_SERIF }}>{example.name}</b> against the rubric:
        </p>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          {RUBRIC.map((r, i) => {
            const pts = scored.perDim[r.dim];
            const tier = pts === 2 ? "strong" : pts === 1 ? "moderate" : "limited";
            return (
              <div key={r.dim} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 14px", background: i % 2 ? C.paper : C.surface, fontSize: 13 }}>
                <span style={{ color: C.muted }}>{r.dim}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Ticks tier={tier} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TIER[tier].color, minWidth: 14, textAlign: "right" }}>{pts}</span>
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: C.brand, color: "#EAF2EF" }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: ".04em" }}>TOTAL {scored.total}/{scored.max} → {TIER[scored.tier].label.toUpperCase()}</span>
            <Ticks tier={scored.tier} />
          </div>
        </div>
      </section>

      {/* Open questions */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "24px 0 48px" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>Open questions</h2>
        <ul style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
          <li>Should dimensions be weighted (e.g. construct validity counts double) rather than summed equally?</li>
          <li>Should a Strong tier <em>require</em> Strong construct validity regardless of total score?</li>
          <li>Are the sample-size thresholds right across task types (crisis vs. detection differ a lot)?</li>
          <li>How should multilingual / non-English coverage factor into population realism?</li>
        </ul>
        <div style={{ marginTop: 20 }}>
          <GhostButton onClick={() => go("catalog")}>See the rubric applied in the catalog <ArrowRight size={14} /></GhostButton>
        </div>
      </section>
    </div>
  );
}

/* --- Small shared UI for the new pages ---------------------------- */
const linkBtn = { border: "none", background: "transparent", color: C.brand, fontWeight: 600, fontSize: "inherit", cursor: "pointer", padding: 0, fontFamily: "inherit" };

function PrimaryButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="lift" style={{
      display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
      color: "#fff", background: C.brand, border: "none", borderRadius: 9, padding: "11px 18px", cursor: "pointer",
    }}>{children}</button>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
      color: C.brand, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 9, padding: "11px 16px", cursor: "pointer",
    }}>{children}</button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.accent, letterSpacing: ".12em", textTransform: "uppercase" }}>{children}</div>
  );
}

function InfoBlock({ icon, title, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {icon}
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, margin: "10px 0 0" }}>{children}</p>
    </div>
  );
}

function TierWord({ t }) {
  return <span style={{ color: TIER[t].color, fontWeight: 600 }}>{TIER[t].label}</span>;
}

function ScoreCell({ tier, pts, text }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderTop: `2px solid ${TIER[tier].color}`, borderRadius: 8, padding: "8px 10px", background: C.surface }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, color: TIER[tier].color }}>{TIER[tier].label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>{pts} pt{pts === 1 ? "" : "s"}</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

function ThresholdCard({ tier, range, desc }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${TIER[tier].color}`, borderRadius: 9, padding: "12px 14px", background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Ticks tier={tier} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: TIER[tier].color }}>{TIER[tier].label}</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.ink, margin: "8px 0 4px" }}>score {range}</div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function CatalogPage() {
  const [mode, setMode] = useState("browse"); // browse | rigor
  const [active, setActive] = useState(null); // selected task id or null
  const [selected, setSelected] = useState(null); // benchmark detail
  const [query, setQuery] = useState("");
  const [sortByRigor, setSortByRigor] = useState(true);

  const byTask = useMemo(() => {
    const m = Object.fromEntries(TASK_TYPES.map((t) => [t.id, []]));
    BENCHMARKS.forEach((b) => m[b.task]?.push(b));
    return m;
  }, []);

  const coverage = useMemo(() => {
    const m = {};
    TASK_TYPES.forEach((t) => (m[t.id] = coverageOf(byTask[t.id])));
    return m;
  }, [byTask]);

  const tierRank = { strong: 0, moderate: 1, limited: 2 };
  const q = query.trim().toLowerCase();

  let visibleTasks = TASK_TYPES.filter((t) => !active || t.id === active);
  if (mode === "gaps") {
    visibleTasks = visibleTasks
      .filter((t) => !coverage[t.id].full)
      .sort((a, b) => coverage[b.id].missing.length - coverage[a.id].missing.length);
  }

  const fullyCovered = TASK_TYPES.filter((t) => coverage[t.id].full).length;
  const emptyTasks = TASK_TYPES.filter((t) => coverage[t.id].empty).length;
  const gappedTasks = TASK_TYPES.length - fullyCovered;

  return (
    <>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.surface }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.accent, letterSpacing: ".12em", textTransform: "uppercase" }}>
                Mental-health LLM evaluation
              </div>
              <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 30, margin: "4px 0 0", lineHeight: 1.1 }}>
                Benchmark Catalog
              </h1>
              <p style={{ color: C.muted, fontSize: 14, margin: "8px 0 0", maxWidth: 560 }}>
                What can you test a model against for each clinical task — and how rigorous is each test?
              </p>
            </div>

            {/* Mode toggle */}
            <div role="tablist" aria-label="View mode" style={{ display: "inline-flex", border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", background: C.paper }}>
              {[
                { id: "browse", label: "Browse by task" },
                { id: "rigor", label: "Rigor view" },
                { id: "gaps", label: "Gaps view" },
              ].map((m) => {
                const on = mode === m.id;
                return (
                  <button
                    key={m.id} role="tab" aria-selected={on}
                    onClick={() => setMode(m.id)}
                    style={{
                      fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
                      padding: "9px 16px", border: "none", cursor: "pointer",
                      background: on ? C.accent : "transparent",
                      color: on ? "#fff" : C.muted,
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coverage summary — the builder-relevant headline */}
          <div style={{ display: "flex", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
            <Stat n={BENCHMARKS.length} label="benchmarks cataloged" />
            <Stat n={`${fullyCovered}/${TASK_TYPES.length}`} label="tasks fully covered · Strong + Open + real-pop" />
            <Stat n={gappedTasks} label="tasks with a coverage gap" accent />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px", display: "grid", gridTemplateColumns: "230px 1fr", gap: 22 }}>
        {/* Task-type spine */}
        <aside>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search benchmarks"
              style={{ width: "100%", padding: "8px 10px 8px 30px", fontFamily: FONT_SANS, fontSize: 13, border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink }}
            />
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: ".1em", padding: "0 4px 8px" }}>
            Task types
          </div>
          <nav>
            <SpineItem label="All tasks" count={BENCHMARKS.length} on={!active} allTasks onClick={() => setActive(null)} />
            {TASK_TYPES.map((t) => (
              <SpineItem
                key={t.id} label={t.label} count={byTask[t.id].length}
                on={active === t.id} cov={coverage[t.id]}
                onClick={() => setActive(active === t.id ? null : t.id)}
              />
            ))}
          </nav>
          <CoverageLegend />
        </aside>

        {/* Lanes */}
        <main>
          {mode === "rigor" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <Legend />
              <button
                onClick={() => setSortByRigor((s) => !s)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: C.brand, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}
              >
                <ArrowUpDown size={13} /> Sort: {sortByRigor ? "rigor" : "name"}
              </button>
            </div>
          )}

          {mode === "gaps" && (
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", maxWidth: 640 }}>
              Tasks missing one or more of the four coverage dimensions, worst first. A task is only
              "fully covered" when it has a benchmark that is <strong style={{ color: C.ink }}>Strong-tier</strong>,
              <strong style={{ color: C.ink }}> open-source</strong>, and built on a
              <strong style={{ color: C.ink }}> real clinical population</strong>.
            </p>
          )}

          {mode === "gaps" && visibleTasks.length === 0 && (
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "18px 16px", background: C.surface, fontSize: 13, color: C.muted }}>
              No coverage gaps under the current filter — every task here has a Strong, open, real-population benchmark.
            </div>
          )}

          {visibleTasks.map((t) => {
            const cov = coverage[t.id];

            if (mode === "gaps") {
              if (q) {
                const hit = t.label.toLowerCase().includes(q) ||
                  byTask[t.id].some((b) => b.name.toLowerCase().includes(q) || b.measures.toLowerCase().includes(q));
                if (!hit) return null;
              }
              return <GapSection key={t.id} t={t} cov={cov} items={byTask[t.id]} onSelect={setSelected} />;
            }

            let items = byTask[t.id];
            if (q) items = items.filter((b) => b.name.toLowerCase().includes(q) || b.measures.toLowerCase().includes(q));
            if (q && items.length === 0) return null;
            const sorted = mode === "rigor" && sortByRigor
              ? [...items].sort((a, b) => tierRank[a.tier] - tierRank[b.tier])
              : items;

            return (
              <section key={t.id} style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <h2 style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, margin: 0 }}>{t.label}</h2>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>{items.length} benchmark{items.length === 1 ? "" : "s"}</span>
                </div>

                {!cov.empty && !cov.full && <PartialGapBanner cov={cov} />}

                {sorted.length === 0 ? (
                  <GapCard label={t.label} />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))", gap: 12 }}>
                    {sorted.map((b) => (
                      <BenchCard key={b.id} b={b} mode={mode} onClick={() => setSelected(b)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>

      {selected && <Detail b={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Stat({ n, label, accent }) {
  return (
    <div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 600, color: accent ? C.accent : C.brand, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function SpineItem({ label, count, on, cov, allTasks, onClick }) {
  const empty = cov ? cov.empty : false;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", width: "100%", alignItems: "stretch",
        gap: 6, textAlign: "left", padding: "8px 10px", marginBottom: 2,
        border: "none", borderRadius: 8, cursor: "pointer",
        background: on ? C.brand : "transparent",
        color: on ? "#EAF2EF" : empty ? C.muted : C.ink,
        fontFamily: FONT_SANS, fontSize: 13, fontWeight: on ? 600 : 400,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span>{label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, opacity: empty ? 0.6 : 1, color: on ? "#EAF2EF" : empty ? C.accent : C.muted }}>
          {empty ? "gap" : count}
        </span>
      </div>
      {!allTasks && cov && <CoverageDots cov={cov} on={on} />}
    </button>
  );
}

function CoverageDots({ cov, on }) {
  const onColor = "#EAF2EF";
  return (
    <span
      style={{ display: "inline-flex", gap: 4 }}
      title={GAP_DIMS.map((d) => `${cov.flags[d.key] ? "✓" : "✗"} ${d.label}`).join("\n")}
      aria-label={`Coverage: ${cov.missing.length} of ${GAP_DIMS.length} dimensions missing`}
    >
      {GAP_DIMS.map((d) => {
        const ok = cov.flags[d.key];
        const solid = on ? onColor : C.brand;
        return (
          <span
            key={d.key}
            aria-hidden
            style={{
              width: 8, height: 8, borderRadius: 2,
              background: ok ? solid : "transparent",
              border: `1px solid ${ok ? solid : on ? "#E9A98F" : C.accent}`,
            }}
          />
        );
      })}
    </span>
  );
}

function CoverageLegend() {
  return (
    <div style={{ marginTop: 12, padding: "10px 4px 0", borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
        Coverage dots
      </div>
      {GAP_DIMS.map((d, i) => (
        <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, border: `1px solid ${C.brand}`, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.muted }}>{i + 1}. {d.label}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: "transparent", border: `1px solid ${C.accent}`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: C.accent }}>hollow = missing (gap)</span>
      </div>
    </div>
  );
}

function PartialGapBanner({ cov }) {
  const missing = cov.missing.filter((d) => d.key !== "any").map((d) => d.phrase);
  if (missing.length === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`,
      background: "#FBF1EC", borderRadius: 8, padding: "8px 12px", marginBottom: 10,
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: ".06em" }}>PARTIAL GAP</span>
      <span style={{ fontSize: 12.5, color: C.ink }}>
        Benchmarks exist, but none is {missing.join(" · ")}.
      </span>
    </div>
  );
}

function GapSection({ t, cov, items, onSelect }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, margin: 0 }}>{t.label}</h2>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.accent }}>
          {cov.missing.length} of {GAP_DIMS.length} dimensions missing
        </span>
      </div>

      {cov.empty ? (
        <GapCard label={t.label} />
      ) : (
        <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: 14, background: C.surface }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 8, marginBottom: 12 }}>
            {GAP_DIMS.map((d) => {
              const ok = cov.flags[d.key];
              return (
                <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: ok ? C.ink : C.accent }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: ok ? C.brand : "transparent", border: `1px solid ${ok ? C.brand : C.accent}` }} />
                  <span>{ok ? "Has " : "No "}{d.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted, marginRight: 2 }}>Has:</span>
            {items.map((b) => (
              <button
                key={b.id} onClick={() => onSelect(b)} className="lift"
                style={{
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                  background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 10px",
                }}
              >
                <Ticks tier={b.tier} size={4} />
                <span style={{ fontFamily: FONT_SERIF, fontSize: 13, color: C.ink }}>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BenchCard({ b, mode, onClick }) {
  const tierColor = TIER[b.tier].color;
  return (
    <button
      onClick={onClick} className="lift"
      style={{
        textAlign: "left", cursor: "pointer", background: C.surface,
        border: `1px solid ${C.line}`, borderLeft: mode === "rigor" ? `3px solid ${tierColor}` : `1px solid ${C.line}`,
        borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8,
        boxShadow: "0 1px 0 rgba(20,32,28,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600 }}>{b.name}</span>
        {mode === "rigor" && <Ticks tier={b.tier} />}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>{b.measures}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
        <Chip>{ROLE[b.role]}</Chip>
        <Chip mono>{SRC_LABEL[b.source]} source</Chip>
        {mode === "rigor" && <Chip mono color={tierColor}>{TIER[b.tier].label}</Chip>}
      </div>
    </button>
  );
}

function Chip({ children, mono, color }) {
  return (
    <span style={{
      fontFamily: mono ? FONT_MONO : FONT_SANS, fontSize: 11,
      color: color || C.muted, border: `1px solid ${color ? color : C.line}`,
      borderRadius: 999, padding: "2px 8px", background: C.paper, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function GapCard({ label }) {
  return (
    <div style={{
      border: `1.5px dashed ${C.line}`, borderRadius: 10, padding: "16px 16px",
      background: "transparent", color: C.muted, fontSize: 13,
    }}>
      <strong style={{ color: C.accent, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".06em" }}>COVERAGE GAP</strong>
      <div style={{ marginTop: 4 }}>No catalogued benchmark evaluates <span style={{ color: C.ink }}>{label.toLowerCase()}</span>. For a safety team, this is the signal: there is currently nothing to test against here.</div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>Rigor:</span>
      {["strong", "moderate", "limited"].map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Ticks tier={k} /><span style={{ fontSize: 12, color: C.ink }}>{TIER[k].label}</span>
        </span>
      ))}
    </div>
  );
}

function Detail({ b, onClose }) {
  const rows = [
    ["Task type", TASK_TYPES.find((t) => t.id === b.task)?.label],
    ["Model role", ROLE[b.role]],
    ["Ground truth", b.groundTruth],
    ["Clinicians involved", `n = ${b.clinicians}`],
    ["Construct validity", b.validity],
    ["Population & language", b.population],
    ["Sample size", b.n.toLocaleString()],
    ["Source availability", SRC_LABEL[b.source]],
  ];
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,32,28,0.34)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(440px, 100%)", height: "100%", background: C.surface, borderLeft: `1px solid ${C.line}`, overflowY: "auto", padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <TierBadge tier={b.tier} />
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, margin: "8px 0 0" }}>{b.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.5, marginTop: 14 }}>{b.measures}</p>

        <div style={{ marginTop: 18, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: i % 2 ? C.paper : C.surface, fontSize: 13 }}>
              <span style={{ color: C.muted }}>{k}</span>
              <span style={{ fontFamily: FONT_MONO, color: C.ink, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        <a
          href="#" onClick={(e) => e.preventDefault()}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 18, fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: "#fff", background: C.brand, padding: "10px 16px", borderRadius: 9, textDecoration: "none" }}
        >
          View source paper <ExternalLink size={14} />
        </a>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{b.paper} · link is a placeholder in this prototype</div>
      </div>
    </div>
  );
}
