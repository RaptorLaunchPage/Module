"use client"

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Specialized hook to detect OAuth sessions immediately on page load
 * This handles the case where Discord OAuth redirects to homepage but session isn't immediately detected
 */
export function useOAuthSessionDetector() {
  const router = useRouter()
  const pathname = usePathname()
  const hasChecked = useRef(false)
  const isChecking = useRef(false)

  useEffect(() => {
    // Only run on homepage and auth/confirm pages
    if (!['/'].includes(pathname)) {
      return
    }

    // Don't run multiple times
    if (hasChecked.current || isChecking.current) {
      return
    }

    // Check for OAuth session immediately
    const checkOAuthSession = async () => {
      try {
        isChecking.current = true
        console.log('🔍 OAuth Session Detector: Checking for immediate session...')

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ OAuth Session Detector: Error getting session:', error)
          return
        }

        if (session?.user) {
          const provider = session.user.app_metadata?.provider || 'email'
          console.log(`✅ OAuth Session Detector: Found ${provider} session immediately!`)
          
          // If we're on homepage with a session, this is likely Discord OAuth
          if (pathname === '/') {
            console.log('🔄 OAuth Session Detector: Redirecting to auth/confirm for proper handling')
            
            // Redirect to auth/confirm to let the normal flow handle it
            router.replace('/auth/confirm')
            return
          }
        } else {
          console.log('ℹ️ OAuth Session Detector: No immediate session found')
        }
      } catch (error) {
        console.error('❌ OAuth Session Detector: Exception:', error)
      } finally {
        hasChecked.current = true
        isChecking.current = false
      }
    }

    // Check immediately and also after a short delay
    checkOAuthSession()
    
    // Also check after a short delay in case session takes time to be available
    const timeoutId = setTimeout(checkOAuthSession, 500)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [pathname, router])

  // Reset when pathname changes
  useEffect(() => {
    hasChecked.current = false
    isChecking.current = false
  }, [pathname])
}