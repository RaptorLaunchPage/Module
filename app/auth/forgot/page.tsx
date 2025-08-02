"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ForgotPasswordPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page since we only support Discord OAuth (no passwords to reset)
    router.replace('/auth/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Redirecting...</h2>
        <p className="text-slate-300">Password reset not needed for Discord authentication</p>
      </div>
    </div>
  )
}