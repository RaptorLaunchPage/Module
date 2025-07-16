"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Removed auto-redirect useEffect

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-8 w-8 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-4 w-4 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-16">
          <h1 className="esports-heading text-6xl font-bold text-white mb-4">Raptor Esports Hub</h1>
          <p className="text-xl text-slate-200 max-w-2xl mx-auto">
            Professional esports team management system for performance tracking, user management, and team analytics.
          </p>
        </div>
        <div className="max-w-md w-full mx-auto">
          <Card className="bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-white">Get Started</CardTitle>
              <CardDescription className="text-slate-200">Sign in to access your hub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full bg-white/90 text-black hover:bg-white" size="lg">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup" className="w-full">
                <Button variant="outline" className="w-full bg-white/10 text-white border border-white/20" size="lg">
                  Sign Up
                </Button>
              </Link>
              {/* Social login placeholder */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black/60 px-2 text-slate-400">Coming Soon</span>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-white/10 text-white border border-white/20 cursor-not-allowed" size="lg" disabled>
                Login with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </VideoBackground>
  )
}
