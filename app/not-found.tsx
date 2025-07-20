"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoBackground } from "@/components/video-background"
import { Home, Search, ArrowLeft, Gamepad2, Shield, Zap } from "lucide-react"

export default function NotFound() {
  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-8 w-8 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-4 w-4 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="pointer-events-none fixed right-1/3 top-1/4 z-10 h-6 w-6 rounded-full bg-white opacity-30 blur-xl animate-pulse" />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-4xl w-full">
          {/* Main 404 Hero */}
          <div className="mb-16">
            <div className="mb-8">
              <h1 className="esports-heading text-8xl md:text-9xl font-bold text-white mb-4 opacity-90">
                404
              </h1>
              <div className="flex justify-center mb-6">
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"></div>
              </div>
              <h2 className="esports-heading text-3xl md:text-4xl font-bold text-white mb-4">
                Mission Failed
              </h2>
              <p className="text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
                The page you're looking for has gone off the grid. Maybe it's hiding in the storm circle, 
                or perhaps it never existed in this dimension.
              </p>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="mx-auto mb-4">
                  <Home className="h-12 w-12 text-white opacity-80" />
                </div>
                <CardTitle className="text-white text-lg">Return to Base</CardTitle>
                <CardDescription className="text-slate-200">
                  Head back to the main hub and start fresh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="mx-auto mb-4">
                  <Shield className="h-12 w-12 text-white opacity-80" />
                </div>
                <CardTitle className="text-white text-lg">Dashboard</CardTitle>
                <CardDescription className="text-slate-200">
                  Access your player dashboard and stats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    <Shield className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="mx-auto mb-4">
                  <Gamepad2 className="h-12 w-12 text-white opacity-80" />
                </div>
                <CardTitle className="text-white text-lg">Join the Game</CardTitle>
                <CardDescription className="text-slate-200">
                  Sign up and become part of our esports community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/auth/signup">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <Card className="bg-white/5 backdrop-blur-md border-white/10 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-yellow-400 opacity-80" />
              </div>
              <h3 className="esports-heading text-xl text-white mb-4">Lost in the Digital Battlefield?</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Don't worry, even the best players sometimes take a wrong turn. 
                The page you're looking for might have been moved, deleted, or temporarily unavailable.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer message */}
          <div className="mt-12">
            <p className="text-slate-400 text-sm">
              Error Code: 404 • Page Not Found • Raptor Esports Hub
            </p>
          </div>
        </div>
      </div>
    </VideoBackground>
  )
}