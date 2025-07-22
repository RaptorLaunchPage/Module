"use client"

import { VideoBackground } from "@/components/video-background"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Shield } from "lucide-react"

export default function Loading() {
  return (
    <VideoBackground>
      {/* Ambient glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="relative mb-6">
                <Shield className="h-16 w-16 text-white/60 mx-auto mb-4" />
                <Loader2 className="h-8 w-8 text-white animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Loading Raptor Hub</h3>
              <p className="text-white/80">Initializing your esports experience...</p>
              
              <div className="mt-6">
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}
