"use client"

import type React from "react"
import { useState } from "react"
import { useAuthFixed as useAuth } from "@/hooks/use-auth-fixed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { RefreshCw, Home, Shield } from "lucide-react"
import { COMPONENT_STYLES } from "@/lib/global-theme"

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLoginAnimation, setShowLoginAnimation] = useState(false)
  const { signInWithDiscord, isAuthenticated, isLoading, error } = useAuth()

  const handleDiscordLogin = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      await signInWithDiscord()
      // Discord OAuth will redirect externally, so we don't need to handle success here
      // The redirect will happen automatically
    } catch (err: any) {
      console.error("Discord login error:", err)
      setIsSubmitting(false)
    }
  }

  // Show loading animation during successful login
  if (showLoginAnimation) {
    return (
      <VideoBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className={`w-full max-w-md ${COMPONENT_STYLES.authCard}`}>
            <CardContent className="text-center py-12">
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <Shield className="h-16 w-16 text-white animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">Welcome Back!</h3>
                  <p className="text-slate-200">Taking you to your dashboard...</p>
                </div>
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </VideoBackground>
    )
  }

  return (
    <VideoBackground>
      {/* Ambient glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${COMPONENT_STYLES.authCard}`}>
          <CardHeader className="text-center relative">
            <Link href="/" className="absolute left-4 top-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl font-semibold text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-200">
              Sign in to your Raptor Esports account with Discord
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700/50 backdrop-blur-sm">
                <AlertDescription className="text-sm text-red-100">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleDiscordLogin}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#5865F2] font-medium text-lg py-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Connecting to Discord...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Sign in with Discord
                </>
              )}
            </Button>
            
            <div className="text-center text-sm text-slate-400 mt-6">
              New to Raptor Esports?{" "}
              <Link href="/auth/signup" className="text-white hover:underline font-medium">
                Create account with Discord
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}
