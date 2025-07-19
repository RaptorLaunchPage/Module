"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { Eye, EyeOff, LogIn, RefreshCw, Home } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, signInWithDiscord, clearError: clearAuthError, loading: authLoading, user, profile } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile && !authLoading) {
      console.log("✅ User authenticated with profile, redirecting to dashboard")
      setIsSubmitting(false)
      if (profile.role === "pending_player") {
        router.push("/onboarding")
      } else {
        router.push("/dashboard")
      }
    }
  }, [user, profile, authLoading, router])

  // Clear local error when auth error changes
  useEffect(() => {
    clearAuthError()
    setError("")
  }, [clearAuthError])

  // Reset submitting state if auth loading changes
  useEffect(() => {
    if (!authLoading && isSubmitting) {
      // Small delay to allow for successful redirect
      const timeout = setTimeout(() => {
        if (!user) {
          setIsSubmitting(false)
        }
      }, 1000)
      
      return () => clearTimeout(timeout)
    }
  }, [authLoading, isSubmitting, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password")
      return
    }

    if (isSubmitting || authLoading) {
      console.log("Already submitting or auth loading, ignoring submit")
      return
    }

    setIsSubmitting(true)
    setError("")
    clearAuthError()
    
    try {
      console.log("🔐 Attempting login for:", email)
      const result = await signIn(email, password)
      
      if (result?.error) {
        console.error("❌ Login failed:", result.error)
        const errorMessage = result.error.message || "Invalid email or password"
        setError(errorMessage)
        setIsSubmitting(false)
      } else {
        console.log("✅ Login successful, waiting for redirect...")
        // Don't reset submitting here - let useEffect handle it
        // Add fallback timeout
        setTimeout(() => {
          if (isSubmitting && !user) {
            console.warn("⚠️ Login timeout, resetting state")
            setIsSubmitting(false)
            setError("Login is taking longer than expected. Please try again.")
          }
        }, 20000) // 20 second timeout
      }
    } catch (err: any) {
      console.error("❌ Login exception:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleDiscordLogin = async () => {
    if (isSubmitting || authLoading) {
      return
    }
    
    setError("")
    clearAuthError()
    setIsSubmitting(true)
    
    try {
      await signInWithDiscord()
      // Discord OAuth will handle the redirect
    } catch (err: any) {
      console.error("Discord login error:", err)
      setError(err.message || "Could not sign in with Discord")
      setIsSubmitting(false)
    }
  }

  const clearErrors = () => {
    setError("")
    clearAuthError()
  }

  // Show loading if auth is processing or we're submitting
  const isLoading = authLoading || isSubmitting

  return (
    <VideoBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/RLogo.ico" 
                alt="Raptor Logo" 
                className="h-12 w-12"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your Raptor account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between">
                    {error}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearErrors}
                      className="ml-2 text-destructive hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {isSubmitting ? "Signing In..." : "Connecting..."}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleDiscordLogin}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418Z"
                  />
                </svg>
                Discord
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <div className="text-sm">
                <Link 
                  href="/auth/forgot" 
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="text-sm">
                Don't have an account?{" "}
                <Link 
                  href="/auth/signup" 
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}
