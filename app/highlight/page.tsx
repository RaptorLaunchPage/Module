"use client"

import { VideoBackground } from "@/components/video-background"

export default function HighlightPage() {
  return (
    <VideoBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <video controls autoPlay playsInline className="w-full h-[60vh] object-cover rounded-md">
            <source src="/highlight.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </VideoBackground>
  )
}