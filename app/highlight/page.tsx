"use client"

import { VideoBackground } from "@/components/video-background"

export default function HighlightPage() {
  return (
    <VideoBackground>
      <div className="min-h-screen flex flex-col">
        <header className="h-14 flex items-center px-3 sm:px-4 bg-black/55 backdrop-blur-md border-b border-white/10">
          <div className="font-extrabold tracking-wide text-transparent bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] bg-clip-text">RAPTOR ESPORTS</div>
          <a href="/" className="ml-auto px-3 py-1.5 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white text-xs sm:text-sm">Home</a>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <video controls autoPlay playsInline className="w-full h-[46vh] sm:h-[60vh] object-cover rounded-md">
              <source src="/highlight.mp4" type="video/mp4" />
            </video>
          </div>
        </main>
        <footer className="h-12 flex items-center justify-between px-3 sm:px-4 bg-gradient-to-t from-black/70 to-transparent text-white/70 text-xs sm:text-sm">
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
          <a href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
        </footer>
      </div>
    </VideoBackground>
  )
}