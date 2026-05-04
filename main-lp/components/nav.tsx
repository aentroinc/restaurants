"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Hexagon, Menu, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "どう動くか", href: "/how-it-works" },
  { label: "導入実績", href: "/value" },
  { label: "安全性", href: "/security" },
  { label: "お試し導入", href: "/poc" },
  { label: "他社比較", href: "/vs" },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 backdrop-blur-md",
        scrolled
          ? "bg-bg-primary/85 border-b border-white/[0.06] py-3"
          : "bg-bg-primary/40 py-5"
      )}
    >
      <div className="container-x flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Hexagon className="w-7 h-7 text-blue-400 transition-transform group-hover:rotate-12" strokeWidth={1.5} />
          <div>
            <div className="text-[12px] font-bold tracking-[0.16em] text-blue-400 uppercase leading-none">AENTRO</div>
            <div className="text-[9px] text-white/45 tracking-[0.10em] mt-0.5">Restaurant OS</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] text-white/65 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium transition-colors"
          >
            デモを依頼
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label="メニュー"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -mr-2 text-white/70 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-bg-primary border-b border-white/[0.06] animate-fade-in">
          <div className="container-x py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-3 text-[14px] text-white/75 hover:bg-white/[0.04] rounded"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/demo"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-4 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] text-center font-medium"
            >
              デモを依頼
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
