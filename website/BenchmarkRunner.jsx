import React, { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// "Run this benchmark" — browser-only, bring-your-own-key (BYOK).
// First benchmark: Depression subtype classification (recreation of
// AlSaad, Alshakhs & Thomas 2026; data Zenodo CC-BY-4.0).
//
// The visitor's API key stays in this browser tab and is sent ONLY to the
// model provider they choose (Anthropic or OpenAI). We store nothing.
// ---------------------------------------------------------------------------

// Letters A.. map to classOrder[i]. Provider presets are free-text (editable)
// so a visitor can type any model id their key can access.
const PROVIDERS = {
  anthropic: {
    label: "Anthropic (Claude)",
    models: ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5-20251001"],
    endpoint: "https://api.anthropic.com/v1/messages",
    keyHint: "sk-ant-...",
  },
  openai: {
    label: "OpenAI (GPT)",
    models: ["gpt-5.2", "gpt-5-mini", "gpt-4o"],
    endpoint: "https://api.openai.com/v1/chat/completions",
    keyHint: "sk-...",
  },
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function buildPrompt(text, classOrder, classDisplay) {
  const options = classOrder
    .map((k, i) => `${LETTERS[i]}. ${classDisplay[k]}`)
    .join("\n");
  return (
    "You are classifying a social media post by which depression subtype it best reflects.\n\n" +
    `Post: "${text}"\n\n` +
    "Which ONE category best fits? Reply with ONLY the single capital letter, nothing else.\n\n" +
    options
  );
}

// Turn a raw model reply into one of our class keys (or null if unparseable).
function parsePrediction(reply, classOrder, classDisplay) {
  if (!reply) return null;
  const up = reply.toUpperCase();
  const m = up.match(/\b([A-F])\b/); // first standalone A-F
  if (m) {
    const idx = LETTERS.indexOf(m[1]);
    if (idx >= 0 && idx < classOrder.length) return classOrder[idx];
  }
  // fallback: match a display name substring
  const low = reply.toLowerCase();
  for (const k of classOrder) {
    if (low.includes(classDisplay[k].toLowerCase())) return k;
  }
  return null;
}

async function callModel(provider, model, apiKey, prompt) {
  const p = PROVIDERS[provider];
  let res, data;
  if (provider === "anthropic") {
    res = await fetch(p.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return (data.content?.[0]?.text || "").trim();
  } else {
    res = await fetch(p.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return (data.choices?.[0]?.message?.content || "").trim();
  }
}

function sample(items, n, seed) {
  // simple deterministic-ish shuffle so a given seed picks a stable subset
  const arr = items.slice();
  let s = seed || 12345;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

const box = {
  background: "#E8E8E3",
  border: "1px solid #BFBFB1",
  borderRadius: 4,
  padding: 22,
  marginBottom: 16,
};
const label = { display: "block", fontWeight: 600, fontSize: 13, margin: "0 0 6px", color: "#080807" };
const input = {
  width: "100%", padding: "10px 12px", border: "1px solid #BFBFB1",
  borderRadius: 4, fontSize: 14, boxSizing: "border-box", background: "#FAFAF9", color: "#080807",
};

function App() {
  const [bench, setBench] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState(PROVIDERS.anthropic.models[0]);
  const [apiKey, setApiKey] = useState("");
  const [size, setSize] = useState(25);
  const [demo, setDemo] = useState(false);

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState([]); // {item, gold, pred, correct}
  const [runError, setRunError] = useState("");
  const stopRef = useRef(false);

  useEffect(() => {
    fetch("./depression_benchmark.json?t=" + Date.now())
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(setBench)
      .catch((e) => setLoadErr(String(e)));
  }, []);

  useEffect(() => { setModel(PROVIDERS[provider].models[0]); }, [provider]);

  async function run() {
    if (!bench) return;
    if (!demo && !apiKey.trim()) { setRunError("Enter your API key, or turn on Demo mode."); return; }
    setRunError("");
    setResults([]);
    setDone(0);
    setRunning(true);
    stopRef.current = false;

    const chosen = sample(bench.items, size, 777);
    const { classOrder, classDisplay } = bench;
    const acc = [];
    for (let i = 0; i < chosen.length; i++) {
      if (stopRef.current) break;
      const it = chosen[i];
      let pred = null;
      try {
        if (demo) {
          await new Promise((r) => setTimeout(r, 120));
          // simulate ~68% accuracy
          pred = Math.random() < 0.68
            ? it.label
            : classOrder[Math.floor(Math.random() * classOrder.length)];
        } else {
          const reply = await callModel(
            provider, model, apiKey.trim(),
            buildPrompt(it.text, classOrder, classDisplay)
          );
          pred = parsePrediction(reply, classOrder, classDisplay);
        }
      } catch (e) {
        setRunError("Stopped: " + String(e.message || e));
        stopRef.current = true;
        break;
      }
      acc.push({ item: it, gold: it.label, pred, correct: pred === it.label });
      setResults(acc.slice());
      setDone(i + 1);
    }
    setRunning(false);
  }

  if (loadErr) return <div style={{ padding: 24, color: "#b00020" }}>Could not load benchmark data: {loadErr}</div>;
  if (!bench) return <div style={{ padding: 24 }}>Loading benchmark…</div>;

  const nCorrect = results.filter((r) => r.correct).length;
  const acc = results.length ? (100 * nCorrect / results.length) : 0;

  // per-class tally
  const perClass = {};
  bench.classOrder.forEach((k) => (perClass[k] = { n: 0, ok: 0 }));
  results.forEach((r) => { perClass[r.gold].n++; if (r.correct) perClass[r.gold].ok++; });

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "34px 20px 80px", fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif", color: "#080807" }}>
      <a href="./" style={{ color: "#7C766B", textDecoration: "none", fontSize: 13, fontFamily: "'Roboto Mono', monospace", letterSpacing: ".04em" }}>← BACK TO CATALOG</a>
      <h1 style={{ fontFamily: "'Lexend', sans-serif", fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 400, letterSpacing: "-.035em", lineHeight: 1.02, margin: "16px 0 6px" }}>Run this benchmark</h1>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#3C3830" }}>{bench.benchmark}</div>
      <p style={{ color: "#475467", fontSize: 14, lineHeight: 1.55 }}>
        {bench.task} This is <b>our recreation</b> of{" "}
        <a href={bench.sourcePaperUrl} target="_blank" rel="noreferrer">{bench.sourcePaper}</a>{" "}
        using its public dataset ({bench.dataset}). Results approximate, not identical to, the paper.
      </p>

      <div style={{ ...box, background: "#fffbeb", borderColor: "#fde68a", fontSize: 13, color: "#7a5b12" }}>
        🔒 <b>Your key stays in your browser.</b> It is sent only to the provider you pick and is never stored or seen by us.
        Running uses <b>your</b> API credits. ⚕️ Research demo only — not a clinical or diagnostic tool.
      </div>

      <div style={box}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={label}>Provider</label>
            <select style={input} value={provider} onChange={(e) => setProvider(e.target.value)} disabled={running}>
              {Object.keys(PROVIDERS).map((k) => <option key={k} value={k}>{PROVIDERS[k].label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Model</label>
            <input style={input} list="models" value={model} onChange={(e) => setModel(e.target.value)} disabled={running} />
            <datalist id="models">
              {PROVIDERS[provider].models.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={label}>Your API key {demo && <span style={{ color: "#98a2b3", fontWeight: 400 }}>(not needed in demo mode)</span>}</label>
          <input style={input} type="password" placeholder={PROVIDERS[provider].keyHint}
            value={apiKey} onChange={(e) => setApiKey(e.target.value)} disabled={running || demo} autoComplete="off" />
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div>
            <label style={label}>How many tweets?</label>
            <select style={{ ...input, width: 120 }} value={size} onChange={(e) => setSize(+e.target.value)} disabled={running}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 7, marginTop: 18 }}>
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} disabled={running} />
            Demo mode (simulate, no key/cost)
          </label>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          {!running ? (
            <button onClick={run} style={{ background: "#EF9043", color: "#080807", border: "1px solid #080807", borderRadius: 999, padding: "11px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ▶ Run benchmark
            </button>
          ) : (
            <button onClick={() => (stopRef.current = true)} style={{ background: "#d92d20", color: "#fff", border: 0, borderRadius: 8, padding: "11px 22px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              ■ Stop
            </button>
          )}
        </div>
        {runError && <div style={{ marginTop: 12, color: "#b42318", fontSize: 13 }}>{runError}</div>}
      </div>

      {(running || results.length > 0) && (
        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 600 }}>{running ? "Running…" : "Result"}</div>
            <div style={{ fontSize: 13, color: "#667085" }}>{done}/{size} done</div>
          </div>
          <div style={{ height: 8, background: "#eef2f6", borderRadius: 99, overflow: "hidden", margin: "10px 0 16px" }}>
            <div style={{ height: "100%", width: "100%", transform: `scaleX(${size ? done / size : 0})`, transformOrigin: "left", background: "#17150F", transition: "transform .2s" }} />
          </div>
          <div style={{ fontFamily: "'Lexend', sans-serif", fontSize: 52, fontWeight: 400, letterSpacing: "-.03em", color: "#080807" }}>{acc.toFixed(1)}%</div>
          <div style={{ color: "#667085", fontSize: 14, marginBottom: 16 }}>accuracy — {nCorrect} of {results.length} correct</div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#667085" }}>
                <th style={{ padding: "6px 4px" }}>Subtype</th><th>Correct</th><th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {bench.classOrder.map((k) => (
                <tr key={k} style={{ borderTop: "1px solid #eef2f6" }}>
                  <td style={{ padding: "6px 4px" }}>{bench.classDisplay[k]}</td>
                  <td>{perClass[k].ok}/{perClass[k].n}</td>
                  <td>{perClass[k].n ? (100 * perClass[k].ok / perClass[k].n).toFixed(0) + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length > 0 && (
        <div style={box}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Per-item detail</div>
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid #eef2f6" : 0, fontSize: 13 }}>
                <div style={{ color: "#475467", marginBottom: 4 }}>{r.item.text.slice(0, 180)}{r.item.text.length > 180 ? "…" : ""}</div>
                <div>
                  <span style={{ color: r.correct ? "#067647" : "#b42318", fontWeight: 600 }}>{r.correct ? "✓" : "✗"}</span>{" "}
                  predicted <b>{r.pred ? bench.classDisplay[r.pred] : "(unparsed)"}</b> · gold <b>{bench.classDisplay[r.gold]}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
