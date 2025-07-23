"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-provider"
import { useAgreementContext } from "@/hooks/use-agreement-context"
import { FullPageLoader } from "@/components/ui/full-page-loader"
import { AlertTriangle } from "lucide-react"

interface AgreementRouteGuardProps {
  children: React.ReactNode
}

// Routes that are allowed even if agreement is required
const ALLOWED_ROUTES = [
  '/agreement-review',
  '/auth/login',
  '/auth/logout',
  '/auth/signup',
  '/auth/confirm',
  '/auth/forgot',
  '/api'  // All API routes
]

function isRouteAllowed(pathname: string): boolean {
  return ALLOWED_ROUTES.some(route => pathname.startsWith(route))
}

export function AgreementRouteGuard({ children }: AgreementRouteGuardProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const { loading, requiresAgreement, hasChecked } = useAgreementContext()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect to agreement review if needed (only for specific routes)
  useEffect(() => {
    // Skip if still loading or checking
    if (authLoading || loading || !hasChecked) return
    
    // Skip if no user (will be handled by auth)
    if (!user || !profile) return
    
    // Skip if current route is allowed
    if (isRouteAllowed(pathname)) return
    
    // Redirect if agreement is required and we're on a protected route
    if (requiresAgreement && pathname !== '/agreement-review') {
      console.log('Agreement required, redirecting to review page')
      router.push('/agreement-review')
    }
  }, [
    authLoading,
    loading,
    hasChecked,
    user,
    profile,
    requiresAgreement,
    pathname,
    router
  ])

  // Show loading screen while checking agreement status
  if ((authLoading || loading || !hasChecked) && user && profile) {
    return (
      <FullPageLoader 
        state="checking-agreement"
        showBackground={false}
        size="md"
      />
    )
  }

  // Show blocked screen if agreement is required but we're not on allowed route
  if (
    user && 
    profile && 
    requiresAgreement && 
    hasChecked &&
    !loading && 
    !isRouteAllowed(pathname) &&
    pathname !== '/agreement-review'
  ) {
    return (
      <FullPageLoader 
        state="redirecting"
        customTitle="Agreement Required"
        customDescription="You need to review and accept the user agreement to continue. Redirecting..."
        showBackground={false}
        size="md"
      />
    )
  }

  // Render children normally
  return <>{children}</>
}
