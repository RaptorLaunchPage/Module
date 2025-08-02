"use client"

import type React from "react"
import { useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { Home, Shield } from "lucide-react"
import { COMPONENT_STYLES } from "@/lib/global-theme"

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLoginAnimation, setShowLoginAnimation] = useState(false)
  const { signInWithDiscord, isAuthenticated, error } = useAuth()

  // If already authenticated, the route guard will handle redirect

  const handleDiscordLogin = async () => {
    console.log("🔐 Discord login attempt")
    
    if (isSubmitting) {
      console.log("❌ Already submitting, ignoring")
      return
    }

    setIsSubmitting(true)
    
    try {
      setShowLoginAnimation(true)
      await signInWithDiscord()
      // Discord OAuth will handle the redirect to /auth/confirm
    } catch (err: any) {
      console.error("Discord login error:", err)
      setIsSubmitting(false)
      setShowLoginAnimation(false)
    }
  }

  // Show loading animation during Discord OAuth flow
  if (showLoginAnimation) {
    return (
      <VideoBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className={`w-full max-w-md ${COMPONENT_STYLES.authCard}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-4">
                  <Shield className="h-12 w-12 text-white mx-auto animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Redirecting to Discord...</h2>
                <p className="text-slate-300 text-sm mb-4">You'll be redirected back after authentication</p>
                <div className="flex justify-center items-center space-x-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
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
              Welcome to Raptor Esports
            </CardTitle>
            <CardDescription className="text-slate-200">
              Sign in with your Discord account to get started
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
            
            <div className="space-y-4">
              <Button
                onClick={handleDiscordLogin}
                disabled={isSubmitting}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
                </svg>
                <span>Continue with Discord</span>
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-slate-300">
                  New to Discord?{" "}
                  <a 
                    href="https://discord.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white hover:underline"
                  >
                    Create an account
                  </a>
                </p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-slate-400 text-center">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}