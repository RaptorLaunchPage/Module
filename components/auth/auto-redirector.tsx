"use client"

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { getRoleBasedDashboardPath, shouldAutoRedirectAfterLogin } from '@/lib/role-redirect'

interface AutoRedirectorProps {
  /**
   * Whether to show debug logs for the redirect process
   */
  debug?: boolean
  
  /**
   * Delay in milliseconds before triggering the redirect
   */
  redirectDelay?: number
}

/**
 * AutoRedirector component handles automatic post-login redirects
 * Should be placed in the app layout or homepage to detect fresh logins
 */
export function AutoRedirector({ debug = false, redirectDelay = 1000 }: AutoRedirectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, isLoading, isAuthenticated } = useAuth()
  
  const hasRedirectedRef = useRef(false)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
      redirectTimeoutRef.current = null
    }
    
    // Don't redirect if already redirected in this session
    if (hasRedirectedRef.current) {
      return
    }
    
    // Don't redirect while still loading
    if (isLoading) {
      if (debug) console.log('🔄 AutoRedirector: Still loading, waiting...')
      return
    }
    
    // Don't redirect if not authenticated
    if (!isAuthenticated || !user || !profile) {
      if (debug) console.log('🔄 AutoRedirector: Not authenticated, skipping')
      return
    }
    
    // Check if we should auto-redirect from current page
    const isFromAuthPage = pathname.startsWith('/auth/')
    const shouldRedirect = shouldAutoRedirectAfterLogin(pathname, isFromAuthPage)
    
    if (!shouldRedirect) {
      if (debug) console.log(`🔄 AutoRedirector: No redirect needed for path: ${pathname}`)
      return
    }
    
    // Get the appropriate dashboard path for this user
    const targetPath = getRoleBasedDashboardPath(profile)
    
    // Don't redirect if already on the target path
    if (pathname === targetPath) {
      if (debug) console.log(`🔄 AutoRedirector: Already on target path: ${targetPath}`)
      return
    }
    
    if (debug) {
      console.log('🎯 AutoRedirector: Preparing redirect...', {
        role: profile.role,
        currentPath: pathname,
        targetPath,
        isFromAuthPage,
        onboardingCompleted: profile.onboarding_completed
      })
    }
    
    // Set up delayed redirect to allow for any UI transitions
    redirectTimeoutRef.current = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true
        
        if (debug) {
          console.log(`🚀 AutoRedirector: Redirecting ${profile.role} to ${targetPath}`)
        }
        
        router.push(targetPath)
      }
    }, redirectDelay)
    
    // Cleanup function
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    profile,
    pathname,
    router,
    debug,
    redirectDelay
  ])
  
  // Reset redirect flag when user logs out
  useEffect(() => {
    if (!isAuthenticated || !user) {
      hasRedirectedRef.current = false
    }
  }, [isAuthenticated, user])
  
  // This component doesn't render anything
  return null
}

/**
 * Hook version of the auto-redirector for use in components
 */
export function useAutoRedirect(options: AutoRedirectorProps = {}) {
  const { debug = false, redirectDelay = 1000 } = options
  
  // The logic is the same as the component, just as a hook
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, isLoading, isAuthenticated } = useAuth()
  
  const hasRedirectedRef = useRef(false)
  
  useEffect(() => {
    if (hasRedirectedRef.current || isLoading || !isAuthenticated || !user || !profile) {
      return
    }
    
    const isFromAuthPage = pathname.startsWith('/auth/')
    const shouldRedirect = shouldAutoRedirectAfterLogin(pathname, isFromAuthPage)
    
    if (!shouldRedirect) return
    
    const targetPath = getRoleBasedDashboardPath(profile)
    
    if (pathname === targetPath) return
    
    const timeoutId = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true
        if (debug) {
          console.log(`🚀 useAutoRedirect: Redirecting ${profile.role} to ${targetPath}`)
        }
        router.push(targetPath)
      }
    }, redirectDelay)
    
    return () => clearTimeout(timeoutId)
  }, [isLoading, isAuthenticated, user, profile, pathname, router, debug, redirectDelay])
  
  useEffect(() => {
    if (!isAuthenticated || !user) {
      hasRedirectedRef.current = false
    }
  }, [isAuthenticated, user])
  
  return {
    willRedirect: isAuthenticated && !!profile && shouldAutoRedirectAfterLogin(pathname, pathname.startsWith('/auth/')),
    targetPath: profile ? getRoleBasedDashboardPath(profile) : null
  }
}