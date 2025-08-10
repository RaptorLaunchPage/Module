"use client"

import React from "react"
import { FOOTER_BG, TEXT_DIM } from "@/components/public/public-theme"

export function PublicFooter() {
  return (
    <footer className={`h-12 flex items-center justify-between px-3 sm:px-4 ${FOOTER_BG} text-white/70 text-xs sm:text-sm`}>
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-white">Privacy</a>
        <a href="#" className="hover:text-white">Terms</a>
        <span className="hidden sm:inline">© {new Date().getFullYear()} Raptor Esports. All rights reserved.</span>
      </div>
      <a href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
    </footer>
  )
}