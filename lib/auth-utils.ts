import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export async function getUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting user from token:', error)
    return null
  }
}

export async function getUserWithProfile(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return { user: null, profile: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return { user, profile: null }
    }

    return { user, profile }
  } catch (error) {
    console.error('Error getting user with profile:', error)
    return { user: null, profile: null }
  }
}

// Utility to prevent redirect loops
export function useSafeRedirect() {
  const router = useRouter()
  const redirectInProgress = useRef(false)
  const redirectCount = useRef(0)
  const lastRedirectTime = useRef(0)

  const safeRedirect = (path: string, options?: { 
    force?: boolean
    delay?: number 
  }) => {
    const now = Date.now()
    
    // Prevent too many redirects in a short time
    if (now - lastRedirectTime.current < 1000) {
      redirectCount.current++
      if (redirectCount.current > 5) {
        console.warn('⚠️ Too many redirects detected, stopping to prevent loop')
        return
      }
    } else {
      redirectCount.current = 0
    }
    
    // Prevent multiple simultaneous redirects
    if (redirectInProgress.current && !options?.force) {
      console.log('🔄 Redirect already in progress, skipping')
      return
    }

    lastRedirectTime.current = now
    redirectInProgress.current = true

    const delay = options?.delay || 0
    
    setTimeout(() => {
      console.log(`🚀 Safe redirect to: ${path}`)
      router.push(path)
      
      // Reset after a reasonable delay
      setTimeout(() => {
        redirectInProgress.current = false
      }, 2000)
    }, delay)
  }

  return { safeRedirect, redirectInProgress }
}
