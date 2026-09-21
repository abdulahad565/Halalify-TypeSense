import type { Metadata } from "next"
import Link from "next/link"
import HamburgerMenu from "@/components/HamburgerMenu"
import DirectoryClient from "./DirectoryClient"

export const metadata: Metadata = {
  title: "Certification Authority Directory · HalalOne",
  description:
    "A verified reference directory of the world's leading halal certification bodies — their standards, product scope, international recognition and verification portals, across nine regions.",
}

const HEX_CLIP =
  "[clip-path:polygon(50%_0,100%_27%,100%_73%,50%_100%,0_73%,0_27%)]"

/** Hexagon mark with a gold check. Sized by the caller. */
function HalalOneMark({
  className,
  check,
}: {
  className: string
  check: number
}) {
  return (
    <div className={`flex flex-none items-center justify-center ${HEX_CLIP} ${className}`}>
      <svg width={check} height={check} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 12.5l5 5L20 6.5"
          stroke="#C9A248"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function Wordmark({ className, light }: { className: string; light?: boolean }) {
  return (
    <div className={`plus-jakarta-sans-800 leading-none tracking-[-.03em] ${className}`}>
      <span className={light ? "text-white" : "text-ho-green"}>Halal</span>
      <span className="text-ho-gold">One</span>
    </div>
  )
}

// Non-functional in the design — these are labels, not links, so they stay
// as spans until the destination pages exist.
const NAV_ITEMS = ["Directory", "Standards", "Regions", "About"]

const FOOTER_COLUMNS = [
  {
    heading: "Directory",
    items: ["By region", "By product scope", "Government bodies", "Standards bodies"],
  },
  {
    heading: "Platform",
    items: ["Verify a certificate", "Standards library", "Recognition map", "About Halal One"],
  },
]

export default function Page() {
  return (
    <div className="plus-jakarta-sans-400 min-h-screen bg-ho-bg text-ho-ink antialiased overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-ho-green/8 bg-ho-bg/90 px-4 py-2.5 sm:py-3.5 backdrop-blur-sm sm:px-6 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Back to home" className="flex items-center gap-[10px] flex-none">
              <HalalOneMark className="h-[34px] w-[30px] sm:h-[38px] sm:w-[34px] bg-ho-green" check={17} />
              <Wordmark className="text-[19px] sm:text-[21px]" />
            </Link>
            <div className="hidden md:block w-px h-5 bg-ho-green/15" />
            <span className="hidden md:inline-block text-[13px] font-semibold text-ho-muted">
              Certification Authorities Directory
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-block plus-jakarta-sans-700 text-[11px] tracking-[.12em] uppercase text-ho-gold-dk">
              Module 1 · Directory
            </span>
            <HamburgerMenu />
          </div>
        </div>

        {/* Mobile Row 2 */}
        <div className="flex sm:hidden items-center justify-between pt-1.5 mt-1.5 border-t border-ho-green/8 text-[11.5px]">
          <span className="font-semibold text-ho-muted">Certification Authorities</span>
          <span className="plus-jakarta-sans-700 text-[10px] tracking-[.08em] uppercase text-ho-gold-dk">
            Module 1 · Directory
          </span>
        </div>
      </header>

      <DirectoryClient />

      {/* FOOTER */}
      <footer className="bg-ho-green-dk px-5 py-[46px] text-ho-mint sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-between gap-7">
          <div className="max-w-[360px] min-w-0">
            <div className="mb-[13px] flex items-center gap-[10px]">
              <HalalOneMark className="h-[34px] w-[30px] bg-ho-green-lt" check={15} />
              <Wordmark className="text-[19px]" light />
            </div>
            <p className="m-0 text-[13.5px] leading-[1.6] text-ho-mint-3">
              Halal Clarity, All in One. A reference directory of global halal
              certification authorities — always verify certificate details
              against official sources before relying on them.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-7 sm:gap-[60px]">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="plus-jakarta-sans-700 mb-3 text-[11px] tracking-widest uppercase text-ho-mint-4">
                  {col.heading}
                </div>
                <div className="flex flex-col gap-[9px] text-[13.5px] text-ho-mint">
                  {col.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-[34px] max-w-[1240px] border-t border-white/8 pt-5 text-[12px] text-ho-mint-4">
          © 2026 Halal One · Certification Authority Directory · Module 1 — data
          reference
        </div>
      </footer>
    </div>
  )
}
