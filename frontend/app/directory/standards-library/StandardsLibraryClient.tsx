"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import HamburgerMenu from "@/components/HamburgerMenu"
import { STANDARDS } from "./data"

const SCOPED_CSS = `
.stdlib-root{
  --green-900:#07351F; --green-800:#0F4B2E; --green-700:#196B24; --green-100:#D9DED8;
  --gold-600:#B7902F; --gold-500:#C9A248; --gold-200:#EBDFC0;
  --cream-50:#FBFAF6; --cream-100:#F7F4EC;
  --ink:#222222; --muted:#657269; --danger:#B23A2E; --border:#D9DED8;
  --shadow-sm:0 2px 8px color-mix(in srgb,#07351F 8%,transparent);
  --mono:var(--font-geist-mono),ui-monospace,SFMono-Regular,Menlo,monospace;
  --font:var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-family:var(--font);background:var(--cream-50);color:var(--ink);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;min-height:100vh;
  overflow-x: hidden;
}
.stdlib-root *{box-sizing:border-box;}
.stdlib-root a{color:var(--green-800);text-decoration:none;transition:color .13s ease;}
.stdlib-root a:hover{color:var(--gold-600);}
.stdlib-root ::selection{background:var(--gold-200);color:var(--green-900);}
.stdlib-root input::placeholder{color:var(--muted);}
@keyframes stdlib-fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}

.stdlib-root .stdlib-head-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 24px;
}
.stdlib-root .stdlib-head-row1 {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.stdlib-root .stdlib-head-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.stdlib-root .stdlib-head-divider {
  width: 1px;
  height: 22px;
  background: var(--border);
}
.stdlib-root .stdlib-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
}
.stdlib-root .stdlib-head-row2 {
  display: none;
}

.stdlib-root .stdlib-hero-inner {
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
.stdlib-root .stdlib-hero-count {
  text-align: right;
}
.stdlib-root .stdlib-main-wrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px 72px;
}
.stdlib-root .stdlib-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: -28px;
  position: relative;
  z-index: 10;
}
.stdlib-root .stdlib-filter-panel {
  position: sticky;
  top: 63px;
  z-index: 30;
  margin-top: 20px;
  background: color-mix(in srgb, var(--cream-50) 90%, transparent);
  backdrop-filter: blur(8px);
  padding: 12px 0;
}
.stdlib-root .stdlib-card-body {
  padding: 18px 22px;
}
.stdlib-root .stdlib-card-expanded {
  padding: 4px 22px 20px;
}
.stdlib-root .stdlib-card-foot {
  padding: 10px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stdlib-root .stdlib-footer-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 38px 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.stdlib-root .stdlib-footer-note {
  font-size: 11.5px;
  color: color-mix(in srgb, var(--cream-50) 60%, transparent);
  max-width: 540px;
  line-height: 1.6;
  text-align: right;
}

@media (max-width: 960px) {
  .stdlib-root .stdlib-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .stdlib-root .stdlib-grid2 {
    grid-template-columns: 1fr !important;
  }
  .stdlib-root .stdlib-grid-lang {
    grid-template-columns: 1fr !important;
  }
}
@media (max-width: 768px) {
  .stdlib-root .stdlib-filter-panel {
    position: static !important;
    top: auto !important;
    backdrop-filter: none !important;
    padding: 8px 0 12px !important;
  }
  .stdlib-root .stdlib-grid2 {
    grid-template-columns: 1fr !important;
  }
  .stdlib-root .stdlib-grid-lang {
    grid-template-columns: 1fr !important;
  }
}
@media (max-width: 640px) {
  .stdlib-root .stdlib-head-container {
    padding: 10px 16px 8px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .stdlib-root .stdlib-head-row1 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }
  .stdlib-root .stdlib-head-divider {
    display: none !important;
  }
  .stdlib-root .stdlib-head-subtitle {
    display: none !important;
  }
  .stdlib-root .stdlib-head-tag-desktop {
    display: none !important;
  }
  .stdlib-root .stdlib-head-right {
    margin-left: 0 !important;
    gap: 8px !important;
  }
  .stdlib-root .stdlib-head-row2 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding-top: 5px !important;
    border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent) !important;
  }
  .stdlib-root .stdlib-head-subtitle-mobile {
    font-size: 11.5px !important;
    font-weight: 600 !important;
    color: var(--muted) !important;
  }
  .stdlib-root .stdlib-head-tag-mobile {
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: .08em !important;
    text-transform: uppercase !important;
    color: var(--gold-600) !important;
  }
  .stdlib-root .stdlib-hero-inner {
    padding: 36px 16px 44px !important;
    gap: 20px !important;
  }
  .stdlib-root .stdlib-hero-count {
    text-align: left !important;
  }
  .stdlib-root .stdlib-main-wrap {
    padding: 0 16px 56px !important;
  }
  .stdlib-root .stdlib-stats {
    margin-top: -18px !important;
    gap: 10px !important;
  }
  .stdlib-root .stdlib-card-body {
    padding: 14px 14px !important;
  }
  .stdlib-root .stdlib-card-expanded {
    padding: 4px 14px 16px !important;
  }
  .stdlib-root .stdlib-card-foot {
    padding: 10px 14px !important;
  }
  .stdlib-root .stdlib-footer-inner {
    padding: 30px 16px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 14px !important;
  }
  .stdlib-root .stdlib-footer-note {
    text-align: left !important;
  }
}
@media (max-width: 540px) {
  .stdlib-root .stdlib-stats {
    grid-template-columns: 1fr !important;
  }
  .stdlib-root .stdlib-card-header-row {
    flex-direction: column-reverse !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  .stdlib-root .stdlib-card-id {
    align-self: flex-start !important;
  }
  .stdlib-root .stdlib-card-foot {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
  }
  .stdlib-root .stdlib-card-foot button {
    width: 100% !important;
    text-align: center !important;
  }
}
`

const REGION_COLOR: Record<string, string> = {
  International: "#2A5DA8",
  "SE Asia": "var(--green-700)",
  "Middle East": "var(--green-800)",
  Africa: "var(--gold-600)",
  "South Asia": "#6D4AA6",
  Europe: "var(--danger)",
}
const rc = (r: string) => REGION_COLOR[r] ?? "var(--green-800)"

const kicker: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--gold-600)" }

export default function StandardsLibraryClient() {
  const all = STANDARDS
  const [query, setQuery] = useState("")
  const [region, setRegion] = useState("ALL")
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const { regionTabs, filtered, stats, countLabel } = useMemo(() => {
    const q = query.trim().toLowerCase()

    const regions = [...new Set(all.map((i) => i.region))].filter(Boolean)
    const regionTabs = [{ id: "ALL", label: "All regions", n: all.length }].concat(
      regions.map((r) => ({ id: r, label: r, n: all.filter((i) => i.region === r).length })),
    ).map((t) => ({ ...t, active: region === t.id }))

    const filtered = all.filter(
      (i) => (region === "ALL" || i.region === region) && (!q || JSON.stringify(i).toLowerCase().includes(q)),
    )

    const bodies = [...new Set(all.map((i) => (i.orgCountry || "").split("·")[0].trim()))].filter(Boolean).length
    const stats = [
      { value: all.length, label: "Standards documented", accent: "var(--green-800)" },
      { value: regions.length, label: "Regions covered", accent: "var(--green-700)" },
      { value: all.filter((i) => /international/i.test(i.region)).length, label: "International standards", accent: "var(--gold-500)" },
      { value: bodies, label: "Issuing bodies", accent: "var(--green-800)" },
    ]

    const isFiltered = region !== "ALL" || !!q
    const countLabel = isFiltered ? `Showing ${filtered.length} of ${all.length} standards` : `Showing all ${all.length} standards`

    return { regionTabs, filtered, stats, countLabel }
  }, [all, query, region])

  return (
    <div className="stdlib-root">
      <style>{SCOPED_CSS}</style>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "color-mix(in srgb,var(--cream-50) 88%,transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div className="stdlib-head-container">
          <div className="stdlib-head-row1">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="30" height="30" viewBox="-16 -16 32 32" aria-hidden="true">
                <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" />
                <path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke="var(--green-800)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)" }}>Halal<span style={{ color: "var(--gold-600)" }}>One</span></div>
            </Link>
            <div className="stdlib-head-divider" />
            <div className="stdlib-head-subtitle">Standards &amp; Compliance Library</div>
            <div className="stdlib-head-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="stdlib-head-tag-desktop" style={{ ...kicker }}>Module 5 · Standards</span>
              <HamburgerMenu />
            </div>
          </div>
          <div className="stdlib-head-row2">
            <span className="stdlib-head-subtitle-mobile">Standards &amp; Compliance Library</span>
            <span className="stdlib-head-tag-mobile">Module 5 · Standards</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 3L54 30L30 57L6 30Z' fill='none' stroke='rgba(251,250,246,0.05)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px" }} />
        <div className="stdlib-hero-inner">
          <div style={{ maxWidth: 640 }}>
            <div style={{ ...kicker, letterSpacing: ".14em", color: "var(--gold-500)" }}>Regulatory Intelligence · Standards</div>
            <h1 style={{ margin: "16px 0 0", fontSize: "clamp(26px,3.6vw,42px)", lineHeight: 1.07, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", textWrap: "balance" }}>The world&rsquo;s halal standards, in one library.</h1>
            <p style={{ margin: "15px 0 0", fontSize: "clamp(14px,1.8vw,16px)", lineHeight: 1.6, color: "color-mix(in srgb,var(--cream-50) 74%,transparent)", maxWidth: 560 }}>International, regional and national halal standards with full key requirements — OIC/SMIIC, MS, GSO, SNI, SFDA, SANS, PS, TSE, Codex and HFA — cross-referenced and searchable.</p>
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "color-mix(in srgb,var(--cream-50) 55%,transparent)" }}>ICCD Technology Team · Content reference — consult the official published standard for full text.</p>
          </div>
          <div className="stdlib-hero-count">
            <div style={{ fontSize: "clamp(44px,6vw,60px)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "#fff" }}>{all.length}</div>
            <div style={{ ...kicker, letterSpacing: ".14em", color: "var(--gold-500)", marginTop: 6 }}>Standards documented</div>
          </div>
        </div>
      </section>

      <div className="stdlib-main-wrap">
        {/* STATS */}
        <div className="stdlib-stats">
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--shadow-sm)", borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginTop: 7 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="stdlib-filter-panel">
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 15px" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="#657269" strokeWidth="2" /><path d="m21 21-4.35-4.35" stroke="#657269" strokeWidth="2" strokeLinecap="round" /></svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search standard code, title, body, sector…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font)", fontSize: 14, color: "var(--green-900)" }} />
              {query.length > 0 && <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: "2px 4px" }}>✕</button>}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
              {regionTabs.map((t) => (
                <button key={t.id} onClick={() => setRegion(t.id)} style={t.active
                  ? { padding: "8px 15px", borderRadius: 10, border: "1px solid var(--green-800)", background: "var(--green-800)", color: "#fff", cursor: "pointer", fontFamily: "var(--font)", fontSize: 12, fontWeight: 700 }
                  : { padding: "8px 15px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font)", fontSize: 12, fontWeight: 700 }}>
                  {t.label} <span style={{ opacity: t.active ? 0.6 : 0.55 }}>{t.n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 2px 14px" }}>{countLabel}</div>

        {/* CARDS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((c) => {
            const isOpen = !!open[c.id]
            const color = rc(c.region)
            const languages = c.languages || "—"
            const toggle = () => setOpen((s) => ({ ...s, [c.id]: !s[c.id] }))
            return (
              <article key={c.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)", animation: "stdlib-fade .3s ease both", borderLeft: `4px solid ${color}` }}>
                <div className="stdlib-card-body">
                  <div className="stdlib-card-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "var(--green-900)", background: "var(--cream-100)", padding: "4px 11px", borderRadius: 7, border: "1px solid var(--border)" }}>{c.code}</span>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: `color-mix(in srgb,${color} 12%,transparent)`, color, border: `1px solid color-mix(in srgb,${color} 32%,transparent)` }}>{c.region}</span>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "color-mix(in srgb,var(--green-700) 12%,transparent)", color: "var(--green-700)", border: "1px solid color-mix(in srgb,var(--green-700) 30%,transparent)" }}>{c.status}</span>
                        {c.access && <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "color-mix(in srgb,var(--gold-500) 16%,transparent)", color: "var(--gold-600)", border: "1px solid color-mix(in srgb,var(--gold-500) 38%,transparent)" }}>{c.access}</span>}
                        {c.year && <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{c.year}</span>}
                        {c.supersedes && <span style={{ fontSize: 10.5, color: "var(--muted)" }}>Supersedes {c.supersedes}</span>}
                      </div>
                      <h2 style={{ fontSize: "clamp(16px,2.2vw,18px)", fontWeight: 800, letterSpacing: "-0.015em", color: "var(--green-900)", lineHeight: 1.3, margin: "0 0 5px" }}>{c.title}</h2>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>{c.orgCountry}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 11 }}>
                        {c.tags.map((tg) => (
                          <span key={tg} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "color-mix(in srgb,var(--gold-500) 12%,transparent)", color: "var(--gold-600)", border: "1px solid color-mix(in srgb,var(--gold-500) 30%,transparent)" }}>{tg}</span>
                        ))}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.65, margin: 0 }}>{c.description}</p>
                    </div>
                    <div className="stdlib-card-id" style={{ flex: "0 0 auto", fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--muted)", background: "var(--cream-100)", padding: "4px 9px", borderRadius: 7, border: "1px solid var(--border)" }}>{c.id}</div>
                  </div>
                </div>

                {isOpen && (
                  <div className="stdlib-card-expanded" style={{ borderTop: "1px solid var(--cream-100)" }}>
                    <div style={{ ...kicker, margin: "14px 0 8px" }}>Key requirements</div>
                    <div className="stdlib-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px" }}>
                      {c.requirements.map((rq, ri) => (
                        <div key={ri} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "6px 0", fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5, borderBottom: "1px solid var(--cream-100)" }}>
                          <span style={{ flex: "0 0 auto", color: "var(--green-700)", fontWeight: 800, marginTop: 1 }}>✓</span><span>{rq}</span>
                        </div>
                      ))}
                    </div>

                    <div className="stdlib-grid2" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <div style={{ ...kicker, marginBottom: 7 }}>Adopted / aligned by</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {c.adoptedBy.length > 0 ? c.adoptedBy.map((a) => (
                            <span key={a} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: "color-mix(in srgb,var(--green-700) 10%,transparent)", color: "var(--green-800)", border: "1px solid color-mix(in srgb,var(--green-700) 26%,transparent)" }}>{a}</span>
                          )) : <span style={{ fontSize: 11.5, color: "var(--muted)" }}>—</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...kicker, marginBottom: 7 }}>Related standards</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {c.related.length > 0 ? c.related.map((rl) => (
                            <span key={rl} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", background: "var(--cream-100)", color: "var(--green-800)", border: "1px solid var(--border)" }}>{rl}</span>
                          )) : <span style={{ fontSize: 11.5, color: "var(--muted)" }}>—</span>}
                        </div>
                      </div>
                    </div>

                    <div className="stdlib-grid-lang" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, alignItems: "start" }}>
                      <div>
                        <div style={{ ...kicker, marginBottom: 5 }}>Languages</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5 }}>{languages}</div>
                      </div>
                      {c.note && (
                        <div style={{ fontSize: 12, color: "var(--green-900)", lineHeight: 1.6, background: "color-mix(in srgb,var(--gold-500) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--gold-500) 34%,transparent)", borderRadius: 10, padding: "12px 14px" }}>{c.note}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="stdlib-card-foot" style={{ borderTop: "1px solid var(--cream-100)", background: "color-mix(in srgb,var(--cream-100) 45%,transparent)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Languages: {languages}</div>
                  <button onClick={toggle} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "6px 14px", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700, color: "var(--green-800)", cursor: "pointer" }}>{isOpen ? "Hide requirements ▴" : "View requirements ▾"}</button>
                </div>
              </article>
            )
          })}
        </div>

        {all.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green-900)" }}>No standards match your filters.</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try a different term or reset the region filter.</div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)" }}>
        <div className="stdlib-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <svg width="28" height="28" viewBox="-16 -16 32 32" aria-hidden="true">
              <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" />
              <path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke="var(--cream-50)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Halal<span style={{ color: "var(--gold-500)" }}>One</span></div>
              <div style={{ fontSize: 11, color: "color-mix(in srgb,var(--cream-50) 60%,transparent)" }}>Standards &amp; Compliance Library · Module 5</div>
            </div>
          </div>
          <div className="stdlib-footer-note">Summaries are for orientation only and are not a substitute for the official published standard. Always obtain the authoritative text from the issuing body before certifying or exporting.</div>
        </div>
      </footer>
    </div>
  )
}
