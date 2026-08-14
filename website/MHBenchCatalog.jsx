import React, { useState, useMemo, useEffect, useRef } from "react";
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
  paper: "#EBEBEB",      // off-white grey — page background (matches catalog)
  surface: "#E2E2E2",    // neutral grey — cards / surfaces
  ink: "#080807",        // black-400 — primary text
  muted: "#66666B",      // neutral grey — secondary text
  line: "#CFCFCF",       // neutral grey — hairline borders
  brand: "#080807",      // primary = ink (buttons, nav)
  accent: "#080807",     // emphasis = ink (monochrome, like Monolog)
  lime: "#EF9043",       // signature accent (amber-orange; use with dark text — was neon lime)
  dark: "#181715",       // card-bg — dark surfaces (footer)
  strong: "#3C6E5A",
  moderate: "#8A6D3B",
  limited: "#B5502E",
  unrated: "#938F8A",    // black-50
};

// Site fonts: Lexend for titles/display, EB Garamond for body text,
// Space Mono for labels/metadata.
const FONT_SANS = "'Cairo', 'Segoe UI', system-ui, sans-serif"; // body
const FONT_SERIF = "'Lexend', 'Segoe UI', system-ui, sans-serif";     // display/headings
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
  bg: "#1C4773",                   // catalog canvas — solid dark navy
  card: "#DEEBF7",                 // benchmark tiles — light blue
  ink: "#EDEBE4",                  // on-canvas text (bone)
  muted: "#B9CDDE",                // on-canvas secondary text
  line: "rgba(237,235,228,.16)",   // hairlines on the dark canvas
  cardInk: "#1C4773",              // on-tile text — dark navy titles
  cardMuted: "#66666B",            // on-tile secondary text
  display: "'Lexend', 'Segoe UI', system-ui, sans-serif",
  body: "'Cairo', 'Segoe UI', system-ui, sans-serif",
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
  if (/crisis|suicid|self-harm|self harm|\bharm\b|\brisk\b/.test(t)) return "Crisis Response";
  if (/bias|equit|fair|demograph|hallucinat|safety/.test(t)) return "Safety & Bias";
  if (/treat|medicat|prescri|interven/.test(t)) return "Treatment";
  if (/psychotherap|counsel|\btherap|motivational interview/.test(t)) return "Counseling";
  if (/diagnos|reason/.test(t)) return "Diagnosis";
  if (/document|extract|record|note/.test(t)) return "Clinical Documentation";
  if (/screen|detect|classif|identif|predict|emotion|sentiment|affect/.test(t)) return "Symptom Detection";
  if (/exam|\bmcq\b|knowledge|board|\bqa\b|question/.test(t)) return "Knowledge";
  return "General";
}

// Task taxonomy shown on the landing "what it covers" grid and used as the
// catalog's category filter. Data files may still carry the original long
// names (scripts/generate_names.py TASK_CRITERIA); TASK_RENAME maps them to
// the short display taxonomy at load time.
const TASK_RENAME = {
  "Risk & Crisis Response": "Crisis Response",
  "Safety, Bias & Robustness": "Safety & Bias",
  "Diagnostic Reasoning": "Diagnosis",
  "Symptom Detection & Severity Assessment": "Symptom Detection",
  "Therapeutic Conversation & Counseling": "Counseling",
  "Patient Communication & Education": "Patient Communication",
  "Clinical Documentation & Extraction": "Clinical Documentation",
  "Knowledge & Board Exams": "Knowledge",
};
const CATEGORY_INFO = [
  { name: "Crisis Response", desc: "Evaluates whether a model can recognize suicide, self-harm, and acute crisis, and respond safely with appropriate triage and escalation." },
  { name: "Safety & Bias", desc: "Probes for bias, hallucination, and the reliability of safety guardrails under adversarial or edge-case conditions." },
  { name: "Diagnosis", desc: "Assesses clinical reasoning from a case presentation through to a diagnosis, differential, or formulation." },
  { name: "Symptom Detection", desc: "Measures how accurately a model infers the presence and severity of symptoms from speech, interviews, or written text." },
  { name: "Treatment", desc: "Assesses treatment planning and management decisions, from intervention selection to medication and follow-up recommendations." },
  { name: "Counseling", desc: "Evaluates the quality and appropriateness of multi-turn counseling and psychotherapeutic dialogue." },
  { name: "Patient Communication", desc: "Evaluates the accuracy, reliability, and readability of patient-facing explanations and educational responses." },
  { name: "Clinical Documentation", desc: "Tests classification and information extraction from real-world clinical records and documentation." },
  { name: "Knowledge", desc: "Assesses declarative clinical knowledge through multiple-choice, OSCE, and board-style examination items." },
];
const TASK_ORDER = CATEGORY_INFO.map((c) => c.name);

// One muted, editorial color per task category — used for the card poster so the
// catalog reads as color-coded by category. Tuned to sit on the beige page and
// carry light text.
const CATEGORY_COLORS = {
  "Crisis Response": "#B4553E",        // rust
  "Safety & Bias": "#8A5560",          // mauve
  "Diagnosis": "#4F7183",              // dusty blue
  "Symptom Detection": "#8F6E2E",      // ochre
  "Treatment": "#7D5378",              // plum
  "Counseling": "#5F7A55",             // moss
  "Patient Communication": "#3F7E74",  // teal
  "Clinical Documentation": "#8A6D4B", // coffee
  "Knowledge": "#6B6191",              // indigo
};
const CATEGORY_COLOR_FALLBACK = "#6E6A62"; // neutral warm grey (uncategorized)
function categoryColor(b) {
  const c = (b.tasks && b.tasks[0]) || deriveCategory(b);
  return CATEGORY_COLORS[c] || CATEGORY_COLOR_FALLBACK;
}
// Pick readable text (dark ink vs light paper) for a given hex background.
function readableOn(hex) {
  const c = String(hex).replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), bl = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * bl) > 150 ? C.ink : "#F3F1EA";
}

// The Three-Score Benchmark Evaluation Framework (Benchmark Evaluation
// Methodology 2.0). Each benchmark receives three INDEPENDENT tiered ratings —
// Safety, Clinical Relevance, and Methodological Quality — each Strong / Moderate
// / Weak. There is no single composite score. `tiers` = Strong/Moderate/Weak
// descriptions; `criteria` = additive checklist points; `scale` = pick-one levels.
const RUBRIC_SCORES = [
  {
    name: "Safety",
    question: "Does it test for patient harm?",
    short: "Whether the benchmark probes crisis recognition, safe clinical responses, and bias, plus technical risks like hallucination, robustness, and privacy.",
    purpose: "The Safety rating evaluates how well a benchmark assesses an LLM's ability to recognize, avoid, and appropriately respond to behaviors that could result in patient harm. Rather than measuring overall model capability, this domain focuses specifically on whether the benchmark evaluates clinically and technically important safety risks relevant to mental-health applications. Benchmarks receiving higher safety ratings provide a more comprehensive assessment of potential harmful model behaviors and patient-safety considerations.",
    tiers: [
      ["Strong", "Comprehensive evaluation of clinically and technically important safety risks. The benchmark assesses multiple dimensions of patient safety, including high-risk clinical scenarios and broader model-safety behaviors such as reliability, hallucinations, robustness, bias, or privacy."],
      ["Moderate", "Evaluates several important safety concepts but with limited breadth or depth. The benchmark assesses some clinically or technically relevant safety risks but does not provide comprehensive safety coverage."],
      ["Weak", "Minimal or no explicit evaluation of patient safety. The benchmark primarily measures general model performance without assessing clinically or technically important safety risks."],
    ],
    criteria: [
      { label: "Clinical safety (0-3)", items: [
        ["Evaluates recognition of crisis or high-risk mental-health situations", 1],
        ["Evaluates the appropriateness and safety of the model's clinical response, including treatment recommendations, escalation of care, referral to appropriate resources, and avoidance of harmful or unsafe guidance", 1],
        ["Evaluates demographic, racial, cultural, or other clinically relevant bias", 1],
      ] },
      { label: "Functional safety (0-4)", items: [
        ["Evaluates reliability or consistency across repeated / similar queries", 1],
        ["Evaluates hallucinations or fabricated information (unsupported or incorrect generated content, not merely flawed reasoning)", 1],
        ["Evaluates robustness to adversarial, misleading, or boundary-testing inputs", 1],
        ["Evaluates privacy, confidentiality, or inappropriate information disclosure", 1],
      ] },
    ],
  },
  {
    name: "Clinical Relevance",
    question: "Is it relevant to real care?",
    short: "Whether the benchmark reflects real clinical work and patient interaction rather than textbook mental-health knowledge.",
    purpose: "The Clinical Relevance rating evaluates the extent to which a benchmark measures capabilities that are directly applicable to real-world mental-health care. The purpose is not simply to determine whether a benchmark measures psychiatric knowledge, but whether it evaluates performance in clinically meaningful settings. Higher ratings are assigned to benchmarks that assess realistic psychiatric workflows, patient interactions, clinical reasoning, diagnosis, treatment recommendations, therapeutic responses, or other tasks directly relevant to patient care.",
    tiers: [
      ["Strong", "Evaluates performance within realistic clinical workflows, patient interactions, or decision-making involving multiple clinically relevant psychiatric tasks. Demonstrates clear patient-centered utility and reflects real-world mental-health care."],
      ["Moderate", "Evaluates a single clinically relevant task, such as diagnosis, risk assessment, treatment selection, therapeutic response, or another individual component of psychiatric care."],
      ["Weak", "Primarily evaluates theoretical psychiatric or mental-health knowledge without a clear connection to real-world clinical practice or patient care."],
    ],
  },
  {
    name: "Methodological Quality",
    question: "Can the results be trusted?",
    short: "The scientific rigor of the design: ground-truth quality, evaluation method, population represented, and interaction structure.",
    purpose: "The Methodological Quality rating evaluates the scientific rigor and overall trustworthiness of a benchmark. Rather than assessing the clinical content itself, this domain evaluates the quality of the benchmark's design, development, and evaluation methodology, including the quality of the ground truth, the evaluation method, the representativeness of the population, and the interaction structure.",
    tiers: [
      ["Strong", "High-quality ground truth, an appropriate and rigorous evaluation method, a representative population, and a suitable interaction structure. The design supports trustworthy, reproducible conclusions across the sub-scales below."],
      ["Moderate", "Generally sound methodology with some limitations across the sub-scales, such as a narrower population, a partially unclear evaluation process, or ground truth from a single expert."],
      ["Weak", "Notable methodological weaknesses — unclear or LLM-generated ground truth, an unvalidated evaluation method, or an unrepresentative population — that limit how far the results can be trusted."],
    ],
    subScales: [
      { label: "Ground-truth quality", why: "Evaluates the quality and credibility of the reference standard used to judge model performance.", scale: [
        [3, "Independent multi-expert consensus (2+ experts)"],
        [2, "Qualified study team or individual qualified expert"],
        [1, "Existing reference dataset with documented provenance"],
        [0, "LLM-generated or unclear ground truth without expert validation"],
      ] },
      { label: "Evaluation method — objective benchmarks", why: "Evaluates whether objective benchmarks (e.g. MCQ or classification tasks) use an appropriate and transparent scoring methodology.", scale: [
        [3, "Appropriate deterministic scoring using a validated answer key"],
        [2, "Mostly objective scoring with minor methodological limitations"],
        [1, "Evaluation process partially unclear"],
        [0, "Inappropriate or poorly described evaluation method"],
      ] },
      { label: "Evaluation method — conversational / open-ended", why: "Evaluates the quality and rigor of the process used to assess subjective LLM responses.", scale: [
        [3, "Multiple qualified human reviewers with a rubric and agreement / adjudication"],
        [2, "One qualified human reviewer"],
        [1, "Validated LLM judge calibrated against human reviewers"],
        [0, "Unvalidated LLM judge or unclear scoring process"],
      ] },
      { label: "Population represented", why: "Evaluates how well the benchmark population reflects real-world psychiatric populations.", scale: [
        [3, "Diverse real clinical population with complex cases or multisite representation"],
        [2, "Real patient-derived data from a narrower clinical population"],
        [1, "Curated or simulated psychiatric cases"],
        [0, "Population unspecified or entirely generic / synthetic personas"],
      ] },
      { label: "Interaction structure", why: "Evaluates whether the benchmark appropriately assesses context-dependent interactions.", scale: [
        [1, "Includes genuine multi-turn interactions when appropriate"],
        [0, "Single-turn only"],
      ] },
    ],
  },
];

// Tier colors for the three-score ratings.
const TIER_COLORS = { Strong: "#3C6E5A", Moderate: "#8A6D3B", Weak: "#B5502E" };

/* ------------------------------------------------------------------ *
 *  LAUNCH SWITCHBOARD — controls which sections ship in the current
 *  release. Parked sections stay fully working in this file; flip a
 *  value from false to true to bring one back in a later launch.
 * ------------------------------------------------------------------ */
const LAUNCH = {
  rateRigorHeroButton: false, // landing hero: "How we rate rigor" button
  methodRubric: false,        // methodology page: "How we rate a benchmark" rubric section
  heroStat: false,            // landing hero: "39+ benchmarks catalogued" bottom stat
  ratings: false,             // rating features: card rating chips, Ratings toggle, rating sort, rigor FAQ/banner copy
  tasksType: false,           // landing: "Tasks models are tested on" category grid
  howItsBuilt: false,         // landing: "How the catalog is built" 3-step section
};

// FAQ content (from PLAN.md / TEAM-SUMMARY.md).
const FAQS = [
  { q: "What is this catalog?", a: "A curated, growing index of benchmarks used to evaluate large language models on clinical mental-health tasks: what each one measures, how it was built, and how rigorous it looks. It's drawn from our team's research sheet and kept current by an automated find → filter → extract pipeline with human review." },
  ...(LAUNCH.ratings ? [{ q: "How are the rigor tiers computed?", a: "They're provisional, from a draft five-dimension rubric: construct validity, ground-truth quality, sample size, population realism, and transparency. A tier is only assigned when at least three dimensions have data; otherwise a benchmark is shown as Unrated. Human appraisal will eventually replace the automatic tiers." + (LAUNCH.methodRubric ? " See the Rubric page." : "") }] : []),
  { q: "Can I run a benchmark myself?", a: "Yes. A few benchmarks have a “Run this benchmark” button. You bring your own API key (OpenAI or Anthropic), the test runs entirely in your browser, your key is never stored or sent to us, and you see your model's score. More benchmarks become runnable over time, one at a time." },
  { q: "Where does the data come from?", a: "New papers are found automatically from arXiv, PubMed, and medRxiv, filtered for relevance, and their facts extracted into a consistent schema. Quality appraisal is done by human reviewers, not the machine." },
  { q: "What does it cost to run a benchmark?", a: "Only your own model API usage, typically a few cents for a small sample, since you choose how many items to run. The catalog itself is free to browse." },
  { q: "Is this a clinical tool?", a: "No. It's a research catalog. Any runnable benchmark is a recreation for model evaluation only, not a diagnostic tool and not medical advice." },
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
  { id: "catalog", label: "Catalog", hash: "#/catalog" },
  { id: "method", label: "Methodology", hash: "#/method" },
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
const USER_KEY = "mhbench_user_v1";   // stores the visitor's name/email locally
const TERMS_OWNER = "the MDplus Catalysis Fellowship team"; // TODO: confirm the copyright/IP owner
const TERMS_CONTACT = "[contact email]";                    // TODO: add a contact email
const TERMS_JURISDICTION = "";                              // e.g. "the State of California, USA" (blank hides it)

/* Admins: sharing this passcode lets the 4 admins skip the terms + email form.
 * NOTE: this lives in the page source, so treat it as a soft gate, not real
 * security. Change ADMIN_CODE (and bump TERMS_KEY) if it ever leaks. */
const ADMIN_CODE = "MDPLUS4";

/* Optional access log. Leave "" to store name/email only in the visitor's own
 * browser (nothing sent anywhere). To turn on real logging later, paste a
 * Google Apps Script web-app URL or a Formspree/Getform endpoint here — it will
 * receive { name, email, time, userAgent } as JSON on each acceptance. */
const LOG_ENDPOINT = "";

function logAccess(entry) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(entry)); } catch (e) { /* ignore */ }
  if (!LOG_ENDPOINT) return;
  try {
    fetch(LOG_ENDPOINT, {
      method: "POST",
      // no-cors keeps it simple for Google Apps Script / form endpoints; we
      // don't read the response, we just fire-and-forget the log row.
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  } catch (e) { /* ignore — never block access on a logging failure */ }
}

function AgreementGate({ onAccept }) {
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminErr, setAdminErr] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = name.trim().length > 1;
  const canEnter = checked && nameOk && emailOk;

  const accept = () => {
    if (!canEnter) return;
    logAccess({
      name: name.trim(),
      email: email.trim(),
      time: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
    try { localStorage.setItem(TERMS_KEY, "yes"); } catch (e) { /* ignore */ }
    onAccept();
  };

  const adminEnter = () => {
    if (adminCode.trim() === ADMIN_CODE) {
      try {
        localStorage.setItem(TERMS_KEY, "yes");
        localStorage.setItem(USER_KEY, JSON.stringify({ admin: true, time: new Date().toISOString() }));
      } catch (e) { /* ignore */ }
      onAccept();
    } else {
      setAdminErr(true);
    }
  };

  const field = { width: "100%", background: "rgba(237,235,228,.06)", border: "1px solid rgba(237,235,228,.2)", borderRadius: 8, padding: "11px 13px", color: "#EDEBE4", fontFamily: FONT_SANS, fontSize: 14, outline: "none" };
  const flabel = { fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#B9CDDE", marginBottom: 6, display: "block" };
  const hasContact = TERMS_CONTACT && TERMS_CONTACT[0] !== "[";
  const h3 = { fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 400, color: "#EDEBE4", margin: "0 0 6px", letterSpacing: "-.01em" };
  const p = { fontSize: 13, lineHeight: 1.6, color: "#B7B2A8", margin: 0 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#1C4773", color: "#EDEBE4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "32px 20px" }}>
      <div className="herofx" aria-hidden="true"><b className="s1" /><b className="s2" /><b className="s3" /><b className="s4" /></div>
      <div style={{ position: "relative", width: "min(640px, 100%)", background: "rgba(18,17,13,.74)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(237,235,228,.14)", borderRadius: 8, padding: "clamp(24px, 4vw, 40px)", maxHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#B9CDDE", marginBottom: 14 }}>Confidential Beta · Access Agreement</div>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 400, fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.03em", lineHeight: 1.02, margin: 0 }}>Before you enter</h1>
        <p style={{ fontSize: 14, color: "#B7B2A8", lineHeight: 1.55, margin: "14px 0 0" }}>
          Access to this site is by invitation only and subject to the terms below. Please read them before continuing.
        </p>
        <div style={{ marginTop: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, borderTop: "1px solid rgba(237,235,228,.12)", borderBottom: "1px solid rgba(237,235,228,.12)", padding: "18px 8px 18px 0" }}>
          <div>
            <div style={h3}>1 · Confidential, invitation-only access</div>
            <p style={p}>This website and all of its contents, including the benchmark catalog, evaluation rubric and scores, methodology, compiled data, and any unpublished materials (collectively, the “Confidential Materials”), are provided to you on a strictly confidential, invitation-only basis. By accessing the site you agree to (a) hold the Confidential Materials in strict confidence; (b) not disclose, publish, present, distribute, screenshot, reproduce, or otherwise share them, in whole or in part, with any third party; and (c) use them solely to review and provide feedback on this project. These obligations continue until the materials are released publicly by the project owners in writing.</p>
          </div>
          <div>
            <div style={h3}>2 · Work in progress; no warranty; not medical advice</div>
            <p style={p}>This is an early-stage, in-development prototype provided “AS IS” and “AS AVAILABLE,” without warranties of any kind, whether express or implied, including any warranty of accuracy or fitness for a particular purpose. Content is preliminary and may be incomplete, inaccurate, or changed or removed at any time without notice. Nothing on this site is medical, clinical, psychiatric, diagnostic, or professional advice, and it must not be used to make clinical or treatment decisions; it is not a medical device. If you or someone else may be in crisis, contact local emergency services or a crisis line (in the U.S., call or text 988). To the maximum extent permitted by law, the project owners and their affiliated individuals and institutions disclaim all liability arising from your access to or use of the site.</p>
          </div>
          <div>
            <div style={h3}>3 · Copyright &amp; intellectual property</div>
            <p style={p}>© 2026 {TERMS_OWNER}. All rights reserved. All original content, source code, design, text, the evaluation rubric, and compiled data are the intellectual property of their respective owners and are protected by copyright and other laws. You may not copy, reproduce, distribute, modify, create derivative works from, data-mine, scrape, or reverse-engineer any part of the site without prior written permission. Third-party materials referenced in the catalog, including research papers, datasets, model names, and the names, trademarks, and logos of third parties (such as MDplus, Stanford, and Google), remain the property of their respective owners and are used for identification and reference only; no affiliation, sponsorship, or endorsement is implied.</p>
          </div>
          <div>
            <div style={h3}>4 · Acceptance</div>
            <p style={p}>By checking the box below and selecting “I accept &amp; enter,” you acknowledge that you have read, understood, and agree to be bound by these terms{TERMS_JURISDICTION ? `, which are governed by the laws of ${TERMS_JURISDICTION}` : ""}. If you do not agree, do not access or use the site.{hasContact ? ` Questions: ${TERMS_CONTACT}.` : ""}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
          <div>
            <label style={flabel} htmlFor="gate-name">Your name</label>
            <input id="gate-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" style={field} />
          </div>
          <div>
            <label style={flabel} htmlFor="gate-email">Your email</label>
            <input id="gate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={field} />
          </div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, cursor: "pointer", fontSize: 13.5, color: "#EDEBE4", lineHeight: 1.5 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I have read and accept the confidentiality agreement, the work-in-progress disclaimer, and the copyright &amp; intellectual-property terms above.</span>
        </label>
        <div style={{ marginTop: 18 }}>
          <button onClick={accept} disabled={!canEnter} style={{ background: canEnter ? C.lime : "rgba(237,235,228,.15)", color: canEnter ? C.ink : "rgba(237,235,228,.5)", border: "none", borderRadius: 999, padding: "12px 28px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: canEnter ? "pointer" : "not-allowed" }}>
            I accept &amp; enter →
          </button>
        </div>
        <div style={{ marginTop: 18, borderTop: "1px solid rgba(237,235,228,.1)", paddingTop: 14 }}>
          {!adminOpen ? (
            <button onClick={() => setAdminOpen(true)} style={{ background: "none", border: "none", color: "#B9CDDE", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>
              I'm an admin →
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => { setAdminCode(e.target.value); setAdminErr(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") adminEnter(); }}
                placeholder="Admin passcode"
                autoFocus
                style={{ ...field, width: 200, borderColor: adminErr ? "#e06a6a" : "rgba(237,235,228,.2)" }}
              />
              <button onClick={adminEnter} style={{ background: "rgba(237,235,228,.15)", color: "#EDEBE4", border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Enter
              </button>
              {adminErr && <span style={{ color: "#e06a6a", fontSize: 12, alignSelf: "center" }}>Incorrect passcode.</span>}
            </div>
          )}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "#6f6b62", marginTop: 16 }}>Confidential. Do not distribute · v1</div>
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
      fetch("./benchmark_meta.json?t=" + t).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("./benchmark_components.json?t=" + t).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("./benchmark_ratings.json?t=" + t).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([rows, names, meta, components, ratings]) => setData(rows.map((b) => {
        const n = names[b.paperLink] || names[b.id] || {};
        const m = meta[b.paperLink] || meta[b.id] || {};
        return {
          ...b,
          score: scoreBenchmark(b),
          displayName: n.displayName || b.name,
          conditions: n.conditions || [],
          tasks: (n.tasks || []).map((task) => TASK_RENAME[task] || task),
          objective: m.objective || "",
          paperTitle: m.paperTitle || "",
          pubDate: m.publicationDate || "",
          citation: m.citation || "",
          components: components[b.paperLink] || components[b.id] || [],
          ratings: ratings[b.paperLink] || ratings[b.id] || null,
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Lexend:wght@400&family=Space+Mono:wght@400;700&family=Roboto+Mono:wght@400;500&display=swap');
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

        /* Same live smoke, held fixed to the viewport behind the whole page so
           every section shares one pulsing atmosphere (transparent base). */
        .pagefx{ position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
        .pagefx b{ position: absolute; display: block; border-radius: 50%; filter: blur(80px); mix-blend-mode: screen; will-change: transform, opacity; }
        .pagefx .s1{ width: 80vw; height: 80vw; top: -20%; left: -12%; opacity: .52;
          background: radial-gradient(circle at center, #74736c 0%, rgba(116,115,108,0) 60%); }
        .pagefx .s2{ width: 74vw; height: 74vw; bottom: -24%; right: -12%; opacity: .44;
          background: radial-gradient(circle at center, #3c3b37 0%, rgba(60,59,55,0) 62%); }
        .pagefx .s3{ width: 52vw; height: 52vw; top: 26%; left: 34%; opacity: .38;
          background: radial-gradient(circle at center, #9a988f 0%, rgba(154,152,143,0) 62%); }
        .pagefx .s4{ width: 46vw; height: 46vw; bottom: 2%; left: 4%; opacity: .34;
          background: radial-gradient(circle at center, #5a594f 0%, rgba(90,89,79,0) 62%); }
        .pagefx:after{ content: ""; position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 3px 3px; opacity: .5; }
        @media (prefers-reduced-motion: no-preference){
          .pagefx .s1{ animation: smokeA 24s ease-in-out infinite alternate; }
          .pagefx .s2{ animation: smokeB 19s ease-in-out infinite alternate; }
          .pagefx .s3{ animation: smokeC 30s ease-in-out infinite alternate; }
          .pagefx .s4{ animation: smokeD 26s ease-in-out infinite alternate; }
        }
      `}</style>

      {!accepted ? (
        <AgreementGate onAccept={() => setAccepted(true)} />
      ) : (
        <>
      <div style={(page === "landing" || page === "method")
        ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, background: "#1C4773" }
        : { position: "sticky", top: 0, zIndex: 40, background: "#1C4773" }}>
        <div style={{ background: "transparent", color: "rgba(237,235,228,.72)", fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".04em", fontWeight: 400, padding: "9px 20px", textAlign: "center" }}>
          {LAUNCH.ratings
            ? "Live data from the team catalog · rigor tiers are provisional (draft rubric) pending human appraisal"
            : "Live data from the team catalog · kept current by an automated pipeline with human review"}
        </div>
        <TopNav page={page} go={go} overlay={true} />
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
    <nav style={{ borderBottom: overlay ? "none" : "1px solid #D4D4D4", background: overlay ? "transparent" : "#E6E6E6" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => go("landing")} style={{ display: "flex", alignItems: "center", gap: 9, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: wordColor, display: "inline-block" }} />
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 18, color: wordColor, letterSpacing: "-.02em" }}>Benchly</span>
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
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 18 }}>
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
function Accordion({ q, a, dark }) {
  const [open, setOpen] = useState(false);
  const line = dark ? DASH_LINE : C.line;
  const ink = dark ? DASH_INK : C.ink;
  const muted = dark ? DASH_MUTED : C.muted;
  return (
    <div style={{ borderTop: `1px solid ${line}` }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 400, color: ink, letterSpacing: "-.015em" }}>{q}</span>
        <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: muted, lineHeight: 1, flexShrink: 0 }}>{open ? "-" : "+"}</span>
      </button>
      {open && <div style={{ fontSize: 15.5, lineHeight: 1.65, color: muted, padding: "0 0 24px", maxWidth: 760 }}>{a}</div>}
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
            <span style={{ fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 19, letterSpacing: "-.02em" }}>Benchly</span>
          </div>
          <p style={{ maxWidth: 420, marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "#B7B0A2" }}>
            A curated, growing index of how AI models are evaluated on mental-health tasks, a few of which you can run yourself.
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
          <span>Research catalog, not a clinical tool.</span>
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
    return <span style={{ fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 17, letterSpacing: "-.01em", color: color || C.ink }}>{name}</span>;
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ height: h, width: "auto", maxWidth: 180, objectFit: "contain", display: "block" }} />
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE 1 — Landing
 * ------------------------------------------------------------------ */
/* ---- Overview "by the numbers" dashboard (dark) ---------------------- *
 * Two single-measure magnitude charts (task coverage + growth over time)
 * plus a stat-tile row. Per the dataviz method: one hue per chart (no
 * rainbow), category identity carried by a small color dot + a direct label,
 * recessive tracks, rounded bar ends, value labels, hover tooltips.          */
const DASH_BG = "#1C4773";
const DASH_INK = "#EDEBE4";
const DASH_MUTED = "#B9CDDE";
const DASH_TRACK = "rgba(237,235,228,.07)";
const DASH_PANEL = "rgba(237,235,228,.035)"; // soft borderless panel fill
const DASH_LINE = "rgba(237,235,228,.12)";   // hairline divider on dark

// One stat in the strip: a figure over a small mono label. All stats share the
// same size and the same count-up animation for a uniform, lively row.
function StatCell({ n, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: FONT_SERIF, fontWeight: 400, letterSpacing: "-.03em", lineHeight: 0.9, color: DASH_INK, fontSize: "clamp(38px, 5vw, 56px)" }}><CountUp to={n} /></div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: DASH_MUTED, lineHeight: 1.4, maxWidth: 128 }}>{label}</div>
    </div>
  );
}

// Chart panel — light-blue ground card so the two graphs pop off the canvas.
const PANEL_BG = "#DEEBF7";
const PANEL_INK = "#1C4773";
const PANEL_MUTED = "#4A6E8F";
const PANEL_TRACK = "rgba(28,71,115,.12)";
function DashCard({ title, children }) {
  return (
    <div style={{ borderRadius: 18, padding: "24px 26px 28px", background: PANEL_BG, display: "flex", flexDirection: "column" }}>
      <h3 style={{ fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 400, letterSpacing: "-.02em", color: PANEL_INK, margin: "0 0 24px" }}>{title}</h3>
      {/* center the content in the card's remaining height, so a short chart
          sits mid-card instead of leaving a large empty band at the bottom */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

// Horizontal pill bars, one per task category, each in its own category color
// (the same hues as the catalog cards) so the chart is colorful and legible;
// every bar is directly labeled, so color reinforces rather than carries alone.
function TaskBars({ rows }) {
  const max = rows.length ? rows[0][1] : 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map(([name, n]) => {
        const col = CATEGORY_COLORS[name] || CATEGORY_COLOR_FALLBACK;
        return (
          <div key={name} className="dashbar" title={`${name}: ${n}`} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: PANEL_INK, lineHeight: 1.3 }}>{name}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: col, flexShrink: 0 }}>{n}</span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: PANEL_TRACK, overflow: "hidden" }}>
              <div style={{ width: `${(n / max) * 100}%`, height: "100%", background: col, borderRadius: 999, minWidth: 6 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Filled line graph of benchmarks per year. Gap years plot as zero so the
// growth curve reads honestly. Single series: deep-amber 2.5px line over a
// soft amber area fade, dots with a surface ring, values labeled selectively
// (peak + latest) with the rest on hover.
function GrowthLine({ rows }) {
  const W = 560, H = 210, PAD_L = 40, PAD_R = 40, PAD_T = 30, PAD_B = 30;
  const innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
  const max = rows.reduce((m, [, n]) => Math.max(m, n), 0) || 1;
  const step = rows.length > 1 ? innerW / (rows.length - 1) : 0;
  const px = (i) => PAD_L + i * step;
  const py = (n) => PAD_T + (1 - n / max) * innerH;
  const baseline = H - PAD_B;
  const pts = rows.map(([, n], i) => `${px(i).toFixed(1)},${py(n).toFixed(1)}`);
  const areaPath = `M ${px(0).toFixed(1)},${baseline} L ${pts.join(" L ")} L ${px(rows.length - 1).toFixed(1)},${baseline} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={`Benchmarks per year: ${rows.map(([y, n]) => `${y} ${n}`).join(", ")}`}>
      <defs>
        <linearGradient id="growthfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF9043" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#EF9043" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <line x1={PAD_L} y1={baseline} x2={W - PAD_R} y2={baseline} stroke={PANEL_TRACK} strokeWidth="1" />
      {rows.length > 1 && <path d={areaPath} fill="url(#growthfill)" />}
      {rows.length > 1 && <path d={`M ${pts.join(" L ")}`} fill="none" stroke="#E0782F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {rows.map(([y, n], i) => (
        <g key={y}>
          <circle cx={px(i)} cy={py(n)} r={n ? 4 : 3} fill={n ? "#E0782F" : PANEL_MUTED} stroke={PANEL_BG} strokeWidth="2" />
          {/* larger invisible hit target with a native tooltip */}
          <circle cx={px(i)} cy={py(n)} r="14" fill="transparent">
            <title>{`${y}: ${n} benchmark${n === 1 ? "" : "s"}`}</title>
          </circle>
          <text x={px(i)} y={py(n) - 12} textAnchor="middle" style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, fill: n ? PANEL_INK : PANEL_MUTED }}>{n}</text>
          <text x={px(i)} y={H - 8} textAnchor="middle" style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".04em", fill: PANEL_MUTED }}>{y}</text>
        </g>
      ))}
    </svg>
  );
}

// Minimalist count-up: rapidly ticks 0 -> `to` on mount and lands there,
// easeOut at a ~30fps cadence. Flat and clean (no shadow); tabular figures keep
// the width steady. Respects reduced-motion by snapping to the final value.
function CountUp({ to, suffix = "", duration = 1300 }) {
  const [val, setVal] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !to) { setVal(to || 0); return; }
    let raf, start = null;
    const step = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      if (t - last.current >= 33 || p === 1) { // ~30fps
        last.current = t;
        const eased = 1 - Math.pow(1 - p, 3);  // easeOutCubic
        setVal(Math.round(eased * to));
      }
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{val}{suffix}</span>;
}

// "Orbit: Cards" style loop — the real catalog cards (BenchTile) circle a
// center point on a shallow ellipse, with depth-driven scale / opacity / blur
// for parallax layering. Continuous (seamless) rotation; respects reduced-motion.
function OrbitCards({ items, go }) {
  const wrapRefs = useRef([]);
  useEffect(() => {
    const N = items.length;
    if (!N) return;
    const RX = 300, RY = 68, BASE = 0.54, PERIOD = 68000; // slow revolution
    const apply = (base) => {
      // Pass 1: depths, to find the front card. While its guide callouts are
      // visible the other cards fade far back so the labels never sit on top
      // of a readable card; everything eases on the same curve (t).
      const depths = [];
      let frontI = 0;
      for (let i = 0; i < N; i++) {
        const a = base + (i / N) * Math.PI * 2;
        depths[i] = (Math.sin(a) + 1) / 2;           // 0 = back/top, 1 = front/bottom
        if (depths[i] > depths[frontI]) frontI = i;
      }
      const t = Math.min(1, Math.max(0, (depths[frontI] - 0.9) / 0.09));
      for (let i = 0; i < N; i++) {
        const el = wrapRefs.current[i];
        if (!el) continue;
        const a = base + (i / N) * Math.PI * 2;
        const x = Math.cos(a) * RX;
        const y = Math.sin(a) * RY;
        const depth = depths[i];
        const s = BASE * (0.8 + depth * 0.34);
        el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
        const baseO = 0.5 + depth * 0.5;
        el.style.opacity = (i === frontI ? baseO : baseO * (1 - 0.8 * t)).toFixed(3);
        el.style.zIndex = String(Math.round(depth * 100));
        el.style.filter = depth < 0.5 ? `blur(${((0.5 - depth) * 3.4).toFixed(2)}px)` : "none";
        el.style.setProperty("--inv", (1 / s).toFixed(3));
        el.style.setProperty("--guide-o", (i === frontI ? t : 0).toFixed(3));
      }
    };
    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { apply(Math.PI / 2); return; }        // static, front card centered
    let raf, start = null;
    const loop = (ts) => {
      if (start == null) start = ts;
      apply(((ts - start) / PERIOD) * Math.PI * 2 + Math.PI / 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  return (
    <div style={{ position: "relative", height: 640, margin: "0 auto", maxWidth: 1040, overflow: "hidden" }}>
      {/* How-to-read-a-card guide: callout chips ride on each card and fade in
          as it reaches the front; the orbit loop fades the OTHER cards back at
          the same time so the labels never overlap a readable card. */}
      <style>{`
        .cardguide{position:absolute;inset:0;opacity:var(--guide-o,0);pointer-events:none}
        .cg-item{position:absolute;display:flex;align-items:center;font-size:calc(13px * var(--inv,1))}
        .cg-l{right:100%;flex-direction:row}
        .cg-r{left:100%;flex-direction:row-reverse}
        .cg-line{width:2.4em;height:.11em;background:rgba(237,235,228,.75);flex-shrink:0}
        .cg-dot{width:.5em;height:.5em;border-radius:999px;background:#FFFFFF;flex-shrink:0}
        .cg-label{font-family:'Lexend','Segoe UI',system-ui,sans-serif;font-weight:400;font-size:1em;color:#FFFFFF;line-height:1.45;white-space:nowrap;background:rgba(11,10,9,.92);border:.09em solid rgba(237,235,228,.32);border-radius:.5em;padding:.5em .85em}
        .cg-l .cg-label{text-align:right;margin-right:.7em}
        .cg-r .cg-label{text-align:left;margin-left:.7em}
        .cg-sub{display:block;font-family:'Space Mono','Roboto Mono',ui-monospace,monospace;font-weight:400;font-size:.85em;color:#B7B2A8;margin-top:.15em}
        @media (max-width: 860px){.cardguide{display:none}}
      `}</style>
      {items.map((b, i) => (
        <div key={b.id} ref={(el) => (wrapRefs.current[i] = el)}
          style={{ position: "absolute", top: "50%", left: "50%", width: 250, willChange: "transform, opacity, filter" }}>
          <BenchTile b={b} showRigor={LAUNCH.ratings} catColor={null} onClick={() => go("catalog")} />
          <div className="cardguide" aria-hidden="true">
            <div className="cg-item cg-l" style={{ top: 26 }}>
              <span className="cg-label">Benchmark name</span><span className="cg-line" /><span className="cg-dot" />
            </div>
            {LAUNCH.ratings && (
            <div className="cg-item cg-r" style={{ top: 26 }}>
              <span className="cg-label">Rigor ratings<span className="cg-sub">safety · clinical · method</span></span><span className="cg-line" /><span className="cg-dot" />
            </div>
            )}
            <div className="cg-item cg-l" style={{ top: 262 }}>
              <span className="cg-label">Task tags<span className="cg-sub">color = category · filter with these</span></span><span className="cg-line" /><span className="cg-dot" />
            </div>
            <div className="cg-item cg-r" style={{ top: 316 }}>
              <span className="cg-label">View details<span className="cg-sub">opens the full entry</span></span><span className="cg-line" /><span className="cg-dot" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// "Tasks Type" dashboard — the 8 task categories as translucent dark cards with
// a per-category accent, revealed with a staggered fade + rise + slight scale-up
// when the grid scrolls into view. Respects reduced-motion.
function TaskTypeCards() {
  const [shown, setShown] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { setShown(true); io.disconnect(); break; }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(258px, 1fr))", gap: 18 }}>
      {CATEGORY_INFO.map((c, i) => {
        const accent = CATEGORY_COLORS[c.name] || CATEGORY_COLOR_FALLBACK;
        return (
          <div key={c.name} style={{
            position: "relative", borderRadius: 16, padding: "22px 22px 24px",
            background: "rgba(237,235,228,.035)", border: "1px solid rgba(237,235,228,.10)",
            boxShadow: `0 0 26px -16px ${accent}, inset 0 1px 0 rgba(255,255,255,.03)`,
            willChange: "opacity, transform",
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0) scale(1)" : "translateY(18px) scale(.965)",
            transition: `opacity .55s ease-out ${i * 85}ms, transform .6s cubic-bezier(.22,.61,.36,1) ${i * 85}ms`,
          }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: accent }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ width: 26, height: 2, borderRadius: 2, background: accent, opacity: 0.85, margin: "11px 0 13px" }} />
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 400, letterSpacing: "-.01em", color: DASH_INK, margin: 0, lineHeight: 1.2 }}>{c.name}</h3>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, lineHeight: 1.55, color: "#EDEBE4", margin: "11px 0 0" }}>{c.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

function LandingPage({ go, data }) {
  const total = data.length;
  const openCount = data.filter((b) => b.source === "Open").length;
  const multiTurn = data.filter((b) => /multi/i.test(String(b.turn || b.turnRaw || ""))).length;
  const maxLLMs = data.reduce((m, b) => {
    const d = String(b.numLLMs || "").match(/\d+/);
    return Math.max(m, d ? parseInt(d[0], 10) : 0);
  }, 0);

  // Benchmarks per task category (multi-label), most-covered first.
  const taskCounts = (() => {
    const c = {};
    data.forEach((b) => (b.tasks || []).forEach((t) => { c[t] = (c[t] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  })();

  // Benchmarks per year, filled continuously so gap years show as empty.
  const yearMap = {};
  data.forEach((b) => { const m = (b.year || "").match(/20\d\d/); if (m) yearMap[m[0]] = (yearMap[m[0]] || 0) + 1; });
  const yrs = Object.keys(yearMap).map(Number);
  const growth = [];
  if (yrs.length) { for (let y = Math.min(...yrs); y <= Math.max(...yrs); y++) growth.push([String(y), yearMap[String(y)] || 0]); }
  const sinceRecent = (yearMap["2025"] || 0) + (yearMap["2026"] || 0);

  const runnableCount = data.filter((b) => runHrefFor(b)).length;
  const featured = [...data]
    .sort((a, b) =>
      (runHrefFor(b) ? 1 : 0) - (runHrefFor(a) ? 1 : 0) ||
      (benchRatings(b) ? 1 : 0) - (benchRatings(a) ? 1 : 0) ||
      (b.sizeNum || 0) - (a.sizeNum || 0))
    .slice(0, 6);

  return (
    <div style={{ position: "relative", color: DASH_INK, background: DASH_BG }}>
      {/* Solid #1C4773 background (the pagefx smoke overlay was removed for 1.0;
          see git history / pre-1.0 tag to restore it). */}
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Dark full-screen hero — giant wordmark (Monolog-style) on the solid navy base. */}


      <section style={{ position: "relative", color: "#EDEBE4", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", padding: "104px 32px 48px" }}>
            {/* Load-in choreography: one staged entrance for the hero — each
                piece rises and sharpens in sequence. Respects reduced-motion. */}
            <style>{`
              @keyframes heroin { from { opacity: 0; transform: translateY(22px); filter: blur(5px); } to { opacity: 1; transform: none; filter: none; } }
              .heroin { animation: heroin .9s cubic-bezier(.16,1,.3,1) both; }
              @media (prefers-reduced-motion: reduce) { .heroin { animation: none; } }
            `}</style>

            {/* one centered composition: lockup, copy, CTA, then the numbers */}
            <div style={{ position: "relative", maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 400, lineHeight: 1.02, letterSpacing: "-.035em", color: "#FFFFFF", margin: "0 auto", maxWidth: 720, textWrap: "balance" }}>
                <span className="heroin" style={{ display: "block", fontSize: "clamp(19px, 2.6vw, 30px)", fontWeight: 400, letterSpacing: "-.02em", color: "#B7B2A8", marginBottom: 12, animationDelay: ".05s" }}>The Mental Health</span>
                <span className="heroin" style={{ display: "block", fontSize: "clamp(42px, 7.4vw, 92px)", animationDelay: ".16s" }}>Benchmark Catalog</span>
              </h1>
              <p className="heroin" style={{ fontFamily: FONT_MONO, fontSize: 12.5, lineHeight: 1.7, color: "#CFCCC2", margin: "22px auto 0", maxWidth: 520, animationDelay: ".32s" }}>
                We aggregate all published benchmarks that test AI models on mental health tasks into one catalog, so you don’t have to.
              </p>
              <div className="heroin" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap", animationDelay: ".46s" }}>
                <button onClick={() => go("catalog")} style={{ background: C.lime, color: C.ink, border: "none", borderRadius: 999, padding: "12px 26px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Browse the catalog →</button>
                {LAUNCH.rateRigorHeroButton && (
                  <button onClick={() => go("method")} style={{ background: "transparent", color: "#EDEBE4", border: "1px solid rgba(237,235,228,.35)", borderRadius: 999, padding: "12px 24px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>How we rate rigor</button>
                )}
              </div>

            </div>

            {/* by the numbers — big figures spread across the bottom of the hero */}
            <div className="heroin" style={{ position: "absolute", left: 32, right: 32, bottom: 44, animationDelay: ".62s" }}>
              <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "30px 48px" }}>
                {[
                  [total, "+", "Benchmarks catalogued"],
                  [TASK_ORDER.length, "", "Task categories"],
                  [openCount, "", "Open-source"],
                  [multiTurn, "", "Multi-turn"],
                ].map(([n, suffix, label]) => (
                  <div key={label} style={{ textAlign: "center", minWidth: 150, flex: "1 1 150px" }}>
                    <div style={{ fontFamily: FONT_SERIF, fontWeight: 400, letterSpacing: "-.03em", lineHeight: 1, fontSize: "clamp(40px, 5.2vw, 72px)", color: "#EDEBE4" }}><CountUp to={n} suffix={suffix} /></div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#B9CDDE", marginTop: 10, lineHeight: 1.4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
      </section>



      {/* Charts — the stat strip now lives in the hero above */}
      <section style={{ color: DASH_INK }}>
        <style>{`.dashbar{transition:opacity .16s ease,transform .16s ease}.dashbar:hover{opacity:.8}`}</style>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px 82px" }}>
          {/* charts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <DashCard title="Benchmarks by task category">
              <TaskBars rows={taskCounts} />
              <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: PANEL_MUTED, marginTop: 20, lineHeight: 1.5 }}>
                {total} benchmarks; many cover more than one task.
              </div>
            </DashCard>
            <DashCard title="Benchmarks by year">
              {growth.length ? <GrowthLine rows={growth} /> : null}
            </DashCard>
          </div>
        </div>
      </section>

    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 20px" }}>

      {/* About — the people behind the project */}
      <section style={{ borderTop: `1px solid ${DASH_LINE}`, padding: "60px 0", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: 40 }}>
        <div>
          <div style={{ marginTop: 0 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: DASH_MUTED, marginBottom: 20 }}>
              With support from
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24 }}>
              <Logo src="./logos/mdplus.png" name="MDplus" h={30} color="#A7B6EC" />
              <Logo src="./logos/stanford.png" name="Stanford" h={50} color="#E19A9A" />
              <Logo src="./logos/google.png" name="Google" h={30} color={DASH_INK} />
            </div>
          </div>
        </div>
        <div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 400, letterSpacing: "-.03em", lineHeight: 1.08, margin: 0, color: DASH_INK }}>
            Built by medical students, guided by clinicians.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: DASH_MUTED, marginTop: 20, maxWidth: 640 }}>
            Everything here (the website, the benchmark-evaluation rubric, and the sorting, naming, and
            runnable-benchmark systems) was created by <b style={{ color: DASH_INK }}>four medical students</b> through the{" "}
            <b style={{ color: DASH_INK }}>MDplus Catalysis Fellowship</b>.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: DASH_MUTED, marginTop: 14, maxWidth: 640 }}>
            The project is mentored by <b style={{ color: DASH_INK }}>Dr. Havlik</b> (Stanford) and <b style={{ color: DASH_INK }}>Dr. Kwon</b>.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section style={{ borderTop: `1px solid ${DASH_LINE}`, padding: "60px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 400, letterSpacing: "-.03em", margin: "0", color: DASH_INK }}>Start here</h2>
          </div>
          <button onClick={() => go("catalog")} style={{ border: "none", background: "transparent", color: C.lime, fontWeight: 600, fontSize: "inherit", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>All benchmarks →</button>
        </div>
        <OrbitCards items={featured.slice(0, 5)} go={go} />
      </section>

      {/* Tasks Type — parked behind LAUNCH.tasksType */}
      {LAUNCH.tasksType && (
      <section style={{ borderTop: `1px solid ${DASH_LINE}`, padding: "68px 0" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".18em", textTransform: "uppercase", color: DASH_MUTED, marginBottom: 12 }}>Tasks Type</div>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 400, letterSpacing: "-.03em", margin: "0 0 28px", color: DASH_INK }}>Tasks models are tested on</h2>
        <TaskTypeCards />
      </section>
      )}

      {/* How it's built — parked behind LAUNCH.howItsBuilt */}
      {LAUNCH.howItsBuilt && (
      <section style={{ borderTop: `1px solid ${DASH_LINE}`, padding: "60px 0" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 400, letterSpacing: "-.03em", margin: "0", color: DASH_INK }}>How the catalog is built</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28, marginTop: 28 }}>
          {[
            { n: "01", t: "Find", d: "A scheduled job scans arXiv, PubMed, and medRxiv for new mental-health LLM papers and skips anything already seen." },
            { n: "02", t: "Extract", d: "Relevant papers are read and their facts pulled into a consistent schema (models, tasks, size, metrics) with a short plain-language summary." },
            { n: "03", t: "Publish & appraise", d: "Confident entries publish automatically; uncertain ones wait for a reviewer. Humans grade benchmark quality by hand." },
          ].map((s) => (
            <div key={s.n}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 42, fontWeight: 400, color: "rgba(237,235,228,.16)", letterSpacing: "-.03em" }}>{s.n}</div>
              <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 400, margin: "6px 0 8px", letterSpacing: "-.02em", color: DASH_INK }}>{s.t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: DASH_MUTED, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* FAQ */}
      <section style={{ borderTop: `1px solid ${DASH_LINE}`, padding: "60px 0" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 400, letterSpacing: "-.03em", margin: "0 0 22px", color: DASH_INK }}>Frequently asked</h2>
        <div style={{ borderBottom: `1px solid ${DASH_LINE}` }}>
          {FAQS.map((f) => <Accordion key={f.q} q={f.q} a={f.a} dark />)}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ borderTop: `1px solid ${DASH_LINE}`, padding: "80px 0 48px", textAlign: "center" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 400, letterSpacing: "-.04em", lineHeight: 1.02, margin: "0 auto", maxWidth: 780, color: DASH_INK }}>
          See how AI is really tested on mental health.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
          <button onClick={() => go("catalog")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.lime, color: C.ink, border: "none", borderRadius: 999, padding: "13px 26px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Browse the catalog <ArrowRight size={15} /></button>
          <button onClick={() => go("method")} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", color: DASH_INK, border: "1px solid rgba(237,235,228,.35)", borderRadius: 999, padding: "12px 24px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>How we rate rigor</button>
        </div>
      </section>
    </div>
    </div>
    </div>
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
    <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 8, overflow: "hidden", background: "#0b0a09", border: "1px solid rgba(237,235,228,.12)" }}>
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

const rubricId = (name) => "rub-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function scrollToId(id) {
  const el = typeof document !== "undefined" && document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Small pill legend for Strong / Moderate / Weak.
function TierLegend() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {["Strong", "Moderate", "Weak"].map((t) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 12px", background: C.surface }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: TIER_COLORS[t] }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.ink }}>{t}</span>
        </span>
      ))}
    </div>
  );
}

// Summary card for one rating — clickable, scrolls to the full section below.
function RatingSummaryCard({ d, index }) {
  return (
    <button
      onClick={() => scrollToId(rubricId(d.name))}
      style={{
        textAlign: "left", cursor: "pointer", appearance: "none", width: "100%",
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
        padding: "16px 16px 15px", display: "flex", flexDirection: "column", gap: 9,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.muted }}>{String(index + 1).padStart(2, "0")}</span>
        <ArrowRight size={15} color={C.muted} />
      </div>
      <div style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 400, letterSpacing: "-.01em", color: C.ink }}>{d.name}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".02em", color: C.accent }}>{d.question}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: C.muted }}>{d.short}</div>
    </button>
  );
}

function RubricScore({ d, index }) {
  const [open, setOpen] = useState(false);
  const hasCriteria = !!(d.criteria || d.subScales);
  return (
    <div id={rubricId(d.name)} style={{ scrollMarginTop: 24, borderTop: `1px solid ${C.line}`, padding: "34px 0" }}>
      {/* header: number + name + the plain-language question */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: C.muted, flexShrink: 0 }}>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <h3 style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 400, letterSpacing: "-.02em", margin: 0 }}>{d.name}</h3>
          {d.question && <div style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: ".02em", color: C.accent, marginTop: 5 }}>{d.question}</div>}
        </div>
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.ink, margin: "16px 0 0", maxWidth: 700 }}>{d.purpose}</p>

      {/* What each rating means */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>What each rating means</div>
        <div style={{ display: "grid", gap: 8 }}>
          {(d.tiers || []).map(([tier, desc]) => (
            <div key={tier} style={{ display: "grid", gridTemplateColumns: "112px 1fr", gap: 14, alignItems: "start", borderLeft: `3px solid ${TIER_COLORS[tier]}`, background: C.surface, borderRadius: 6, padding: "11px 14px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: TIER_COLORS[tier], flexShrink: 0 }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: TIER_COLORS[tier] }}>{tier}</span>
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.5, color: C.ink }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible full scoring criteria (hidden by default to keep it digestible) */}
      {hasCriteria && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: "pointer", appearance: "none", background: open ? C.surface : "transparent", border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: C.ink }}
          >
            <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", fontSize: 10 }}>▶</span>
            {open ? "Hide scoring criteria" : "Show scoring criteria"}
          </button>
          {open && (
            <div style={{ marginTop: 14, border: `1px solid ${C.line}`, borderRadius: 8, background: C.paper, padding: "4px 16px 16px" }}>
              {d.criteria && d.criteria.map((g) => (
                <div key={g.label} style={{ marginTop: 14 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.accent, marginBottom: 2 }}>{g.label}</div>
                  {g.items.map(([text, pts], i) => <CritRow key={i} text={text} pts={pts} additive />)}
                </div>
              ))}
              {d.subScales && d.subScales.map((s) => (
                <div key={s.label} style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.accent }}>{s.label}</div>
                  {s.why && <p style={{ fontSize: 12.5, fontStyle: "italic", color: C.muted, margin: "2px 0 2px", lineHeight: 1.45, maxWidth: 660 }}>{s.why}</p>}
                  {s.scale.map(([pts, text], i) => <CritRow key={i} text={text} pts={pts} />)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MethodPage({ go }) {
  const STEPS = [
    { t: "We find the papers", d: "A scheduled job scans arXiv, PubMed, and medRxiv for newly released mental-health LLM papers, and skips anything it has already seen." },
    { t: "We check relevance", d: "A fast, low-cost model reads each title and abstract and keeps only genuine LLM-in-mental-health evaluation work; off-topic papers are dropped with a logged reason." },
    { t: "We extract the facts", d: "The full paper is read into a consistent schema (models tested, tasks, dataset size, metrics, ground truth) with a short plain-language summary. It never guesses; unclear fields stay blank." },
    { t: "We rate the benchmark", d: "Reviewers apply a three-part rubric (Safety, Clinical Relevance, Methodological Quality), giving each benchmark three independent Strong / Moderate / Weak ratings rather than one blended score." },
    { t: "Humans appraise & publish", d: "Reviewers finalize the ratings by hand. Confident entries publish automatically; uncertain ones wait for a person to approve them before going live." },
  ];

  return (
    <>
      {/* Dark hero + compact numbered pipeline */}
      <div style={{ background: "#1C4773", color: "#EDEBE4" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px 56px" }}>
          <section style={{ padding: "104px 0 8px", maxWidth: 760 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#B9CDDE", marginBottom: 18 }}>Methodology</div>
            <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 400, fontSize: "clamp(38px, 5.5vw, 66px)", lineHeight: 0.98, letterSpacing: "-.04em", margin: 0 }}>How the catalog works</h1>
            <p style={{ fontSize: 16.5, color: "#B7B2A8", lineHeight: 1.6, margin: "22px 0 0" }}>
              {LAUNCH.methodRubric
                ? "Two things happen here: an automated pipeline gathers and organizes the benchmarks, then people rate each one against a clear rubric. Below is the pipeline; further down is exactly how the ratings are decided."
                : "An automated pipeline gathers and organizes the benchmarks, then human reviewers appraise each one before it goes live. Below is the pipeline, step by step."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
              <button onClick={() => scrollToId("sec-pipeline")} style={{ appearance: "none", cursor: "pointer", background: "transparent", border: "1px solid rgba(237,235,228,.28)", borderRadius: 999, padding: "8px 15px", fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", color: "#EDEBE4" }}>The pipeline</button>
              {LAUNCH.methodRubric && (
                <button onClick={() => scrollToId("sec-rubric")} style={{ appearance: "none", cursor: "pointer", background: C.lime, border: `1px solid ${C.lime}`, borderRadius: 999, padding: "8px 15px", fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", color: "#1C4773", fontWeight: 700 }}>How we rate benchmarks →</button>
              )}
            </div>
          </section>

          <section id="sec-pipeline" style={{ scrollMarginTop: 16, marginTop: 40 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#B9CDDE", marginBottom: 6 }}>The pipeline · 5 steps</div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {STEPS.map((s, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, padding: "22px 0", borderTop: `1px solid rgba(237,235,228,.14)` }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: C.lime, paddingTop: 5 }}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(20px, 2.6vw, 27px)", fontWeight: 400, letterSpacing: "-.02em", lineHeight: 1.1, margin: 0, color: "#EDEBE4" }}>{s.t}</h2>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#B7B2A8", margin: "8px 0 0", maxWidth: 640 }}>{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* Rubric (light) — the three-score framework, on the off-white canvas.
          Parked behind LAUNCH.methodRubric for a later release. */}
      {LAUNCH.methodRubric && (
      <div style={{ background: "#EBEBEB" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 24px" }}>
        <section id="sec-rubric" style={{ scrollMarginTop: 16, padding: "56px 0 8px" }}>
          <SectionLabel>The evaluation rubric</SectionLabel>
          <h2 style={{ fontFamily: FONT_SERIF, fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 42px)", lineHeight: 1.06, letterSpacing: "-.03em", margin: "12px 0 0" }}>
            How we rate a benchmark
          </h2>
          <p style={{ fontSize: 15.5, color: C.ink, lineHeight: 1.6, margin: "18px 0 0", maxWidth: 680 }}>
            Every benchmark gets <b>three independent ratings</b> instead of one blended score, because a benchmark can be
            strong in one area and weak in another. Each rating is <b>Strong</b>, <b>Moderate</b>, or <b>Weak</b>. Select a
            rating below to read exactly how it is decided.
          </p>
          <div style={{ marginTop: 18 }}><TierLegend /></div>
          <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, margin: "16px 0 0", maxWidth: 680 }}>
            The framework was built from a structured PubMed review of mental-health LLM benchmarks (112 papers screened,
            40 reviewed), with the project's focus on clinical utility and patient safety.
          </p>
        </section>

        {/* Three ratings at a glance — clickable summary / jump nav */}
        <section style={{ padding: "22px 0 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: 14 }}>
            {RUBRIC_SCORES.map((d, i) => <RatingSummaryCard key={d.name} d={d} index={i} />)}
          </div>
        </section>

        {/* Per-rating detail */}
        <section style={{ padding: "34px 0 0" }}>
          {RUBRIC_SCORES.map((d, i) => <RubricScore key={d.name} d={d} index={i} />)}
        </section>

        {/* Note + CTA */}
        <section style={{ borderTop: `1px solid ${C.line}`, padding: "22px 0 48px" }}>
          <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`, background: "#E4E4E4", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: C.ink, lineHeight: 1.55 }}>
            <strong style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: ".06em" }}>NOTE</strong>
            <span style={{ marginLeft: 8 }}>The three ratings are assigned by expert review. A benchmark that is Strong on one domain may be Weak on another; the scores are meant to be read together, not averaged into a single number.</span>
          </div>
          <div style={{ marginTop: 20 }}>
            <GhostButton onClick={() => go("catalog")}>See the benchmarks <ArrowRight size={14} /></GhostButton>
          </div>
        </section>
      </div>
      </div>
      )}
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
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 400, margin: 0 }}>{title}</h2>
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
  const [sort, setSort] = useState("year"); // name | year | rigor | size — newest first by default
  const [catFilter, setCatFilter] = useState(null); // null = all categories
  const [selected, setSelected] = useState(null);
  const [showRigor, setShowRigor] = useState(LAUNCH.ratings); // toggle the rigor rating display (parked when LAUNCH.ratings is false)

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
        return ratingRank(b) - ratingRank(a); // best (highest combined rating) first
      }
      return (a.name || "").localeCompare(b.name || "");
    });
    return arr;
  }, [data, q, sort, catFilter]);

  const rated = data.filter((b) => b.score.tier).length;
  const graded = data.filter((b) => b.overallGrade).length;
  // One-line description for the selected category (from CATEGORY_INFO).
  const catDesc = catFilter ? (CATEGORY_INFO.find((c) => c.name === catFilter) || {}).desc : null;
  // When a task type is selected, every card in that view shares its color.
  const activeCatColor = catFilter ? (CATEGORY_COLORS[catFilter] || CATEGORY_COLOR_FALLBACK) : null;

  return (
    <div style={{ background: ED.bg, color: ED.ink, fontFamily: ED.body }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 76px" }}>
      {/* Header — big title + count on the right (Monolog "All success stories") */}
      <header style={{ padding: "40px 0 24px", borderBottom: `1px solid ${ED.line}`, marginBottom: 34 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 22 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: ED.muted }}>
            Mental-health LLM benchmarks
          </div>
          {LAUNCH.ratings && <RigorToggle on={showRigor} onToggle={() => setShowRigor((v) => !v)} />}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: ED.display, fontWeight: 400, fontSize: catFilter ? "clamp(34px, 5.4vw, 66px)" : "clamp(46px, 8vw, 94px)", lineHeight: 0.96, letterSpacing: "-.04em", margin: 0, color: ED.ink, maxWidth: "13ch" }}>
            {catFilter || "All benchmarks"}
          </h1>
          <span style={{ fontFamily: ED.display, fontWeight: 400, fontSize: "clamp(32px, 5vw, 58px)", letterSpacing: "-.03em", color: ED.ink, lineHeight: 1 }}>
            ({String(visible.length).padStart(2, "0")})
          </span>
        </div>
        {catDesc && (
          <p style={{ fontFamily: ED.body, fontSize: "clamp(15px, 1.6vw, 18px)", lineHeight: 1.5, color: ED.muted, margin: "18px 0 0", maxWidth: "60ch" }}>
            {catDesc}
          </p>
        )}
      </header>

      {error && (
        <div style={{ border: `1px solid ${C.limited}`, background: "#F6E7DF", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.ink, marginBottom: 20 }}>
          Couldn't load benchmarks.json ({error}). Make sure the export script has been run and the file sits next to index.html.
        </div>
      )}

      {/* Two columns: left vertical filter + controls, right horizontal tile gallery */}
      <div className="catlayout">
        <aside style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* search + sort first */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            <div style={{ position: "relative" }}>
              <Search size={14} color={ED.muted} style={{ position: "absolute", left: 12, top: 11 }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
                style={{ width: "100%", padding: "9px 12px 9px 32px", fontFamily: ED.body, fontSize: 13.5, border: `1px solid ${ED.line}`, borderRadius: 8, background: "rgba(237,235,228,.07)", color: ED.ink, boxSizing: "border-box" }} />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontFamily: ED.body, fontSize: 13.5, padding: "9px 12px", border: `1px solid ${ED.line}`, borderRadius: 8, background: "#2A5580", color: ED.ink, cursor: "pointer" }}>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="year">Sort: Year (newest)</option>
              {LAUNCH.ratings && <option value="rigor">Sort: Rating (best first)</option>}
              <option value="size">Sort: Size (largest)</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: ED.ink, display: "inline-block" }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: ED.ink }}>Filter by category</span>
          </div>
          <VChip label="All Projects" on={!catFilter} onClick={() => setCatFilter(null)} />
          {categories.map((c) => (
            <VChip key={c} label={c} on={catFilter === c} onClick={() => setCatFilter(catFilter === c ? null : c)} />
          ))}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24, rowGap: 34 }}>
            {visible.map((b) => (
              <BenchTile key={b.id} b={b} catColor={activeCatColor} showRigor={showRigor} onClick={() => setSelected(b)} />
            ))}
          </div>
          {visible.length === 0 && !error && (
            <div style={{ textAlign: "center", color: ED.muted, padding: "48px 20px", border: `1px dashed ${ED.line}`, borderRadius: 8, background: "rgba(237,235,228,.04)" }}>
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

// Rigor toggle — a pill switch in the catalog top bar (editorial aesthetic).
function RigorToggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label="Show ratings"
      className="lift"
      style={{
        display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer",
        fontFamily: FONT_MONO, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
        color: ED.ink, background: "rgba(237,235,228,.08)", border: `1px solid ${ED.line}`,
        borderRadius: 999, padding: "7px 8px 7px 14px", lineHeight: 1,
      }}
    >
      <span>Ratings</span>
      <span style={{
        position: "relative", width: 38, height: 21, borderRadius: 999, flexShrink: 0,
        background: on ? C.lime : "rgba(237,235,228,.25)", transition: "background .18s ease",
      }}>
        <span style={{
          position: "absolute", top: 3, left: 3, width: 15, height: 15, borderRadius: 999,
          background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)",
          transform: on ? "translateX(17px)" : "translateX(0)", transition: "transform .18s ease",
        }} />
      </span>
    </button>
  );
}

// Vertical filter chip (left rail) — dark canvas chip, active is solid white.
function VChip({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      alignSelf: "flex-start", fontFamily: ED.body, fontSize: 15, fontWeight: 500, cursor: "pointer",
      color: on ? ED.cardInk : ED.ink, background: on ? ED.card : "rgba(237,235,228,.08)",
      border: "none", borderRadius: 5, padding: "8px 15px", textAlign: "left", lineHeight: 1.2,
    }}>{label}</button>
  );
}

// The three ratings that apply to a whole card. Multi-benchmark papers rate
// each sub-benchmark separately, so there is no single card-level triple for
// them (their ratings show per-component inside the popup).
function benchRatings(b) {
  const comps = b.components || [];
  if (comps.length > 1) return null;
  return (comps[0] && comps[0].ratings) || b.ratings || null;
}

// Combined rank for "best first" sorting: Strong=2, Moderate=1, Weak=0 across
// the three ratings; unrated benchmarks sort last.
function ratingRank(b) {
  const r = benchRatings(b);
  if (!r) return -1;
  const v = { Strong: 2, Moderate: 1, Weak: 0 };
  return (v[r.safety] || 0) + (v[r.clinical] || 0) + (v[r.methodology] || 0);
}

// Gallery tile — a tall solid-color "poster": name at the top, task types
// listed inside at the bottom (plain text, no pills). Short description spans
// full width below. Uniform height: the grid stretches every card, CTA pinned.
function BenchTile({ b, catColor, showRigor, onClick }) {
  // White tile on the dark canvas. Category color lives in the task tags
  // (Vals-style tinted pills), not the card surface. Whole tile is clickable;
  // "View details" at the bottom names the action.
  const runnable = !!runHrefFor(b);
  const ratings = benchRatings(b);
  const tasks = (b.tasks && b.tasks.length) ? b.tasks : [deriveCategory(b)];
  const objective = b.objective || b.measures || b.clinicalUseCase || "";
  return (
    <button onClick={onClick} className="edtile" style={{
      width: "100%", height: "100%", minHeight: 360, textAlign: "left", cursor: "pointer",
      background: ED.card, border: "none", borderRadius: 10, padding: "22px 22px 18px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* name top-left + rating chips top-right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <h3 style={{ fontFamily: ED.display, fontSize: 21, fontWeight: 400, letterSpacing: "-.02em", lineHeight: 1.15, margin: 0, color: ED.cardInk, overflowWrap: "anywhere", hyphens: "auto", minWidth: 0 }}>
          {b.displayName || b.name}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          {showRigor && ratings && [["Safety", ratings.safety], ["Clinical", ratings.clinical], ["Method", ratings.methodology]].map(([label, tier]) => tier ? (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: ".04em", textTransform: "uppercase", color: ED.cardMuted, background: "rgba(8,8,7,0.05)", borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>
              <span style={{ opacity: 0.8 }}>{label}</span>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: TIER_COLORS[tier] || C.unrated }} />
            </span>
          ) : null)}
        </div>
      </div>
      {/* objective — directly below the name */}
      {objective && (
        <p style={{ margin: 0, fontFamily: ED.body, fontSize: 13.5, lineHeight: 1.55, color: ED.cardMuted, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{objective}</p>
      )}
      {/* task tags — tinted rounded rectangles, one accent color per category */}
      <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {runnable && (
          <span style={{ background: C.lime, color: C.ink, borderRadius: 7, padding: "4px 10px", fontFamily: ED.body, fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>Runnable</span>
        )}
        {tasks.map((t) => {
          const col = CATEGORY_COLORS[t] || CATEGORY_COLOR_FALLBACK;
          return (
            <span key={t} style={{ background: `${col}1F`, color: col, borderRadius: 7, padding: "4px 10px", fontFamily: ED.body, fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{t}</span>
          );
        })}
      </div>
      {/* bottom action */}
      <span className="edarrow" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ED.body, fontSize: 13.5, fontWeight: 600, color: ED.cardInk, borderTop: "1px solid rgba(8,10,33,.12)", paddingTop: 12 }}>
        View details <span>→</span>
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
          <h3 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 400, letterSpacing: "-.025em", lineHeight: 1.1, margin: 0, color: ED.ink }}>{b.name}</h3>
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
        <h3 style={{ fontFamily: ED.display, fontSize: 21, fontWeight: 400, lineHeight: 1.12, letterSpacing: "-.02em", margin: 0, color: ED.ink }}>
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

// One label/value fact in the detail popup. `wide` spans the full grid width.
function Fact({ label, value, wide }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: PANEL_MUTED, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14.5, lineHeight: 1.5, color: PANEL_INK }}>{value}</div>
    </div>
  );
}

function Detail({ b, showRigor, onClose }) {
  const components = b.components || [];
  const hasComponents = components.length > 1; // only papers that bundle several benchmarks
  const [tab, setTab] = useState("main");
  const [expanded, setExpanded] = useState({}); // per-component (default: collapsed, name only)
  const runHref = runHrefFor(b); // module-level map
  const objective = b.objective || b.measures || "";
  const dateStr = b.pubDate || b.year || "";

  // Single-benchmark papers: show the same field set as a component would, built
  // from the paper's own data (or its single component entry if one exists).
  const primary = components[0] || {
    dataSource: "",
    groundTruth: b.groundTruth,
    evaluation: b.evaluation,
    population: b.population,
    turn: b.turn || b.turnRaw,
  };
  const primTurn = primary.turn || b.turn || b.turnRaw;
  // Single-benchmark papers: the three ratings live on the paper's single component
  // (or on the benchmark itself). Shown inline on the tab row so they're easy to see.
  const primaryRatings = !hasComponents ? (primary.ratings || b.ratings || null) : null;
  // Sub-tasks list: real components when the paper bundles several; otherwise a
  // single synthesized entry named after the benchmark, so every popup uses the
  // same collapsible style.
  const subTasks = hasComponents ? components : [{
    name: b.displayName || b.name,
    tasks: b.tasks || [],
    dataSource: primary.dataSource || "",
    groundTruth: primary.groundTruth || "",
    evaluation: primary.evaluation || "",
    population: primary.population || "",
    turn: primTurn || "",
    ratings: primaryRatings || undefined,
  }];

  // Extra info tab = the citation / reference details.
  const paperLinkEl = b.paperLink ? (
    <a href={b.paperLink} target="_blank" rel="noreferrer" style={{ color: PANEL_INK, wordBreak: "break-word", textDecoration: "underline" }}>{b.paperLink}</a>
  ) : null;
  const extraFields = [
    ["Paper title", b.paperTitle || b.name, true],
    ["Paper link", paperLinkEl, true],
    ["Publication date", b.pubDate || b.year],
    ["Authors / institutions", b.authors, true],
    ["Journal", b.venue],
    ["Citation (AMA)", b.citation, true],
  ].filter(([, v]) => v);

  // Popup runs on the site theme: light-blue card, steel-blue inks.
  const line = "rgba(28,71,115,.2)";
  // Squared outline chips for the quick-glance metrics.
  const chipStyle = { display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: `1px solid ${line}`, borderRadius: 5, padding: "5px 10px" };
  const chipLabel = { fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: PANEL_MUTED };
  const chipValue = { fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 700, color: PANEL_INK };
  // Even smaller pill for the per-component task tags.
  const tinyChip = { display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${line}`, borderRadius: 999, padding: "1px 8px" };

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding: "0 0 12px", background: "none", border: "none", cursor: "pointer", marginBottom: -1,
      borderBottom: tab === key ? `2px solid ${PANEL_INK}` : "2px solid transparent",
      color: tab === key ? PANEL_INK : PANEL_MUTED, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 7,
    }}>
      {label}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,32,28,0.44)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(760px, 100%)", maxHeight: "90vh", background: PANEL_BG, color: PANEL_INK, border: `1px solid ${line}`, borderRadius: 10, boxShadow: "0 24px 60px rgba(8,8,7,0.30)", overflowY: "auto", padding: 32 }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, border: "none", background: "transparent", cursor: "pointer", color: PANEL_MUTED, padding: 4 }}>
          <X size={20} />
        </button>

        {/* header: title on the left, date + journal on the right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingRight: 28 }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 400, letterSpacing: "-.02em", lineHeight: 1.05, margin: 0, color: PANEL_INK, minWidth: 0 }}>{b.displayName || b.name}</h2>
          {(dateStr || b.venue) && (
            <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: PANEL_MUTED, textAlign: "right", lineHeight: 1.5, flexShrink: 0 }}>
              {dateStr && <div>{dateStr}</div>}
              {b.venue && <div>{b.venue}</div>}
            </div>
          )}
        </div>

        {/* objective */}
        {objective && (
          <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.6, color: PANEL_INK, maxWidth: 640 }}>{objective}</p>
        )}

        {/* language + access */}
        {(b.language || b.source || b.sourceRaw) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            {[["Language", b.language], ["Access", b.source || b.sourceRaw]].filter(([, v]) => v).map(([label, value]) => (
              <span key={label} style={chipStyle}>
                <span style={chipLabel}>{label}</span>
                <span style={chipValue}>{value}</span>
              </span>
            ))}
          </div>
        )}

        {/* tabs (with the three ratings pinned to the right for single-benchmark papers) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, borderBottom: `1px solid ${line}`, marginTop: 26, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            {tabBtn("main", "Sub-tasks")}
            {tabBtn("extra", "Source Info")}
          </div>
          {showRigor && primaryRatings && (
            <span style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingBottom: 11 }}>
              {[["Safety", primaryRatings.safety], ["Clinical", primaryRatings.clinical], ["Method", primaryRatings.methodology]].map(([label, tier]) => tier ? (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase", color: PANEL_MUTED }}>{label}</span>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: TIER_COLORS[tier] || C.unrated, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, color: TIER_COLORS[tier] || PANEL_MUTED }}>{tier}</span>
                </span>
              ) : null)}
            </span>
          )}
        </div>

        {tab === "main" ? (
          /* Sub-tasks: one collapsible row each (single-benchmark papers get one
             row named after the benchmark, same style) */
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: PANEL_MUTED, marginBottom: 2 }}>
              {subTasks.length} sub-task{subTasks.length === 1 ? "" : "s"} in this benchmark
            </div>
            {subTasks.map((c, i) => {
              const open = !!expanded[i];
              return (
                <div key={c.name} style={{ borderTop: `1px solid ${line}` }}>
                  <button onClick={() => setExpanded((s) => ({ ...s, [i]: !open }))} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                      <span style={{ color: PANEL_MUTED, fontSize: 11, width: 10, flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
                      <span style={{ fontFamily: FONT_SERIF, fontSize: 16.5, fontWeight: 400, letterSpacing: "-.01em", color: PANEL_INK }}>{c.name}</span>
                      {(c.tasks || []).map((t) => (
                        <span key={t} style={tinyChip}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: CATEGORY_COLORS[t] || CATEGORY_COLOR_FALLBACK, flexShrink: 0 }} />
                          <span style={{ fontFamily: FONT_SANS, fontSize: 10, color: PANEL_MUTED }}>{t}</span>
                        </span>
                      ))}
                    </span>
                    {/* three rubric ratings on the right */}
                    {showRigor && c.ratings && (
                      <span style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end", flexShrink: 0 }}>
                        {[["Safety", c.ratings.safety], ["Clinical", c.ratings.clinical], ["Method", c.ratings.methodology]].map(([label, tier]) => tier ? (
                          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase", color: PANEL_MUTED }}>{label}</span>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: TIER_COLORS[tier] || C.unrated, flexShrink: 0 }} />
                            <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: TIER_COLORS[tier] || PANEL_MUTED, minWidth: 52, textAlign: "right" }}>{tier}</span>
                          </span>
                        ) : null)}
                      </span>
                    )}
                  </button>
                  {open && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px 28px", padding: "0 0 22px 20px" }}>
                      {c.dataSource && <Fact label="Data / question source" value={c.dataSource} wide />}
                      {c.groundTruth && <Fact label="Ground truth" value={c.groundTruth} />}
                      {c.evaluation && <Fact label="Evaluation" value={c.evaluation} />}
                      {c.population && <Fact label="Population" value={c.population} />}
                      {c.turn && <Fact label="Interaction" value={c.turn === "Single" ? "Single-turn" : c.turn} />}
                      {!c.dataSource && !c.groundTruth && !c.evaluation && !c.population && !c.turn && (
                        <div style={{ color: PANEL_MUTED, fontSize: 13.5, gridColumn: "1 / -1" }}>No additional information recorded for this benchmark yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Source Info: citation / reference facts */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px 28px", marginTop: 24 }}>
            {extraFields.map(([k, v, wide]) => <Fact key={k} label={k} value={v} wide={wide} />)}
            {extraFields.length === 0 && (
              <div style={{ color: PANEL_MUTED, fontSize: 13.5, gridColumn: "1 / -1" }}>No source information recorded for this benchmark yet.</div>
            )}
          </div>
        )}

        {/* actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
          {runHref && (
            <a href={runHref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, color: C.ink, background: C.lime, padding: "12px 20px", borderRadius: 999, textDecoration: "none" }}>
              ▶ Run this benchmark
            </a>
          )}
          {b.paperLink && (
            <a href={b.paperLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: runHref ? PANEL_INK : "#fff", background: runHref ? "rgba(255,255,255,.55)" : PANEL_INK, border: runHref ? `1px solid ${line}` : "none", padding: "12px 18px", borderRadius: 999, textDecoration: "none" }}>
              View source paper <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
