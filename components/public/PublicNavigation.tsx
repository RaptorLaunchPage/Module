"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BRAND_GRAD, HEADER_BG } from "@/components/public/public-theme"

const NAV_ITEMS = [
  { name: "Home", href: "/public" },
  { name: "About", href: "/about" },
  { name: "Incentives", href: "/incentives" },
  { name: "Highlights", href: "/highlight" },
]

// Special case for public page which has internal navigation
const PUBLIC_PAGE_NAV_ITEMS = [
  { name: "Home", href: "/public" },
  { name: "About", href: "/about" },
  { name: "Tier System", href: "/public#tier-system" },
  { name: "Incentives", href: "/incentives" },
  { name: "Tournaments", href: "/public#tournaments" },
  { name: "Contact", href: "/public#contact" },
]

export function PublicNavigation() {
  const pathname = usePathname()

  return (
    <header className={`fixed top-0 left-0 right-0 z-30 ${HEADER_BG}`}>
      <div className="max-w-7xl mx-auto h-14 px-3 sm:px-4 flex items-center">
        {/* Brand left with gradient */}
        <Link href="/public" className="font-extrabold tracking-wide text-transparent bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] bg-clip-text drop-shadow-xl hover:brightness-110 transition-all">
          RAPTOR ESPORTS
        </Link>
        
        {/* Center nav names */}
        <nav className="mx-auto hidden md:flex items-center gap-3 lg:gap-4 overflow-x-auto no-scrollbar px-2">
          {(pathname === "/public" ? PUBLIC_PAGE_NAV_ITEMS : NAV_ITEMS).map(({ name, href }) => (
            <Link
              key={name}
              href={href}
              className={`text-xs sm:text-sm text-white/80 hover:text-white transition-colors pb-0.5 border-b-2 ${
                pathname === href ? "border-white" : "border-transparent hover:border-white/40"
              }`}
              aria-label={`Go to ${name}`}
            >
              {name}
            </Link>
          ))}
        </nav>
        
        {/* Right: Dashboard button */}
        <div className="ml-auto">
          <a
            href="/auth/login"
            className="px-3 py-1.5 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white hover:brightness-110 transition-shadow shadow-[0_0_20px_rgba(58,125,255,0.35)] text-xs sm:text-sm"
          >
            Dashboard
          </a>
        </div>
      </div>
    </header>
  )
}