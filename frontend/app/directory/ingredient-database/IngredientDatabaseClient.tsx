"use client"

import { Fragment, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import HamburgerMenu from "@/components/HamburgerMenu"
import { INGREDIENTS } from "./data"

const SCOPED_CSS = `
.ingdb-root {
  --green-900:#07351F; --green-800:#0F4B2E; --green-700:#196B24; --green-100:#D9DED8;
  --gold-600:#B7902F; --gold-500:#C9A248; --gold-200:#EBDFC0;
  --cream-50:#FBFAF6; --cream-100:#F7F4EC;
  --ink:#222222; --muted:#657269; --danger:#B23A2E; --border:#D9DED8;
  --shadow-sm:0 2px 8px color-mix(in srgb,#07351F 8%,transparent);
  --mono:var(--font-geist-mono),ui-monospace,SFMono-Regular,Menlo,monospace;
  --font:var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-family:var(--font);background:var(--cream-50);color:var(--ink);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;min-height:100vh;
}
.ingdb-root *{box-sizing:border-box;}
.ingdb-root a{color:var(--green-800);text-decoration:none;transition:color .13s ease;}
.ingdb-root a:hover{color:var(--gold-600);}
.ingdb-root ::selection{background:var(--gold-200);color:var(--green-900);}
.ingdb-root input::placeholder{color:var(--muted);}

.ingdb-root .ingdb-head-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 24px;
}
.ingdb-root .ingdb-head-row1 {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.ingdb-root .ingdb-head-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.ingdb-root .ingdb-head-divider {
  width: 1px;
  height: 22px;
  background: var(--border);
}
.ingdb-root .ingdb-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
}
.ingdb-root .ingdb-head-row2 {
  display: none;
}

.ingdb-root .ingdb-hero-inner {
  position: relative;
  max-width: 1240px;
  margin: 0 auto;
  padding: 52px 24px 58px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
}
.ingdb-root .ingdb-hero-count {
  text-align: right;
}
.ingdb-root .ingdb-main-wrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px 72px;
}
.ingdb-root .ingdb-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: -28px;
  position: relative;
  z-index: 10;
}
.ingdb-root .ingdb-detail {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 18px;
  padding-top: 14px;
}
.ingdb-root .ingdb-footer-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 38px 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.ingdb-root .ingdb-footer-note {
  font-size: 11.5px;
  color: color-mix(in srgb, var(--cream-50) 60%, transparent);
  max-width: 540px;
  line-height: 1.6;
  text-align: right;
}

.ingdb-root .ingdb-filter-panel {
  position: sticky;
  top: 63px;
  z-index: 30;
  margin-top: 20px;
  background: color-mix(in srgb, var(--cream-50) 90%, transparent);
  backdrop-filter: blur(8px);
  padding: 12px 0;
}
.ingdb-root .ingdb-table-desktop {
  display: block;
}
.ingdb-root .ingdb-cards-mobile {
  display: none;
}

@media (max-width: 960px) {
  .ingdb-root .ingdb-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
@media (max-width: 768px) {
  .ingdb-root .ingdb-filter-panel {
    position: static !important;
    top: auto !important;
    backdrop-filter: none !important;
    padding: 8px 0 12px !important;
  }
  .ingdb-root .ingdb-table-desktop {
    display: none !important;
  }
  .ingdb-root .ingdb-cards-mobile {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
  }
  .ingdb-root .ingdb-detail {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }
}
@media (max-width: 640px) {
  .ingdb-root .ingdb-head-container {
    padding: 10px 16px 8px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .ingdb-root .ingdb-head-row1 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }
  .ingdb-root .ingdb-head-divider {
    display: none !important;
  }
  .ingdb-root .ingdb-head-subtitle {
    display: none !important;
  }
  .ingdb-root .ingdb-head-tag-desktop {
    display: none !important;
  }
  .ingdb-root .ingdb-head-right {
    margin-left: 0 !important;
    gap: 8px !important;
  }
  .ingdb-root .ingdb-head-row2 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding-top: 5px !important;
    border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent) !important;
  }
  .ingdb-root .ingdb-head-subtitle-mobile {
    font-size: 11.5px !important;
    font-weight: 600 !important;
    color: var(--muted) !important;
  }
  .ingdb-root .ingdb-head-tag-mobile {
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: .08em !important;
    text-transform: uppercase !important;
    color: var(--gold-600) !important;
  }
  .ingdb-root .ingdb-hero-inner {
    padding: 36px 16px 44px !important;
    gap: 20px !important;
  }
  .ingdb-root .ingdb-hero-count {
    text-align: left !important;
  }
  .ingdb-root .ingdb-main-wrap {
    padding: 0 16px 56px !important;
  }
  .ingdb-root .ingdb-stats {
    margin-top: -18px !important;
    gap: 10px !important;
  }
  .ingdb-root .ingdb-footer-inner {
    padding: 30px 16px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 14px !important;
  }
  .ingdb-root .ingdb-footer-note {
    text-align: left !important;
  }
}
@media (max-width: 540px) {
  .ingdb-root .ingdb-stats {
    grid-template-columns: 1fr !important;
  }
}
`

const CERTS = ["JAKIM", "IFANCA", "SANHA", "ESMA", "MUI"] as const

const kicker: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--gold-600)" }
const th: CSSProperties = { textAlign: "left", padding: "12px 12px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-200)" }

function statusColor(s: string) {
  const t = (s || "").toLowerCase()
  if (t.startsWith("halal")) return { fg: "var(--green-700)", bg: "color-mix(in srgb,var(--green-700) 12%,transparent)", border: "color-mix(in srgb,var(--green-700) 30%,transparent)", dot: "var(--green-700)" }
  if (t.startsWith("haram")) return { fg: "var(--danger)", bg: "color-mix(in srgb,var(--danger) 12%,transparent)", border: "color-mix(in srgb,var(--danger) 30%,transparent)", dot: "var(--danger)" }
  return { fg: "var(--gold-600)", bg: "color-mix(in srgb,var(--gold-500) 16%,transparent)", border: "color-mix(in srgb,var(--gold-500) 38%,transparent)", dot: "var(--gold-500)" }
}
function shortStatus(s: string) {
  if (/^halal/i.test(s)) return "Halal"
  if (/^haram/i.test(s)) return "Haram"
  if (/depends/i.test(s)) return "Depends"
  if (/doubtful/i.test(s)) return "Doubtful"
  return s
}
function certSym(v: string) {
  const t = (v || "").toLowerCase()
  if (t.startsWith("halal")) return { sym: "H", bg: "color-mix(in srgb,var(--green-700) 15%,transparent)", fg: "var(--green-700)" }
  if (t.startsWith("haram")) return { sym: "✕", bg: "color-mix(in srgb,var(--danger) 14%,transparent)", fg: "var(--danger)" }
  if (t && t !== "—" && t !== "-") return { sym: "?", bg: "color-mix(in srgb,var(--gold-500) 20%,transparent)", fg: "var(--gold-600)" }
  return { sym: "–", bg: "var(--cream-100)", fg: "var(--muted)" }
}

const STATUS_GROUPS = [
  { id: "ALL", label: "All", test: () => true },
  { id: "Halal", label: "Halal", test: (s: string) => /^halal/i.test(s) },
  { id: "Depends", label: "Depends on source", test: (s: string) => /depends/i.test(s) },
  { id: "Doubtful", label: "Doubtful", test: (s: string) => /doubtful/i.test(s) },
  { id: "Haram", label: "Haram", test: (s: string) => /^haram/i.test(s) },
]

export default function IngredientDatabaseClient() {
  const all = INGREDIENTS
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("ALL")
  const [cat, setCat] = useState("ALL")
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const { statusTabs, catTabs, filtered, stats, countLabel } = useMemo(() => {
    const q = query.trim().toLowerCase()

    const statusTabs = STATUS_GROUPS.map((g) => {
      const n = g.id === "ALL" ? all.length : all.filter((i) => g.test(i.status)).length
      const color = g.id === "ALL" ? "var(--green-800)" : statusColor(g.id).dot
      return { id: g.id, label: g.label, n, color, active: status === g.id }
    })

    const cats = [...new Set(all.map((i) => i.category))].sort()
    const catTabs = [{ id: "ALL", label: "All categories", n: all.length }].concat(
      cats.map((c) => ({ id: c, label: c, n: all.filter((i) => i.category === c).length })),
    ).map((t) => ({ ...t, active: cat === t.id }))

    const matchStatus = (s: string) => status === "ALL" || STATUS_GROUPS.find((g) => g.id === status)!.test(s)
    const filtered = all.filter((i) => matchStatus(i.status) && (cat === "ALL" || i.category === cat) && (!q || JSON.stringify(i).toLowerCase().includes(q)))

    const cnt = (test: (s: string) => boolean) => all.filter((i) => test(i.status)).length
    const stats = [
      { value: all.length, label: "Ingredients catalogued", accent: "var(--green-800)" },
      { value: cnt((s) => /^halal/i.test(s)), label: "Clearly halal", accent: "var(--green-700)" },
      { value: cnt((s) => /depends|doubtful/i.test(s)), label: "Depends on source / doubtful", accent: "var(--gold-500)" },
      { value: cnt((s) => /^haram/i.test(s)), label: "Haram", accent: "var(--danger)" },
    ]

    const isFiltered = status !== "ALL" || cat !== "ALL" || !!q
    const countLabel = isFiltered ? `Showing ${filtered.length} of ${all.length} ingredients` : `Showing all ${all.length} ingredients`

    return { statusTabs, catTabs, filtered, stats, countLabel }
  }, [all, query, status, cat])

  return (
    <div className="ingdb-root">
      <style>{SCOPED_CSS}</style>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "color-mix(in srgb,var(--cream-50) 88%,transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div className="ingdb-head-container">
          <div className="ingdb-head-row1">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="30" height="30" viewBox="-16 -16 32 32" aria-hidden="true">
                <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" />
                <path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke="var(--green-800)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)" }}>
                Halal<span style={{ color: "var(--gold-600)" }}>One</span>
              </div>
            </Link>
            <div className="ingdb-head-divider" />
            <div className="ingdb-head-subtitle">Ingredient &amp; E-Number Database</div>
            <div className="ingdb-head-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ ...kicker }} className="ingdb-head-tag-desktop">Module 3 · Ingredients</span>
              <HamburgerMenu />
            </div>
          </div>
          <div className="ingdb-head-row2">
            <span className="ingdb-head-subtitle-mobile">Ingredient &amp; E-Number Database</span>
            <span className="ingdb-head-tag-mobile">Module 3 · Ingredients</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 3L54 30L30 57L6 30Z' fill='none' stroke='rgba(251,250,246,0.05)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px" }} />
        <div className="ingdb-hero-inner" style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "52px 24px 58px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 32 }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ ...kicker, letterSpacing: ".14em", color: "var(--gold-500)" }}>Regulatory Intelligence · Ingredients</div>
            <h1 style={{ margin: "16px 0 0", fontSize: "clamp(28px,3.6vw,42px)", lineHeight: 1.07, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", textWrap: "balance" }}>Halal status of every E-number and additive.</h1>
            <p style={{ margin: "15px 0 0", fontSize: 16, lineHeight: 1.6, color: "color-mix(in srgb,var(--cream-50) 74%,transparent)", maxWidth: 560 }}>Halal classification of food additives, E-numbers and common ingredients — with source origin, the reasoning, and side-by-side rulings from five major certification bodies.</p>
            <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "color-mix(in srgb,var(--cream-50) 55%,transparent)" }}>ICCD Technology Team · Content reference — verify against the latest cert-body guidance.</p>
          </div>
          <div className="ingdb-hero-count" style={{ textAlign: "right" }}>
            <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "#fff" }}>{all.length}</div>
            <div style={{ ...kicker, letterSpacing: ".14em", color: "var(--gold-500)", marginTop: 6 }}>Ingredients at launch</div>
          </div>
        </div>
      </section>

      <div className="ingdb-main-wrap" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px 72px" }}>
        {/* STATS */}
        <div className="ingdb-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: -28, position: "relative", zIndex: 10 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--shadow-sm)", borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginTop: 7 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="ingdb-filter-panel">
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 15px" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="#657269" strokeWidth="2" /><path d="m21 21-4.35-4.35" stroke="#657269" strokeWidth="2" strokeLinecap="round" /></svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search E-number, ingredient, synonym, source…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font)", fontSize: 14, color: "var(--green-900)" }} />
              {query.length > 0 && <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: "2px 4px" }}>✕</button>}
            </div>

            <div style={{ ...kicker, margin: "13px 2px 7px" }}>Halal status</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {statusTabs.map((t) => (
                <button key={t.id} onClick={() => setStatus(t.id)} style={t.active
                  ? { padding: "7px 13px", borderRadius: 999, border: `1px solid ${t.color}`, background: t.color, color: "#fff", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700 }
                  : { padding: "7px 13px", borderRadius: 999, border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700 }}>
                  {t.label} <span style={{ opacity: t.active ? 0.7 : 0.6 }}>{t.n}</span>
                </button>
              ))}
            </div>

            <div style={{ ...kicker, margin: "13px 2px 7px" }}>Category</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {catTabs.map((t) => (
                <button key={t.id} onClick={() => setCat(t.id)} style={t.active
                  ? { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--green-800)", background: "var(--green-800)", color: "#fff", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700 }
                  : { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11, fontWeight: 600 }}>
                  {t.label} <span style={{ opacity: t.active ? 0.6 : 0.55 }}>{t.n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 2px 12px", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{countLabel}</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green-700)" }} />Halal</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gold-500)" }} />Depends / doubtful</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--danger)" }} />Haram</span>
          </div>
        </div>

        {/* TABLE (DESKTOP) */}
        <div className="ingdb-table-desktop" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ background: "var(--green-800)" }}>
                  <th style={{ ...th, padding: "12px 16px" }}>E-No.</th>
                  <th style={th}>Ingredient</th>
                  <th style={th}>Category</th>
                  <th style={th}>Status</th>
                  <th style={th}>JAKIM · IFANCA · SANHA · ESMA · MUI</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const isOpen = !!open[r.enumber]
                  const sc = statusColor(r.status)
                  const rowBg = isOpen ? "var(--cream-100)" : idx % 2 ? "color-mix(in srgb,var(--cream-100) 40%,transparent)" : "#fff"
                  const toggle = () => setOpen((s) => ({ ...s, [r.enumber]: !s[r.enumber] }))
                  return (
                    <Fragment key={r.enumber}>
                      <tr onClick={toggle} style={{ borderTop: "1px solid var(--cream-100)", cursor: "pointer", background: rowBg }}>
                        <td style={{ padding: "12px 16px", verticalAlign: "top" }}><span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--green-800)" }}>{r.enumber}</span></td>
                        <td style={{ padding: "12px 12px", verticalAlign: "top" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green-900)", lineHeight: 1.3 }}>{r.name}</div>
                          {r.aka && r.aka !== "—" && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{r.aka}</div>}
                        </td>
                        <td style={{ padding: "12px 12px", verticalAlign: "top" }}><span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--cream-100)", color: "var(--muted)", border: "1px solid var(--border)" }}>{r.category}</span></td>
                        <td style={{ padding: "12px 12px", verticalAlign: "top" }}><span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 800, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>{shortStatus(r.status)}</span></td>
                        <td style={{ padding: "12px 12px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", gap: 5 }}>
                            {CERTS.map((cn) => {
                              const d = certSym(r.certs[cn])
                              return <span key={cn} title={`${cn}: ${r.certs[cn] || "—"}`} style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: d.bg, color: d.fg }}>{d.sym}</span>
                            })}
                          </div>
                        </td>
                        <td style={{ padding: "12px 12px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>{isOpen ? "▲" : "▾"}</td>
                      </tr>
                      {isOpen && (
                        <tr style={{ background: "var(--cream-100)" }}>
                          <td colSpan={6} style={{ padding: "0 16px 18px" }}>
                            <div className="ingdb-detail" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, paddingTop: 14 }}>
                              <div>
                                <div style={{ ...kicker, marginBottom: 5 }}>Reasoning</div>
                                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>{r.reason}</div>
                                <div style={{ ...kicker, margin: "14px 0 5px" }}>Origin / source</div>
                                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{r.sources}</div>
                              </div>
                              <div>
                                <div style={{ ...kicker, marginBottom: 7 }}>Certification body rulings</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                                  {CERTS.map((cn) => (
                                    <div key={cn} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                                      <span style={{ fontWeight: 700, color: "var(--green-900)" }}>{cn}</span>
                                      <span style={{ fontWeight: 700, color: certSym(r.certs[cn]).fg }}>{r.certs[cn] || "—"}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ ...kicker, margin: "14px 0 5px" }}>Notes</div>
                                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55 }}>{r.notes}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {all.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green-900)" }}>No ingredients match your filters.</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Try a different term or reset the status and category filters.</div>
            </div>
          )}
        </div>

        {/* CARDS (MOBILE) */}
        <div className="ingdb-cards-mobile">
          {filtered.map((r) => {
            const isOpen = !!open[r.enumber]
            const sc = statusColor(r.status)
            const toggle = () => setOpen((s) => ({ ...s, [r.enumber]: !s[r.enumber] }))
            return (
              <div
                key={r.enumber}
                style={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  boxShadow: "var(--shadow-sm)",
                  cursor: "pointer",
                }}
                onClick={toggle}
              >
                {/* Header row: E-number, Name, and Halal Status Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800, color: "var(--green-800)" }}>{r.enumber}</span>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--green-900)", lineHeight: 1.3 }}>{r.name}</span>
                    </div>
                    {r.aka && r.aka !== "—" && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>aka: {r.aka}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 800, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                      {shortStatus(r.status)}
                    </span>
                  </div>
                </div>

                {/* Badges row: Category + Certifier Quick Icons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: "var(--cream-100)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                    {r.category}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", marginRight: 2 }}>Certs:</span>
                    {CERTS.map((cn) => {
                      const d = certSym(r.certs[cn])
                      return (
                        <span key={cn} title={`${cn}: ${r.certs[cn] || "—"}`} style={{ width: 20, height: 20, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: d.bg, color: d.fg }}>
                          {d.sym}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Expand / Collapse trigger */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--cream-100)", fontSize: 11.5, color: "var(--gold-600)", fontWeight: 700 }}>
                  <span>{isOpen ? "Hide details" : "View details & rulings"}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{isOpen ? "▲" : "▾"}</span>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ ...kicker, marginBottom: 5 }}>Reasoning</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6 }}>{r.reason}</div>

                    <div style={{ ...kicker, margin: "14px 0 5px" }}>Origin / source</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55 }}>{r.sources}</div>

                    <div style={{ ...kicker, margin: "14px 0 7px" }}>Certification body rulings</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                      {CERTS.map((cn) => (
                        <div key={cn} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: "var(--green-900)" }}>{cn}</span>
                          <span style={{ fontWeight: 700, color: certSym(r.certs[cn]).fg }}>{r.certs[cn] || "—"}</span>
                        </div>
                      ))}
                    </div>

                    {r.notes && (
                      <>
                        <div style={{ ...kicker, margin: "14px 0 5px" }}>Notes</div>
                        <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.55 }}>{r.notes}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {all.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", background: "#fff", border: "1px solid var(--border)", borderRadius: 14, color: "var(--muted)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green-900)" }}>No ingredients match your filters.</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>Try a different term or reset the status and category filters.</div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)" }}>
        <div className="ingdb-footer-inner" style={{ maxWidth: 1240, margin: "0 auto", padding: "38px 24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <svg width="28" height="28" viewBox="-16 -16 32 32" aria-hidden="true"><path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" /><path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke="var(--cream-50)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Halal<span style={{ color: "var(--gold-500)" }}>One</span></div>
              <div style={{ fontSize: 11, color: "color-mix(in srgb,var(--cream-50) 60%,transparent)" }}>Ingredient &amp; E-Number Database · Module 3</div>
            </div>
          </div>
          <div className="ingdb-footer-note" style={{ fontSize: 11.5, color: "color-mix(in srgb,var(--cream-50) 60%,transparent)", maxWidth: 540, lineHeight: 1.6, textAlign: "right" }}>Cert-body rulings can differ and change. Where a status is &quot;depends on source&quot;, always confirm the specific product&apos;s origin and processing with its certifier before relying on this reference.</div>
        </div>
      </footer>
    </div>
  )
}
