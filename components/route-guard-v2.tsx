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

  // Initialize auth and handle state changes
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Dynamic import to avoid potential circular dependencies
        const { default: authFlowV2 } = await import('@/lib/auth-flow-v2')

        if (!mounted) return

        // Subscribe to auth state changes
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

        // Initialize auth flow
        const result = await authFlowV2.initialize(true)
        
        if (!mounted) return

        if (result.success && result.shouldRedirect && result.redirectPath) {
          // Use setTimeout to prevent navigation conflicts
          setTimeout(() => {
            if (mounted) {
              router.push(result.redirectPath!)
            }
          }, 100)
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
        // Cleanup function will be called when component unmounts
        return () => {
          mounted = false
          unsubscribe()
        }
      }
    })

    return () => {
      mounted = false
    }
  }, [router, pathname])

  // Handle route protection logic
  useEffect(() => {
    if (!authState || authState.isLoading) {
      return // Still loading, don't make decisions yet
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
      
      router.push('/auth/login')
      return
    }

    // Check agreement requirements
    if (authState.agreementStatus?.requiresAgreement && pathname !== '/agreement-review') {
      console.log('📋 Route guard: Agreement required, redirecting to review')
      router.push('/agreement-review')
      return
    }

    // All checks passed
    setIsLoading(false)

  }, [authState, pathname, router])

  // Show loading screen while initializing or making route decisions
  if (isLoading || (authState?.isLoading)) {
    const steps: LoadingStep[] = ['connecting', 'authenticating', 'loading-profile', 'initializing', 'redirecting']
    
    let currentStep: LoadingStep = loadingStep
    let description = 'Establishing connection...'
    
    if (authState) {
      if (!authState.isAuthenticated) {
        currentStep = 'connecting'
        description = 'Establishing connection...'
      } else if (!authState.profile) {
        currentStep = 'loading-profile'
        description = 'Loading your profile...'
      } else if (authState.isLoading) {
        currentStep = 'initializing'
        description = 'Setting up your dashboard...'
      } else {
        currentStep = 'redirecting'
        description = 'Taking you to your dashboard...'
      }
    }

    return (
      <AdvancedLoading
        currentStep={currentStep}
        steps={steps}
        customDescription={description}
        timeoutMs={0} // No timeout - let auth flow handle timing
        showProgress={true}
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