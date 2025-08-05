"use client"

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { useSafeRedirect } from '@/lib/client-utils'

interface UsePostAuthRedirectOptions {
  /** Pages where auto-redirect should happen */
  redirectFromPages?: string[]
  /** Force redirect even if not on redirect pages */
  forceRedirect?: boolean
  /** Delay before redirect (ms) */
  redirectDelay?: number
}

/**
 * Unified post-auth redirect hook
 * Handles automatic redirects after both email and Discord authentication
 */
export function usePostAuthRedirect(options: UsePostAuthRedirectOptions = {}) {
  const {
    redirectFromPages = ['/', '/auth/confirm', '/auth/login', '/auth/signup'],
    forceRedirect = false,
    redirectDelay = 100
  } = options

  const { user, profile, isLoading, isAuthenticated } = useAuth()
  const { safeRedirect } = useSafeRedirect()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Don't redirect if still loading or already redirected
    if (isLoading || hasRedirected.current || !isAuthenticated || !user || !profile) {
      return
    }

    // Check if we should redirect from current page
    const shouldRedirect = forceRedirect || redirectFromPages.includes(pathname)
    
    if (!shouldRedirect) {
      return
    }

    console.log(`🚀 Post-auth redirect: User authenticated on ${pathname}, determining redirect...`)

    // Determine correct redirect path
    let targetPath = '/dashboard'
    if (profile.role === 'pending_player' && !profile.onboarding_completed) {
      targetPath = '/onboarding'
      console.log('🔄 New user needs onboarding')
    } else {
      console.log('🔄 Redirecting to dashboard')
    }

    // Don't redirect if already on target page
    if (pathname === targetPath) {
      console.log(`✅ Already on target page: ${targetPath}`)
      return
    }

    // Mark as redirected to prevent multiple redirects
    hasRedirected.current = true

    // Clear any existing timeout
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current)
    }

    // Perform redirect with delay
    redirectTimeout.current = setTimeout(() => {
      console.log(`⚡ Executing post-auth redirect to: ${targetPath}`)
      
      // Use router.replace to avoid back button issues
      router.replace(targetPath)
      
      // Also use safeRedirect as fallback
      setTimeout(() => {
        safeRedirect(targetPath, { delay: 50 })
      }, 100)
      
    }, redirectDelay)

    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [
    isAuthenticated, 
    user, 
    profile, 
    isLoading, 
    pathname, 
    forceRedirect, 
    redirectFromPages, 
    redirectDelay, 
    router, 
    safeRedirect
  ])

  // Reset redirect flag when auth state changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      hasRedirected.current = false
    }
  }, [isAuthenticated, user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [])

  return {
    shouldRedirect: !isLoading && isAuthenticated && user && profile && !hasRedirected.current,
    targetPath: profile?.role === 'pending_player' && !profile?.onboarding_completed ? '/onboarding' : '/dashboard',
    isRedirecting: hasRedirected.current
  }
}

/**
 * Hook for manual redirect triggering (for buttons, etc.)
 */
export function useManualRedirect() {
  const { user, profile } = useAuth()
  const router = useRouter()

  const triggerRedirect = () => {
    if (!user || !profile) {
      console.warn('⚠️ Cannot redirect: User or profile not available')
      return
    }

    const targetPath = profile.role === 'pending_player' && !profile.onboarding_completed 
      ? '/onboarding' 
      : '/dashboard'

    console.log(`🔄 Manual redirect triggered to: ${targetPath}`)
    router.replace(targetPath)
  }

  return {
    triggerRedirect,
    targetPath: profile?.role === 'pending_player' && !profile?.onboarding_completed ? '/onboarding' : '/dashboard',
    canRedirect: !!(user && profile)
  }
}