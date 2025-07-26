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
  const [isLoading, setIsLoading] = useState(() => {
    // Don't start in loading state for public routes
    return !isPublicRoute(pathname)
  })
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('connecting')

  // Ultimate fallback - force completion after 15 seconds no matter what
  useEffect(() => {
    if (isPublicRoute(pathname)) return // Skip for public routes

    const ultimateFallback = setTimeout(() => {
      console.log('⚠️ Ultimate fallback triggered - forcing loading completion after 15 seconds')
      setIsLoading(false)
      
      // If we're on a protected route and don't have auth, redirect to login
      if (!isPublicRoute(pathname) && (!authState || !authState.isAuthenticated)) {
        console.log('🔒 No auth after timeout, redirecting to login')
        router.push('/auth/login')
      }
    }, 15000) // 15 second ultimate fallback

    return () => clearTimeout(ultimateFallback)
  }, [pathname, router, authState])

  // Force completion timeout to prevent infinite loading
  useEffect(() => {
    if (isPublicRoute(pathname)) return // Skip for public routes

    const forceCompletionTimer = setTimeout(() => {
      if (isLoading && authState?.isAuthenticated && authState?.profile) {
        console.log('⚠️ Force completing authentication - timeout reached')
        console.log('🔍 Timeout force details:', {
          isAuthenticated: authState.isAuthenticated,
          hasUser: !!authState.user,
          hasProfile: !!authState.profile,
          authLoading: authState.isLoading,
          routeGuardLoading: isLoading,
          pathname
        })
        setIsLoading(false)
      }
    }, 3000) // Increased to 3 seconds for better UX

    return () => clearTimeout(forceCompletionTimer)
  }, [isLoading, authState?.isAuthenticated, authState?.profile, authState?.isLoading, authState?.user, pathname])

  // Additional safety check - clear loading if we have complete auth data
  useEffect(() => {
    if (isPublicRoute(pathname)) return // Skip for public routes

    if (isLoading && authState && !authState.isLoading && 
        authState.isAuthenticated && authState.user && authState.profile) {
      console.log('🔧 Safety check: Auth data complete, clearing loading state')
      setTimeout(() => {
        setIsLoading(false)
      }, 100)
    }
  }, [isLoading, authState, pathname])

  // Initialize auth and handle state changes
  useEffect(() => {
    if (isPublicRoute(pathname)) return // Skip for public routes

    let mounted = true
    let initTimeout: NodeJS.Timeout | null = null

    // This effect only runs for protected routes now
    console.log('🔒 Protected route detected, initializing auth:', pathname)

    const initializeAuth = async () => {
      try {
        console.log('🚀 Route guard: Starting auth initialization...')
        
        // Set a timeout to prevent infinite waiting
        initTimeout = setTimeout(() => {
          if (mounted) {
            console.log('⚠️ Route guard: Auth initialization timeout - forcing completion')
            setIsLoading(false)
          }
        }, 10000) // 10 second timeout for initialization
        
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
            // Clear the initialization timeout since we got a response
            if (initTimeout) {
              clearTimeout(initTimeout)
              initTimeout = null
            }
            setIsLoading(false)
          }
        })

        // Check if already initialized to prevent duplicate calls
        const currentState = authFlowV2.getState()
        if (currentState.isInitialized && !currentState.isLoading) {
          console.log('✅ Route guard: Auth already initialized, using existing state')
          setAuthState(currentState)
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          setIsLoading(false)
          return unsubscribe
        }

        // Initialize auth flow - this should be the primary initialization point
        console.log('🚀 Route guard: Performing fresh auth initialization...')
        const result = await authFlowV2.initialize(true) // This is the main initialization
        
        if (!mounted) return

        console.log('✅ Route guard: Auth initialization completed:', {
          success: result.success,
          shouldRedirect: result.shouldRedirect,
          redirectPath: result.redirectPath,
          error: result.error
        })

        // Clear the initialization timeout since we got a response
        if (initTimeout) {
          clearTimeout(initTimeout)
          initTimeout = null
        }

        // Route guard focuses on protection, not redirection
        // Let the auth flow handle its own redirects through events
        if (result.success && result.shouldRedirect && result.redirectPath) {
          console.log('🔄 Route guard: Auth flow determined redirect needed to', result.redirectPath, '- auth hook will handle it')
        }

        return unsubscribe
      } catch (error: any) {
        console.error('❌ Route guard initialization error:', error)
        if (mounted) {
          // Clear the initialization timeout
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          setIsLoading(false)
        }
      }
    }

    initializeAuth().then((unsubscribe) => {
      if (mounted && unsubscribe) {
        // Store cleanup function
        return () => {
          mounted = false
          if (initTimeout) {
            clearTimeout(initTimeout)
          }
          unsubscribe()
        }
      }
    })

    return () => {
      mounted = false
      if (initTimeout) {
        clearTimeout(initTimeout)
      }
    }
  }, [pathname]) // Only depend on pathname changes

  // Handle route protection logic
  useEffect(() => {
    if (isPublicRoute(pathname)) return // Skip for public routes

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
      console.log('🔍 Force clear details:', {
        isAuthenticated: authState.isAuthenticated,
        hasProfile: !!authState.profile,
        authLoading: authState.isLoading,
        routeGuardLoading: isLoading,
        pathname
      })
      setIsLoading(false)
      return
    }

    // Additional fallback - if we have everything needed for dashboard access
    if (authState.isAuthenticated && authState.user && authState.profile && 
        !authState.isLoading && isLoading && pathname === '/dashboard') {
      console.log('🚀 Route guard: Dashboard access ready - clearing loading')
      setIsLoading(false)
      return
    }

    if (authState.isLoading) {
      return // Still loading, don't make route decisions yet
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
    console.log('🔍 Auth state details:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      hasProfile: !!authState.profile,
      isLoading: authState.isLoading,
      routeGuardLoading: isLoading,
      pathname
    })
    setIsLoading(false)

  }, [authState, pathname, router, isLoading])

  // For public routes, render immediately without any loading
  if (isPublicRoute(pathname)) {
    console.log('🏠 Public route - rendering immediately:', pathname)
    return <>{children}</>
  }

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

    console.log('🔄 Route guard showing loading screen:', {
      currentStep,
      description,
      authStateLoading: authState?.isLoading,
      routeGuardLoading: isLoading,
      isAuthenticated: authState?.isAuthenticated,
      hasProfile: !!authState?.profile,
      pathname
    })

    return (
      <AdvancedLoading
        currentStep={currentStep}
        steps={steps}
        customDescription={description}
        timeoutMs={5000} // Increased timeout for better UX
        showProgress={true}
        autoProgress={false} // Don't auto-progress, wait for actual auth completion
        onTimeout={() => {
          console.log('⚠️ Route guard loading timeout - forcing completion')
          console.log('🔍 Timeout details:', {
            isAuthenticated: authState?.isAuthenticated,
            hasUser: !!authState?.user,
            hasProfile: !!authState?.profile,
            authLoading: authState?.isLoading,
            pathname
          })
          // Force redirect to dashboard if we have auth data
          if (authState?.isAuthenticated && authState?.profile) {
            console.log('🚀 Forcing redirect to dashboard after timeout')
            router.push('/dashboard')
          }
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
        timeoutMs={5000}
        showProgress={true}
        autoProgress={false} // Don't auto-progress, wait for actual auth completion
      />
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}