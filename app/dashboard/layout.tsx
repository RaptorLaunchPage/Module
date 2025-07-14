"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AppTopbar } from "@/components/app-topbar"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, error, retryProfileCreation } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Setting up your profile...</p>
          <p className="text-xs text-muted-foreground">Check console (F12) for details</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Profile Creation Failed:</strong> {error}
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>User ID:</strong> {user.id}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={retryProfileCreation}>Try Again</Button>
              <Button variant="outline" onClick={() => router.push("/auth/login")}>
                Back to Login
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <p className="font-semibold mb-2">Manual Fix:</p>
              <code className="block text-left">
                {`INSERT INTO users (id, email, name, role) VALUES ('${user.id}', '${user.email}', 'Your Name', 'admin');`}
              </code>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Profile Not Found</h2>
          <p className="text-muted-foreground">Your profile should have been created automatically.</p>
          <Button onClick={retryProfileCreation}>Retry Profile Creation</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppTopbar />
      <main className="flex-1 flex flex-col gap-4 p-2 sm:p-4">
        <div className="flex-1 rounded-xl bg-muted/50 p-2 sm:p-4 min-h-[calc(100vh-6rem)]">
          {children}
        </div>
      </main>
    </div>
  )
}
