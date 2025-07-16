import { VideoBackground } from "@/components/video-background"
import { Loader2 } from "lucide-react"
import React from "react"

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-8 w-8 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-4 w-4 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
        {message && <div className="text-white text-lg text-center mt-2">{message}</div>}
      </div>
    </VideoBackground>
  )
}