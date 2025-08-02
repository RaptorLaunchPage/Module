"use client"

import { useRouter } from "next/navigation"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"

export default function HomePage() {
  const { user, profile, signOut } = useAuth() // Removed isLoading dependency
  const router = useRouter()

  // Homepage should always render - no loading state needed
  // The auth state will be available when ready, but we don't wait for it

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
                <CardTitle className="text-white text-xl">Welcome back, {profile.display_name || profile.name || user.email}!</CardTitle>
                <CardDescription className="text-slate-200">
                  You're already signed in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => {
                    if (profile.role === "pending_player" && !profile.onboarding_completed) {
                      router.push("/onboarding")
                    } else {
                      router.push("/dashboard")
                    }
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  Continue to {(profile.role === "pending_player" && !profile.onboarding_completed) ? "Setup" : "Dashboard"}
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
          // Not logged in - show Discord sign in option
          <div className="max-w-md w-full">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-white text-xl">Join the Team</CardTitle>
                <CardDescription className="text-slate-200">
                  Sign in with Discord to access your account or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/auth/login">
                  <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
                    </svg>
                    <span>Continue with Discord</span>
                  </Button>
                </Link>
                <div className="text-center">
                  <p className="text-sm text-slate-300">
                    New players and returning members welcome
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">
                Organize your team, track performance, and manage tournaments with our comprehensive tools.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">
                Detailed statistics and insights to help your team identify strengths and areas for improvement.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Creator Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">
                Tools and resources for content creators to grow their brand and connect with the community.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </VideoBackground>
  )
}
