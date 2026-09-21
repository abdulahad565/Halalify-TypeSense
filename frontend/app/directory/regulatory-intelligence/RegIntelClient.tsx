"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import HamburgerMenu from "@/components/HamburgerMenu"
import { COUNTRIES, type Country } from "./data"

// Regions shown as filter tabs, in the order the original design lists them.
const REGIONS = ["ALL", "Africa", "Americas", "Europe", "Middle East", "Oceania", "SE Asia", "South Asia"] as const

// A country plus the view-only fields the original DCLogic derived per render.
interface CardVM extends Country {
  voluntary: boolean
  preshipNot: boolean
  preshipStatus: string
  preshipDetail: string
}

// Scoped styles: CSS variables, link/selection/placeholder rules, the inactive
// tab hover, and the card fade — everything that can't live in an inline style.
// All scoped under .regintel-root so nothing leaks into the rest of the app.
const SCOPED_CSS = `
.regintel-root {
  --green-900:#07351F; --green-800:#0F4B2E; --green-700:#196B24; --green-100:#D9DED8;
  --gold-600:#B7902F; --gold-500:#C9A248; --gold-200:#EBDFC0;
  --cream-50:#FBFAF6; --cream-100:#F7F4EC;
  --ink:#222222; --muted:#657269; --danger:#B23A2E; --border:#D9DED8;
  --shadow-sm:0 2px 8px color-mix(in srgb,#07351F 8%,transparent);
  --shadow-md:0 10px 28px color-mix(in srgb,#07351F 12%,transparent);
  --font:var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-family:var(--font);
  background:var(--cream-50);
  color:var(--ink);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  min-height: 100vh;
  overflow-x: hidden;
}
.regintel-root *{box-sizing:border-box;}
.regintel-root a{color:var(--green-800);text-decoration:none;transition:color .13s ease;}
.regintel-root a:hover{color:var(--gold-600);}
.regintel-root ::selection{background:var(--gold-200);color:var(--green-900);}
.regintel-root input::placeholder{color:var(--muted);}
.regintel-root .ri-tab-inactive:hover{background:var(--cream-100);}
@keyframes ri-hl-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}

.regintel-root .regintel-head-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
}
.regintel-root .regintel-head-row1 {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.regintel-root .regintel-head-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.regintel-root .regintel-head-divider {
  width: 1px;
  height: 22px;
  background: var(--border);
}
.regintel-root .regintel-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
}
.regintel-root .regintel-head-row2 {
  display: none;
}

.regintel-root .regintel-filter-panel {
  position: sticky;
  top: 63px;
  z-index: 30;
  margin-top: 22px;
  background: color-mix(in srgb,var(--cream-50) 90%,transparent);
  backdrop-filter: blur(8px);
  padding: 12px 0;
}

.regintel-root .regintel-hero-inner {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 24px 60px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
}
.regintel-root .regintel-hero-count {
  text-align: right;
}
.regintel-root .regintel-main-wrap {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px 72px;
}
.regintel-root .regintel-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: -30px;
  position: relative;
  z-index: 10;
}

.regintel-root .regintel-footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.regintel-root .regintel-footer-note {
  font-size: 11.5px;
  color: color-mix(in srgb, var(--cream-50) 60%, transparent);
  max-width: 520px;
  line-height: 1.6;
  text-align: right;
}

@media (max-width: 960px) {
  .regintel-root .regintel-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
@media (max-width: 768px) {
  .regintel-root .regintel-filter-panel {
    position: static !important;
    top: auto !important;
    backdrop-filter: none !important;
    padding: 8px 0 12px !important;
  }
  .regintel-root .regintel-subgrid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}
@media (max-width: 640px) {
  .regintel-root .regintel-head-container {
    padding: 10px 16px 8px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .regintel-root .regintel-head-row1 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }
  .regintel-root .regintel-head-divider {
    display: none !important;
  }
  .regintel-root .regintel-head-subtitle {
    display: none !important;
  }
  .regintel-root .regintel-head-tag-desktop {
    display: none !important;
  }
  .regintel-root .regintel-head-right {
    margin-left: 0 !important;
    gap: 8px !important;
  }
  .regintel-root .regintel-head-row2 {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding-top: 5px !important;
    border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent) !important;
  }
  .regintel-root .regintel-head-subtitle-mobile {
    font-size: 11.5px !important;
    font-weight: 600 !important;
    color: var(--muted) !important;
  }
  .regintel-root .regintel-head-tag-mobile {
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: .08em !important;
    text-transform: uppercase !important;
    color: var(--gold-600) !important;
  }
  .regintel-root .regintel-hero-inner {
    padding: 36px 16px 44px !important;
    gap: 20px !important;
  }
  .regintel-root .regintel-hero-count {
    text-align: left !important;
  }
  .regintel-root .regintel-main-wrap {
    padding: 0 16px 56px !important;
  }
  .regintel-root .regintel-stats {
    margin-top: -18px !important;
    gap: 10px !important;
  }
  .regintel-root .regintel-footer-inner {
    padding: 30px 16px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 14px !important;
  }
  .regintel-root .regintel-footer-note {
    text-align: left !important;
  }
}
@media (max-width: 540px) {
  .regintel-root .regintel-stats {
    grid-template-columns: 1fr !important;
  }
  .regintel-root .regintel-card-head-top {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
  }
  .regintel-root .regintel-card-head-stat {
    text-align: left !important;
  }
}
`

// The gold uppercase micro-label repeated above every field.
const kick = (mb = 5): CSSProperties => ({
  fontSize: "10px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".12em",
  color: "var(--gold-600)",
  marginBottom: `${mb}px`,
})

const activeTabStyle: CSSProperties = {
  padding: "8px 15px", borderRadius: "10px", border: "1px solid var(--green-800)",
  background: "var(--green-800)", color: "#fff", cursor: "pointer",
  fontFamily: "var(--font)", fontSize: "12px", fontWeight: 700,
}
const inactiveTabStyle: CSSProperties = {
  padding: "8px 15px", borderRadius: "10px", border: "1px solid var(--border)",
  background: "#fff", color: "var(--muted)", cursor: "pointer",
  fontFamily: "var(--font)", fontSize: "12px", fontWeight: 700, transition: "background .13s ease",
}

// Hexagon + check mark used in the header and footer. Stroke colors differ per placement.
function HalalOneMark({ size, checkStroke }: { size: number; checkStroke: string }) {
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" aria-hidden="true">
      <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z" fill="none" stroke="var(--gold-500)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-5 0.5 L-1.3 4.6 L5.8 -4.5" fill="none" stroke={checkStroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function RegIntelClient() {
  const [query, setQuery] = useState("")
  const [region, setRegion] = useState<string>("ALL")

  const all = COUNTRIES
  const q = query.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      all.filter((c) => {
        const regionMatch = region === "ALL" || c.region === region
        const searchMatch = !q || JSON.stringify(c).toLowerCase().includes(q)
        return regionMatch && searchMatch
      }),
    [all, region, q],
  )

  // Split "⚠ Required — detail" into a status line and a detail line, as the original did.
  const cards: CardVM[] = useMemo(
    () =>
      filtered.map((c) => {
        const parts = String(c.preship || "").split(" — ")
        const preshipStatus = (parts[0] || "").replace("⚠", "").trim()
        const preshipDetail = parts.slice(1).join(" — ")
        return { ...c, voluntary: !c.mandatory, preshipNot: !c.preshipRequired, preshipStatus, preshipDetail }
      }),
    [filtered],
  )

  const tabs = REGIONS.map((id) => ({
    id,
    label: id === "ALL" ? "All" : id,
    n: id === "ALL" ? all.length : all.filter((c) => c.region === id).length,
    active: region === id,
  }))

  const mandatoryCount = all.filter((c) => c.mandatory).length
  const oicCount = all.filter((c) => c.oic).length
  const stats = [
    { value: all.length, label: "Countries covered", accent: "var(--green-800)" },
    { value: mandatoryCount, label: "Mandatory halal framework", accent: "var(--green-700)" },
    { value: all.length - mandatoryCount, label: "Voluntary / market-driven", accent: "var(--muted)" },
    { value: oicCount, label: "OIC member states", accent: "var(--gold-500)" },
  ]

  const hasQuery = query.length > 0
  const empty = all.length > 0 && filtered.length === 0
  const countLabel =
    region === "ALL" && !q ? `Showing all ${all.length} countries` : `Showing ${filtered.length} of ${all.length} countries`

  return (
    <div className="regintel-root">
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />

      {/* ============ TOP BAR ============ */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "color-mix(in srgb,var(--cream-50) 88%,transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div className="regintel-head-container">
          <div className="regintel-head-row1">
            <Link href="/" aria-label="Back to home" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <HalalOneMark size={30} checkStroke="var(--green-800)" />
              <div style={{ fontSize: "19px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)" }}>
                Halal<span style={{ color: "var(--gold-600)" }}>One</span>
              </div>
            </Link>
            <div className="regintel-head-divider" />
            <div className="regintel-head-subtitle">Regulatory Intelligence</div>
            <div className="regintel-head-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="regintel-head-tag-desktop" style={{ fontSize: "11px", fontWeight: 700, color: "var(--gold-600)", textTransform: "uppercase", letterSpacing: ".12em" }}>Module 4 · Regulatory</span>
              <HamburgerMenu />
            </div>
          </div>
          <div className="regintel-head-row2">
            <span className="regintel-head-subtitle-mobile">Regulatory Intelligence</span>
            <span className="regintel-head-tag-mobile">Module 4 · Regulatory</span>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 3L54 30L30 57L6 30Z' fill='none' stroke='rgba(251,250,246,0.05)' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: "60px", opacity: 0.9 }} />
        <div className="regintel-hero-inner">
          <div style={{ maxWidth: "640px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold-500)" }}>Regulatory Intelligence · Country Data</div>
            <h1 style={{ margin: "16px 0 0", fontSize: "clamp(30px,4vw,46px)", lineHeight: 1.06, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", textWrap: "balance" }}>Import rules &amp; halal compliance, country by country.</h1>
            <p style={{ margin: "16px 0 0", fontSize: "17px", lineHeight: 1.6, color: "color-mix(in srgb,var(--cream-50) 74%,transparent)", maxWidth: "560px" }}>Standards, accepted certification bodies, labelling requirements and import documentation for every major OIC and export market — one verified reference.</p>
            <p style={{ margin: "14px 0 0", fontSize: "12.5px", color: "color-mix(in srgb,var(--cream-50) 55%,transparent)" }}>ICCD Technology Team · Content reference — verify against official sources before platform entry.</p>
          </div>
          <div className="regintel-hero-count">
            <div style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "#fff" }}>{all.length}</div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold-500)", marginTop: "6px" }}>Countries covered</div>
            <div style={{ fontSize: "12.5px", color: "color-mix(in srgb,var(--cream-50) 60%,transparent)", marginTop: "6px" }}>OIC + key non-OIC export markets</div>
          </div>
        </div>
      </section>

      <div className="regintel-main-wrap">
        {/* ============ STATS ============ */}
        <div className="regintel-stats">
          {stats.map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "14px", padding: "18px 18px", boxShadow: "var(--shadow-sm)", borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--green-900)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--muted)", marginTop: "8px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ============ CONTROLS ============ */}
        <div className="regintel-filter-panel">
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "16px", padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: "12px", padding: "11px 15px" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="8" stroke="#657269" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" stroke="#657269" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country, standard, cert body, ingredient…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font)", fontSize: "14px", color: "var(--green-900)" }}
              />
              {hasQuery && (
                <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: "15px", lineHeight: 1, padding: "2px 4px" }}>✕</button>
              )}
            </div>
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginTop: "12px" }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRegion(t.id)}
                  className={t.active ? "ri-tab ri-tab-active" : "ri-tab ri-tab-inactive"}
                  style={t.active ? activeTabStyle : inactiveTabStyle}
                >
                  {t.label} <span style={{ opacity: t.active ? 0.6 : 0.55 }}>{t.n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: "12.5px", color: "var(--muted)", margin: "6px 2px 14px" }}>{countLabel}</div>

        {/* ============ COUNTRY GRID ============ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(480px,100%),1fr))", gap: "16px" }}>
          {cards.map((c) => (
            <article key={c.name} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "18px", overflow: "hidden", boxShadow: "var(--shadow-sm)", animation: "ri-hl-fade .3s ease both" }}>
              {/* card header */}
              <div style={{ position: "relative", padding: "20px 22px", background: "linear-gradient(150deg,#0F4B2E,#07351F)", overflow: "hidden" }}>
                <div aria-hidden="true" style={{ position: "absolute", top: "-30px", right: "-30px", width: "150px", height: "150px", borderRadius: "50%", background: "radial-gradient(circle,color-mix(in srgb,var(--gold-500) 22%,transparent),transparent 70%)" }} />
                <div className="regintel-card-head-top" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "13px", alignItems: "center" }}>
                    <div style={{ flex: "0 0 auto", width: "46px", height: "46px", borderRadius: "12px", background: "rgba(251,250,246,.12)", border: "1px solid rgba(251,250,246,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px" }}>{c.flag}</div>
                    <div>
                      <div style={{ fontSize: "19px", fontWeight: 800, letterSpacing: "-0.015em", color: "#fff" }}>{c.name}</div>
                      <div style={{ fontSize: "11.5px", color: "color-mix(in srgb,var(--cream-50) 68%,transparent)", marginTop: "2px" }}>{c.authority}</div>
                    </div>
                  </div>
                  <div className="regintel-card-head-stat" style={{ textAlign: "right", flex: "0 0 auto" }}>
                    <div style={{ fontSize: "26px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{c.muslimPct}</div>
                    <div style={{ fontSize: "10px", color: "color-mix(in srgb,var(--cream-50) 55%,transparent)", marginTop: "3px" }}>Muslim population</div>
                    <div style={{ fontSize: "11px", color: "color-mix(in srgb,var(--cream-50) 45%,transparent)", marginTop: "2px" }}>Total: {c.total}</div>
                  </div>
                </div>
                <div style={{ position: "relative", display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "14px" }}>
                  {c.mandatory && (
                    <span style={{ padding: "4px 11px", borderRadius: "999px", fontSize: "10px", fontWeight: 800, letterSpacing: ".02em", background: "var(--gold-500)", color: "var(--green-900)" }}>Mandatory framework</span>
                  )}
                  {c.voluntary && (
                    <span style={{ padding: "4px 11px", borderRadius: "999px", fontSize: "10px", fontWeight: 800, letterSpacing: ".02em", background: "transparent", color: "var(--cream-50)", border: "1px solid rgba(251,250,246,.4)" }}>Voluntary framework</span>
                  )}
                  {c.oic && (
                    <span style={{ padding: "4px 11px", borderRadius: "999px", fontSize: "10px", fontWeight: 700, background: "color-mix(in srgb,var(--gold-500) 20%,transparent)", color: "var(--gold-200)", border: "1px solid color-mix(in srgb,var(--gold-500) 45%,transparent)" }}>OIC Member</span>
                  )}
                  <span style={{ padding: "4px 11px", borderRadius: "999px", fontSize: "10px", fontWeight: 600, background: "rgba(251,250,246,.14)", color: "#fff" }}>{c.region}</span>
                </div>
              </div>

              {/* card body */}
              <div style={{ padding: "18px 22px 20px" }}>
                <div className="regintel-subgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={kick(5)}>Regulatory framework</div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.55, fontWeight: 600 }}>{c.framework}</div>
                  </div>
                  <div>
                    <div style={kick(5)}>Governing ministry</div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.5 }}>{c.ministry}</div>
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={kick(5)}>National standard</div>
                  <div style={{ fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.55 }}>{c.natStd}</div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={kick(5)}>Accepted halal cert bodies</div>
                  <div style={{ fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.7 }}>{c.certBodies}</div>
                </div>

                <div className="regintel-subgrid" style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={kick(6)}>Halal label</div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: c.mandatory ? "var(--green-700)" : "var(--muted)" }}>{c.labelStatus}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>{c.labelLang}</div>
                    <div style={{ fontSize: "11.5px", color: "var(--ink)", lineHeight: 1.5, marginTop: "6px" }}>{c.labelNote}</div>
                  </div>
                  <div style={{ background: "var(--cream-100)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={kick(6)}>Pre-shipment inspection</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: c.preshipRequired ? "var(--danger)" : "var(--green-700)" }}>{c.preshipStatus}</div>
                    <div style={{ fontSize: "11.5px", color: "var(--ink)", lineHeight: 1.5, marginTop: "5px" }}>{c.preshipDetail}</div>
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={kick(6)}>Required import documents</div>
                  <div className="regintel-subgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
                    {c.docs.map((d, di) => (
                      <div key={di} style={{ display: "flex", gap: "7px", alignItems: "flex-start", padding: "5px 0", fontSize: "12px", color: "var(--ink)", lineHeight: 1.4 }}>
                        <span style={{ flex: "0 0 auto", color: "var(--green-700)", fontWeight: 800 }}>✓</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={kick(6)}>Product-specific requirements</div>
                  {c.prods.map((pr, pi) => (
                    <div key={pi} style={{ padding: "7px 0", borderBottom: "1px solid var(--cream-100)", fontSize: "12px", lineHeight: 1.5 }}>
                      <b style={{ color: "var(--green-900)", fontWeight: 800 }}>{pr.k}:</b> <span style={{ color: "var(--ink)" }}>{pr.v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={kick(6)}>Prohibited ingredients</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {c.prohibited.map((pb, pbi) => (
                      <span key={pbi} style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "10.5px", fontWeight: 600, background: "color-mix(in srgb,var(--danger) 8%,transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb,var(--danger) 26%,transparent)" }}>{pb}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={kick(5)}>Market entry notes</div>
                  <div style={{ fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.6 }}>{c.marketNotes}</div>
                </div>

                <div className="regintel-subgrid" style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", alignItems: "start" }}>
                  <div>
                    <div style={kick(6)}>Recent regulatory changes</div>
                    <div style={{ fontSize: "11.5px", color: "var(--ink)", lineHeight: 1.55, background: "color-mix(in srgb,var(--gold-500) 9%,transparent)", border: "1px solid color-mix(in srgb,var(--gold-500) 32%,transparent)", borderRadius: "10px", padding: "11px 13px" }}>{c.recentChanges}</div>
                  </div>
                  <div>
                    <div style={kick(5)}>Cert renewal</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--green-900)", lineHeight: 1.4 }}>{c.renewal}</div>
                    <div style={{ ...kick(5), margin: "12px 0 5px" }}>Official resource</div>
                    <a href={c.resourceUrl} target="_blank" rel="noopener" style={{ fontSize: "12px", fontWeight: 700, wordBreak: "break-all" }}>{c.resourceLabel} ↗</a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {empty && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--green-900)" }}>No countries match your search.</div>
            <div style={{ fontSize: "13px", marginTop: "6px" }}>Try a different term or clear the filters.</div>
          </div>
        )}
      </div>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: "linear-gradient(160deg,#0F4B2E,#07351F)", color: "var(--cream-50)" }}>
        <div className="regintel-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
            <HalalOneMark size={28} checkStroke="var(--cream-50)" />
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
                Halal<span style={{ color: "var(--gold-500)" }}>One</span>
              </div>
              <div style={{ fontSize: "11px", color: "color-mix(in srgb,var(--cream-50) 60%,transparent)" }}>Regulatory Intelligence · Module 4</div>
            </div>
          </div>
          <div className="regintel-footer-note">Content reference maintained by the ICCD Technology Team. Regulatory requirements change frequently — always verify against official government sources before relying on this data for platform entry.</div>
        </div>
      </footer>
    </div>
  )
}
