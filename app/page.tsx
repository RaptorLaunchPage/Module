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
  const { user, loading, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Simple redirect logic without delays
    if (!loading && user && profile) {
      console.log('🏠 Home page redirecting user to appropriate page:', profile.role)
      if (profile.role === "pending_player") {
        router.replace("/onboarding")
      } else {
        router.replace("/dashboard")
      }
    }
  }, [user, loading, profile, router])

  if (loading) {
    return <FullPageLoader />
  }

  if (user && profile) {
    return <FullPageLoader />
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <VideoBackground />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />
      
      {/* Content */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-4xl text-center space-y-8">
          {/* Logo/Brand */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight">
              RAPTOR
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 font-light">
              Elite Esports Management Platform
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-black/20 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Team Management</CardTitle>
                <CardDescription className="text-gray-300">
                  Comprehensive tools for managing your esports organization
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-black/20 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Player Analytics</CardTitle>
                <CardDescription className="text-gray-300">
                  Advanced statistics and performance tracking
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-black/20 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Tournament Tools</CardTitle>
                <CardDescription className="text-gray-300">
                  Everything you need to organize and compete
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              <Link href="/auth/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-black px-8">
              <Link href="/auth/signup">Join Now</Link>
            </Button>
          </div>

          {/* Features List */}
          <div className="mt-16 text-gray-300">
            <p className="text-sm mb-4">Trusted by top esports organizations worldwide</p>
            <div className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-wider">
              <span>Real-time Analytics</span>
              <span>•</span>
              <span>Team Coordination</span>
              <span>•</span>
              <span>Performance Tracking</span>
              <span>•</span>
              <span>Tournament Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
