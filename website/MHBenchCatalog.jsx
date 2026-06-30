import React, { useState, useMemo, useEffect } from "react";
import { ExternalLink, X, ArrowUpDown, Search, ArrowRight, ShieldCheck, Layers } from "lucide-react";

/* ------------------------------------------------------------------ *
 *  MH-LLM Benchmark Catalog
 *  Data source: website/benchmarks.json  (generated from the team's
 *  "Benchmark catalog" Google Sheet by scripts/export_catalog_to_website.py)
 *  Benchmarks are currently UNCATEGORIZED — a flat catalog. Rigor tiers are
 *  PROVISIONAL, computed from a draft rubric until human appraisal is filled in.
 * ------------------------------------------------------------------ */

const C = {
  paper: "#F8F9FA",      // page background (Google grey-50)
  surface: "#FFFFFF",    // cards / nav
  ink: "#202124",        // near-black text
  muted: "#5F6368",      // secondary text
  line: "#DADCE0",       // hairline borders
  brand: "#1A73E8",      // Google blue — primary
  accent: "#1A73E8",     // accent / emphasis
  strong: "#188038",     // green
  moderate: "#F29900",   // amber
  limited: "#D93025",    // red
  unrated: "#9AA0A6",    // grey
};

// Google Research uses a clean geometric sans (Google Sans). We list it first
// for anyone who has it, falling back to Inter (loaded from Google Fonts).
const FONT_SANS = "'Google Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const FONT_SERIF = FONT_SANS; // no serif in this aesthetic — headings use the sans
const FONT_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

const TIER = {
  strong: { label: "Strong", color: C.strong, ticks: 4 },
  moderate: { label: "Moderate", color: C.moderate, ticks: 3 },
  limited: { label: "Limited", color: C.limited, ticks: 1 },
};

const SOURCE_OPTIONS = ["Open", "Mixed", "Restricted", "Closed"];

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
      color: "#fff", background: C.brand, border: "none", borderRadius: 999, padding: "12px 24px", cursor: "pointer",
      boxShadow: "0 1px 2px rgba(60,64,67,0.2)",
    }}>{children}</button>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
      color: C.brand, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: "12px 22px", cursor: "pointer",
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

export default function App() {
  const [page, setPage] = useState(hashToPage());
  const [data, setData] = useState(null);   // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    const onHash = () => setPage(hashToPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    fetch("./benchmarks.json?t=" + Date.now())
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((rows) => setData(rows.map((b) => ({ ...b, score: scoreBenchmark(b) }))))
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        a { color: ${C.brand}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .8s linear infinite; }
        @media (prefers-reduced-motion: no-preference){
          .lift{ transition: transform .14s ease, box-shadow .14s ease; }
          .lift:hover{ transform: translateY(-2px); box-shadow: 0 6px 18px rgba(60,64,67,0.16); }
          .navlink{ transition: color .12s ease; }
        }
      `}</style>

      <div style={{ background: "#E8F0FE", color: "#1A56C4", fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, padding: "9px 20px", textAlign: "center" }}>
        Live data from the team catalog · rigor tiers are provisional (draft rubric) pending human appraisal
      </div>

      <TopNav page={page} go={go} />

      {data === null ? (
        <Loading />
      ) : (
        <>
          {page === "landing" && <LandingPage go={go} data={data} />}
          {page === "method" && <MethodPage go={go} data={data} />}
          {page === "catalog" && <CatalogPage data={data} error={error} />}
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

function TopNav({ page, go }) {
  return (
    <nav style={{ borderBottom: `1px solid ${C.line}`, background: C.surface, position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => go("landing")} style={{ display: "flex", alignItems: "center", gap: 9, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
          <span style={{ width: 11, height: 11, borderRadius: 999, background: C.brand, display: "inline-block" }} />
          <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 18, color: C.ink, letterSpacing: "-.01em" }}>Mental Health Benchmarks</span>
        </button>
        <div style={{ display: "flex", gap: 2 }}>
          {NAV.map((n) => {
            const on = page === n.id;
            return (
              <button key={n.id} className="navlink" onClick={() => go(n.id)} aria-current={on ? "page" : undefined} style={{
                fontFamily: FONT_SANS, fontSize: 13, fontWeight: on ? 600 : 500,
                color: on ? C.brand : C.muted, background: "transparent",
                border: "none", borderBottom: `2px solid ${on ? C.accent : "transparent"}`,
                padding: "6px 12px", cursor: "pointer",
              }}>{n.label}</button>
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
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 3px rgba(60,64,67,0.1)" }}>
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

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px" }}>
      <section style={{ padding: "44px 0 32px", maxWidth: 720 }}>
        <SectionLabel>Mental-health LLM evaluation</SectionLabel>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 52, lineHeight: 1.08, margin: "12px 0 0", letterSpacing: "-.025em" }}>
          A working catalog of mental-health LLM benchmarks.
        </h1>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.55, margin: "16px 0 0" }}>
          A curated index of benchmarks for evaluating large language models on clinical mental-health
          tasks — what each one measures, how it was built, and (provisionally) how rigorous it looks.
          The catalog is drawn directly from our team's research sheet.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => go("catalog")}>Browse the catalog <ArrowRight size={15} /></PrimaryButton>
          <GhostButton onClick={() => go("method")}>How we rate rigor</GhostButton>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${C.line}`, padding: "28px 0" }}>
        <SectionLabel>Where things stand</SectionLabel>
        <div style={{ display: "flex", gap: 30, marginTop: 14, flexWrap: "wrap" }}>
          <Stat n={total} label="benchmarks cataloged" />
          <Stat n={rated} label="with a provisional rigor tier" />
          <Stat n={graded} label="with a human appraisal grade" accent />
        </div>
        <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.55, margin: "16px 0 0", maxWidth: 680 }}>
          The catalog is still being filled in: {withSource} of {total} benchmarks record an access type, and
          human appraisal has only just begun. Rigor tiers shown are <em>provisional</em>, computed from a draft
          rubric — they will be replaced by the team's appraisal as it is completed.{" "}
          <button onClick={() => go("catalog")} style={linkBtn}>Open the catalog →</button>
        </p>
      </section>

      <section style={{ borderTop: `1px solid ${C.line}`, padding: "28px 0" }}>
        <SectionLabel>Catalog at a glance</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
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

      <section style={{ borderTop: `1px solid ${C.line}`, padding: "28px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
        <InfoBlock icon={<Layers size={18} color={C.brand} />} title="What this is">
          A browsable catalog of mental-health LLM benchmarks, annotated with what each measures, its
          ground truth, population, access, and evaluation method. Categorization by clinical use-case is
          planned next.
        </InfoBlock>
        <InfoBlock icon={<ShieldCheck size={18} color={C.brand} />} title="Why it matters">
          Mental health is high-stakes, and the evaluation landscape is uneven. Making each benchmark's
          strengths, gaps, and accessibility legible helps teams test against the right thing and know how
          far to trust the result.
        </InfoBlock>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE 2 — Methodology (draft rubric)
 * ------------------------------------------------------------------ */
function MethodPage({ go, data }) {
  const example = data.find((b) => b.score.tier) || data.find((b) => b.overallGrade) || data[0];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px" }}>
      <section style={{ padding: "40px 0 8px" }}>
        <SectionLabel>Methodology</SectionLabel>
        <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 34, lineHeight: 1.12, margin: "10px 0 0" }}>
          How we rate rigor (draft)
        </h1>
        <p style={{ fontSize: 15.5, color: C.muted, lineHeight: 1.55, margin: "14px 0 0", maxWidth: 660 }}>
          Each benchmark shows a provisional rigor tier — <TierWord t="strong" />, <TierWord t="moderate" />,
          or <TierWord t="limited" /> — computed from the draft rubric below. It is a placeholder until the
          team's human appraisal is filled in; benchmarks without enough data are shown as <b>Unrated</b>.
        </p>
        <div style={{ marginTop: 16, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`, background: "#E8F0FE", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: C.ink }}>
          <strong style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: ".06em" }}>DRAFT</strong>
          <span style={{ marginLeft: 8 }}>Thresholds and weights are not final. A tier is only assigned when at least {MIN_KNOWN} of the {RUBRIC.length} dimensions have data.</span>
        </div>
      </section>

      <section style={{ padding: "26px 0" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>The dimensions</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 16px" }}>
          Each scores <b>2</b>, <b>1</b>, or <b>0</b> when data is present; the tier comes from the average across known dimensions.
        </p>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          {RUBRIC.map((r, i) => (
            <div key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: i % 2 ? C.paper : C.surface, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{r.dim}</span>
              <span style={{ color: C.muted, textAlign: "right", maxWidth: 440 }}>{r.why}</span>
            </div>
          ))}
        </div>
      </section>

      {example && example.score.tier && (
        <section style={{ padding: "8px 0 26px" }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 10px" }}>Worked example</h2>
          <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.55, margin: "0 0 14px" }}>
            Scoring <b style={{ fontFamily: FONT_SERIF }}>{example.name}</b> on the dimensions that have data:
          </p>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            {RUBRIC.map((r, i) => {
              const s = example.score.per[r.key];
              const tier = !s.known ? null : s.pts === 2 ? "strong" : s.pts === 1 ? "moderate" : "limited";
              return (
                <div key={r.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 14px", background: i % 2 ? C.paper : C.surface, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{r.dim}</span>
                  {s.known ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Ticks tier={tier} />
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TIER[tier].color, minWidth: 14, textAlign: "right" }}>{s.pts}</span>
                    </span>
                  ) : (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>no data</span>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: C.brand, color: "#EAF2EF" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: ".04em" }}>
                {example.score.total}/{example.score.maxKnown} across {example.score.knownCount} known → {TIER[example.score.tier].label.toUpperCase()}
              </span>
              <Ticks tier={example.score.tier} />
            </div>
          </div>
        </section>
      )}

      <section style={{ borderTop: `1px solid ${C.line}`, padding: "24px 0 48px" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>Open questions</h2>
        <ul style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
          <li>Should construct validity be weighted more heavily than the others?</li>
          <li>What sample-size thresholds make sense across different task types?</li>
          <li>How should multilingual / non-English coverage factor in?</li>
          <li>When does the team's human appraisal grade replace the provisional tier entirely?</li>
        </ul>
        <div style={{ marginTop: 20 }}>
          <GhostButton onClick={() => go("catalog")}>See the rubric applied in the catalog <ArrowRight size={14} /></GhostButton>
        </div>
      </section>
    </div>
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
  const [sourceFilter, setSourceFilter] = useState(null); // null = all
  const [selected, setSelected] = useState(null);

  const q = query.trim().toLowerCase();

  const visible = useMemo(() => {
    let rows = data;
    if (sourceFilter) rows = rows.filter((b) => b.source === sourceFilter);
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
  }, [data, q, sort, sourceFilter]);

  const rated = data.filter((b) => b.score.tier).length;
  const graded = data.filter((b) => b.overallGrade).length;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px" }}>
      <header style={{ padding: "8px 0 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Layers size={22} color={C.brand} />
          <h1 style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 30, margin: 0, letterSpacing: "-.02em" }}>Benchmark Catalog</h1>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
          <Stat n={data.length} label="benchmarks" />
          <Stat n={rated} label="provisionally rated" />
          <Stat n={graded} label="human-graded" accent />
        </div>
      </header>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, skills, authors…"
            style={{ width: "100%", padding: "8px 10px 8px 30px", fontFamily: FONT_SANS, fontSize: 13, border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink }}
          />
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowUpDown size={13} color={C.muted} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontFamily: FONT_SANS, fontSize: 13, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.surface, color: C.ink, cursor: "pointer" }}>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="year">Sort: Year (newest)</option>
            <option value="rigor">Sort: Rigor (best first)</option>
            <option value="size">Sort: Size (largest)</option>
          </select>
        </div>
      </div>

      {/* Source filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        <FilterChip label="All sources" on={!sourceFilter} onClick={() => setSourceFilter(null)} />
        {SOURCE_OPTIONS.map((s) => (
          <FilterChip key={s} label={s} on={sourceFilter === s} onClick={() => setSourceFilter(sourceFilter === s ? null : s)} />
        ))}
      </div>

      {error && (
        <div style={{ border: `1px solid ${C.limited}`, background: "#FCE8E6", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: C.ink, marginBottom: 14 }}>
          Couldn't load benchmarks.json ({error}). Make sure the export script has been run and the file sits next to preview.html.
        </div>
      )}

      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted, marginBottom: 10 }}>
        {visible.length} of {data.length} shown
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
        {visible.map((b) => (
          <BenchCard key={b.id} b={b} onClick={() => setSelected(b)} />
        ))}
      </div>

      {visible.length === 0 && !error && (
        <div style={{ textAlign: "center", color: C.muted, padding: "48px 20px", border: `1px dashed ${C.line}`, borderRadius: 16, background: C.surface }}>
          <Search size={26} color={C.unrated} />
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginTop: 10 }}>No matches</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search term or clear the source filter.</div>
        </div>
      )}

      {selected && <Detail b={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterChip({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, cursor: "pointer",
      color: on ? "#fff" : C.muted, background: on ? C.brand : C.surface,
      border: `1px solid ${on ? C.brand : C.line}`, borderRadius: 999, padding: "5px 12px",
    }}>{label}</button>
  );
}

function BenchCard({ b, onClick }) {
  return (
    <button onClick={onClick} className="lift" style={{
      textAlign: "left", cursor: "pointer", background: C.surface, border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${b.score.tier ? TIER[b.score.tier].color : C.unrated}`,
      borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 1px 3px rgba(60,64,67,0.12)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>{b.name}</span>
        <RigorBadge score={b.score} />
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>
        {[b.venue, b.year].filter(Boolean).join(" · ") || "—"}
      </div>
      {b.measures && <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>{b.measures}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
        {b.source && <Chip mono>{b.source}</Chip>}
        {b.turn && <Chip>{b.turn}</Chip>}
        {b.overallGrade && <Chip mono color={C.accent}>Grade {b.overallGrade}</Chip>}
      </div>
    </button>
  );
}

function Detail({ b, onClose }) {
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
  ].filter(([, v]) => v);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,32,28,0.34)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 100%)", height: "100%", background: C.surface, borderLeft: `1px solid ${C.line}`, overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <RigorBadge score={b.score} />
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, margin: "8px 0 0" }}>{b.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {!b.score.tier && (
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

        {b.paperLink && (
          <a href={b.paperLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 18, fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: "#fff", background: C.brand, padding: "10px 16px", borderRadius: 9, textDecoration: "none" }}>
            View source paper <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
