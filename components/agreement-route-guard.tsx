"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-provider"
import { useAgreementContext } from "@/hooks/use-agreement-context"
import { FullPageLoader } from "@/components/ui/full-page-loader"
import { throttledNavigate } from "@/lib/navigation-throttle"

interface AgreementRouteGuardProps {
  children: React.ReactNode
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/confirm',
  '/auth/forgot',
  '/auth/reset-password'
]

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

function isPublicRoute(pathname: string): boolean {
  // API routes are public (they handle their own auth)
  if (pathname.startsWith('/api/')) return true
  
  // Static assets
  if (pathname.startsWith('/_next/')) return true
  if (pathname.includes('.')) return true // Files with extensions
  
  // Explicit public routes
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  })
}

function isRouteAllowed(pathname: string): boolean {
  return ALLOWED_ROUTES.some(route => pathname.startsWith(route))
}

export function AgreementRouteGuard({ children }: AgreementRouteGuardProps) {
  const { user, profile, loading: authLoading, isAuthenticated, isExpired, isInitialized } = useAuth()
  const { loading: agreementLoading, requiresAgreement, hasChecked } = useAgreementContext()
  const router = useRouter()
  const pathname = usePathname()
  const [hasRedirected, setHasRedirected] = useState(false)
  const redirectTimeoutRef = useRef<NodeJS.Timeout>()

  // Clear any pending redirects on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  // Handle authentication and agreement redirects
  useEffect(() => {
    // Skip if already redirected this session or route is public
    if (hasRedirected || isPublicRoute(pathname)) return

    // Wait for auth to initialize
    if (!isInitialized || authLoading) return

    // Handle authentication
    if (!isAuthenticated || isExpired) {
      // Store the intended route for redirect after login
      if (pathname !== '/auth/login' && typeof window !== 'undefined') {
        localStorage.setItem('raptor-intended-route', pathname)
      }
      
      setHasRedirected(true)
      redirectTimeoutRef.current = setTimeout(() => {
        throttledNavigate(router, '/auth/login', 'push')
      }, 100) // Small delay to prevent rapid calls
      return
    }

    // Wait for user and profile
    if (!user || !profile) return

    // Wait for agreement check to complete
    if (agreementLoading || !hasChecked) return

    // Handle agreement requirement
    if (requiresAgreement && !isRouteAllowed(pathname) && pathname !== '/agreement-review') {
      console.log('Agreement required, redirecting to review page')
      setHasRedirected(true)
      redirectTimeoutRef.current = setTimeout(() => {
        throttledNavigate(router, '/agreement-review', 'push')
      }, 100)
      return
    }

  }, [
    isInitialized,
    authLoading,
    isAuthenticated,
    isExpired,
    user,
    profile,
    agreementLoading,
    hasChecked,
    requiresAgreement,
    pathname,
    router,
    hasRedirected
  ])

  // Reset redirect flag when pathname changes
  useEffect(() => {
    setHasRedirected(false)
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
    }
  }, [pathname])

  // Show loading while initializing
  if (!isInitialized || authLoading) {
    return (
      <FullPageLoader 
        state="initializing"
        customDescription="Loading application..."
        showBackground={false}
        size="md"
      />
    )
  }

  // Allow access to public routes
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // Show auth loading/redirect
  if (!isAuthenticated || isExpired || !user || !profile) {
    return (
      <FullPageLoader 
        state="redirecting"
        customTitle="Authentication Required"
        customDescription="Redirecting to login..."
        showBackground={false}
        size="md"
      />
    )
  }

  // Show agreement loading
  if (agreementLoading || !hasChecked) {
    return (
      <FullPageLoader 
        state="checking-agreement"
        customDescription="Checking agreement status..."
        showBackground={false}
        size="md"
      />
    )
  }

  // Show agreement redirect
  if (requiresAgreement && !isRouteAllowed(pathname) && pathname !== '/agreement-review') {
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
