"use client"

import React, { useEffect, useRef } from "react"

interface VideoBackgroundProps {
  children: React.ReactNode
}

export function VideoBackground({ children }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const playVideo = async () => {
      try {
        // Ensure video is ready to play
        video.load()
        
        // Try to play the video
        await video.play()
      } catch (error) {
        console.log('Video autoplay failed, will try on user interaction:', error)
        
        // If autoplay fails, try to play on first user interaction
        const handleUserInteraction = async () => {
          try {
            await video.play()
            // Remove listeners after successful play
            document.removeEventListener('click', handleUserInteraction)
            document.removeEventListener('keydown', handleUserInteraction)
            document.removeEventListener('touchstart', handleUserInteraction)
          } catch (playError) {
            console.log('Video play failed even after user interaction:', playError)
          }
        }
        
        document.addEventListener('click', handleUserInteraction, { once: true })
        document.addEventListener('keydown', handleUserInteraction, { once: true })
        document.addEventListener('touchstart', handleUserInteraction, { once: true })
      }
    }

    // Play video when component mounts
    playVideo()

    // Also try to play when video metadata is loaded
    video.addEventListener('loadedmetadata', playVideo)
    video.addEventListener('canplay', playVideo)

    return () => {
      video.removeEventListener('loadedmetadata', playVideo)
      video.removeEventListener('canplay', playVideo)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: -1 }}
      >
        <source src="/space-particles.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}