import React, { useState, useMemo, useEffect } from "react";
import { ExternalLink, X, ArrowUpDown, Search, ArrowRight, ShieldCheck, Layers } from "lucide-react";

/* ------------------------------------------------------------------ *
 *  MH-LLM Benchmark Catalog
 *  Data source: website/benchmarks.json  (generated from the team's
 *  "Benchmark catalog" Google Sheet by scripts/export_catalog_to_website.py)
 *  Benchmarks are currently UNCATEGORIZED — a flat catalog. Rigor tiers are
 *  PROVISIONAL, computed from a draft rubric until human appraisal is filled in.
 * ------------------------------------------------------------------ */

// Editorial theme (Monolog-inspired), applied site-wide: warm off-white canvas,
// near-black warm ink, a single terracotta accent, muted semantic tier colors.
// Color mostly comes from content (card banners), not the UI — monochrome + air.
// Palette matched to bymonolog.com's actual Webflow swatches (extracted from
// their stylesheet): warm greige canvas, near-black ink, warm greys, and their
// signature lime accent. Tier colors stay semantic for the rigor charts.
const C = {
  paper: "#D1D1C7",      // beige-300 — page background (their --background)
  surface: "#E8E8E3",    // beige-100 — cards / nav
  ink: "#080807",        // black-400 — primary text
  muted: "#6B645C",      // black-100 — secondary text
  line: "#BFBFB1",       // beige-400 — hairline borders
  brand: "#080807",      // primary = ink (buttons, nav)
  accent: "#080807",     // emphasis = ink (monochrome, like Monolog)
  lime: "#F1FE67",       // their signature highlight (use with dark text)
  dark: "#181715",       // card-bg — dark surfaces (footer)
  strong: "#3C6E5A",
  moderate: "#8A6D3B",
  limited: "#B5502E",
  unrated: "#938F8A",    // black-50
};

// Fonts substituted for their licensed webfonts: Khteka→Space Grotesk (display),
// Suisse Mono→Space Mono. Body stays Inter (clean neo-grotesque).
const FONT_SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const FONT_SERIF = "'Space Grotesk', 'Inter', system-ui, sans-serif"; // display/headings
const FONT_MONO = "'Space Mono', 'Roboto Mono', ui-monospace, monospace";

const TIER = {
  strong: { label: "Strong", color: C.strong, ticks: 4 },
  moderate: { label: "Moderate", color: C.moderate, ticks: 3 },
  limited: { label: "Limited", color: C.limited, ticks: 1 },
};

const SOURCE_OPTIONS = ["Open", "Mixed", "Restricted", "Closed"];

/* ------------------------------------------------------------------ *
 *  Editorial theme — SCOPED TO THE CATALOG PAGE ONLY (Monolog-inspired):
 *  warm off-white, near-black type, Space Grotesk display, generous
 *  whitespace, borderless cards with a color top-banner. Other pages keep
 *  the existing `C` / FONT_* look.
 * ------------------------------------------------------------------ */
const ED = {
  bg: "#D1D1C7",       // beige-300 canvas (matches Monolog)
  card: "#E8E8E3",     // beige-100 card surface
  ink: "#080807",      // black-400
  muted: "#6B645C",    // black-100
  line: "#BFBFB1",     // beige-400 hairline
  display: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
};
// Muted editorial palette for each card's top color-banner (deterministic per study).
const ED_BAND = ["#B5502E", "#3C6E5A", "#4A5B9E", "#8A6D3B", "#7C4A73", "#2F6D77", "#A65A4E", "#586A3A"];
function bandColor(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return ED_BAND[h % ED_BAND.length];
}

/* ------------------------------------------------------------------ *
 *  DRAFT RIGOR RUBRIC (provisional — edit freely)
 *  Each dimension scores 2 / 1 / 0 when the data is present. A tier is
 *  assigned only when at least MIN_KNOWN dimensions have data; otherwise the
 *  benchmark is "Unrated" (a signal that the sheet row needs more detail).
 * ------------------------------------------------------------------ */
const MIN_KNOWN = 3;

const RUBRIC = [
  { key: "validity", dim: "Construct validity", why: "Does it measure the clinical construct it claims to?" },
  { key: "groundTruth", dim: "Ground truth", why: "How authoritative is the answer key?" },
  { key: "size", dim: "Sample size", why: "Enough items for stable estimates?" },
  { key: "population", dim: "Population realism", why: "Real patients vs. synthetic/proxy data?" },
  { key: "transparency", dim: "Transparency", why: "Can an external team access and reproduce it?" },
];

function dimScore(b, key) {
  switch (key) {
    case "validity": {
      const v = (b.constructValidity || "").toLowerCase();
      if (!v) return { known: false, pts: 0 };
      if (v.startsWith("strong")) return { known: true, pts: 2 };
      if (v.startsWith("mod")) return { known: true, pts: 1 };
      return { known: true, pts: 0 };
    }
    case "groundTruth": {
      const g = (b.groundTruth || "").toLowerCase();
      if (!g) return { known: false, pts: 0 };
      if (/instrument|consensus|expert|casebook|manual|guideline|gold|clinician/.test(g)) return { known: true, pts: 2 };
      if (/coder|annotat|label/.test(g)) return { known: true, pts: 1 };
      return { known: true, pts: 1 };
    }
    case "size": {
      const n = b.sizeNum;
      if (n == null) return { known: false, pts: 0 };
      if (n >= 1000) return { known: true, pts: 2 };
      if (n >= 300) return { known: true, pts: 1 };
      return { known: true, pts: 0 };
    }
    case "population": {
      const p = (b.population || "").toLowerCase();
      if (!p) return { known: false, pts: 0 };
      if (/patient|clinical|outpatient|inpatient|adult|geriatric/.test(p)) return { known: true, pts: 2 };
      if (/mixed|simulat|transcript|forum|social/.test(p)) return { known: true, pts: 1 };
      return { known: true, pts: 1 };
    }
    case "transparency": {
      const s = (b.source || "").toLowerCase();
      if (!s) return { known: false, pts: 0 };
      if (s === "open") return { known: true, pts: 2 };
      if (s === "mixed" || s === "restricted") return { known: true, pts: 1 };
      if (s === "closed") return { known: true, pts: 0 };
      return { known: false, pts: 0 };
    }
    default:
      return { known: false, pts: 0 };
  }
}

function scoreBenchmark(b) {
  const per = {};
  let total = 0, maxKnown = 0, knownCount = 0;
  RUBRIC.forEach((r) => {
    const s = dimScore(b, r.key);
    per[r.key] = s;
    if (s.known) { total += s.pts; maxKnown += 2; knownCount += 1; }
  });
  if (knownCount < MIN_KNOWN) return { tier: null, total, maxKnown, knownCount, per };
  const frac = total / maxKnown;
  const tier = frac >= 0.75 ? "strong" : frac >= 0.4 ? "moderate" : "limited";
  return { tier, total, maxKnown, knownCount, per, frac };
}

const tierRank = { strong: 0, moderate: 1, limited: 2 };

/* Benchmarks recreated as a live, browser-only "Run" experience (grows over time).
   Keyed by the paper's stable DOI/link — NOT the catalog `id`, which the pipeline
   regenerates on every refresh. Use runHrefFor(b) to look up a benchmark. */
const RUNNABLE = {
  "https://doi.org/10.3389/fdgth.2026.1790533": "./run.html", // Depression subtype (tweets)
};
function runHrefFor(b) {
  return b ? RUNNABLE[b.paperLink] : undefined;
}

/* Lightweight task categorization (keyword heuristic) — powers the catalog
   category filter and the row tags. Falls back to "General" when nothing matches. */
function deriveCategory(b) {
  const t = `${b.name || ""} ${b.measures || ""} ${b.groundTruth || ""}`.toLowerCase();
  if (/crisis|suicid|self-harm|self harm|\bharm\b|safety/.test(t)) return "Crisis & Safety";
  if (/psychotherap|counsel|\btherap|motivational interview/.test(t)) return "Psychotherapy Quality";
  if (/diagnos/.test(t)) return "Diagnosis";
  if (/\brisk\b/.test(t)) return "Risk Detection";
  if (/screen|detect|classif|identif|predict/.test(t)) return "Screening & Detection";
  if (/emotion|sentiment|affect/.test(t)) return "Emotion & Sentiment";
  if (/reason/.test(t)) return "Clinical Reasoning";
  if (/exam|\bmcq\b|knowledge|board|\bqa\b|question/.test(t)) return "Medical Knowledge";
  if (/bias|equit|fair|demograph|hallucinat/.test(t)) return "Bias & Equity";
  return "General";
}

// Task taxonomy shown on the landing "what it covers" grid and used as the
// catalog's category filter. Matches scripts/generate_names.py (TASK_CRITERIA).
const CATEGORY_INFO = [
  { name: "Knowledge & Board Exams", desc: "Declarative clinical knowledge tested via MCQ / OSCE / board-prep items." },
  { name: "Diagnostic Reasoning", desc: "Case vignette → diagnosis, differential, or clinical reasoning." },
  { name: "Risk & Crisis Response", desc: "Detect suicide / self-harm / crisis and respond safely; triage." },
  { name: "Therapeutic Conversation & Counseling", desc: "Quality of multi-turn counseling / psychotherapy dialogue." },
  { name: "Clinical Documentation & Extraction", desc: "Classify or extract from real clinical records." },
  { name: "Symptom Detection & Severity Assessment", desc: "Infer presence / severity from speech, interview, or text." },
  { name: "Patient Communication & Education", desc: "Quality / reliability / readability of patient-facing answers." },
  { name: "Safety, Bias & Robustness", desc: "Bias, hallucination, and guardrail behavior." },
];
const TASK_ORDER = CATEGORY_INFO.map((c) => c.name);

// The 7-domain weighted benchmark-evaluation rubric (see Benchmark Evaluation
// Methodology). `groups` = additive checklist items; `scale` = pick-one levels.
const RUBRIC_DOMAINS = [
  {
    name: "Safety", weight: 30, range: "0–8",
    why: "A model can score well on knowledge or accuracy while still producing responses that are harmful in a clinical setting — especially around suicidal ideation, psychosis, self-harm, and crisis. Safety carries the highest weight because detecting harmful model behavior is the strongest signal of a benchmark's value.",
    groups: [
      { label: "Clinical safety (0–3)", items: [
        ["Evaluates recognition of crisis or high-risk mental-health situations", 1],
        ["Evaluates appropriateness of response, escalation, resources, and non-reinforcement of harmful content (must ask more than simple crisis recognition + referral)", 1],
        ["Evaluates demographic, racial, cultural, or other clinically relevant bias", 1],
      ] },
      { label: "Functional safety (0–4)", items: [
        ["Evaluates reliability / consistency across repeated or similar queries", 1],
        ["Evaluates hallucination or fabrication (made-up information, not merely flawed reasoning)", 1],
        ["Evaluates robustness to adversarial, misleading, or boundary-testing inputs", 1],
        ["Evaluates privacy, confidentiality, or inappropriate information disclosure", 1],
      ] },
    ],
  },
  {
    name: "Clinical Focus", weight: 25, range: "0–2",
    why: "Rewards benchmarks that evaluate performance relevant to real mental-health care rather than general knowledge.",
    scale: [
      [2, "Evaluates a clinical workflow, patient interaction, or decision spanning multiple psychiatric tasks — clinically meaningful utility or patient-centered benefit/harm"],
      [1, "Tests a single clinical task (diagnosis, risk assessment, treatment selection, therapeutic response)"],
      [0, "Tests theoretical neuroscience / psychiatric / mental-health knowledge"],
    ],
  },
  {
    name: "Ground Truth Quality", weight: 15, range: "0–3",
    why: "A benchmark is only as strong as the reference standard its answers are checked against.",
    scale: [
      [3, "Independent multi-expert consensus (2+)"],
      [2, "Qualified study team or a single qualified human expert"],
      [1, "Existing reference dataset with documented provenance"],
      [0, "LLM-generated or unclear ground truth without expert verification"],
    ],
  },
  {
    name: "Evaluation Method", weight: 10, range: "0–3",
    why: "How the outputs are scored — related to but distinct from the reference standard. Objective tasks (e.g. MCQ accuracy) are not penalized for lacking human review.",
    scale: [
      [3, "Multiple qualified human evaluators with a rubric and agreement / adjudication"],
      [2, "One qualified human evaluator"],
      [1, "LLM judge validated or calibrated against human judgment"],
      [0, "Unvalidated LLM judge or unclear subjective scoring"],
    ],
  },
  {
    name: "Population Represented", weight: 10, range: "0–3",
    why: "Whether the benchmark reflects the patients and situations seen in real mental-health care, which drives generalizability.",
    scale: [
      [3, "Diverse real clinical population — complex / high-risk / comorbid cases, multisite, or explicit subgroup evaluation"],
      [2, "Real patient-derived data from a narrow population or single setting"],
      [1, "Curated or simulated cases, textbook cases, or synthetic personas"],
      [0, "Population unspecified or entirely generic LLM-generated personas"],
    ],
  },
  {
    name: "Interaction Structure", weight: 5, range: "0–1",
    why: "Multi-turn interaction better simulates psychiatric interviews and therapy, though single-turn is appropriate for many valid tasks (classification, risk prediction, note analysis).",
    scale: [
      [1, "Includes genuinely context-dependent multi-turn interaction"],
      [0, "Single-turn only"],
    ],
  },
  {
    name: "Benchmark Size", weight: 5, range: "0–3",
    why: "Scored by statistical power — how small a performance gap between models the item count can reliably detect (80% power, two-sided α = 0.05).",
    scale: [
      [3, "39,200+ items — detects ~1-point differences (large power)"],
      [2, "1,600–39,199 items — detects ~5-point differences (moderate)"],
      [1, "400–1,599 items — detects ~10-point differences (small)"],
      [0, "Fewer than 400 items — cannot reliably detect a 10-point difference"],
    ],
  },
];

// FAQ content (from PLAN.md / TEAM-SUMMARY.md).
const FAQS = [
  { q: "What is this catalog?", a: "A curated, growing index of benchmarks used to evaluate large language models on clinical mental-health tasks — what each one measures, how it was built, and how rigorous it looks. It's drawn from our team's research sheet and kept current by an automated find → filter → extract pipeline with human review." },
  { q: "How are the rigor tiers computed?", a: "They're provisional, from a draft five-dimension rubric: construct validity, ground-truth quality, sample size, population realism, and transparency. A tier is only assigned when at least three dimensions have data; otherwise a benchmark is shown as Unrated. Human appraisal will eventually replace the automatic tiers — see the Rubric page." },
  { q: "Can I run a benchmark myself?", a: "Yes — a few benchmarks have a “Run this benchmark” button. You bring your own API key (OpenAI or Anthropic), the test runs entirely in your browser, your key is never stored or sent to us, and you see your model's score. More benchmarks become runnable over time, one at a time." },
  { q: "Where does the data come from?", a: "New papers are found automatically from arXiv, PubMed, and medRxiv, filtered for relevance, and their facts extracted into a consistent schema. Quality appraisal is done by human reviewers, not the machine." },
  { q: "What does it cost to run a benchmark?", a: "Only your own model API usage — typically a few cents for a small sample, since you choose how many items to run. The catalog itself is free to browse." },
  { q: "Is this a clinical tool?", a: "No. It's a research catalog. Any runnable benchmark is a recreation for model evaluation only — not a diagnostic tool and not medical advice." },
];

/* ------------------------------------------------------------------ *
 *  Small shared UI
 * ------------------------------------------------------------------ */
function Ticks({ tier, size = 4 }) {
  const t = TIER[tier];
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-hidden>
      {Array.from({ length: size }).map((_, i) => (
        <span key={i} style={{
          width: 6, height: 12, borderRadius: 1,
          background: i < t.ticks ? t.color : "transparent",
          border: `1px solid ${i < t.ticks ? t.color : C.line}`,
        }} />
      ))}
    </span>
  );
}

function RigorBadge({ score }) {
  if (!score.tier) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "transparent", border: `1px solid ${C.unrated}` }} />
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>Unrated</span>
      </span>
    );
  }
  const t = TIER[score.tier];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Ticks tier={score.tier} />
      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: t.color, fontWeight: 600 }}>{t.label}</span>
    </span>
  );
}

function Chip({ children, mono, color }) {
  if (!children) return null;
  return (
    <span style={{
      fontFamily: mono ? FONT_MONO : FONT_SANS, fontSize: 11,
      color: color || C.muted, border: `1px solid ${color ? color : C.line}`,
      borderRadius: 999, padding: "2px 8px", background: C.paper, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function PrimaryButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="lift" style={{
      display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
      color: "#fff", background: C.brand, border: "none", borderRadius: 999, padding: "13px 28px", cursor: "pointer",
    }}>{children}</button>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
      color: C.ink, background: "transparent", border: `1px solid ${C.ink}`, borderRadius: 999, padding: "12px 26px", cursor: "pointer",
    }}>{children}</button>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: C.accent, letterSpacing: ".08em", textTransform: "uppercase" }}>{children}</div>;
}

function Stat({ n, label, accent }) {
  return (
    <div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 700, color: accent ? C.accent : C.ink, lineHeight: 1, letterSpacing: "-.02em" }}>{n}</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>{label}</div>
    </div>
  );
}

/* ================================================================== *
 *  APP SHELL — hash router, data loading, persistent chrome
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

/* ------------------------------------------------------------------ *
 *  Access gate — confidential beta agreement (shown before the site).
 *  TEMPLATE TEXT, NOT LEGAL ADVICE — have counsel review before launch.
 *  Edit the placeholders below. Bump TERMS_KEY to re-prompt everyone.
 * ------------------------------------------------------------------ */
const TERMS_KEY = "mhbench_terms_v1";
const TERMS_OWNER = "the MDplus Catalysis Fellowship team"; // TODO: confirm the copyright/IP owner
const TERMS_CONTACT = "[contact email]";                    // TODO: add a contact email
const TERMS_JURISDICTION = "";                              // e.g. "the State of California, USA" (blank hides it)

function AgreementGate({ onAccept }) {
  const [checked, setChecked] = useState(false);
  const accept = () => {
    try { localStorage.setItem(TERMS_KEY, "yes"); } catch (e) { /* ignore */ }
    onAccept();
  };
  const hasContact = TERMS_CONTACT && TERMS_CONTACT[0] !== "[";
  const h3 = { fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 600, color: "#EDEBE4", margin: "0 0 6px", letterSpacing: "-.01em" };
  const p = { fontSize: 13, lineHeight: 1.6, color: "#B7B2A8", margin: 0 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0C0B0A", color: "#EDEBE4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "32px 20px" }}>
      <div className="herofx" aria-hidden="true"><b className="s1" /><b className="s2" /><b className="s3" /><b className="s4" /></div>
      <div style={{ position: "relative", width: "min(640px, 100%)", background: "rgba(18,17,13,.74)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(237,235,228,.14)", borderRadius: 10, padding: "clamp(24px, 4vw, 40px)", maxHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#8C887E", marginBottom: 14 }}>Confidential Beta · Access Agreement</div>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.03em", lineHeight: 1.02, margin: 0 }}>Before you enter</h1>
        <p style={{ fontSize: 14, color: "#B7B2A8", lineHeight: 1.55, margin: "14px 0 0" }}>
          Access to this site is by invitation only and subject to the terms below. Please read them before continuing.
        </p>
        <div style={{ marginTop: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, borderTop: "1px solid rgba(237,235,228,.12)", borderBottom: "1px solid rgba(237,235,228,.12)", padding: "18px 8px 18px 0" }}>
          <div>
            <div style={h3}>1 · Confidential, invitation-only access</div>
            <p style={p}>This website and all of its contents — including the benchmark catalog, evaluation rubric and scores, methodology, compiled data, and any unpublished materials (collectively, the “Confidential Materials”) — are provided to you on a strictly confidential, invitation-only basis. By accessing the site you agree to (a) hold the Confidential Materials in strict confidence; (b) not disclose, publish, present, distribute, screenshot, reproduce, or otherwise share them, in whole or in part, with any third party; and (c) use them solely to review and provide feedback on this project. These obligations continue until the materials are released publicly by the project owners in writing.</p>
          </div>
          <div>
            <div style={h3}>2 · Work in progress; no warranty; not medical advice</div>
            <p style={p}>This is an early-stage, in-development prototype provided “AS IS” and “AS AVAILABLE,” without warranties of any kind, whether express or implied, including any warranty of accuracy or fitness for a particular purpose. Content is preliminary and may be incomplete, inaccurate, or changed or removed at any time without notice. Nothing on this site is medical, clinical, psychiatric, diagnostic, or professional advice, and it must not be used to make clinical or treatment decisions; it is not a medical device. If you or someone else may be in crisis, contact local emergency services or a crisis line (in the U.S., call or text 988). To the maximum extent permitted by law, the project owners and their affiliated individuals and institutions disclaim all liability arising from your access to or use of the site.</p>
          </div>
          <div>
            <div style={h3}>3 · Copyright &amp; intellectual property</div>
            <p style={p}>© 2026 {TERMS_OWNER}. All rights reserved. All original content, source code, design, text, the evaluation rubric, and compiled data are the intellectual property of their respective owners and are protected by copyright and other laws. You may not copy, reproduce, distribute, modify, create derivative works from, data-mine, scrape, or reverse-engineer any part of the site without prior written permission. Third-party materials referenced in the catalog — including research papers, datasets, model names, and the names, trademarks, and logos of third parties (such as MDplus, Stanford, and Google) — remain the property of their respective owners and are used for identification and reference only; no affiliation, sponsorship, or endorsement is implied.</p>
          </div>
          <div>
            <div style={h3}>4 · Acceptance</div>
            <p style={p}>By checking the box below and selecting “I accept &amp; enter,” you acknowledge that you have read, understood, and agree to be bound by these terms{TERMS_JURISDICTION ? `, which are governed by the laws of ${TERMS_JURISDICTION}` : ""}. If you do not agree, do not access or use the site.{hasContact ? ` Questions: ${TERMS_CONTACT}.` : ""}</p>
          </div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 18, cursor: "pointer", fontSize: 13.5, color: "#EDEBE4", lineHeight: 1.5 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I have read and accept the confidentiality agreement, the work-in-progress disclaimer, and the copyright &amp; intellectual-property terms above.</span>
        </label>
        <div style={{ marginTop: 18 }}>
          <button onClick={accept} disabled={!checked} style={{ background: checked ? C.lime : "rgba(237,235,228,.15)", color: checked ? C.ink : "rgba(237,235,228,.5)", border: "none", borderRadius: 999, padding: "12px 28px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: checked ? "pointer" : "not-allowed" }}>
            I accept &amp; enter →
          </button>
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "#6f6b62", marginTop: 16 }}>Confidential — do not distribute · v1</div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(hashToPage());
  const [data, setData] = useState(null);   // null = loading
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem(TERMS_KEY) === "yes"; } catch (e) { return false; }
  });

  useEffect(() => {
    const onHash = () => setPage(hashToPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const t = Date.now();
    // Catalog is required; names (short display name + tags) are an optional
    // DOI-keyed companion file that survives pipeline refreshes of benchmarks.json.
    Promise.all([
      fetch("./benchmarks.json?t=" + t).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
      fetch("./benchmark_names.json?t=" + t).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([rows, names]) => setData(rows.map((b) => {
        const n = names[b.paperLink] || names[b.id] || {};
        return {
          ...b,
          score: scoreBenchmark(b),
          displayName: n.displayName || b.name,
          conditions: n.conditions || [],
          tasks: n.tasks || [],
        };
      })))
      .catch((e) => { setError(String(e)); setData([]); });
  }, []);

  const go = (p) => {
    const hash = NAV.find((n) => n.id === p)?.hash || "#/";
    if (window.location.hash !== hash) window.location.hash = hash;
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  return (
    <div style={{ fontFamily: FONT_SANS, background: C.paper, color: C.ink, minHeight: "100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Roboto+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        a { color: ${C.brand}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .8s linear infinite; }
        @media (prefers-reduced-motion: no-preference){
          .lift{ transition: transform .14s ease, box-shadow .14s ease; }
          .lift:hover{ transform: translateY(-2px); box-shadow: 0 6px 18px rgba(60,64,67,0.16); }
          .navlink{ transition: color .12s ease; }
          .navroll > span{ transition: transform .34s cubic-bezier(.5,0,.15,1); }
          .edcard{ transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
          .edcard:hover{ transform: translateY(-3px); box-shadow: 0 12px 32px rgba(20,18,14,.12); }
          .edcard:hover .edarrow span{ transform: translateX(5px); }
          .edrow:hover{ background: rgba(23,21,15,.035); }
          .edrow:hover .edarrow span{ transform: translateX(5px); }
          .edtile{ transition: transform .18s ease; }
          .edtile:hover{ transform: translateY(-4px); }
          .edtile:hover .edarrow span{ transform: translateX(5px); }
        }
        .edcard .edarrow span, .edrow .edarrow span, .edtile .edarrow span{ transition: transform .16s ease; }
        .edrow{ transition: background .14s ease; }
        /* Nav rollover: text slides up, a duplicate slides in from below on hover. */
        .navroll{ position: relative; display: inline-block; overflow: hidden; vertical-align: bottom; line-height: 1.35; }
        .navroll > span{ display: block; }
        .navroll > span:last-child{ position: absolute; top: 0; left: 0; transform: translateY(100%); }
        .navlink:hover .navroll > span:first-child{ transform: translateY(-100%); }
        .navlink:hover .navroll > span:last-child{ transform: translateY(0); }
        .sr-only{ position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
        .catlayout{ display: grid; grid-template-columns: 210px 1fr; gap: 44px; align-items: start; }
        @media (max-width: 760px){ .catlayout{ grid-template-columns: 1fr; gap: 24px; } }
        .herobottom{ display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: end; margin-top: 34px; }
        @media (max-width: 680px){ .herobottom{ grid-template-columns: 1fr; gap: 22px; } }
        .processrow{ display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; padding: 56px 0; border-top: 1px solid rgba(237,235,228,.14); }
        @media (max-width: 820px){ .processrow{ grid-template-columns: 1fr; gap: 22px; padding: 40px 0; } }

        /* Live smoky grey/black gradient (animated blurred blobs + halftone). */
        .herofx{ position: absolute; inset: 0; overflow: hidden; background: #0b0a09; pointer-events: none; }
        .herofx b{ position: absolute; display: block; border-radius: 50%; filter: blur(72px); mix-blend-mode: screen; will-change: transform, opacity; }
        .herofx .s1{ width: 85vw; height: 85vw; top: -22%; left: -12%; opacity: .55;
          background: radial-gradient(circle at center, #74736c 0%, rgba(116,115,108,0) 60%); }
        .herofx .s2{ width: 80vw; height: 80vw; bottom: -28%; right: -12%; opacity: .5;
          background: radial-gradient(circle at center, #3c3b37 0%, rgba(60,59,55,0) 62%); }
        .herofx .s4{ width: 48vw; height: 48vw; bottom: -8%; left: 6%; opacity: .38;
          background: radial-gradient(circle at center, #5a594f 0%, rgba(90,89,79,0) 62%); }
        .herofx .s3{ width: 55vw; height: 55vw; top: 14%; left: 32%; opacity: .40;
          background: radial-gradient(circle at center, #9a988f 0%, rgba(154,152,143,0) 62%); }
        .herofx:after{ content: ""; position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 3px 3px; opacity: .5; }
        @keyframes smokeA{ 0%{ transform: translate(-10%,-8%) scale(1); opacity: .42; } 50%{ transform: translate(8%,5%) scale(1.45); opacity: .78; } 100%{ transform: translate(18%,12%) scale(1.15); opacity: .55; } }
        @keyframes smokeB{ 0%{ transform: translate(8%,10%) scale(1.15); opacity: .40; } 50%{ transform: translate(-6%,-3%) scale(1.55); opacity: .70; } 100%{ transform: translate(-16%,-12%) scale(1.25); opacity: .48; } }
        @keyframes smokeC{ 0%{ transform: translate(0,8%) scale(1); opacity: .28; } 50%{ transform: translate(-12%,-6%) scale(1.4); opacity: .60; } 100%{ transform: translate(12%,-10%) scale(1.2); opacity: .40; } }
        @keyframes smokeD{ 0%{ transform: translate(4%,6%) scale(1.05); opacity: .28; } 50%{ transform: translate(-9%,-6%) scale(1.4); opacity: .55; } 100%{ transform: translate(11%,4%) scale(1.15); opacity: .36; } }
        @media (prefers-reduced-motion: no-preference){
          .herofx .s1{ animation: smokeA 20s ease-in-out infinite alternate; }
          .herofx .s2{ animation: smokeB 16s ease-in-out infinite alternate; }
          .herofx .s3{ animation: smokeC 26s ease-in-out infinite alternate; }
          .herofx .s4{ animation: smokeD 22s ease-in-out infinite alternate; }
        }
      `}</style>

      {!accepted ? (
        <AgreementGate onAccept={() => setAccepted(true)} />
      ) : (
        <>
      <div style={(page === "landing" || page === "method")
        ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, background: "linear-gradient(to bottom, rgba(11,10,9,.62), rgba(11,10,9,0))" }
        : { position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ background: (page === "landing" || page === "method") ? "transparent" : "#EAE4D7", color: (page === "landing" || page === "method") ? "rgba(237,235,228,.72)" : C.muted, fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".04em", fontWeight: 400, padding: "9px 20px", textAlign: "center" }}>
          Live data from the team catalog · rigor tiers are provisional (draft rubric) pending human appraisal
        </div>
        <TopNav page={page} go={go} overlay={page === "landing" || page === "method"} />
      </div>

      {data === null ? (
        <Loading />
      ) : (
        <>
          {page === "landing" && <LandingPage go={go} data={data} />}
          {page === "method" && <MethodPage go={go} data={data} />}
          {page === "catalog" && <CatalogPage data={data} error={error} />}
          <Footer go={go} />
        </>
      )}
        </>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div className="spin" style={{ width: 30, height: 30, borderRadius: 999, border: `3px solid ${C.line}`, borderTopColor: C.brand }} />
      <div style={{ fontSize: 14, color: C.muted }}>Loading catalog…</div>
    </div>
  );
}

function TopNav({ page, go, overlay }) {
  const wordColor = overlay ? "#EDEBE4" : C.ink;
  return (
    <nav style={{ borderBottom: overlay ? "none" : `1px solid ${C.line}`, background: overlay ? "transparent" : C.surface }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => go("landing")} style={{ display: "flex", alignItems: "center", gap: 9, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: wordColor, display: "inline-block" }} />
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 18, color: wordColor, letterSpacing: "-.02em" }}>Mental Health Benchmarks</span>
        </button>
        <div style={{ display: "flex", gap: 2 }}>
          {NAV.map((n) => {
            const on = page === n.id;
            return (
              <button key={n.id} className="navlink" onClick={() => go(n.id)} aria-current={on ? "page" : undefined} style={{
                fontFamily: FONT_SANS, fontSize: 13, fontWeight: on ? 600 : 500,
                color: overlay ? (on ? "#fff" : "rgba(237,235,228,.72)") : (on ? C.brand : C.muted), background: "transparent",
                border: "none", borderBottom: `2px solid ${on ? (overlay ? C.lime : C.accent) : "transparent"}`,
                padding: "6px 12px", cursor: "pointer",
              }}>
                <span className="navroll" aria-hidden="true"><span>{n.label}</span><span>{n.label}</span></span>
                <span className="sr-only">{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 *  Charts (hand-drawn SVG/CSS — no chart library)
 * ------------------------------------------------------------------ */
function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 4, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 11, color: C.muted }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Donut({ data, total, size = 132, thickness = 20 }) {
  const sum = data.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((s, i) => {
          const len = (s.value / sum) * circ;
          const seg = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return seg;
        })}
      </g>
      <text x={size / 2} y={size / 2 - 3} textAnchor="middle" style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, fill: C.ink }}>{total}</text>
      <text x={size / 2} y={size / 2 + 15} textAnchor="middle" style={{ fontFamily: FONT_SANS, fontSize: 10, fill: C.muted }}>total</text>
    </svg>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
          <span style={{ color: C.ink }}>{s.label}</span>
          <span style={{ color: C.muted, fontFamily: FONT_MONO, marginLeft: "auto" }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function YearBars({ counts }) {
  const max = Math.max(...counts.map((c) => c.n), 1);
  const PLOT = 120;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: PLOT + 26 }}>
      {counts.map((c) => (
        <div key={c.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{c.n}</div>
          <div title={`${c.year}: ${c.n}`} className="lift" style={{ width: "100%", maxWidth: 42, height: Math.max(3, (c.n / max) * PLOT), background: C.brand, borderRadius: "6px 6px 0 0" }} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{c.year}</div>
        </div>
      ))}
    </div>
  );
}

function HBars({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 78, fontSize: 12, color: C.muted, textAlign: "right", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, background: C.paper, borderRadius: 999, height: 10, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: d.color, borderRadius: 999 }} />
          </div>
          <div style={{ width: 24, fontSize: 12, color: C.ink, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

function ChartEmpty() {
  return <div style={{ fontSize: 13, color: C.muted, padding: "8px 0" }}>Not enough data yet.</div>;
}

/* ------------------------------------------------------------------ *
 *  Accordion (FAQ) + site-wide Footer
 * ------------------------------------------------------------------ */
function Accordion({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 500, color: C.ink, letterSpacing: "-.015em" }}>{q}</span>
        <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: C.muted, lineHeight: 1, flexShrink: 0 }}>{open ? "–" : "+"}</span>
      </button>
      {open && <div style={{ fontSize: 15.5, lineHeight: 1.65, color: C.muted, padding: "0 0 24px", maxWidth: 760 }}>{a}</div>}
    </div>
  );
}

function Footer({ go }) {
  return (
    <footer style={{ background: C.ink, color: "#E7E1D4", marginTop: 0 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px 40px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#E7E1D4", display: "inline-block" }} />
            <span style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 19, letterSpacing: "-.02em" }}>Mental Health Benchmarks</span>
          </div>
          <p style={{ maxWidth: 420, marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "#B7B0A2" }}>
            A curated, growing index of how AI models are evaluated on mental-health tasks — a few of which you can run yourself.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#B7B0A2" }}>Explore</div>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} style={{ textAlign: "left", background: "transparent", border: "none", color: "#E7E1D4", fontFamily: FONT_SANS, fontSize: 14.5, cursor: "pointer", padding: 0 }}>
              {n.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(231,225,212,.16)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", fontFamily: FONT_MONO, fontSize: 11, color: "#B7B0A2", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>Data from arXiv · PubMed · medRxiv · human-reviewed</span>
          <span>Research catalog — not a clinical tool.</span>
        </div>
      </div>
    </footer>
  );
}

// Logo that loads an image from website/logos/, falling back to a styled
// wordmark if the file isn't present yet.
function Logo({ src, name, h = 32, color }) {
  const [err, setErr] = useState(false);
  if (err) {
    return <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 17, letterSpacing: "-.01em", color: color || C.ink }}>{name}</span>;
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ height: h, width: "auto", maxWidth: 180, objectFit: "contain", display: "block" }} />
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE 1 — Landing
 * ------------------------------------------------------------------ */
function LandingPage({ go, data }) {
  const total = data.length;
  const withSource = data.filter((b) => b.source).length;
  const rated = data.filter((b) => b.score.tier).length;
  const graded = data.filter((b) => b.overallGrade).length;

  const rigorMix = [
    { label: "Strong", value: data.filter((b) => b.score.tier === "strong").length, color: C.strong },
    { label: "Moderate", value: data.filter((b) => b.score.tier === "moderate").length, color: C.moderate },
    { label: "Limited", value: data.filter((b) => b.score.tier === "limited").length, color: C.limited },
    { label: "Unrated", value: data.filter((b) => !b.score.tier).length, color: C.unrated },
  ].filter((s) => s.value > 0);

  const yearMap = {};
  data.forEach((b) => { const m = (b.year || "").match(/\d{4}/); if (m) yearMap[m[0]] = (yearMap[m[0]] || 0) + 1; });
  const yearCounts = Object.keys(yearMap).sort().map((y) => ({ year: y, n: yearMap[y] }));

  const accessPalette = { Open: C.strong, Mixed: C.moderate, Restricted: C.brand, Closed: C.limited, Unknown: C.unrated };
  const accessMix = ["Open", "Mixed", "Restricted", "Closed", "Unknown"].map((k) => ({
    label: k,
    value: k === "Unknown" ? data.filter((b) => !SOURCE_OPTIONS.includes(b.source)).length : data.filter((b) => b.source === k).length,
    color: accessPalette[k],
  })).filter((d) => d.value > 0);

  const runnableCount = data.filter((b) => runHrefFor(b)).length;
  const featured = [...data]
    .sort((a, b) => (runHrefFor(b) ? 1 : 0) - (runHrefFor(a) ? 1 : 0) || (b.sizeNum || 0) - (a.sizeNum || 0))
    .slice(0, 6);

  return (
    <>
      {/* Dark full-screen hero — giant wordmark (Monolog-style) */}
      <section style={{ position: "relative", background: "#0C0B0A", color: "#EDEBE4", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", padding: "104px 32px 40px" }}>
        <div className="herofx" aria-hidden="true"><b className="s1" /><b className="s2" /><b className="s3" /><b className="s4" /></div>

        {/* top-centered intro + entry buttons */}
        <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, lineHeight: 1.7, color: "#CFCCC2", margin: 0 }}>
            We index how AI models are really tested on mental-health tasks — what each benchmark measures, and how far to trust it.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
            <button onClick={() => go("catalog")} style={{ background: C.lime, color: C.ink, border: "none", borderRadius: 999, padding: "11px 24px", fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Browse the catalog →</button>
            <button onClick={() => go("method")} style={{ background: "transparent", color: "#EDEBE4", border: "1px solid rgba(237,235,228,.35)", borderRadius: 999, padding: "11px 22px", fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>How we rate rigor</button>
          </div>
        </div>

        {/* giant wordmark + bottom stat/paragraph row */}
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: "clamp(34px, 13vw, 230px)", lineHeight: 0.82, letterSpacing: "-.04em", textAlign: "center", color: "#A6A299", whiteSpace: "nowrap", maxWidth: "100%" }}>
            BENCHMARKS
          </div>
          <div className="herobottom">
            <div>
              <div style={{ fontFamily: FONT_SERIF, fontSize: "clamp(34px, 4vw, 54px)", fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>{total}+</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: "#8C887E", marginTop: 8, lineHeight: 1.5 }}>Benchmarks catalogued<br />(arXiv · PubMed · medRxiv)</div>
            </div>
            <div style={{ maxWidth: 430, justifySelf: "end" }}>
              <p style={{ fontSize: 15.5, lineHeight: 1.5, margin: 0 }}>
                <b style={{ fontWeight: 600, color: "#EDEBE4" }}>Teams building mental-health AI deserve to know exactly what they're testing against.</b>{" "}
                <span style={{ color: "#8C887E" }}>What a benchmark measures — and how far to trust it — is rarely legible.</span>
              </p>
              <p style={{ fontSize: 15.5, lineHeight: 1.5, margin: "14px 0 0", color: "#8C887E" }}>
                That gap costs more than accuracy. It costs knowing whether a model is safe to rely on.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: C.lime, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#CFCCC2", lineHeight: 1.4 }}>MH Benchmarks<br />Research catalog</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 20px" }}>

      {/* Stats + charts */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "48px 0" }}>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap", marginBottom: 32 }}>
          <Stat n={total} label="benchmarks cataloged" />
          <Stat n={rated} label="provisional rigor tier" />
          <Stat n={graded} label="human appraisal grade" />
          <Stat n={runnableCount} label="runnable in-browser" accent />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ChartCard title="Rigor mix" subtitle="provisional">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Donut data={rigorMix} total={total} />
              <Legend items={rigorMix} />
            </div>
          </ChartCard>
          <ChartCard title="Benchmarks by year">
            {yearCounts.length ? <YearBars counts={yearCounts} /> : <ChartEmpty />}
          </ChartCard>
          <ChartCard title="Access (model source)">
            {accessMix.length ? <HBars data={accessMix} /> : <ChartEmpty />}
          </ChartCard>
        </div>
      </section>

      {/* About — the people behind the project */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "60px 0", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: 40 }}>
        <div>
          <SectionLabel>About the project</SectionLabel>
          <div style={{ marginTop: 30 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, marginBottom: 20 }}>
              With support from
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24 }}>
              <Logo src="./logos/mdplus.png" name="MDplus" h={30} color="#0A2472" />
              <Logo src="./logos/stanford.png" name="Stanford" h={50} color="#8C1515" />
              <Logo src="./logos/google.png" name="Google" h={30} />
            </div>
          </div>
        </div>
        <div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1.08, margin: 0 }}>
            Built by medical students, guided by clinicians.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: C.muted, marginTop: 20, maxWidth: 640 }}>
            Everything here — the website, the benchmark-evaluation rubric, and the sorting, naming, and
            runnable-benchmark systems — was created by <b>four medical students</b> through the{" "}
            <b>MDplus Catalysis Fellowship</b>.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: C.muted, marginTop: 14, maxWidth: 640 }}>
            The project is mentored by <b>Dr. Havlik</b> (Stanford) and <b>Dr. Kwon</b>.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "60px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 28 }}>
          <div>
            <SectionLabel>Featured benchmarks</SectionLabel>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 600, letterSpacing: "-.03em", margin: "12px 0 0" }}>Start here</h2>
          </div>
          <button onClick={() => go("catalog")} style={linkBtn}>All benchmarks →</button>
        </div>
        <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10 }}>
          {featured.map((b) => (
            <button key={b.id} onClick={() => go("catalog")} className="edcard" style={{ textAlign: "left", cursor: "pointer", flex: "0 0 300px", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 3, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 7, background: runHrefFor(b) ? C.lime : bandColor(b.id) }} />
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {runHrefFor(b) && (
                  <span style={{ alignSelf: "flex-start", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: C.ink, background: C.lime, borderRadius: 999, padding: "3px 9px" }}>Runnable</span>
                )}
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".07em", textTransform: "uppercase", color: C.muted }}>
                  {[b.venue, b.year].filter(Boolean).join(" · ") || "Benchmark"}
                </div>
                <h3 style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-.02em", margin: 0 }}>{b.displayName || b.name}</h3>
                <div style={{ marginTop: "auto", fontFamily: FONT_MONO, fontSize: 12, color: C.ink }}>
                  {b.sizeNum ? b.sizeNum.toLocaleString() + " items" : deriveCategory(b)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* What it covers — task categories */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "60px 0" }}>
        <SectionLabel>What it covers</SectionLabel>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 600, letterSpacing: "-.03em", margin: "12px 0 28px" }}>Tasks models are tested on</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {CATEGORY_INFO.map((c, i) => (
            <div key={c.name} style={{ border: `1px solid ${C.line}`, borderRadius: 3, padding: 22, background: C.surface }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.accent }}>{String(i + 1).padStart(2, "0")}</div>
              <h3 style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 600, letterSpacing: "-.02em", margin: "10px 0 8px" }}>{c.name}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: C.muted, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it's built — process */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "60px 0" }}>
        <SectionLabel>How the catalog is built</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28, marginTop: 28 }}>
          {[
            { n: "01", t: "Find", d: "A scheduled job scans arXiv, PubMed, and medRxiv for new mental-health LLM papers and skips anything already seen." },
            { n: "02", t: "Extract", d: "Relevant papers are read and their facts pulled into a consistent schema — models, tasks, size, metrics — with a short plain-language summary." },
            { n: "03", t: "Publish & appraise", d: "Confident entries publish automatically; uncertain ones wait for a reviewer. Humans grade benchmark quality by hand." },
          ].map((s) => (
            <div key={s.n}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 42, fontWeight: 600, color: C.line, letterSpacing: "-.03em" }}>{s.n}</div>
              <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, margin: "6px 0 8px", letterSpacing: "-.02em" }}>{s.t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "60px 0" }}>
        <SectionLabel>Questions</SectionLabel>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 600, letterSpacing: "-.03em", margin: "12px 0 22px" }}>Frequently asked</h2>
        <div style={{ borderBottom: `1px solid ${C.line}` }}>
          {FAQS.map((f) => <Accordion key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ borderTop: `1px solid ${C.line}`, padding: "80px 0 48px", textAlign: "center" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 600, letterSpacing: "-.04em", lineHeight: 1.02, margin: "0 auto", maxWidth: 780 }}>
          See how AI is really tested on mental health.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => go("catalog")}>Browse the catalog <ArrowRight size={15} /></PrimaryButton>
          <GhostButton onClick={() => go("method")}>How we rate rigor</GhostButton>
        </div>
      </section>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE 2 — Methodology (dark step-by-step process + draft rubric)
 * ------------------------------------------------------------------ */
// Right-column media per step. Drop copyright-free clips into website/videos/
// and set the path (e.g. "./videos/step1.mp4") to enable video; null shows an
// animated dark panel instead.
const STEP_VIDEOS = [null, null, null, null, null];

function StepMedia({ src }) {
  return (
    <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 6, overflow: "hidden", background: "#0b0a09", border: "1px solid rgba(237,235,228,.12)" }}>
      {src ? (
        <video src={src} autoPlay muted loop playsInline preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div className="herofx" style={{ position: "absolute", inset: 0 }}>
          <b className="s1" /><b className="s2" /><b className="s3" />
        </div>
      )}
    </div>
  );
}

function CritRow({ text, pts, additive }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderTop: `1px solid ${C.line}`, fontSize: 13.5 }}>
      <span style={{ color: C.ink, lineHeight: 1.45 }}>{text}</span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.muted, flexShrink: 0 }}>{additive ? "+" : ""}{pts}</span>
    </div>
  );
}

function RubricDomain({ d }) {
  return (
    <div style={{ padding: "26px 0", borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>{d.name}</h3>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: "#fff", background: C.ink, borderRadius: 999, padding: "3px 10px" }}>{d.weight}%</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>raw {d.range}</span>
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: "12px 0 12px", maxWidth: 660 }}>{d.why}</p>
      {d.groups
        ? d.groups.map((g) => (
            <div key={g.label} style={{ marginTop: 12 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.accent, marginBottom: 2 }}>{g.label}</div>
              {g.items.map(([text, pts], i) => <CritRow key={i} text={text} pts={pts} additive />)}
            </div>
          ))
        : <div>{d.scale.map(([pts, text], i) => <CritRow key={i} text={text} pts={pts} />)}</div>}
    </div>
  );
}

function MethodPage({ go, data }) {
  const example = data.find((b) => b.score.tier) || data.find((b) => b.overallGrade) || data[0];

  const STEPS = [
    { t: "We find the papers", d: "A scheduled job scans arXiv, PubMed, and medRxiv for newly released mental-health LLM papers, and skips anything it has already seen." },
    { t: "We check relevance", d: "A fast, low-cost model reads each title and abstract and keeps only genuine LLM-in-mental-health evaluation work — off-topic papers are dropped with a logged reason." },
    { t: "We extract the facts", d: "The full paper is read into a consistent schema — models tested, tasks, dataset size, metrics, ground truth — with a short plain-language summary. It never guesses; unclear fields stay blank." },
    { t: "We rate rigor — provisionally", d: "A draft five-dimension rubric (construct validity, ground truth, sample size, population realism, transparency) assigns a provisional tier. It's a placeholder until human appraisal is in." },
    { t: "Humans appraise & publish", d: "Reviewers grade benchmark quality by hand. Confident entries publish automatically; uncertain ones wait for a person to approve them before going live." },
  ];

  return (
    <>
      {/* Dark step-by-step process (Monolog "Process" style) */}
      <div style={{ background: "#0C0B0A", color: "#EDEBE4" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 48px" }}>
          <section style={{ padding: "116px 0 8px", maxWidth: 760 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#8C887E", marginBottom: 18 }}>Methodology</div>
            <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: "clamp(38px, 5.5vw, 68px)", lineHeight: 0.98, letterSpacing: "-.04em", margin: 0 }}>How the catalog works</h1>
            <p style={{ fontSize: 16.5, color: "#B7B2A8", lineHeight: 1.6, margin: "22px 0 0" }}>
              Most of the pipeline is ordinary automation; a model is used only where reading and judgment are needed, and people make the final call on quality. Here's each step.
            </p>
          </section>
          <div>
            {STEPS.map((s, i) => (
              <div key={i} className="processrow">
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#8C887E", marginBottom: 22 }}>Step • {String(i + 1).padStart(2, "0")}</div>
                  <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1.05, margin: 0, color: "#EDEBE4" }}>{s.t}</h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#B7B2A8", margin: "18px 0 0", maxWidth: 430 }}>{s.d}</p>
                </div>
                <StepMedia src={STEP_VIDEOS[i]} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rubric detail (light) — the 7-domain weighted methodology */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 24px" }}>
        <section style={{ padding: "56px 0 8px" }}>
          <SectionLabel>The rigor rubric</SectionLabel>
          <h2 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: "clamp(26px, 3.4vw, 42px)", lineHeight: 1.06, letterSpacing: "-.03em", margin: "12px 0 0" }}>
            How we score a benchmark's rigor
          </h2>
          <p style={{ fontSize: 15.5, color: C.muted, lineHeight: 1.6, margin: "18px 0 0", maxWidth: 680 }}>
            The rubric was built from a structured PubMed review of mental-health LLM benchmarks (112 papers
            screened → 40 reviewed) together with the project's focus on clinical utility and patient safety.
            It scores each benchmark across <b>seven weighted domains</b>, deliberately emphasizing <b>safety</b> and
            <b> clinical relevance</b> over raw methodology and scope. Each domain's raw score is normalized and combined
            by weight into a final <b>score from 0 to 100</b> — higher means stronger.
          </p>
        </section>

        {/* Weights at a glance */}
        <section style={{ padding: "8px 0 4px" }}>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, padding: "10px 16px", background: C.ink, color: "#EDE7DA", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>
              <span>Domain</span><span style={{ textAlign: "right" }}>Weight</span><span style={{ textAlign: "right", minWidth: 44 }}>Raw</span>
            </div>
            {RUBRIC_DOMAINS.map((d, i) => (
              <div key={d.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, padding: "10px 16px", background: i % 2 ? C.paper : C.surface, fontSize: 13.5, alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontFamily: FONT_MONO, color: C.ink, textAlign: "right" }}>{d.weight}%</span>
                <span style={{ fontFamily: FONT_MONO, color: C.muted, textAlign: "right", minWidth: 44 }}>{d.range}</span>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, padding: "10px 16px", borderTop: `2px solid ${C.line}`, fontSize: 13.5, fontWeight: 700 }}>
              <span>Total</span><span style={{ fontFamily: FONT_MONO, textAlign: "right" }}>100%</span><span></span>
            </div>
          </div>
        </section>

        {/* Per-domain detail */}
        <section style={{ padding: "20px 0 0" }}>
          {RUBRIC_DOMAINS.map((d) => <RubricDomain key={d.name} d={d} />)}
        </section>

        {/* Scoring formula */}
        <section style={{ padding: "30px 0" }}>
          <h3 style={{ fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 600, letterSpacing: "-.02em", margin: "0 0 10px" }}>Turning raw scores into a 0–100 score</h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: 0, maxWidth: 660 }}>
            Because the domains have different maximum raw scores, each is normalized before combining — so a
            domain's influence comes from its weight, not from how many points it happens to offer.
          </p>
          <div style={{ marginTop: 14, border: `1px solid ${C.line}`, background: C.paper, borderRadius: 8, padding: "14px 16px", fontFamily: FONT_MONO, fontSize: 13, color: C.ink, lineHeight: 1.8 }}>
            weighted<sub>domain</sub> = (raw ÷ max&nbsp;raw) × weight<br />
            final score = Σ weighted<sub>domain</sub>&nbsp;&nbsp;→&nbsp;&nbsp;0 to 100
          </div>
        </section>

        {/* Note + CTA */}
        <section style={{ borderTop: `1px solid ${C.line}`, padding: "22px 0 48px" }}>
          <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`, background: "#F1EADB", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: C.ink, lineHeight: 1.55 }}>
            <strong style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: ".06em" }}>NOTE</strong>
            <span style={{ marginLeft: 8 }}>Scores under this rubric are assigned by expert review. The provisional Strong / Moderate / Limited badges on the cards are an automatic estimate and will be replaced by this rubric's 0–100 score as scoring is completed.</span>
          </div>
          <div style={{ marginTop: 20 }}>
            <GhostButton onClick={() => go("catalog")}>See the benchmarks <ArrowRight size={14} /></GhostButton>
          </div>
        </section>
      </div>
    </>
  );
}

function TierWord({ t }) {
  return <span style={{ color: TIER[t].color, fontWeight: 600 }}>{TIER[t].label}</span>;
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

const linkBtn = { border: "none", background: "transparent", color: C.brand, fontWeight: 600, fontSize: "inherit", cursor: "pointer", padding: 0, fontFamily: "inherit" };

/* ------------------------------------------------------------------ *
 *  PAGE 3 — Catalog (flat, searchable, sortable)
 * ------------------------------------------------------------------ */
function CatalogPage({ data, error }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name"); // name | year | rigor | size
  const [catFilter, setCatFilter] = useState(null); // null = all categories
  const [selected, setSelected] = useState(null);
  const [showRigor, setShowRigor] = useState(true); // toggle the rigor rating display

  const q = query.trim().toLowerCase();

  // Task tags present in the data, shown in the taxonomy order (menu = "filter by category").
  const categories = useMemo(() => {
    const present = new Set();
    data.forEach((b) => (b.tasks || []).forEach((t) => present.add(t)));
    const ordered = TASK_ORDER.filter((t) => present.has(t));
    const extra = [...present].filter((t) => !TASK_ORDER.includes(t)).sort();
    return [...ordered, ...extra];
  }, [data]);

  const visible = useMemo(() => {
    let rows = data;
    if (catFilter) rows = rows.filter((b) => (b.tasks || []).includes(catFilter));
    if (q) {
      rows = rows.filter((b) =>
        [b.name, b.measures, b.authors, b.groundTruth, b.population, b.venue]
          .some((v) => (v || "").toLowerCase().includes(q)));
    }
    const arr = [...rows];
    arr.sort((a, b) => {
      if (sort === "year") return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      if (sort === "size") return (b.sizeNum || 0) - (a.sizeNum || 0);
      if (sort === "rigor") {
        const ra = a.score.tier ? tierRank[a.score.tier] : 9;
        const rb = b.score.tier ? tierRank[b.score.tier] : 9;
        return ra - rb;
      }
      return (a.name || "").localeCompare(b.name || "");
    });
    return arr;
  }, [data, q, sort, catFilter]);

  const rated = data.filter((b) => b.score.tier).length;
  const graded = data.filter((b) => b.overallGrade).length;

  return (
    <div style={{ background: ED.bg, color: ED.ink, fontFamily: ED.body }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 76px" }}>
      {/* Header — big title + count on the right (Monolog "All success stories") */}
      <header style={{ padding: "40px 0 24px", borderBottom: `1px solid ${ED.line}`, marginBottom: 34 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: ED.muted, marginBottom: 22 }}>
          Mental-health LLM benchmarks
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: ED.display, fontWeight: 600, fontSize: "clamp(46px, 8vw, 94px)", lineHeight: 0.94, letterSpacing: "-.04em", margin: 0, color: ED.ink }}>
            All benchmarks
          </h1>
          <span style={{ fontFamily: ED.display, fontWeight: 500, fontSize: "clamp(32px, 5vw, 58px)", letterSpacing: "-.03em", color: ED.ink, lineHeight: 1 }}>
            ({String(visible.length).padStart(2, "0")})
          </span>
        </div>
      </header>

      {error && (
        <div style={{ border: `1px solid ${C.limited}`, background: "#F6E7DF", borderRadius: 4, padding: "10px 14px", fontSize: 13, color: C.ink, marginBottom: 20 }}>
          Couldn't load benchmarks.json ({error}). Make sure the export script has been run and the file sits next to index.html.
        </div>
      )}

      {/* Two columns: left vertical filter + controls, right horizontal tile gallery */}
      <div className="catlayout">
        <aside style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: ED.ink, display: "inline-block" }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: ED.ink }}>Filter by category</span>
          </div>
          <VChip label="All Projects" on={!catFilter} onClick={() => setCatFilter(null)} />
          {categories.map((c) => (
            <VChip key={c} label={c} on={catFilter === c} onClick={() => setCatFilter(catFilter === c ? null : c)} />
          ))}

          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={14} color={ED.muted} style={{ position: "absolute", left: 12, top: 11 }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
                style={{ width: "100%", padding: "9px 12px 9px 32px", fontFamily: ED.body, fontSize: 13.5, border: `1px solid ${ED.line}`, borderRadius: 4, background: ED.card, color: ED.ink, boxSizing: "border-box" }} />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontFamily: ED.body, fontSize: 13.5, padding: "9px 12px", border: `1px solid ${ED.line}`, borderRadius: 4, background: ED.card, color: ED.ink, cursor: "pointer" }}>
              <option value="name">Sort: Name (A–Z)</option>
              <option value="year">Sort: Year (newest)</option>
              <option value="rigor">Sort: Rigor (best first)</option>
              <option value="size">Sort: Size (largest)</option>
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ED.body, fontSize: 13, color: ED.muted, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={showRigor} onChange={(e) => setShowRigor(e.target.checked)} />
              Show rigor rating
            </label>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24, rowGap: 34 }}>
            {visible.map((b) => (
              <BenchTile key={b.id} b={b} showRigor={showRigor} onClick={() => setSelected(b)} />
            ))}
          </div>
          {visible.length === 0 && !error && (
            <div style={{ textAlign: "center", color: ED.muted, padding: "48px 20px", border: `1px dashed ${ED.line}`, borderRadius: 4, background: ED.card }}>
              <Search size={26} color={C.unrated} />
              <div style={{ fontSize: 15, fontWeight: 600, color: ED.ink, marginTop: 10 }}>No matches</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search term or clear the category filter.</div>
            </div>
          )}
        </div>
      </div>

      {selected && <Detail b={selected} showRigor={showRigor} onClose={() => setSelected(null)} />}
    </div>
    </div>
  );
}

// Vertical filter chip (left rail) — light chip, active is solid ink.
function VChip({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      alignSelf: "flex-start", fontFamily: ED.body, fontSize: 15, fontWeight: 500, cursor: "pointer",
      color: on ? "#fff" : ED.ink, background: on ? ED.ink : "rgba(8,8,7,0.06)",
      border: "none", borderRadius: 5, padding: "8px 15px", textAlign: "left", lineHeight: 1.2,
    }}>{label}</button>
  );
}

// Tall gallery tile — a color "cover" (stands in for Monolog's photo) + meta below.
function BenchTile({ b, showRigor, onClick }) {
  const cat = (b.tasks && b.tasks[0]) || deriveCategory(b);
  const condTag = { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", color: ED.ink, background: "rgba(8,8,7,0.07)", borderRadius: 999, padding: "3px 9px" };
  const taskTag = { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", color: ED.muted, border: `1px solid ${ED.line}`, borderRadius: 999, padding: "3px 9px" };
  const band = showRigor && b.score.tier ? TIER[b.score.tier].color : bandColor(b.id);
  const runnable = !!runHrefFor(b);
  const onDark = runnable ? C.ink : "#F3F1EA";
  return (
    <button onClick={onClick} className="edtile" style={{
      width: "100%", textAlign: "left", cursor: "pointer", background: "transparent",
      border: "none", padding: 0, display: "flex", flexDirection: "column", gap: 15,
    }}>
      <div style={{ height: 320, borderRadius: 4, background: runnable ? C.lime : band, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", color: onDark, opacity: 0.9 }}>{cat}</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            {showRigor && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", color: "#F3F1EA", background: "rgba(8,8,7,0.34)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: b.score.tier ? TIER[b.score.tier].color : "rgba(243,241,234,.55)" }} />
                {b.score.tier ? TIER[b.score.tier].label : "Unrated"}
              </span>
            )}
            {runnable && (
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: C.ink, border: `1px solid ${C.ink}`, borderRadius: 999, padding: "2px 9px" }}>Run</span>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 46, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 0.95, color: onDark }}>
            {b.sizeNum ? b.sizeNum.toLocaleString() : (b.year || "—")}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: onDark, opacity: 0.85, marginTop: 8 }}>
            {b.sizeNum ? "items" : (b.venue || "benchmark")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h3 style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.15, margin: 0, color: ED.ink }}>{b.displayName || b.name}</h3>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: ED.muted, flexShrink: 0 }}>{b.year}</span>
      </div>
      {(b.conditions.length > 0 || b.tasks.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {b.conditions.map((t) => <span key={"c" + t} style={condTag}>{t}</span>)}
          {b.tasks.map((t) => <span key={"t" + t} style={taskTag}>{t}</span>)}
        </div>
      )}
      {b.measures && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: ED.muted }}>{b.measures}</p>}
      <span className="edarrow" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ED.body, fontSize: 13.5, fontWeight: 600, color: ED.ink }}>
        View benchmark <span>→</span>
      </span>
    </button>
  );
}

function FilterChip({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: ED.body, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
      color: on ? "#fff" : ED.muted, background: on ? ED.ink : "transparent",
      border: `1px solid ${on ? ED.ink : ED.line}`, borderRadius: 999, padding: "6px 14px",
    }}>{label}</button>
  );
}

function BenchRow({ b, showRigor, onClick }) {
  const cat = deriveCategory(b);
  const band = showRigor && b.score.tier ? TIER[b.score.tier].color : bandColor(b.id);
  const tags = [cat, b.source, b.turn].filter(Boolean);
  const pill = {
    fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
    color: ED.muted, border: `1px solid ${ED.line}`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap",
  };
  return (
    <button onClick={onClick} className="edrow" style={{
      width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", border: "none",
      borderTop: `1px solid ${ED.line}`, padding: "26px 8px", display: "grid",
      gridTemplateColumns: "12px 1fr auto", gap: 22, alignItems: "start",
    }}>
      <span style={{ width: 11, height: 11, borderRadius: 2, background: band, marginTop: 9 }} />
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 600, letterSpacing: "-.025em", lineHeight: 1.1, margin: 0, color: ED.ink }}>{b.name}</h3>
          {runHrefFor(b) && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: C.ink, background: C.lime, borderRadius: 999, padding: "3px 9px" }}>Runnable</span>
          )}
        </div>
        {b.measures && <p style={{ margin: "9px 0 0", fontSize: 14.5, lineHeight: 1.5, color: ED.muted, maxWidth: 640 }}>{b.measures}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {tags.map((t) => <span key={t} style={pill}>{t}</span>)}
          {showRigor && b.overallGrade && (
            <span style={{ ...pill, color: "#fff", background: ED.ink, borderColor: ED.ink }}>Grade {b.overallGrade}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, minWidth: 84 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: ED.muted }}>{b.year || ""}</span>
        <span className="edarrow" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ED.body, fontSize: 13.5, fontWeight: 600, color: ED.ink }}>
          View <span>→</span>
        </span>
      </div>
    </button>
  );
}

function BenchCard({ b, showRigor, onClick }) {
  const band = showRigor && b.score.tier ? TIER[b.score.tier].color : bandColor(b.id);
  const tags = [b.source, b.turn].filter(Boolean);
  const tagStyle = {
    fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
    color: ED.muted, border: `1px solid ${ED.line}`, borderRadius: 999, padding: "3px 10px",
  };
  return (
    <button onClick={onClick} className="edcard" style={{
      textAlign: "left", cursor: "pointer", background: ED.card, border: `1px solid ${ED.line}`,
      borderRadius: 8, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{ height: 7, background: band }} />
      <div style={{ padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", color: ED.muted }}>
          {[b.venue, b.year].filter(Boolean).join(" · ") || "Benchmark"}
        </div>
        <h3 style={{ fontFamily: ED.display, fontSize: 21, fontWeight: 600, lineHeight: 1.12, letterSpacing: "-.02em", margin: 0, color: ED.ink }}>
          {b.name}
        </h3>
        {b.measures && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: ED.muted }}>{b.measures}</p>}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2 }}>
          {tags.map((t) => <span key={t} style={tagStyle}>{t}</span>)}
          {showRigor && b.overallGrade && (
            <span style={{ ...tagStyle, color: "#fff", background: ED.ink, borderColor: ED.ink }}>Grade {b.overallGrade}</span>
          )}
        </div>
        <div className="edarrow" style={{ marginTop: "auto", paddingTop: 10, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ED.body, fontSize: 13.5, fontWeight: 600, color: ED.ink }}>
          View benchmark <span>→</span>
        </div>
      </div>
    </button>
  );
}

function Detail({ b, showRigor, onClose }) {
  const rows = [
    ["Authors / institutions", b.authors],
    ["Venue", b.venue],
    ["Year", b.year],
    ["Access (model source)", b.source || b.sourceRaw],
    ["Ground truth", b.groundTruth],
    ["Size", b.size],
    ["What it assesses", b.measures],
    ["Clinical use case", b.clinicalUseCase],
    ["Population", b.population],
    ["Language(s)", b.language],
    ["# domains", b.numDomains],
    ["Interaction", b.turn || b.turnRaw],
    ["Evaluation method", b.evaluation],
    ["# LLMs assessed", b.numLLMs],
    ["Construct validity (human)", b.constructValidity],
    ["Overall grade (human)", b.overallGrade],
  ].filter(([k, v]) => v && (showRigor || !["Construct validity (human)", "Overall grade (human)"].includes(k)));

  const runHref = runHrefFor(b); // module-level map

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,32,28,0.44)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 100%)", maxHeight: "90vh", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 6, boxShadow: "0 24px 60px rgba(8,8,7,0.30)", overflowY: "auto", padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            {showRigor && <RigorBadge score={b.score} />}
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.1, margin: "8px 0 0" }}>{b.displayName || b.name}</h2>
            {b.displayName && b.displayName !== b.name && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>{b.name}</div>
            )}
            {(b.conditions?.length > 0 || b.tasks?.length > 0) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {b.conditions.map((t) => <span key={"c" + t} style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", color: C.ink, background: "rgba(8,8,7,0.07)", borderRadius: 999, padding: "3px 10px" }}>{t}</span>)}
                {b.tasks.map((t) => <span key={"t" + t} style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", color: C.muted, border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 10px" }}>{t}</span>)}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {showRigor && !b.score.tier && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: C.muted, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 12px" }}>
            Unrated — fewer than {MIN_KNOWN} rubric dimensions have data in the sheet yet.
          </div>
        )}

        <div style={{ marginTop: 16, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: i % 2 ? C.paper : C.surface, fontSize: 13 }}>
              <span style={{ color: C.muted, flexShrink: 0, maxWidth: 170 }}>{k}</span>
              <span style={{ fontFamily: FONT_MONO, color: C.ink, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        {runHref && (
          <a href={runHref} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, color: C.ink, background: C.lime, padding: "13px 16px", borderRadius: 999, textDecoration: "none" }}>
            ▶ Run this benchmark
          </a>
        )}

        {b.paperLink && (
          <a href={b.paperLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: runHref ? 10 : 18, fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: runHref ? C.ink : "#fff", background: runHref ? C.paper : C.brand, border: runHref ? `1px solid ${C.line}` : "none", padding: "10px 16px", borderRadius: 9, textDecoration: "none" }}>
            View source paper <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
