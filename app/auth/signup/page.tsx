"use client"

import type React from "react"
import { useState } from "react"
import { useAuthFixed as useAuth } from "@/hooks/use-auth-fixed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { RefreshCw, Home } from "lucide-react"

export default function SignUpPage() {
  const [discordLoading, setDiscordLoading] = useState(false)
  const [error, setError] = useState("")
  const { signInWithDiscord } = useAuth()

  const handleDiscordSignup = async () => {
    setDiscordLoading(true)
    setError("")
    
    try {
      await signInWithDiscord()
      // Discord OAuth will handle the redirect
    } catch (err: any) {
      console.error("Discord signup error:", err)
      setError(err.message || "Could not sign up with Discord")
      setDiscordLoading(false)
    }
  }

  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
          <CardHeader className="text-center relative">
            <Link href="/" className="absolute left-4 top-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <CardTitle className="text-2xl text-white font-semibold">Join Raptor Esports</CardTitle>
            <CardDescription className="text-slate-200">
              Create your account with Discord to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-center space-y-4">
              <div className="text-sm text-slate-300 bg-white/5 p-4 rounded-lg">
                <p className="font-medium mb-2">Why Discord?</p>
                <ul className="text-xs space-y-1 text-left">
                  <li>• Seamless integration with our esports community</li>
                  <li>• No need to remember another password</li>
                  <li>• Instant access to team communications</li>
                  <li>• Secure authentication with Discord's trusted platform</li>
                </ul>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#5865F2] text-lg py-6"
                onClick={handleDiscordSignup}
                disabled={discordLoading}
              >
                {discordLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Connecting to Discord...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Create Account with Discord
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-xs text-slate-400">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </div>
              <div className="text-sm text-slate-300">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Sign in with Discord
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}
