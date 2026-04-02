"use client";

import { useState, useRef, useCallback } from "react";

import * as XLSX from "xlsx";



export default function App() {

  const [fileName, setFileName] = useState("");

  const [cols, setCols] = useState([]);

  const [data, setData] = useState([]);

  const [origData, setOrigData] = useState([]);

  const [busy, setBusy] = useState(false);

  const [prog, setProg] = useState({ msg: "", pct: 0, done: false });

  const [logs, setLogs] = useState([]);

  const [editCell, setEditCell] = useState(null);

  const [editVal, setEditVal] = useState("");

  const [page, setPage] = useState(0);

  const [err, setErr] = useState("");

  const cancel = useRef(false);

  const fileRef = useRef();

  const PS = 50;



  // ── Upload ──

  const onFile = useCallback(async (e) => {

    const f = e.target.files?.[0]; if (!f) return;

    setErr(""); setFileName(f.name); setLogs([]); setProg({ msg: "", pct: 0, done: false });

    try {

      const buf = await f.arrayBuffer();

      const wb = XLSX.read(buf, { type: "array" });

      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

      if (!json.length) { setErr("File is empty."); return; }

      const rk = Object.keys(json[0]);

      const sk = rk.map(c => c.length <= 60 ? c : (c.match(/^([A-Za-zÀ-ÿ''´\s']+?)[\s]+(Categoriz|The brand|Other char|Manufacturer)/i) || [null, c.slice(0, 50)])[1].trim());

      let d = json;

      if (sk.some((c, i) => c !== rk[i])) d = json.map(row => { const o = {}; rk.forEach((r, i) => { o[sk[i]] = row[r]; }); return o; });

      setCols(sk);

      // Add Verified Source + Score columns

      const withMeta = d.map(r => ({ ...r, "Verified Source": "Not verified", "Verification Score": 0 }));

      setData(withMeta);

      setOrigData(d);

      setPage(0);

    } catch (e) { setErr("Parse failed: " + e.message); }

  }, []);



  // ── Web Verify ALL rows ──

  const runVerify = useCallback(async () => {

    if (!data.length) return;

    cancel.current = false; setBusy(true); setLogs([]);



    // Deduplicate rows by all data columns to minimize API calls

    const dataColStr = (row) => cols.map(c => String(row[c] ?? "").trim()).join("|||");

    const uniqueMap = new Map();

    data.forEach((r, i) => {

      const key = dataColStr(r);

      if (!uniqueMap.has(key)) uniqueMap.set(key, { row: r, indices: [i] });

      else uniqueMap.get(key).indices.push(i);

    });

    const unique = Array.from(uniqueMap.values());

    const BATCH = 3;

    const batches = [];

    for (let i = 0; i < unique.length; i += BATCH) batches.push(unique.slice(i, i + BATCH));



    const up = [...data];

    const newLogs = [];

    let done = 0;



    const colDesc = cols.map(c => `"${c}"`).join(", ");



    for (let bi = 0; bi < batches.length; bi++) {

      if (cancel.current) break;

      const batch = batches[bi];

      const rowCount = batch.reduce((s, b) => s + b.indices.length, 0);

      done += batch.length;



      setProg({

        msg: `Verifying batch ${bi + 1}/${batches.length} (${done}/${unique.length} unique rows, covering ${rowCount} total rows)...`,

        pct: Math.round((done / unique.length) * 100),

        done: false

      });



      const inputRows = batch.map(b => {

        const o = {};

        cols.forEach(c => { o[c] = String(b.row[c] ?? "").trim() || "(empty)"; });

        return o;

      });



      try {

        const resp = await fetch("/api/anthropic-proxy", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            model: "claude-sonnet-4-20250514",

            max_tokens: 4096,

            tools: [{ type: "web_search_20250305", name: "web_search" }],

            messages: [{

              role: "user",

              content: `You are verifying industrial spare parts data. Search the web (manufacturer websites, distributor catalogs like Octopart, RS Online, Mouser, PLCHardware) to find the CORRECT data for each row.



Columns: ${colDesc}, "Verified Source", "Verification Score"



For each row below, search the web using the manufacturer name and part/type number. Replace ALL cells with the correct verified data:

- Description: Official English product name from manufacturer catalog

- Manufacturer: Correct standardised name

- Item numbers / Type designations: Correct current part numbers (remove obsolete "ERS." references)

- Supplementary: Key specs (voltage, power, dimensions) from datasheet

- Translate any Swedish text to English

- If a cell was "(empty)", fill it with the correct value from the catalog

- "Verified Source": "Web verified" if found online, "Cleaned" if you fixed formatting only, "Not found" if no web result

- "Verification Score": 95-100 if confirmed on manufacturer site, 70-90 if from distributor, 50-70 if inferred, below 50 if uncertain



Input rows:

${JSON.stringify(inputRows, null, 2)}



Return ONLY a valid JSON array with ${inputRows.length} objects. Each object must have ALL these keys: ${[...cols, "Verified Source", "Verification Score"].map(c => `"${c}"`).join(", ")}.

No markdown fences. No explanation. JSON array only.`

            }]

          })

        });



        if (resp.ok) {

          const d = await resp.json();

          const txt = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("");

          let parsed;

          try { parsed = JSON.parse(txt.replace(/```json|```/g, "").trim()); }

          catch { const m = txt.match(/\[[\s\S]*?\]/); if (m) try { parsed = JSON.parse(m[0]); } catch { } }



          if (Array.isArray(parsed)) {

            parsed.forEach((vRow, j) => {

              if (j >= batch.length) return;

              const { indices } = batch[j];

              for (const idx of indices) {

                const nr = { ...up[idx] };

                cols.forEach(c => {

                  if (vRow[c] !== undefined && vRow[c] !== null && String(vRow[c]).trim() && String(vRow[c]).trim() !== "(empty)") {

                    nr[c] = String(vRow[c]).trim();

                  }

                });

                nr["Verified Source"] = vRow["Verified Source"] || "Web verified";

                nr["Verification Score"] = parseInt(vRow["Verification Score"]) || 75;

                up[idx] = nr;

              }

              const desc = cols[0] ? (vRow[cols[0]] || "—") : "—";

              const src = vRow["Verified Source"] || "?";

              const conf = vRow["Verification Score"] || 0;

              newLogs.push({

                ok: src.includes("Web verified") || src.includes("verified"),

                text: `${batch[j].row[cols[1] || cols[0]] || "?"} — ${batch[j].row[cols[2] || cols[3] || cols[0]] || "?"} → ${desc.slice(0, 70)} [${src}, ${conf}%]`

              });

            });

          }

        } else {

          newLogs.push({ ok: false, text: `Batch ${bi + 1} failed: HTTP ${resp.status}` });

        }

      } catch (e) {

        newLogs.push({ ok: false, text: `Batch ${bi + 1} error: ${e.message}` });

      }



      setData([...up]);

      setLogs([...newLogs]);

      await new Promise(r => setTimeout(r, 600));

    }



    setData([...up]);

    setProg({

      msg: `Complete! ${newLogs.filter(l => l.ok).length} of ${newLogs.length} rows verified from web sources.`,

      pct: 100, done: true

    });

    setBusy(false);

  }, [data, cols]);



  // ── Cell editing ──

  const startEdit = (ri, c) => { const gi = page * PS + ri; setEditCell({ row: gi, col: c }); setEditVal(String(data[gi][c] ?? "")); };

  const commitEdit = () => { if (editCell) { const n = [...data]; n[editCell.row] = { ...n[editCell.row], [editCell.col]: editVal }; setData(n); setEditCell(null); } };



  // ── Download ──

  const download = () => {

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Verified Data");

    if (origData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(origData), "Original Data");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const a = document.createElement("a");

    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

    a.download = fileName.replace(/\.xlsx?$/i, "") + "_verified.xlsx";

    a.click();

  };



  // ── Render ──

  const allCols = data.length && data[0]["Verified Source"] !== undefined ? [...cols, "Verified Source", "Verification Score"] : cols;

  const totalPages = Math.ceil((data.length || 1) / PS);

  const pageData = data.slice(page * PS, (page + 1) * PS);

  const naCount = data.reduce((t, r) => t + cols.filter(c => !r[c] || r[c] === "(empty)" || r[c] === "N/A" || r[c] === "").length, 0);

  const webCount = data.filter(r => String(r["Verified Source"] || "").toLowerCase().includes("web")).length;



  return (

    <div suppressHydrationWarning style={{ minHeight: "100vh", background: "#0b0e14", color: "#c8cdd5", fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif" }}>

      <style suppressHydrationWarning>{`

        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        *{box-sizing:border-box;margin:0;padding:0}

        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#222838;border-radius:3px}

        .pnl{background:#10131a;border:1px solid #1a1f2e;border-radius:10px;margin-bottom:14px}

        .bt{border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;display:inline-flex;align-items:center;gap:6px}

        .bt:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.12)}.bt:disabled{opacity:.3;cursor:not-allowed;transform:none}

        .bv{background:#0e7490;color:#fff}.bd{background:#047857;color:#fff}.bc{background:transparent;border:1px solid #b91c1c;color:#fca5a5}

        .drop{border:2px dashed #1e2538;border-radius:10px;padding:50px 20px;text-align:center;cursor:pointer;transition:all .2s}

        .drop:hover{border-color:#0e7490;background:rgba(14,116,144,.05)}

        table{width:100%;border-collapse:collapse;font-size:11.5px}

        thead{position:sticky;top:0;z-index:2}

        th{background:#141825;color:#5c6578;font-weight:600;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;padding:9px 10px;text-align:left;border-bottom:2px solid #1a1f2e;white-space:nowrap}

        td{padding:6px 10px;border-bottom:1px solid #141825;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:11px;cursor:pointer;transition:background .1s}

        td:hover{background:rgba(14,116,144,.08)}

        tr:nth-child(even) td{background:rgba(255,255,255,.008)}

        td.na{color:#ef4444;font-style:italic}

        td.hi{color:#34d399}td.md{color:#fbbf24}td.lo{color:#f97316}td.vl{color:#ef4444}

        td.web{color:#22d3ee;font-weight:500}

        td.ed{padding:2px 4px}

        td.ed input{width:100%;background:#1a1f2e;border:1px solid #0e7490;color:#e2e8f0;padding:5px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;outline:none}

        .pb{background:#1a1f2e;border-radius:4px;height:5px;overflow:hidden}

        .pf{height:100%;border-radius:4px;background:linear-gradient(90deg,#0e7490,#06b6d4);transition:width .3s}

        .log{font-family:'IBM Plex Mono',monospace;font-size:10px;line-height:1.7;max-height:200px;overflow-y:auto;padding:12px 14px;background:#0a0c12;border-radius:6px;border:1px solid #1a1f2e;margin:12px 16px 16px}

        .log .ok{color:#34d399}.log .no{color:#f97316}

        .pg{display:flex;align-items:center;gap:6px}

        .pg button{background:#1a1f2e;border:1px solid #222838;color:#5c6578;padding:5px 12px;border-radius:5px;font-size:11px;cursor:pointer;font-family:inherit}

        .pg button:hover:not(:disabled){background:#222838;color:#c8cdd5}.pg button:disabled{opacity:.25;cursor:not-allowed}

        .st{background:#141825;border-radius:8px;padding:12px;text-align:center}

        .sn{font-size:22px;font-weight:700;line-height:1}.sl{font-size:8px;color:#4b5563;text-transform:uppercase;letter-spacing:.06em;margin-top:3px}

        @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu .25s ease-out}

      `}</style>



      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "18px 24px" }}>



        {/* HEADER */}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <div style={{ width: 30, height: 30, borderRadius: 6, background: "#0e7490", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>SP</div>

            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Spare Parts Web Verifier</h1>

          </div>

          {data.length > 0 && <button className="bt bd" onClick={download}>📥 Download Verified Excel</button>}

        </div>



        {/* UPLOAD */}

        {!data.length && (

          <div className="pnl fu" style={{ padding: 20 }}>

            <div className="drop" onClick={() => fileRef.current?.click()}>

              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} style={{ display: "none" }} />

              <div style={{ fontSize: 36, marginBottom: 6 }}>📂</div>

              <div style={{ fontSize: 15, fontWeight: 600, color: "#67e8f9" }}>Upload your Excel file</div>

              <div style={{ fontSize: 12, color: "#4b5563", marginTop: 3 }}>.xlsx or .xls — all rows will be web-verified</div>

            </div>

            {err && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>⚠ {err}</div>}

          </div>

        )}



        {/* DATA LOADED */}

        {data.length > 0 && (

          <div className="fu">



            {/* Stats bar */}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8, marginBottom: 14 }}>

              <div className="st"><div className="sn" style={{ color: "#67e8f9" }}>{data.length}</div><div className="sl">Rows</div></div>

              <div className="st"><div className="sn" style={{ color: "#22d3ee" }}>{webCount}</div><div className="sl">Web verified</div></div>

              <div className="st"><div className="sn" style={{ color: "#ef4444" }}>{naCount}</div><div className="sl">Empty cells</div></div>

              <div className="st"><div className="sn" style={{ color: "#34d399" }}>{data.filter(r => (r["Verification Score"] || 0) >= 90).length}</div><div className="sl">Score ≥90</div></div>

              <div className="st"><div className="sn" style={{ color: "#fbbf24" }}>{data.filter(r => { const s = r["Verification Score"] || 0; return s >= 50 && s < 90; }).length}</div><div className="sl">50–89</div></div>

              <div className="st"><div className="sn" style={{ color: "#f97316" }}>{data.filter(r => { const s = r["Verification Score"] || 0; return s > 0 && s < 50; }).length}</div><div className="sl">&lt;50</div></div>

            </div>



            {/* Action bar */}

            <div className="pnl" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", flexWrap: "wrap" }}>

              <button className="bt bv" onClick={runVerify} disabled={busy}>

                {busy ? "⏳ Verifying..." : "🌐 Web Verify All Rows"}

              </button>

              {busy && <button className="bt bc" onClick={() => { cancel.current = true; }}>✕ Stop</button>}

              <button className="bt bd" onClick={download}>📥 Download</button>

              <button className="bt" style={{ background: "#1a1f2e", color: "#5c6578" }} onClick={() => { setData([]); setOrigData([]); setCols([]); setLogs([]); setProg({ msg: "", pct: 0, done: false }); setFileName(""); }}>

                ↻ New File

              </button>

              <div style={{ flex: 1 }} />

              <span style={{ fontSize: 11, color: "#3b4559" }}>{fileName} · Click any cell to edit</span>

            </div>



            {/* Progress */}

            {prog.msg && (

              <div className="pnl" style={{ padding: "10px 18px" }}>

                <div style={{ fontSize: 12, color: prog.done ? "#34d399" : "#22d3ee", marginBottom: busy ? 6 : 0 }}>{prog.msg}</div>

                {busy && <div className="pb"><div className="pf" style={{ width: `${prog.pct}%` }} /></div>}

              </div>

            )}



            {/* Verification log */}

            {logs.length > 0 && (

              <div className="pnl" style={{ padding: 0 }}>

                <div style={{ padding: "10px 16px 0", fontSize: 11, fontWeight: 600, color: "#3b4559" }}>

                  VERIFICATION LOG — {logs.filter(l => l.ok).length}✓ / {logs.filter(l => !l.ok).length}✗

                </div>

                <div className="log">

                  {logs.map((l, i) => <div key={i} className={l.ok ? "ok" : "no"}>{l.ok ? "✓" : "✗"} {l.text}</div>)}

                </div>

              </div>

            )}



            {/* DATA TABLE — editable */}

            <div className="pnl" style={{ padding: 0, overflow: "hidden" }}>

              <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1f2e" }}>

                <span style={{ fontSize: 12, fontWeight: 600, color: "#8b95a5" }}>Data</span>

                <div className="pg">

                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>

                  <span style={{ fontSize: 11, color: "#3b4559" }}>{page + 1}/{totalPages}</span>

                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>

                </div>

              </div>

              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 540 }}>

                <table>

                  <thead><tr><th style={{ width: 36 }}>#</th>{allCols.map(c => <th key={c}>{c}</th>)}</tr></thead>

                  <tbody>

                    {pageData.map((row, ri) => {

                      const gi = page * PS + ri;

                      return (

                        <tr key={ri}>

                          <td style={{ color: "#2a3040", cursor: "default", fontWeight: 600 }}>{gi + 1}</td>

                          {allCols.map(c => {

                            const v = String(row[c] ?? "");

                            const isEd = editCell?.row === gi && editCell?.col === c;

                            if (isEd) return (

                              <td key={c} className="ed">

                                <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}

                                  onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }} />

                              </td>

                            );

                            let cls = "";

                            if (!v || v === "N/A" || v === "(empty)" || v === "Not verified") cls = "na";

                            else if (c === "Verification Score") { const n = parseInt(v); cls = n >= 90 ? "hi" : n >= 70 ? "md" : n >= 50 ? "lo" : n > 0 ? "vl" : "na"; }

                            else if (c === "Verified Source" && v.toLowerCase().includes("web")) cls = "web";

                            return <td key={c} className={cls} title={`${v}\n\nClick to edit`} onClick={() => startEdit(ri, c)}>{v}</td>;

                          })}

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}
