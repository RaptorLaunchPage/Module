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

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await signUp(email, password, name)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <VideoBackground>
        {/* Subtle white glowing dots */}
        <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
        <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white font-semibold">Check Your Email</CardTitle>
              <CardDescription className="text-slate-200">
                We've sent you a confirmation link to complete your registration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/auth/login")} className="w-full bg-white/90 text-black hover:bg-white">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </VideoBackground>
    )
  }

  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="esports-heading text-2xl text-white font-semibold">Create Account</CardTitle>
            <CardDescription className="text-slate-200">Join the Raptor Esports team</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="bg-transparent border-white/20 text-white placeholder:text-slate-400 focus:ring-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-transparent border-white/20 text-white placeholder:text-slate-400 focus:ring-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="bg-transparent border-white/20 text-white placeholder:text-slate-400 focus:ring-white/30"
                />
              </div>
              <Button type="submit" className="w-full bg-white/90 text-black hover:bg-white" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
            {/* Social login placeholder */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button className="w-full bg-white/10 text-white border border-white/20 cursor-not-allowed" disabled>
                Google (Coming Soon)
              </Button>
              <Button className="w-full bg-white/10 text-white border border-white/20 cursor-not-allowed" disabled>
                Discord (Coming Soon)
              </Button>
            </div>
            <div className="mt-4 text-center">
              <p className="text-slate-200">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-white underline hover:text-slate-100">
                  Sign in
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
