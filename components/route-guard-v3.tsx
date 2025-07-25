"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FullPageLoader } from '@/components/ui/full-page-loader'
import authFlowV3, { AuthState } from '@/lib/auth-flow-v3'

interface RouteGuardV3Props {
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

// Check if a route is public
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

export function RouteGuardV3({ children }: RouteGuardV3Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [isCheckingRoute, setIsCheckingRoute] = useState(true)

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authFlowV3.subscribe((newState) => {
      console.log('🔄 Route Guard received auth state:', {
        isAuthenticated: newState.isAuthenticated,
        isInitialized: newState.isInitialized,
        isLoading: newState.isLoading,
        hasProfile: !!newState.profile,
        pathname
      })
      
      setAuthState(newState)
      
      // If auth is initialized and not loading, we can make route decisions
      if (newState.isInitialized && !newState.isLoading) {
        setIsCheckingRoute(false)
      }
    })

    // Initialize auth if not already done
    authFlowV3.initialize()

    return unsubscribe
  }, [pathname])

  // Handle route protection logic
  useEffect(() => {
    if (!authState || authState.isLoading || isCheckingRoute) {
      return // Still initializing
    }

    // Allow public routes immediately
    if (isPublicRoute(pathname)) {
      return
    }

    // Protected route logic
    if (!authState.isAuthenticated || !authState.user || !authState.profile) {
      console.log('🔒 Route guard: Not authenticated, redirecting to login')
      
      // Store intended route
      if (pathname !== '/auth/login') {
        localStorage.setItem('raptor-intended-route', pathname)
      }
      
      router.push('/auth/login')
      return
    }

    // Check agreement requirements
    if (authState.agreementStatus?.requiresAgreement && pathname !== '/agreement-review') {
      console.log('📋 Route guard: Agreement required, redirecting to review')
      router.push('/agreement-review')
      return
    }

    // Check onboarding requirements for pending players
    if (authState.profile?.role === 'pending_player' && 
        !authState.profile?.onboarding_completed && 
        pathname !== '/onboarding') {
      console.log('🎯 Route guard: Onboarding required, redirecting to onboarding')
      router.push('/onboarding')
      return
    }

    console.log('✅ Route guard: All checks passed, access granted')
  }, [authState, pathname, router, isCheckingRoute])

  // Show loading screen while checking auth or routes
  if (!authState || authState.isLoading || isCheckingRoute) {
    // Don't show loading for public routes
    if (isPublicRoute(pathname)) {
      return <>{children}</>
    }

    let loadingState: 'connecting' | 'authenticating' | 'loading-profile' | 'initializing' = 'connecting'
    let message = 'Establishing connection...'

    if (authState) {
      if (!authState.isAuthenticated) {
        loadingState = 'connecting'
        message = 'Connecting to server...'
      } else if (!authState.profile) {
        loadingState = 'loading-profile'
        message = 'Loading your profile...'
      } else {
        loadingState = 'initializing'
        message = 'Setting up your dashboard...'
      }
    }

    return (
      <FullPageLoader 
        state={loadingState}
        message={message}
        size="md"
        showBackground={true}
      />
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}