"use client"

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import authFlowV2, { AuthState, AuthFlowResult } from '@/lib/auth-flow-v2'
import { useSession } from '@/hooks/use-session'
import { useToast } from '@/hooks/use-toast'
import { IdleTimer } from '@/components/session/idle-timer'
import { TokenRefresher } from '@/components/session/token-refresher'

interface AuthContextType extends AuthState {
  // Auth actions
  signIn: (email: string, password: string) => Promise<AuthFlowResult>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  signInWithDiscord: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  
  // Agreement actions
  acceptAgreement: () => Promise<boolean>
  
  // Utility
  refreshProfile: () => Promise<void>
  updateProfile: (updatedProfile: any) => Promise<void>
  clearError: () => void
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to get the correct site URL for redirects
const getSiteUrl = () => {
  let url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
  url = url.startsWith('http') ? url : `https://${url}`
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function AuthProviderV2({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { toast } = useToast()
  const session = useSession()
  
  // Auth flow state
  const [authState, setAuthState] = useState<AuthState>(authFlowV2.getState())
  
  // Track pending redirect for instant redirect when auth completes
  const pendingRedirect = useRef<{ redirectPath: string; isFromAuthPage: boolean; isRequiredRedirect: boolean } | null>(null)
  const mounted = useRef(true)
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Track Supabase auth events
  useEffect(() => {
    console.log('🔗 Setting up Supabase auth listener...')
    

    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (!mounted.current) return
      
      console.log(`🔄 Supabase AUTH EVENT: ${event}`)
      
      try {
        if (event === 'SIGNED_OUT') {
          console.log('🚪 Supabase signed out - cleaning up completely')
          
          // Clear any pending redirects
          if (redirectTimeout.current) {
            clearTimeout(redirectTimeout.current)
            redirectTimeout.current = null
          }
          
          // Clear all auth state immediately
          await authFlowV2.signOut()
          
          // Don't restart auth flow - stay in signed out state
          console.log('✅ Sign out complete - staying in signed out state')
          return
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && supabaseSession?.user) {
          console.log(`✅ Processing Supabase ${event}`)
          const result = await authFlowV2.handleSupabaseSession(supabaseSession)
          
          // Only redirect on actual sign in from login page, not on app initialization or navigation
          if (event === 'SIGNED_IN' && result.success && result.shouldRedirect && result.redirectPath) {
            const currentPath = window.location.pathname
            
            // Only redirect if we're coming from an auth page (actual login) or if it's required (agreement/onboarding)
            const isFromAuthPage = currentPath.startsWith('/auth/')
            const isRequiredRedirect = result.redirectPath === '/agreement-review' || result.redirectPath === '/onboarding'
            
            if (isFromAuthPage || isRequiredRedirect) {
              // Don't redirect if already on the target page
              if (currentPath !== result.redirectPath) {
                console.log('🎬 Sign in detected, preparing for redirect to:', result.redirectPath)
                
                // Store redirect information for instant redirect when auth completes
                pendingRedirect.current = {
                  redirectPath: result.redirectPath,
                  isFromAuthPage,
                  isRequiredRedirect
                }
                
                // If authentication is already complete (profile loaded), redirect immediately
                if (authState.isAuthenticated && !authState.isLoading && authState.profile) {
                  console.log('⚡ Profile already ready, redirecting immediately to:', result.redirectPath)
                  router.push(result.redirectPath)
                  pendingRedirect.current = null
                } else {
                  console.log('⏳ Waiting for profile to load before redirect...')
                  // The useEffect watching authState will handle the redirect when ready
                  
                  // Fallback timeout in case something goes wrong (increased to 5 seconds)
                  redirectTimeout.current = setTimeout(() => {
                    if (mounted.current && pendingRedirect.current) {
                      console.log('⚠️ Fallback timeout triggered, redirecting to:', pendingRedirect.current.redirectPath)
                      router.push(pendingRedirect.current.redirectPath)
                      pendingRedirect.current = null
                    }
                  }, 5000)
                }
              } else {
                console.log('🔄 Already on target page, skipping redirect')
              }
            } else {
              console.log('🔄 Sign in detected but not from auth page, skipping redirect')
            }
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed - maintaining current page')
          }
        }
      } catch (error: any) {
        console.error('❌ Supabase auth event error:', error)
        toast({
          title: 'Authentication Error',
          description: error.message || 'An authentication error occurred',
          variant: 'destructive'
        })
      }
    })

    return () => {
      mounted.current = false
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
      subscription.unsubscribe()
    }
  }, [router, toast])

  // Subscribe to auth flow state changes
  useEffect(() => {
    const unsubscribe = authFlowV2.subscribe((newState) => {
      setAuthState(newState)
    })

    return unsubscribe
  }, [])

  // Handle instant redirect when authentication is complete
  useEffect(() => {
    if (!mounted.current) return

    // Check if we should trigger an instant redirect after authentication completes
    if (authState.isAuthenticated && !authState.isLoading && authState.profile && pendingRedirect.current) {
      const { redirectPath, isFromAuthPage, isRequiredRedirect } = pendingRedirect.current
      const currentPath = window.location.pathname

      console.log('🚀 Authentication complete! Profile ready, triggering instant redirect to:', redirectPath)
      
      // Clear any existing redirect timeout
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }

      // Don't redirect if already on the target page
      if (currentPath !== redirectPath) {
        console.log('⚡ Instant redirect to:', redirectPath)
        router.push(redirectPath)
      } else {
        console.log('🔄 Already on target page, skipping redirect')
      }

      // Clear the pending redirect
      pendingRedirect.current = null
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.profile, router])

  // Initialize auth flow on mount
  useEffect(() => {
    let initTimeout: NodeJS.Timeout | null = null
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 Auth hook: Checking if initialization needed...')
        
        // Don't initialize if route guard is handling it
        // Route guard will initialize for protected routes
        const currentPath = window.location.pathname
        const isPublicRoute = ['/', '/auth/login', '/auth/signup', '/auth/confirm', '/auth/forgot', '/auth/reset-password'].some(route => {
          if (route === '/') return currentPath === '/'
          return currentPath.startsWith(route)
        })
        
        if (isPublicRoute) {
          console.log('🏠 Auth hook: On public route, letting route guard handle auth initialization')
          return
        }
        
        // Only initialize for protected routes if not already initialized
        const currentState = authFlowV2.getState()
        if (currentState.isInitialized && !currentState.isLoading) {
          console.log('✅ Auth hook: Already initialized, skipping')
          return
        }
        
        console.log('🚀 Auth hook: Performing initialization...')
        const result = await authFlowV2.initialize(false)
        
        if (!mounted.current) return
        
        // Only redirect if explicitly needed and not on a public route
        if (result.success && result.shouldRedirect && result.redirectPath) {
          const currentPath = window.location.pathname
          
          if (currentPath !== result.redirectPath) {
            console.log('🔄 Auth hook: Redirecting to:', result.redirectPath)
            
            initTimeout = setTimeout(() => {
              if (mounted.current) {
                router.push(result.redirectPath!)
              }
            }, 200)
          }
        }
      } catch (error: any) {
        console.error('❌ Auth hook initialization error:', error)
        if (mounted.current) {
          toast({
            title: 'Initialization Error',
            description: 'Failed to initialize authentication',
            variant: 'destructive'
          })
        }
      }
    }

    // Only initialize once on mount, not on every dependency change
    const delayedInit = setTimeout(() => {
      if (mounted.current) {
        initializeAuth()
      }
    }, 100)
    
    return () => {
      mounted.current = false
      clearTimeout(delayedInit)
      if (initTimeout) {
        clearTimeout(initTimeout)
      }
    }
  }, []) // Remove dependencies to prevent re-initialization

  // Sign in function
  const signIn = useCallback(async (email: string, password: string): Promise<AuthFlowResult> => {
    try {
      const result = await authFlowV2.signIn(email, password)
      
      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.'
        })
        
        // Allow more time for the login animation to complete before redirecting
        // The auth state listener will handle the actual redirect with proper timing
        console.log('🔄 Sign in successful, animation sequence will complete before redirect')
      } else if (result.error) {
        toast({
          title: 'Sign In Failed',
          description: result.error,
          variant: 'destructive'
        })
      }
      
      return result
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed'
      toast({
        title: 'Sign In Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return { success: false, shouldRedirect: false, error: errorMessage }
    }
  }, [router, toast])

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Sign up attempt:', email)

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${getSiteUrl()}/auth/confirm`
        }
      })

      if (signUpError) {
        console.error('❌ Sign up failed:', signUpError.message)
        toast({
          title: 'Sign Up Failed',
          description: signUpError.message,
          variant: 'destructive'
        })
        return { error: signUpError }
      }

      console.log('✅ Sign up successful - check email')
      toast({
        title: 'Check Your Email',
        description: 'We\'ve sent you a confirmation link to complete your registration.'
      })
      
      return { error: null }

    } catch (err: any) {
      console.error('❌ Sign up exception:', err)
      toast({
        title: 'Sign Up Error',
        description: err.message || 'Sign up failed',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [toast])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process...')
      
      // Clear auth state first to prevent any race conditions
      await authFlowV2.signOut()
      
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.'
      })
      
      // Small delay to ensure state is properly cleared before navigation
      setTimeout(() => {
        console.log('🏠 Redirecting to home after sign out')
        router.push('/')
      }, 100)
      
    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      toast({
        title: 'Sign Out Error',
        description: 'There was an issue signing out',
        variant: 'destructive'
      })
      
      // Still try to redirect to home even if there was an error
      setTimeout(() => {
        router.push('/')
      }, 100)
    }
  }, [router, toast])

  // Discord sign in
  const signInWithDiscord = useCallback(async () => {
    try {
      console.log('🔐 Discord sign in attempt')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/auth/confirm`
        }
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('❌ Discord sign in error:', error)
      toast({
        title: 'Discord Sign In Failed',
        description: error.message || 'Failed to sign in with Discord',
        variant: 'destructive'
      })
      throw error
    }
  }, [toast])

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<{ error: any | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset-password`
      })

      if (error) {
        toast({
          title: 'Reset Failed',
          description: error.message,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Check Your Email',
          description: 'We\'ve sent you a password reset link.'
        })
      }

      return { error }
    } catch (err: any) {
      toast({
        title: 'Reset Error',
        description: err.message || 'Password reset failed',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [toast])

  // Accept agreement
  const acceptAgreement = useCallback(async (): Promise<boolean> => {
    try {
      const success = await authFlowV2.acceptAgreement()
      
      if (success) {
        toast({
          title: 'Agreement Accepted',
          description: 'You can now access the full application.'
        })
      } else {
        toast({
          title: 'Agreement Error',
          description: 'Failed to accept the agreement. Please try again.',
          variant: 'destructive'
        })
      }
      
      return success
    } catch (error: any) {
      console.error('❌ Agreement acceptance error:', error)
      toast({
        title: 'Agreement Error',
        description: error.message || 'Failed to accept agreement',
        variant: 'destructive'
      })
      return false
    }
  }, [toast])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    try {
      console.log('🔄 Auth hook: Refreshing profile data...')
      
      // Use dedicated refresh method to avoid full initialization
      await authFlowV2.refreshProfile()
      
      console.log('✅ Auth hook: Profile refresh completed')
    } catch (error: any) {
      console.error('❌ Auth hook: Profile refresh error:', error)
      toast({
        title: 'Refresh Error',
        description: 'Failed to refresh profile',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Update profile without full re-initialization
  const updateProfile = useCallback(async (updatedProfile: any) => {
    try {
      await authFlowV2.updateProfile(updatedProfile)
    } catch (error: any) {
      console.error('❌ Profile update error:', error)
      toast({
        title: 'Update Error',
        description: 'Failed to update profile data',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Clear error
  const clearError = useCallback(() => {
    // The auth flow manager will handle error clearing in its state
  }, [])

  // Get access token
  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }, [])

  // Handle logout from session management
  const handleSessionLogout = useCallback(() => {
    signOut()
  }, [signOut])

  const contextValue: AuthContextType = {
    // Auth flow state
    ...authState,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    signInWithDiscord,
    resetPassword,
    
    // Agreement actions
    acceptAgreement,
    
    // Utility
    refreshProfile,
    updateProfile,
    clearError,
    getToken
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {/* Session management components - only if authenticated */}
      {authState.isAuthenticated && (
        <>
          <IdleTimer onLogout={handleSessionLogout} />
          <TokenRefresher onTokenExpired={handleSessionLogout} />
        </>
      )}
    </AuthContext.Provider>
  )
}

export function useAuthV2() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthV2 must be used within an AuthProviderV2')
  }
  return context
}