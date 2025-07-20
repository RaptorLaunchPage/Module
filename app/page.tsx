"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { user, loading, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Simple redirect logic for authenticated users
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
    return <div>Loading...</div>
  }

  if (user && profile) {
    return <div>Redirecting to dashboard...</div>
  }

  return (
    <div>
      <h1>Raptor Esports Hub</h1>
      <p>Welcome to the platform</p>
      <a href="/auth/login">Login</a> | <a href="/auth/signup">Sign Up</a>
    </div>
  )
}
