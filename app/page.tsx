"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { FullPageLoader } from "@/components/ui/full-page-loader"

export default function HomePage() {
  const { user, loading, profile, signOut } = useAuth()
  const router = useRouter()

  // Remove automatic redirects - let users choose when to login
  // useEffect(() => {
  //   // Automatic redirect logic DISABLED - users should choose when to login
  //   if (!loading && user && profile) {
  //     console.log('🏠 Home page redirecting user to appropriate page:', profile.role)
  //     if (profile.role === "pending_player") {
  //       router.replace("/onboarding")
  //     } else {
  //       router.replace("/dashboard")
  //     }
  //   }
  // }, [user, profile, loading, router])

  // Only show loader if actively loading or if we have user but no profile
  if (loading) {
    return <FullPageLoader message="Checking authentication..." />
  }

  // If we have a user but no profile, there might be an issue
  if (user && !profile) {
    return <FullPageLoader message="Loading your account..." />
  }

  // Show homepage for all users - let them choose their next action
  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-8 w-8 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-4 w-4 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-16">
          <h1 className="esports-heading text-6xl font-bold text-white mb-4">Raptor Esports Hub</h1>
          <p className="text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
            The launchpad for emerging BGMI teams, creators, and future champions.<br />
            Whether you're a squad looking to rise through the tiers or a creator making your mark — this is where the real ones level up.
          </p>
        </div>

        {/* Show different content based on auth status */}
        {user && profile ? (
          // Already logged in - show welcome message and dashboard option
          <div className="text-center space-y-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-white text-xl">Welcome back, {profile.display_name || user.email}!</CardTitle>
                <CardDescription className="text-slate-200">
                  You're already signed in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push(profile.role === "pending_player" ? "/onboarding" : "/dashboard")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  Continue to {profile.role === "pending_player" ? "Setup" : "Dashboard"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => signOut()}
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Not logged in - show sign in/up options
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
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
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
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
                    Sign Up
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

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
