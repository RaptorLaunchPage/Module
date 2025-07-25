"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthV3 as useAuth } from '@/hooks/use-auth-v3'
import { AdvancedLoading, LoadingStep } from '@/components/ui/advanced-loading'

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
  const { isAuthenticated, isLoading, agreementStatus, user, profile, isInitialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [shouldRender, setShouldRender] = useState(false)
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('connecting')
  const [redirectDelay, setRedirectDelay] = useState(false)
  const [initStartTime, setInitStartTime] = useState<number>(Date.now())

  useEffect(() => {
    // Don't render anything while auth is loading
    if (isLoading) {
      setShouldRender(false)
      
      // Determine loading step based on auth state
      if (!isAuthenticated) {
        setLoadingStep('connecting')
      } else if (!user) {
        setLoadingStep('authenticating')
      } else if (agreementStatus.requiresAgreement && !agreementStatus.isChecked) {
        setLoadingStep('checking-agreement')
      } else if (!profile) {
        setLoadingStep('loading-profile')
      } else {
        setLoadingStep('initializing')
      }
      
      return
    }

    // Special handling for profile completion - add delay to ensure everything is ready
    if (isAuthenticated && user && profile && isInitialized && !isPublicRoute(pathname)) {
      const timeElapsed = Date.now() - initStartTime
      
      console.log('🎯 RouteGuard: All conditions met for dashboard access:', {
        isAuthenticated,
        hasUser: !!user,
        hasProfile: !!profile,
        isInitialized,
        pathname,
        timeElapsed: `${timeElapsed}ms`
      })
      
      setLoadingStep('initializing')
      setRedirectDelay(true)
      
      // Safety fallback - if we've been loading for too long, force render
      if (timeElapsed > 10000) { // 10 seconds
        console.warn('⚠️ RouteGuard: Forcing render after 10 seconds')
        setShouldRender(true)
        setRedirectDelay(false)
        return
      }
      
      // Add a small delay to ensure profile is fully processed
      const timer = setTimeout(() => {
        console.log('✅ RouteGuard: Profile loaded completely, ready to render dashboard')
        setLoadingStep('redirecting')
        
        // Small additional delay to show the completion
        setTimeout(() => {
          setShouldRender(true)
          setRedirectDelay(false)
        }, 300)
      }, 600) // 600ms initial delay
      
      return () => clearTimeout(timer)
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
      
      setLoadingStep('redirecting')
      router.push('/auth/login')
      setShouldRender(false)
      return
    }

    // If authenticated but no profile, show loading
    if (!profile) {
      setLoadingStep('loading-profile')
      setShouldRender(false)
      return
    }

    // Check agreement requirements
    if (agreementStatus.requiresAgreement && !agreementStatus.isChecked) {
      // Still checking agreement
      setLoadingStep('checking-agreement')
      setShouldRender(false)
      return
    }

    if (agreementStatus.requiresAgreement && pathname !== '/agreement-review') {
      console.log('📋 Route guard: Agreement required, redirecting to review')
      setLoadingStep('redirecting')
      router.push('/agreement-review')
      setShouldRender(false)
      return
    }

    // All checks passed
    setShouldRender(true)

  }, [isAuthenticated, user, profile, agreementStatus, pathname, router, isLoading, isInitialized, initStartTime])

  // Show advanced loading while auth is loading
  if (isLoading) {
    const steps: LoadingStep[] = ['connecting', 'authenticating', 'checking-agreement', 'loading-profile', 'initializing']
    
    return (
      <AdvancedLoading
        currentStep={loadingStep}
        steps={steps}
        timeoutMs={0} // ✅ No timeout for route guard - let auth flow handle it
        showProgress={true}
      />
    )
  }

  // Show loading while checking auth/profile for protected routes or during redirect delay
  if (!isPublicRoute(pathname) && (!shouldRender || !profile || redirectDelay)) {
    const steps: LoadingStep[] = ['connecting', 'authenticating', 'loading-profile', 'initializing', 'redirecting']
    
    let currentStep: LoadingStep = 'authenticating'
    let description = 'Redirecting to login...'
    
    if (!isAuthenticated) {
      currentStep = 'authenticating'
      description = 'Redirecting to login...'
    } else if (!profile) {
      currentStep = 'loading-profile'
      description = 'Loading your profile...'
    } else if (redirectDelay) {
      currentStep = loadingStep // Use the current step from state
      description = loadingStep === 'redirecting' ? 'Dashboard ready! Redirecting...' : 'Setting up your dashboard...'
    } else {
      currentStep = 'initializing'
      description = 'Finalizing setup...'
    }

    return (
      <AdvancedLoading
        currentStep={currentStep}
        steps={steps}
        customDescription={description}
        timeoutMs={0} // ✅ No timeout for navigation
        showProgress={true}
      />
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}