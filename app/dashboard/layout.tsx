"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"
import { VideoBackground } from "@/components/video-background"

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
              <strong>We couldn't set up your profile:</strong> <br />
              {error}
              <br />
              <span className="block mt-2">This may be a temporary issue. Please try again, or contact support if the problem persists.</span>
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex flex-wrap h-16 min-h-16 items-center gap-2 border-b px-2 sm:px-4 border-white/20 w-full bg-background">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <MobileNav />
            <span className="font-semibold hidden sm:inline">Raptor Hub</span>
            <span className="font-semibold sm:hidden">Raptor</span>
          </div>
          <div className="ml-auto flex items-center flex-wrap gap-2 sm:gap-4 min-w-0">
            <span className="truncate text-sm text-muted-foreground hidden md:inline max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
              Welcome, {profile.name || profile.email}
            </span>
            <span className="truncate text-sm text-muted-foreground md:hidden max-w-[120px]">
              {profile.name || profile.email?.split('@')[0]}
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0 w-full">
          <div className="flex-1 rounded-xl p-2 sm:p-4 border border-white/20 shadow-xl w-full min-w-0 bg-background">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
