"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
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
  
  // Track Supabase auth events
  useEffect(() => {
    console.log('🔗 Setting up Supabase auth listener...')
    
    let mounted = true
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (!mounted) return
      
      console.log(`🔄 Supabase AUTH EVENT: ${event}`)
      
      try {
        if (event === 'SIGNED_OUT') {
          console.log('🚪 Supabase signed out')
          await authFlowV2.signOut()
          return
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && supabaseSession?.user) {
          console.log(`✅ Processing Supabase ${event}`)
          const result = await authFlowV2.handleSupabaseSession(supabaseSession)
          
          // Only redirect on actual sign in, not token refresh, and only if not already on target page
          if (event === 'SIGNED_IN' && result.success && result.shouldRedirect && result.redirectPath) {
            const currentPath = window.location.pathname
            
            // Don't redirect if already on the target page
            if (currentPath !== result.redirectPath) {
              console.log('🔄 Redirecting after sign in to:', result.redirectPath)
              // Use setTimeout to prevent navigation conflicts
              setTimeout(() => {
                router.push(result.redirectPath!)
              }, 150)
            } else {
              console.log('🔄 Already on target page, skipping redirect')
            }
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed - not redirecting')
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
      mounted = false
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

  // Initialize auth flow on mount
  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing authentication v2...')
        const result = await authFlowV2.initialize(false) // Don't redirect on app initialization
        
        if (!mounted) return
        
        // Only redirect if explicitly needed (like agreement required or onboarding needed)
        if (result.success && result.shouldRedirect && result.redirectPath) {
          const currentPath = window.location.pathname
          
          // Don't redirect if already on the target page or if it's just a dashboard redirect on page load
          if (currentPath !== result.redirectPath && !(currentPath === '/dashboard' && result.redirectPath === '/dashboard')) {
            console.log('🔄 Auth requires redirect to:', result.redirectPath)
            // Small delay to prevent conflicts with route guards
            setTimeout(() => {
              router.push(result.redirectPath!)
            }, 200)
          } else {
            console.log('🔄 Already on target page or unnecessary redirect, skipping')
          }
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          toast({
            title: 'Initialization Error',
            description: 'Failed to initialize authentication',
            variant: 'destructive'
          })
        }
      }
    }

    initializeAuth()
    
    return () => {
      mounted = false
    }
  }, [router, toast])

  // Sign in function
  const signIn = useCallback(async (email: string, password: string): Promise<AuthFlowResult> => {
    try {
      const result = await authFlowV2.signIn(email, password)
      
      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.'
        })
        
        // Let the auth event handler manage the redirect to avoid conflicts
        // The 'SIGNED_IN' event will handle the redirect properly
        console.log('🔄 Sign in successful, redirect will be handled by auth event listener')
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
      await authFlowV2.signOut()
      
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.'
      })
      
      // Redirect to home
      router.push('/')
      
    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      toast({
        title: 'Sign Out Error',
        description: 'There was an issue signing out',
        variant: 'destructive'
      })
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
      // Re-initialize the auth flow to refresh profile
      await authFlowV2.initialize(false)
    } catch (error: any) {
      console.error('❌ Profile refresh error:', error)
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