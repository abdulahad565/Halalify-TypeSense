"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import HamburgerMenu from "@/components/HamburgerMenu"
import { ARTICLES, type Priority } from "./data"

const SCOPED_CSS = `
.newsroom-root{
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
.newsroom-root *{box-sizing:border-box;}
.newsroom-root a{color:var(--green-800);text-decoration:none;transition:color .13s ease;}
.newsroom-root a:hover{color:var(--gold-600);}
.newsroom-root ::selection{background:var(--gold-200);color:var(--green-900);}
.newsroom-root input::placeholder{color:var(--muted);}
@keyframes newsroom-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}

.newsroom-root .newsroom-head-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 12px 24px;
}
.newsroom-root .newsroom-head-row1 {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.newsroom-root .newsroom-head-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.newsroom-root .newsroom-head-divider {
  width: 1px;
  height: 22px;
  background: var(--border);
}
.newsroom-root .newsroom-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
}
.newsroom-root .newsroom-head-row2 {
  display: none;
}

.newsroom-root .newsroom-hero-inner {
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
  padding: 52px 24px 58px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
}
.newsroom-root .newsroom-hero-count {
  text-align: right;
}
.newsroom-root .newsroom-main-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px 72px;
}
.newsroom-root .newsroom-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: -28px;
  position: relative;
  z-index: 10;
}
.newsroom-root .newsroom-filter-panel {
  position: sticky;
  top: 63px;
  z-index: 30;
  margin-top: 16px;
  background: color-mix(in srgb, var(--cream-50) 90%, transparent);
  backdrop-filter: blur(8px);
  padding: 10px 0;
}
.newsroom-root .newsroom-card-body {
  padding: 18px 22px;
}
.newsroom-root .newsroom-card-expanded {
  padding: 4px 22px 20px;
}
.newsroom-root .newsroom-card-foot {
  padding: 10px 22px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.newsroom-root .newsroom-detailgrid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.newsroom-root .newsroom-footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 38px 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.newsroom-root .newsroom-footer-note {
  font-size: 11.5px;
  color: color-mix(in srgb, var(--cream-50) 60%, transparent);
  max-width: 520px;
  line-height: 1.6;
  text-align: right;
}

@media (max-width: 1024px) {
  .newsroom-root .newsroom-stats {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}
@media (max-width: 768px) {
  .newsroom-root .newsroom-filter-panel {
    position: static !important;
    top: auto !important;
    backdrop-filter: none !important;
    padding: 8px 0 12px !important;
  }
}
@media (max-width: 760px) {
  .newsroom-root .newsroom-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .newsroom-root .newsroom-detailgrid {
    grid-template-columns: 1fr !important;
  }
}
@media (max-width: 640px) {
  .newsroom-root .newsroom-head-container {
    padding: 10px 16px 8px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .newsroom-root .newsroom-head-row1 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }
  .newsroom-root .newsroom-head-divider {
    display: none !important;
  }
  .newsroom-root .newsroom-head-subtitle {
    display: none !important;
  }
  .newsroom-root .newsroom-head-tag-desktop {
    display: none !important;
  }
  .newsroom-root .newsroom-head-right {
    margin-left: 0 !important;
    gap: 8px !important;
  }
  .newsroom-root .newsroom-head-row2 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding-top: 5px !important;
    border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent) !important;
  }
  .newsroom-root .newsroom-head-subtitle-mobile {
    font-size: 11.5px !important;
    font-weight: 600 !important;
    color: var(--muted) !important;
  }
  .newsroom-root .newsroom-head-tag-mobile {
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: .08em !important;
    text-transform: uppercase !important;
    color: var(--gold-600) !important;
  }
  .newsroom-root .newsroom-hero-inner {
    padding: 36px 16px 44px !important;
    gap: 20px !important;
  }
  .newsroom-root .newsroom-hero-count {
    text-align: left !important;
  }
  .newsroom-root .newsroom-main-wrap {
    padding: 0 16px 56px !important;
  }
  .newsroom-root .newsroom-stats {
    margin-top: -18px !important;
    gap: 10px !important;
  }
  .newsroom-root .newsroom-card-body {
    padding: 14px 14px !important;
  }
  .newsroom-root .newsroom-card-expanded {
    padding: 4px 14px 16px !important;
  }
  .newsroom-root .newsroom-card-foot {
    padding: 10px 14px !important;
  }
  .newsroom-root .newsroom-footer-inner {
    padding: 30px 16px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 14px !important;
  }
  .newsroom-root .newsroom-footer-note {
    text-align: left !important;
  }
}
@media (max-width: 540px) {
  .newsroom-root .newsroom-card-header-row {
    flex-direction: column-reverse !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  .newsroom-root .newsroom-card-id {
    align-self: flex-start !important;
  }
  .newsroom-root .newsroom-card-foot button {
    width: 100% !important;
    text-align: center !important;
  }
}
@media (max-width: 480px) {
  .newsroom-root .newsroom-stats {
    grid-template-columns: 1fr !important;
  }
}
`

const TYPE_ACCENT: Record<string, string> = {
  "Regulatory Alert": "var(--danger)",
  "Product Recall": "var(--danger)",
  "Certification Update": "var(--green-700)",
  "Standard Change": "var(--gold-500)",
  "Market Update": "var(--green-800)",
  "Trade News": "var(--green-800)",
  "Industry News": "var(--muted)",
}
const accentOf = (t: string) => TYPE_ACCENT[t] ?? "var(--green-800)"

function priStyle(p: Priority | "ALL") {
  if (p === "HIGH") return { dark: "var(--danger)", bg: "color-mix(in srgb,var(--danger) 12%,transparent)", fg: "var(--danger)", border: "color-mix(in srgb,var(--danger) 30%,transparent)" }
  if (p === "MEDIUM") return { dark: "var(--gold-600)", bg: "color-mix(in srgb,var(--gold-500) 16%,transparent)", fg: "var(--gold-600)", border: "color-mix(in srgb,var(--gold-500) 38%,transparent)" }
  return { dark: "var(--green-700)", bg: "color-mix(in srgb,var(--green-700) 10%,transparent)", fg: "var(--green-700)", border: "color-mix(in srgb,var(--green-700) 28%,transparent)" }
}

const kicker: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--gold-600)" }

export default function NewsAlertsClient() {
  const all = ARTICLES
  const [query, setQuery] = useState("")
  const [type, setType] = useState("ALL")
  const [pri, setPri] = useState("ALL")
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const { typeTabs, priTabs, filtered, stats, countLabel } = useMemo(() => {
    const q = query.trim().toLowerCase()

    const types = [...new Set(all.map((a) => a.type))].sort()
    const typeTabs = [{ id: "ALL", label: "All types", n: all.length }].concat(
      types.map((t) => ({ id: t, label: t, n: all.filter((a) => a.type === t).length })),
    ).map((t) => ({ ...t, active: type === t.id }))

    const priOrder: Priority[] = ["HIGH", "MEDIUM", "LOW"]
    const priTabs = [{ id: "ALL", label: "All priorities", n: all.length, dark: "var(--green-800)", bg: "#fff", fg: "var(--muted)", border: "var(--border)" }].concat(
      priOrder.map((p) => ({ id: p, label: p, n: all.filter((a) => a.priority === p).length, ...priStyle(p) })),
    ).map((t) => ({ ...t, active: pri === t.id }))

    const filtered = all.filter((a) => {
      const tm = type === "ALL" || a.type === type
      const pm = pri === "ALL" || a.priority === pri
      const sm = !q || JSON.stringify(a).toLowerCase().includes(q)
      return tm && pm && sm
    })

    const cnt = (t: Priority) => all.filter((a) => a.priority === t).length
    const stats = [
      { value: all.length, label: "Total articles", accent: "var(--green-800)" },
      { value: cnt("HIGH"), label: "High priority alerts", accent: "var(--danger)" },
      { value: cnt("MEDIUM"), label: "Medium priority", accent: "var(--gold-500)" },
      { value: cnt("LOW"), label: "Low / informational", accent: "var(--green-700)" },
      { value: all.filter((a) => a.type === "Product Recall").length, label: "Product recalls", accent: "var(--danger)" },
    ]

    const isFiltered = type !== "ALL" || pri !== "ALL" || !!q
    const countLabel = isFiltered ? `Showing ${filtered.length} of ${all.length} articles` : `Showing all ${all.length} articles`

    return { typeTabs, priTabs, filtered, stats, countLabel }
  }, [all, query, type, pri])

  return (
    <div className="newsroom-root">
      <style>{SCOPED_CSS}</style>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "color-mix(in srgb,var(--cream-50) 88%,transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div className="newsroom-head-container">
          <div className="newsroom-head-row1">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="30" height="30" viewBox="-16 -16 32 32" aria-hidden="true">
                <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" />
                <path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke="var(--green-800)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)" }}>Halal<span style={{ color: "var(--gold-600)" }}>One</span></div>
            </Link>
            <div className="newsroom-head-divider" />
            <div className="newsroom-head-subtitle">Industry News &amp; Alerts</div>
            <div className="newsroom-head-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="newsroom-head-tag-desktop" style={{ ...kicker }}>Module 8 · News</span>
              <HamburgerMenu />
            </div>
          </div>
          <div className="newsroom-head-row2">
            <span className="newsroom-head-subtitle-mobile">Industry News &amp; Alerts</span>
            <span className="newsroom-head-tag-mobile">Module 8 · News</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 3L54 30L30 57L6 30Z' fill='none' stroke='rgba(251,250,246,0.05)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px", opacity: 0.9 }} />
        <div className="newsroom-hero-inner">
          <div style={{ maxWidth: 640 }}>
            <div style={{ ...kicker, letterSpacing: ".14em", color: "var(--gold-500)" }}>Regulatory Intelligence · Newsroom</div>
            <h1 style={{ margin: "16px 0 0", fontSize: "clamp(26px,3.6vw,42px)", lineHeight: 1.07, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", textWrap: "balance" }}>Industry news &amp; regulatory alerts, verified and current.</h1>
            <p style={{ margin: "15px 0 0", fontSize: "clamp(14px,1.8vw,16px)", lineHeight: 1.6, color: "color-mix(in srgb,var(--cream-50) 74%,transparent)", maxWidth: 560 }}>Certification changes, standard updates, market moves and recall advisories — curated from ministry announcements, cert body bulletins, trade publications and OIC/SMIIC releases.</p>
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "color-mix(in srgb,var(--cream-50) 55%,transparent)" }}>ICCD editorial team · Seed content for platform launch — verify against official sources before publishing.</p>
          </div>
          <div className="newsroom-hero-count">
            <div style={{ fontSize: "clamp(44px,6vw,60px)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "#fff" }}>{all.length}</div>
            <div style={{ ...kicker, letterSpacing: ".14em", color: "var(--gold-500)", marginTop: 6 }}>Articles</div>
            <div style={{ fontSize: 12, color: "color-mix(in srgb,var(--cream-50) 60%,transparent)", marginTop: 6 }}>Jan 2025 baseline</div>
          </div>
        </div>
      </section>

      <div className="newsroom-main-wrap">
        {/* STATS */}
        <div className="newsroom-stats">
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 16px", boxShadow: "var(--shadow-sm)", borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginTop: 7, lineHeight: 1.35 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* EDITORIAL NOTE */}
        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "flex-start", background: "color-mix(in srgb,var(--gold-500) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--gold-500) 34%,transparent)", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ flex: "0 0 auto", width: 28, height: 28, borderRadius: 8, background: "var(--gold-500)", color: "var(--green-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>i</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--green-900)" }}>
            <b style={{ fontWeight: 800 }}>Editorial note.</b> This is the <b>seed content</b> for the Module 8 newsroom at platform launch. The ICCD editorial team should publish 3–5 new items per week, verify each against official sources before publishing, and review or archive alerts on their expiry date.
          </div>
        </div>

        {/* CONTROLS */}
        <div className="newsroom-filter-panel">
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 15px" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="#657269" strokeWidth="2" /><path d="m21 21-4.35-4.35" stroke="#657269" strokeWidth="2" strokeLinecap="round" /></svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search articles, countries, ingredients, cert bodies…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font)", fontSize: 14, color: "var(--green-900)" }} />
              {query.length > 0 && <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: "2px 4px" }}>✕</button>}
            </div>

            <div style={{ ...kicker, margin: "13px 2px 7px" }}>Article type</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {typeTabs.map((t) => (
                <button key={t.id} onClick={() => setType(t.id)} style={t.active
                  ? { padding: "7px 13px", borderRadius: 999, border: "1px solid var(--green-800)", background: "var(--green-800)", color: "#fff", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700 }
                  : { padding: "7px 13px", borderRadius: 999, border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700 }}>
                  {t.label} <span style={{ opacity: t.active ? 0.6 : 0.55 }}>{t.n}</span>
                </button>
              ))}
            </div>

            <div style={{ ...kicker, margin: "13px 2px 7px" }}>Priority</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {priTabs.map((t) => (
                <button key={t.id} onClick={() => setPri(t.id)} style={t.active
                  ? { padding: "7px 13px", borderRadius: 999, border: `1px solid ${t.dark}`, background: t.dark, color: "#fff", cursor: "pointer", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700 }
                  : { padding: "7px 13px", borderRadius: 999, border: `1px solid ${t.border}`, background: t.bg, color: t.fg, cursor: "pointer", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700 }}>
                  {t.label} <span style={{ opacity: t.active ? 0.65 : 0.7 }}>{t.n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 2px 14px" }}>{countLabel}</div>

        {/* FEED */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((a) => {
            const isOpen = !!open[a.id]
            const ps = priStyle(a.priority)
            const accent = accentOf(a.type)
            const toggle = () => setOpen((s) => ({ ...s, [a.id]: !s[a.id] }))
            return (
              <article key={a.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)", animation: "newsroom-fade .3s ease both", borderLeft: `4px solid ${accent}` }}>
                <div className="newsroom-card-body">
                  <div className="newsroom-card-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: ".02em", background: `color-mix(in srgb,${accent} 12%,transparent)`, color: accent, border: `1px solid color-mix(in srgb,${accent} 30%,transparent)` }}>{a.type}</span>
                        <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: ".02em", background: ps.bg, color: ps.fg }}>{a.priority} PRIORITY</span>
                        <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{a.date}</span>
                        {a.expires && <span style={{ fontSize: 11, color: "var(--gold-600)", fontWeight: 700 }}>⏱ Expires {a.expires}</span>}
                      </div>
                      <h2 style={{ fontSize: "clamp(15.5px, 2.2vw, 17px)", fontWeight: 800, letterSpacing: "-0.015em", color: "var(--green-900)", lineHeight: 1.32, margin: "0 0 8px" }}>{a.title}</h2>
                      <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                    </div>
                    <div className="newsroom-card-id" style={{ flex: "0 0 auto", fontSize: 11, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--green-800)", background: "var(--cream-100)", padding: "4px 9px", borderRadius: 7, border: "1px solid var(--border)" }}>{a.id}</div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, alignItems: "center" }}>
                    {a.countries.map((co) => (
                      <span key={co} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: "color-mix(in srgb,var(--green-700) 10%,transparent)", color: "var(--green-800)", border: "1px solid color-mix(in srgb,var(--green-700) 26%,transparent)" }}>{co}</span>
                    ))}
                    {a.certBodies.map((cb) => (
                      <span key={cb} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: "color-mix(in srgb,var(--gold-500) 14%,transparent)", color: "var(--gold-600)", border: "1px solid color-mix(in srgb,var(--gold-500) 36%,transparent)" }}>{cb}</span>
                    ))}
                  </div>
                </div>

                {isOpen && (
                  <div className="newsroom-card-expanded" style={{ borderTop: "1px solid var(--cream-100)" }}>
                    {a.blocks.map((b, bi) => (
                      <div key={bi} style={{ marginTop: 14 }}>
                        {b.label && <div style={{ ...kicker, marginBottom: 6 }}>{b.label}</div>}
                        {b.text && <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.7, margin: 0 }}>{b.text}</p>}
                        {b.bullets && b.bullets.length > 0 && (
                          <ul style={{ margin: "2px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                            {b.bullets.map((bl, li) => (
                              <li key={li} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>
                                <span style={{ flex: "0 0 auto", color: "var(--gold-500)", fontWeight: 800, marginTop: 1 }}>◆</span><span>{bl}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}

                    <div className="newsroom-detailgrid" style={{ background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                      <div>
                        <div style={{ ...kicker, marginBottom: 7 }}>Countries affected</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {a.countries.length > 0 ? a.countries.map((co) => (
                            <span key={co} style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "color-mix(in srgb,var(--green-700) 10%,transparent)", color: "var(--green-800)", border: "1px solid color-mix(in srgb,var(--green-700) 26%,transparent)" }}>{co}</span>
                          )) : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...kicker, marginBottom: 7 }}>Cert bodies referenced</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {a.certBodies.length > 0 ? a.certBodies.map((cb) => (
                            <span key={cb} style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "color-mix(in srgb,var(--gold-500) 14%,transparent)", color: "var(--gold-600)", border: "1px solid color-mix(in srgb,var(--gold-500) 36%,transparent)" }}>{cb}</span>
                          )) : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...kicker, marginBottom: 7 }}>Source</div>
                        <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{a.sourceLabel} ↗</a>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {a.tags.map((tg) => (
                        <span key={tg} style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: "var(--cream-100)", color: "var(--muted)", border: "1px solid var(--border)" }}>#{tg}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="newsroom-card-foot" style={{ borderTop: "1px solid var(--cream-100)", background: "color-mix(in srgb,var(--cream-100) 45%,transparent)" }}>
                  <button onClick={toggle} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "6px 14px", fontFamily: "var(--font)", fontSize: 11.5, fontWeight: 700, color: "var(--green-800)", cursor: "pointer" }}>{isOpen ? "Collapse ▴" : "Read full article ▾"}</button>
                </div>
              </article>
            )
          })}
        </div>

        {all.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green-900)" }}>No articles match your filters.</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try a different term or reset the type and priority filters.</div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)" }}>
        <div className="newsroom-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <svg width="28" height="28" viewBox="-16 -16 32 32" aria-hidden="true">
              <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" />
              <path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke="var(--cream-50)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Halal<span style={{ color: "var(--gold-500)" }}>One</span></div>
              <div style={{ fontSize: 11, color: "color-mix(in srgb,var(--cream-50) 60%,transparent)" }}>Industry News &amp; Alerts · Module 8</div>
            </div>
          </div>
          <div className="newsroom-footer-note">Newsroom seed content maintained by the ICCD editorial team. Regulatory requirements change frequently — always verify against official government and cert-body sources before relying on any item for platform decisions.</div>
        </div>
      </footer>
    </div>
  )
}
