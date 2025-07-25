"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import authFlowV3, { AuthState, AuthResult } from '@/lib/auth-flow-v3'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType extends AuthState {
  // Auth actions
  signIn: (email: string, password: string) => Promise<AuthResult>
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

export function AuthProviderV3({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { toast } = useToast()
  
  // Auth flow state
  const [authState, setAuthState] = useState<AuthState>(authFlowV3.getState())

  // Subscribe to auth flow state changes
  useEffect(() => {
    const unsubscribe = authFlowV3.subscribe((newState) => {
      setAuthState(newState)
      
      // Handle automatic redirects after authentication
      if (newState.isAuthenticated && !newState.isLoading && newState.profile) {
        const redirectPath = authFlowV3.getRedirectPath()
        const currentPath = window.location.pathname
        
        // Only redirect if we're on an auth page or the redirect is required
        const isOnAuthPage = currentPath.startsWith('/auth/')
        const isRequiredRedirect = redirectPath === '/agreement-review' || redirectPath === '/onboarding'
        
        if (redirectPath && (isOnAuthPage || isRequiredRedirect) && currentPath !== redirectPath) {
          console.log('🔄 Auto-redirecting to:', redirectPath)
          setTimeout(() => router.push(redirectPath), 500)
        }
      }
    })

    return unsubscribe
  }, [router])

  // Initialize auth flow on mount
  useEffect(() => {
    authFlowV3.initialize().catch((error) => {
      console.error('❌ Auth initialization failed:', error)
    })
  }, [])

  // Sign in function
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authFlowV3.signIn(email, password)
    
    if (result.success) {
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.'
      })
    } else if (result.error) {
      toast({
        title: 'Sign In Failed',
        description: result.error,
        variant: 'destructive'
      })
    }
    
    return result
  }, [toast])

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
      
      await authFlowV3.signOut()
      
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.'
      })
      
      // Redirect to home
      setTimeout(() => {
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
      const success = await authFlowV3.acceptAgreement()
      
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
      console.log('🔄 Refreshing profile data...')
      await authFlowV3.refreshProfile()
      console.log('✅ Profile refresh completed')
    } catch (error: any) {
      console.error('❌ Profile refresh error:', error)
      toast({
        title: 'Refresh Error',
        description: 'Failed to refresh profile',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Update profile
  const updateProfile = useCallback(async (updatedProfile: any) => {
    try {
      authFlowV3.updateProfile(updatedProfile)
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
    // Error will be cleared automatically on next auth action
    console.log('Error cleared')
  }, [])

  // Get access token
  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }, [])

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
    </AuthContext.Provider>
  )
}

export function useAuthV3() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthV3 must be used within an AuthProviderV3')
  }
  return context
}