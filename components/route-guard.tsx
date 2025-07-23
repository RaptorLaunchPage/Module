"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { COMPONENT_STYLES } from '@/lib/global-theme'

interface RouteGuardProps {
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

export function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading, agreementStatus, user, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Don't render anything while auth is loading
    if (isLoading) {
      setShouldRender(false)
      return
    }

    // Allow public routes immediately
    if (isPublicRoute(pathname)) {
      setShouldRender(true)
      return
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      console.log('🔒 Route guard: Not authenticated, redirecting to login')
      
      // Store intended route
      if (pathname !== '/auth/login' && typeof window !== 'undefined') {
        localStorage.setItem('raptor-intended-route', pathname)
      }
      
      router.push('/auth/login')
      setShouldRender(false)
      return
    }

    // If authenticated but no profile, show loading
    if (!profile) {
      setShouldRender(false)
      return
    }

    // Check agreement requirements
    if (agreementStatus.requiresAgreement && !agreementStatus.isChecked) {
      // Still checking agreement
      setShouldRender(false)
      return
    }

    if (agreementStatus.requiresAgreement && pathname !== '/agreement-review') {
      console.log('📋 Route guard: Agreement required, redirecting to review')
      router.push('/agreement-review')
      setShouldRender(false)
      return
    }

    // All checks passed
    setShouldRender(true)

  }, [isAuthenticated, user, profile, agreementStatus, pathname, router, isLoading])

  // Show loading while auth is loading
  if (isLoading) {
    return (
      <div className={COMPONENT_STYLES.loadingContainer}>
        <div className={COMPONENT_STYLES.loadingCard}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white font-medium">Initializing application...</p>
        </div>
      </div>
    )
  }

  // Show loading while checking auth/profile for protected routes
  if (!isPublicRoute(pathname) && (!shouldRender || !profile)) {
    return (
      <div className={COMPONENT_STYLES.loadingContainer}>
        <div className={COMPONENT_STYLES.loadingCard}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white font-medium">
            {!isAuthenticated ? 'Redirecting to login...' : 
             !profile ? 'Loading profile...' :
             'Checking access...'}
          </p>
        </div>
      </div>
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}