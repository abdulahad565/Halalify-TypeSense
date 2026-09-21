"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Directory", href: "/directory/certification-authority-directory" },
  { label: "Business", href: "/directory/business-directory" },
  { label: "Ingredients", href: "/directory/ingredient-database" },
  { label: "Regulatory", href: "/directory/regulatory-intelligence" },
  { label: "Standards", href: "/directory/standards-library" },
  { label: "Market", href: "/directory/market-intelligence" },
  { label: "Trade", href: "/directory/trade-intelligence" },
  { label: "News", href: "/directory/news-alerts" },
]

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#FBFAF6",
            display: "flex",
            flexDirection: "column",
            fontFamily: "var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {/* Header row: Logo on left, Close button on right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 68,
              padding: "0 24px",
              borderBottom: "1px solid #D9DED8",
              background: "#FBFAF6",
            }}
          >
            <Link
              href="/"
              onClick={() => setOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
            >
              <svg width="28" height="28" viewBox="-16 -16 32 32" aria-hidden="true">
                <path
                  d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5 Z"
                  fill="none"
                  stroke="#C9A248"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M-5 0.5 L-1.3 4.6 L5.8 -4.5"
                  fill="none"
                  stroke="#0F4B2E"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#07351F",
                }}
              >
                Halal<span style={{ color: "#B7902F" }}>One</span>
              </div>
            </Link>

            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "1px solid #D9DED8",
                background: "#ffffff",
                cursor: "pointer",
                color: "#07351F",
                padding: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Navigation link list */}
          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {NAV_LINKS.map((l) => {
              const isActive = l.href === "/" ? pathname === "/" : (pathname === l.href || pathname?.startsWith(l.href))
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "16px 24px",
                    fontSize: 19,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    color: isActive ? "#B7902F" : "#07351F",
                    background: isActive ? "rgba(201, 162, 72, 0.08)" : "transparent",
                    borderLeft: isActive ? "4px solid #C9A248" : "4px solid transparent",
                    borderBottom: "1px solid #D9DED8",
                    display: "block",
                    textDecoration: "none",
                    transition: "background 0.15s ease, color 0.15s ease",
                  }}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Call-To-Action button */}
          <div
            style={{
              padding: "20px 24px",
              borderTop: "1px solid #D9DED8",
              background: "#FBFAF6",
            }}
          >
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "14px 20px",
                borderRadius: 9999,
                background: "#0F4B2E",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 800,
                textDecoration: "none",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(7,53,31,0.15)",
                transition: "background 0.15s ease",
              }}
            >
              Start Chat
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: 10,
          border: "1px solid #D9DED8",
          background: "#ffffff",
          cursor: "pointer",
          color: "#07351F",
          boxShadow: "0 1px 4px rgba(7,53,31,0.06)",
          padding: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  )
}
