"use client"

import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { user, loading, profile } = useAuth()

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
