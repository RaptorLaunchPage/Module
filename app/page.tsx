"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { FullPageLoader } from "@/components/ui/full-page-loader"

export default function HomePage() {
  const { user, loading, profile } = useAuth()
  const router = useRouter()
  const [initializationComplete, setInitializationComplete] = useState(false)

  useEffect(() => {
    // Give more time for auth initialization to complete
    // This prevents premature redirects during page refresh
    const timer = setTimeout(() => {
      setInitializationComplete(true)
    }, 1500) // Wait 1.5 seconds for auth to fully initialize

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Only redirect after initialization is complete AND we have stable auth state
    if (initializationComplete && !loading && user && profile) {
      console.log('🏠 Home page redirecting user to appropriate page:', profile.role)
      if (profile.role === "pending_player") {
        router.replace("/onboarding")
      } else {
        router.replace("/dashboard")
      }
    } else if (initializationComplete && !loading && !user) {
      console.log('🏠 Home page: No user after initialization, staying on landing page')
    }
  }, [user, profile, loading, router, initializationComplete])

  // Show loader during auth initialization OR if we have a user but are still waiting for profile
  if (!initializationComplete || loading || (user && !profile)) {
    const message = !initializationComplete 
      ? "Initializing..." 
      : (user && !profile) 
        ? "Loading your account..." 
        : "Checking authentication..."
        
    return <FullPageLoader message={message} />
  }

  // If we reach here, either:
  // 1. User is not logged in (show landing page)
  // 2. Auth initialization failed (show landing page)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-xl">Sign In</CardTitle>
              <CardDescription className="text-slate-200">
                Access your existing account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/login">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                  Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-xl">Sign Up</CardTitle>
              <CardDescription className="text-slate-200">
                Create a new account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/signup">
                <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
                  Sign Up
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-300 text-sm mb-4">
            Professional esports management for competitive teams
          </p>
          <div className="flex justify-center space-x-6 text-slate-400 text-xs">
            <span>Performance Analytics</span>
            <span>•</span>
            <span>Team Management</span>
            <span>•</span>
            <span>Real-time Tracking</span>
          </div>
        </div>
      </div>
    </VideoBackground>
  )
}
