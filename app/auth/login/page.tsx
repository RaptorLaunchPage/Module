"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
<<<<<<< HEAD
  const { signIn } = useAuth()
=======
  const { signIn, signInWithDiscord } = useAuth()
>>>>>>> cursor/enhance-authentication-and-profile-features-a7f6
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await signIn(email, password)
      const signInError = result?.error || null
      if (signInError) {
        setError(signInError.message || "Invalid email or password")
        setLoading(false)
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="esports-heading text-2xl text-white font-semibold">Welcome Back</CardTitle>
            <CardDescription className="text-slate-200">Sign in to your Raptor Esports account</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Discord login at the top */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <Button
                className="w-full bg-[#5865F2] text-white border border-white/20 hover:bg-[#4752c4]"
                type="button"
                onClick={async () => {
                  setLoading(true)
                  setError("")
                  try {
                    await signInWithDiscord()
                  } catch (err: any) {
                    setError(err.message || "Discord login failed")
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                {loading ? "Redirecting..." : "Login with Discord"}
              </Button>
            </div>
            {/* Social login placeholder for Google */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <Button className="w-full bg-white/10 text-white border border-white/20 cursor-not-allowed" disabled>
                Google (Coming Soon)
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@raptoresports.gg"
                  required
                  className="bg-transparent border-white/20 text-white placeholder:text-slate-400 focus:ring-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Test@12345"
                    required
                    className="bg-transparent border-white/20 text-white placeholder:text-slate-400 focus:ring-white/30 pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-300 hover:text-white focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="text-right mt-1">
                  <Link href="/auth/forgot" className="text-xs text-slate-300 hover:text-white underline">Forgot Password?</Link>
                </div>
              </div>
              <Button type="submit" className="w-full bg-white/90 text-black hover:bg-white" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-slate-200">
                {"Don't have an account? "}
                <Link href="/auth/signup" className="text-white underline hover:text-slate-100">
                  Sign up
                </Link>
              </p>
            </div>
            <div className="mt-4 text-center">
              <Link href="/" className="text-slate-400 hover:text-white text-sm">
                 Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}
