// Merge "data/Benchmark Catalog Final - Benchmark Components.csv" into
// website/benchmark_components.json.
//
// The CSV is keyed by benchmark NAME; the site JSON is keyed by paper link.
// We resolve names through benchmarks.json / benchmark_names.json, normalize
// task names to the current short taxonomy, and preserve fields the CSV does
// not carry (ratings, items, lang) from the existing JSON entry of the same
// component name. Run:  node scripts/update_components_from_csv.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = resolve(root, "data/Benchmark Catalog Final - Benchmark Components.csv");
const COMPONENTS = resolve(root, "website/benchmark_components.json");
const BENCHMARKS = resolve(root, "website/benchmarks.json");
const NAMES = resolve(root, "website/benchmark_names.json");

// Map every historical task-name variant to the current short taxonomy.
const TASK_RENAME = {
  "Risk & Crisis Response": "Crisis Response",
  "Risk & Crisis": "Crisis Response",
  "Safety, Bias & Robustness": "Safety & Bias",
  "Diagnostic Reasoning": "Diagnosis",
  "Symptom Detection & Severity Assessment": "Symptom Detection",
  "Symptom Detection & Severity": "Symptom Detection",
  "Therapeutic Conversation & Counseling": "Counseling",
  "Therapeutic Conversation": "Counseling",
  "Patient Communication & Education": "Patient Communication",
  "Clinical Documentation & Extraction": "Clinical Documentation",
  "Knowledge & Board Exams": "Knowledge",
  "Knowledge & Exams": "Knowledge",
};
const normTask = (t) => TASK_RENAME[t.trim()] || t.trim();

// Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const csvRows = parseCSV(readFileSync(CSV, "utf8"));
const header = csvRows[0].map((h) => h.trim());
const col = (name) => header.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase()));
const iBench = col("Benchmark Name"), iComp = col("Benchmark Component Name"), iTasks = col("Task Types"),
  iSource = col("Data/Question Source"), iTruth = col("Ground Truth"), iEval = col("Evaluation method"),
  iPop = col("Population"), iTurn = col("Single vs");

const benchmarks = JSON.parse(readFileSync(BENCHMARKS, "utf8"));
const names = JSON.parse(readFileSync(NAMES, "utf8"));
const existing = JSON.parse(readFileSync(COMPONENTS, "utf8"));

// name (lowercased) -> paperLink/id key used by the site loader
const keyByName = new Map();
for (const b of benchmarks) {
  const key = b.paperLink || b.id;
  if (!key) continue;
  if (b.name) keyByName.set(b.name.toLowerCase(), key);
  const n = names[b.paperLink] || names[b.id] || {};
  if (n.displayName) keyByName.set(n.displayName.toLowerCase(), key);
}

const out = { ...existing };
const unmatched = [];
const grouped = new Map(); // key -> components[]
for (const r of csvRows.slice(1)) {
  const benchName = (r[iBench] || "").trim();
  if (!benchName) continue;
  const key = keyByName.get(benchName.toLowerCase());
  if (!key) { unmatched.push(benchName); continue; }
  const compName = (r[iComp] || "").trim() || benchName;
  const prevList = existing[key] || [];
  const prev = prevList.find((c) => (c.name || "").toLowerCase() === compName.toLowerCase()) || {};
  const comp = {
    name: compName,
    tasks: (r[iTasks] || "").split(",").map(normTask).filter(Boolean),
    ...(prev.items ? { items: prev.items } : {}),
    ...(prev.lang ? { lang: prev.lang } : {}),
    turn: (r[iTurn] || "").trim() || prev.turn || "",
    dataSource: (r[iSource] || "").trim() || prev.dataSource || "",
    groundTruth: (r[iTruth] || "").trim() || prev.groundTruth || "",
    evaluation: (r[iEval] || "").trim() || prev.evaluation || "",
    population: (r[iPop] || "").trim() || prev.population || "",
    ...(prev.ratings ? { ratings: prev.ratings } : {}),
  };
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(comp);
}
for (const [key, comps] of grouped) out[key] = comps;

writeFileSync(COMPONENTS, JSON.stringify(out, null, 1) + "\n", "utf8");
console.log(`Updated ${grouped.size} benchmarks (${[...grouped.values()].reduce((n, c) => n + c.length, 0)} components).`);
if (unmatched.length) console.log("UNMATCHED benchmark names (left untouched):\n - " + [...new Set(unmatched)].join("\n - "));
