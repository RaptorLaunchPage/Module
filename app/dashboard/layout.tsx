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
import { Shield, RefreshCw, Home, AlertTriangle } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, error, retryProfileCreation, clearError, signOut } = useAuth()
  const router = useRouter()
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // More resilient redirect logic for refresh scenarios
    if (!loading && !user) {
      // Give a short grace period before redirecting to allow for session recovery
      const timer = setTimeout(() => {
        console.log('📍 Dashboard: No user after grace period, redirecting to login')
        router.push("/auth/login")
      }, 2000) // 2 second grace period
      
      setRedirectTimer(timer)
    } else if (user) {
      // User is present, clear any pending redirect
      if (redirectTimer) {
        clearTimeout(redirectTimer)
        setRedirectTimer(null)
      }
    }

    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer)
      }
    }
  }, [user, loading, router, redirectTimer])

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
    clearError()
    
    try {
      await retryProfileCreation()
    } catch (err) {
      console.error('Retry failed:', err)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleBackToLogin = async () => {
    try {
      await signOut()
      router.push("/auth/login")
    } catch (err) {
      console.error('Sign out failed:', err)
      // Force redirect even if sign out fails
      router.push("/auth/login")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Setting up your account...</p>
            <p className="text-sm text-muted-foreground">
              This usually takes just a moment
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <Home className="h-8 w-8 mx-auto text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isConstraintError = error.includes('constraint') || error.includes('role')
    const isDatabaseError = error.includes('database') || error.includes('Database')
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h1 className="text-2xl font-bold">Account Setup Issue</h1>
              <p className="text-muted-foreground mt-2">
                We're having trouble setting up your profile
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertDescription className="space-y-3">
              <div>
                <strong>What happened:</strong>
                <p className="mt-1 text-sm">{error}</p>
              </div>
              
              {isConstraintError && (
                <div>
                  <strong>Technical info:</strong>
                  <p className="mt-1 text-sm">
                    This appears to be a database configuration issue. The system is trying to assign a role that isn't allowed in the database.
                  </p>
                </div>
              )}
              
              <div>
                <strong>What you can do:</strong>
                <ul className="mt-1 text-sm space-y-1 list-disc list-inside">
                  <li>Try again - temporary issues often resolve themselves</li>
                  <li>Check your internet connection</li>
                  {retryCount > 2 && <li>Contact support if the problem persists</li>}
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>User ID:</strong> <code className="text-xs">{user.id}</code></p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Provider:</strong> {user.app_metadata?.provider || 'email'}</p>
                {retryCount > 0 && <p><strong>Retry attempts:</strong> {retryCount}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again {retryCount > 0 && `(${retryCount + 1})`}
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleBackToLogin}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>

            {(isDatabaseError || retryCount > 2) && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm mb-2">For Developers:</h3>
                <div className="text-xs space-y-2">
                  <p>This error suggests a database schema issue. To fix:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Run the database migration in <code>database/emergency-role-constraint-fix.sql</code></li>
                    <li>Ensure the role constraint includes 'pending_player'</li>
                    <li>Check that the default role is set correctly</li>
                  </ol>
                  
                  <details className="mt-3">
                    <summary className="cursor-pointer text-muted-foreground">Show SQL fix</summary>
                    <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
{`-- Emergency fix:
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'coach', 'player', 'analyst', 'pending_player', 'awaiting_approval'));`}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-4">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold">Profile Setup Required</h2>
              <p className="text-muted-foreground mt-2">
                Your account exists, but we need to set up your profile.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <Button onClick={handleRetry} className="w-full">
              <Shield className="mr-2 h-4 w-4" />
              Set Up Profile
            </Button>
            
            <Button variant="outline" onClick={handleBackToLogin} className="w-full">
              Back to Login
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>User: {user.email}</p>
          </div>
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
