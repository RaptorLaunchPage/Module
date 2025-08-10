"use client"

import { VideoBackground } from "@/components/video-background"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function HighlightPage() {
  return (
    <VideoBackground>
      <div className="min-h-screen flex flex-col">
        <PublicHeader rightCta={<a href="/" className="px-3 py-1.5 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white text-xs sm:text-sm">Home</a>} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <video controls autoPlay playsInline className="w-full h-[46vh] sm:h-[60vh] object-cover rounded-md">
              <source src="/highlight.mp4" type="video/mp4" />
            </video>
          </div>
        </main>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}