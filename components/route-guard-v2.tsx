"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdvancedLoading, LoadingStep } from '@/components/ui/advanced-loading'

interface RouteGuardV2Props {
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

export function RouteGuardV2({ children }: RouteGuardV2Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [authState, setAuthState] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('connecting')

  // Force completion timeout to prevent infinite loading
  useEffect(() => {
    const forceCompletionTimer = setTimeout(() => {
      if (isLoading && authState?.isAuthenticated && authState?.profile) {
        console.log('⚠️ Force completing authentication - timeout reached')
        setIsLoading(false)
      }
    }, 2000) // 2 second maximum loading time

    return () => clearTimeout(forceCompletionTimer)
  }, [isLoading, authState?.isAuthenticated, authState?.profile])

  // Initialize auth and handle state changes
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('🚀 Route guard: Starting auth initialization...')
        
        // Dynamic import to avoid potential circular dependencies
        const { default: authFlowV2 } = await import('@/lib/auth-flow-v2')

        if (!mounted) return

        // Subscribe to auth state changes first
        const unsubscribe = authFlowV2.subscribe((newState) => {
          if (!mounted) return
          
          console.log('🔄 Route Guard received auth state update:', {
            isAuthenticated: newState.isAuthenticated,
            isInitialized: newState.isInitialized,
            isLoading: newState.isLoading,
            hasProfile: !!newState.profile,
            pathname
          })

          setAuthState(newState)

          // Update loading step based on auth state
          if (newState.isLoading) {
            if (!newState.isAuthenticated) {
              setLoadingStep('connecting')
            } else if (!newState.profile) {
              setLoadingStep('loading-profile')
            } else {
              setLoadingStep('initializing')
            }
          } else {
            setLoadingStep('redirecting')
            setIsLoading(false)
          }
        })

        // Check if already initialized to prevent duplicate calls
        const currentState = authFlowV2.getState()
        if (currentState.isInitialized && !currentState.isLoading) {
          console.log('✅ Route guard: Auth already initialized, using existing state')
          setAuthState(currentState)
          setIsLoading(false)
          return unsubscribe
        }

        // Initialize auth flow - this should be the primary initialization point
        console.log('🚀 Route guard: Performing fresh auth initialization...')
        const result = await authFlowV2.initialize(true) // This is the main initialization
        
        if (!mounted) return

        // Route guard focuses on protection, not redirection
        // Let the auth flow handle its own redirects through events
        if (result.success && result.shouldRedirect && result.redirectPath) {
          console.log('🔄 Route guard: Auth flow determined redirect needed to', result.redirectPath, '- auth hook will handle it')
        }

        return unsubscribe
      } catch (error: any) {
        console.error('❌ Route guard initialization error:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth().then((unsubscribe) => {
      if (mounted && unsubscribe) {
        // Store cleanup function
        return () => {
          mounted = false
          unsubscribe()
        }
      }
    })

    return () => {
      mounted = false
    }
  }, [pathname]) // Only depend on pathname changes

  // Handle route protection logic
  useEffect(() => {
    if (!authState) {
      return // Still waiting for initial auth state
    }

    // If auth state shows not loading and we're still showing loading screen, clear it
    if (!authState.isLoading && isLoading) {
      console.log('🔄 Route guard: Auth completed, clearing loading screen')
      setIsLoading(false)
      return
    }

    // Force clear loading if authenticated and profile is loaded (fallback)
    if (authState.isAuthenticated && authState.profile && !authState.isLoading && isLoading) {
      console.log('⚡ Route guard: Force clearing loading - auth complete with profile')
      setIsLoading(false)
      return
    }

    if (authState.isLoading) {
      return // Still loading, don't make route decisions yet
    }

    // Allow public routes immediately
    if (isPublicRoute(pathname)) {
      setIsLoading(false)
      return
    }

    // If not authenticated, redirect to login
    if (!authState.isAuthenticated || !authState.user) {
      console.log('🔒 Route guard: Not authenticated, redirecting to login')
      
      // Store intended route
      if (pathname !== '/auth/login' && typeof window !== 'undefined') {
        localStorage.setItem('raptor-intended-route', pathname)
      }
      
      // Add slight delay to prevent jarring transitions
      setTimeout(() => {
        router.push('/auth/login')
      }, 100)
      return
    }

    // Check agreement requirements
    if (authState.agreementStatus?.requiresAgreement && pathname !== '/agreement-review') {
      console.log('📋 Route guard: Agreement required, redirecting to review')
      setTimeout(() => {
        router.push('/agreement-review')
      }, 100)
      return
    }

    // Check onboarding requirements for pending players
    if (authState.profile?.role === 'pending_player' && 
        !authState.profile?.onboarding_completed && 
        pathname !== '/onboarding') {
      console.log('🎯 Route guard: Onboarding required, redirecting to onboarding')
      setTimeout(() => {
        router.push('/onboarding')
      }, 100)
      return
    }

    // All checks passed and auth is complete - clear loading
    console.log('✅ Route guard: All checks passed, access granted')
    setIsLoading(false)

  }, [authState, pathname, router, isLoading])

  // Show loading screen while initializing or making route decisions
  if (isLoading || (authState?.isLoading)) {
    const steps: LoadingStep[] = ['connecting', 'authenticating', 'loading-profile', 'initializing', 'redirecting']
    
    let currentStep: LoadingStep = loadingStep
    let description = 'Establishing connection...'
    
    if (authState) {
      if (!authState.isAuthenticated && !authState.user) {
        currentStep = 'connecting'
        description = 'Establishing connection...'
      } else if (authState.isAuthenticated && !authState.profile) {
        currentStep = 'loading-profile'
        description = 'Loading your profile...'
      } else if (authState.isAuthenticated && authState.profile && authState.isLoading) {
        currentStep = 'initializing'
        description = 'Setting up your dashboard...'
      } else if (authState.isAuthenticated && authState.profile && !authState.isLoading) {
        // Auth is complete but route guard is still processing
        currentStep = 'redirecting'
        description = 'Access granted! Loading your dashboard...'
      } else {
        currentStep = 'authenticating'
        description = 'Verifying your credentials...'
      }
    }

    return (
      <AdvancedLoading
        currentStep={currentStep}
        steps={steps}
        customDescription={description}
        timeoutMs={3000} // Reduced timeout to prevent infinite loading
        showProgress={true}
        onTimeout={() => {
          console.log('⚠️ Route guard loading timeout - forcing completion')
          setIsLoading(false)
        }}
      />
    )
  }

  // Show loading for protected routes while checking authentication
  if (!isPublicRoute(pathname) && (!authState || !authState.isInitialized)) {
    return (
      <AdvancedLoading
        currentStep="initializing"
        steps={['connecting', 'authenticating', 'loading-profile', 'initializing']}
        customDescription="Verifying access permissions..."
        timeoutMs={0}
        showProgress={true}
      />
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}