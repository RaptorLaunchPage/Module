"use client"

import React from "react"

interface VideoBackgroundProps {
  children: React.ReactNode
}

export function VideoBackground({ children }: VideoBackgroundProps) {
  // Video duration in seconds (adjust to match your video)
  const VIDEO_DURATION = 10
  // Fade duration in ms
  const FADE_DURATION = 600

  // Use a CSS animation to fade out and in at the loop point
  // The fade will start FADE_DURATION ms before the end and finish FADE_DURATION ms after the start

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: -1 }}
      >
        <source src="/space-particles.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Fade overlay to mask loop jump */}
      <div
        className="pointer-events-none absolute inset-0 z-0 fade-loop-overlay"
        style={{ animationDuration: `${VIDEO_DURATION}s` }}
      />
      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}