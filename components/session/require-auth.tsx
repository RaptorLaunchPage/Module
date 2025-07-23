"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth-provider'
import { FullPageLoader } from '@/components/ui/full-page-loader'

interface RequireAuthProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
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

// API routes and static assets
const isPublicRoute = (pathname: string): boolean => {
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

export function RequireAuth({ 
  children, 
  fallback,
  redirectTo = '/auth/login'
}: RequireAuthProps) {
  const { isAuthenticated, loading, isExpired } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect on public routes
    if (isPublicRoute(pathname)) return

    // Don't redirect while loading
    if (loading) return

    // Redirect if not authenticated or session expired
    if (!isAuthenticated || isExpired) {
      console.log(`🔒 Redirecting to ${redirectTo} - auth: ${isAuthenticated}, expired: ${isExpired}`)
      
      // Store the intended route for redirect after login
      if (pathname !== redirectTo && typeof window !== 'undefined') {
        localStorage.setItem('raptor-intended-route', pathname)
      }
      
      router.push(redirectTo)
    }
  }, [isAuthenticated, loading, isExpired, pathname, router, redirectTo])

  // Show loading while checking auth
  if (loading) {
    return fallback || (
      <FullPageLoader 
        state="loading"
        customTitle="Checking Authentication"
        customDescription="Please wait while we verify your session..."
        showBackground={false}
        size="md"
      />
    )
  }

  // Allow access to public routes
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // Show loading if redirecting
  if (!isAuthenticated || isExpired) {
    return fallback || (
      <FullPageLoader 
        state="redirecting"
        customTitle="Authentication Required"
        customDescription="Redirecting to login..."
        showBackground={false}
        size="md"
      />
    )
  }

  // Render protected content
  return <>{children}</>
}
