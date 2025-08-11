"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BRAND_GRAD, HEADER_BG } from "@/components/public/public-theme"
import { getButtonStyle } from "@/lib/global-theme"

// Clean navigation with fewer tabs
const NAV_ITEMS = [
  { name: "Home", href: "/public" },
  { name: "About", href: "/about" },
  { name: "Incentives", href: "/incentives" },

  { name: "Tier", href: "/tier-structure" },
  { name: "Gallery", href: "/gallery" },
  { name: "Join", href: "/join-us" },
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
          {NAV_ITEMS.map(({ name, href }) => (
            <Link
              key={name}
              href={href}
              className={`text-xs sm:text-sm text-white/80 hover:text-white transition-colors pb-0.5 border-b-2 cursor-pointer ${
                pathname === href ? "border-white" : "border-transparent hover:border-white/40"
              }`}
              aria-label={`Go to ${name}`}
              onClick={() => console.log(`🔄 Navigating to: ${href}`)}
            >
              {name}
            </Link>
          ))}
        </nav>
        
        {/* Right: Dashboard button */}
        <div className="ml-auto">
          <Link
            href="/auth/login"
            className={`px-3 py-1.5 rounded-md font-semibold text-xs sm:text-sm cursor-pointer ${getButtonStyle('primary')}`}
            onClick={() => console.log('🔄 Dashboard button clicked - redirecting to login')}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  )
}