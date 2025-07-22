"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAgreementEnforcement, useAgreementDevOverride } from "@/hooks/use-agreement-enforcement"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, AlertTriangle } from "lucide-react"

interface AgreementEnforcementWrapperProps {
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

export function AgreementEnforcementWrapper({ children }: AgreementEnforcementWrapperProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const { loading, requiresAgreement, agreementStatus } = useAgreementEnforcement()
  const devOverride = useAgreementDevOverride()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect to agreement review if needed
  useEffect(() => {
    // Skip if still loading
    if (authLoading || loading) return
    
    // Skip if no user (will be handled by auth)
    if (!user || !profile) return
    
    // Skip if dev override is enabled
    if (devOverride) return
    
    // Skip if current route is allowed
    if (isRouteAllowed(pathname)) return
    
    // Redirect if agreement is required
    if (requiresAgreement && agreementStatus) {
      console.log('Agreement required, redirecting to review page', {
        status: agreementStatus.status,
        current: agreementStatus.current_version,
        required: agreementStatus.required_version
      })
      router.push('/agreement-review')
    }
  }, [
    authLoading,
    loading,
    user,
    profile,
    requiresAgreement,
    agreementStatus,
    devOverride,
    pathname,
    router
  ])

  // Show loading screen while checking agreement status
  if ((authLoading || loading) && user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Checking agreement status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show blocked screen if agreement is required but we're not on allowed route
  if (
    user && 
    profile && 
    requiresAgreement && 
    !loading && 
    !devOverride && 
    !isRouteAllowed(pathname)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Shield className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Agreement Required</h3>
              <p className="text-muted-foreground mb-4">
                You need to review and accept the user agreement to continue.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to agreement review...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show dev override notice in development
  if (devOverride && process.env.NODE_ENV === 'development') {
    return (
      <div>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Development Mode:</strong> Agreement enforcement is disabled.
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // Render children normally
  return <>{children}</>
}
