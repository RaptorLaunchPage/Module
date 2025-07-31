"use client"

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase-client'
import { useToast } from '@/hooks/use-toast'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  signInWithDiscord: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  
  // Profile actions
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any | null }>
  
  // Utility
  clearError: () => void
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isInitialized: false,
    error: null
  })
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const initializationRef = useRef<Promise<void> | null>(null)
  const mountedRef = useRef(true)

  // Get site URL for redirects
  const getSiteUrl = useCallback(() => {
    return process.env.NEXT_PUBLIC_SITE_URL || 
           process.env.NEXT_PUBLIC_VERCEL_URL || 
           window.location.origin
  }, [])

  // Load user profile from database
  const loadUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('🔄 Loading user profile for:', userId)
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ User profile not found, needs to be created')
          return null
        }
        console.error('❌ Error loading profile:', error)
        return null
      }

      console.log('✅ User profile loaded successfully')
      return profile
    } catch (error: any) {
      console.error('❌ Profile loading error:', error)
      return null
    }
  }, [supabase])

  // Update auth state safely
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    if (mountedRef.current) {
      setAuthState(prev => ({ ...prev, ...updates }))
    }
  }, [])

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    if (!mountedRef.current) return

    console.log(`🔄 Auth state changed: ${event}`, { hasSession: !!session, hasUser: !!session?.user })

    try {
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          if (session?.user) {
            console.log('✅ User signed in, loading profile...')
            updateAuthState({ isLoading: true, error: null })
            
            const profile = await loadUserProfile(session.user.id)
            
            updateAuthState({
              user: session.user,
              profile,
              isLoading: false,
              isAuthenticated: true,
              isInitialized: true,
              error: null
            })

            // Only redirect on actual sign in, not token refresh
            if (event === 'SIGNED_IN') {
              const currentPath = window.location.pathname
              // Don't redirect if already on a protected route or callback
              if (!currentPath.startsWith('/dashboard') && !currentPath.includes('/callback')) {
                setTimeout(() => {
                  router.push('/dashboard')
                }, 100)
              }
            }
          }
          break

        case 'SIGNED_OUT':
          console.log('🚪 User signed out')
          updateAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true,
            error: null
          })
          break

        default:
          console.log(`🔄 Unhandled auth event: ${event}`)
      }
    } catch (error: any) {
      console.error('❌ Auth state change error:', error)
      updateAuthState({
        isLoading: false,
        error: error.message || 'Authentication error occurred'
      })
    }
  }, [loadUserProfile, updateAuthState, router])

  // Initialize auth
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) {
      return initializationRef.current
    }

    initializationRef.current = (async () => {
      try {
        console.log('🚀 Initializing authentication...')
        updateAuthState({ isLoading: true, error: null })

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (session?.user && mountedRef.current) {
          console.log('✅ Existing session found, loading profile...')
          const profile = await loadUserProfile(session.user.id)
          
          updateAuthState({
            user: session.user,
            profile,
            isLoading: false,
            isAuthenticated: true,
            isInitialized: true,
            error: null
          })
        } else if (mountedRef.current) {
          console.log('ℹ️ No existing session found')
          updateAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true,
            error: null
          })
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error)
        if (mountedRef.current) {
          updateAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true,
            error: error.message || 'Failed to initialize authentication'
          })
        }
      }
    })()

    return initializationRef.current
  }, [supabase, loadUserProfile, updateAuthState])

  // Initialize on mount and set up auth listener
  useEffect(() => {
    mountedRef.current = true
    
    // Initialize auth
    initializeAuth()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      initializationRef.current = null
    }
  }, [supabase, initializeAuth, handleAuthStateChange])

  // Auth actions
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email)
      updateAuthState({ isLoading: true, error: null })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        updateAuthState({ isLoading: false })
        toast({
          title: 'Sign In Failed',
          description: error.message,
          variant: 'destructive'
        })
        return { error }
      }

      // Auth state change will be handled by the listener
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.'
      })

      return { error: null }
    } catch (err: any) {
      updateAuthState({ isLoading: false })
      toast({
        title: 'Sign In Error',
        description: err.message || 'An unexpected error occurred',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [supabase, updateAuthState, toast])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      console.log('📝 Attempting sign up for:', email)
      updateAuthState({ isLoading: true, error: null })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${getSiteUrl()}/auth/callback`
        }
      })

      updateAuthState({ isLoading: false })

      if (error) {
        toast({
          title: 'Sign Up Failed',
          description: error.message,
          variant: 'destructive'
        })
        return { error }
      }

      if (data.user && !data.session) {
        toast({
          title: 'Check Your Email',
          description: 'We\'ve sent you a confirmation link to complete your registration.'
        })
      } else if (data.session) {
        // Auto-confirmed, will be handled by auth listener
        toast({
          title: 'Account Created',
          description: 'Your account has been created successfully!'
        })
      }

      return { error: null }
    } catch (err: any) {
      updateAuthState({ isLoading: false })
      toast({
        title: 'Sign Up Error',
        description: err.message || 'An unexpected error occurred',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [supabase, getSiteUrl, updateAuthState, toast])

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...')
      updateAuthState({ isLoading: true })

      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }

      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.'
      })

      // Redirect to home
      router.push('/')
    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      updateAuthState({ isLoading: false })
      toast({
        title: 'Sign Out Error',
        description: error.message || 'Failed to sign out',
        variant: 'destructive'
      })
    }
  }, [supabase, updateAuthState, toast, router])

  const signInWithDiscord = useCallback(async () => {
    try {
      console.log('🎮 Attempting Discord sign in...')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback`
        }
      })

      if (error) {
        throw error
      }

      // OAuth redirect will happen automatically
    } catch (error: any) {
      console.error('❌ Discord sign in error:', error)
      toast({
        title: 'Discord Sign In Failed',
        description: error.message || 'Failed to sign in with Discord',
        variant: 'destructive'
      })
    }
  }, [supabase, getSiteUrl, toast])

  const resetPassword = useCallback(async (email: string) => {
    try {
      console.log('🔑 Sending password reset for:', email)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset`
      })

      if (error) {
        toast({
          title: 'Reset Failed',
          description: error.message,
          variant: 'destructive'
        })
        return { error }
      }

      toast({
        title: 'Check Your Email',
        description: 'We\'ve sent you a password reset link.'
      })

      return { error: null }
    } catch (err: any) {
      toast({
        title: 'Reset Error',
        description: err.message || 'Failed to send reset email',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [supabase, getSiteUrl, toast])

  // Profile actions
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return

    try {
      console.log('🔄 Refreshing user profile...')
      const profile = await loadUserProfile(authState.user.id)
      updateAuthState({ profile })
    } catch (error: any) {
      console.error('❌ Profile refresh error:', error)
      toast({
        title: 'Refresh Error',
        description: 'Failed to refresh profile',
        variant: 'destructive'
      })
    }
  }, [authState.user, loadUserProfile, updateAuthState, toast])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!authState.user) {
      return { error: new Error('No authenticated user') }
    }

    try {
      console.log('📝 Updating user profile...')
      
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', authState.user.id)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Update Failed',
          description: error.message,
          variant: 'destructive'
        })
        return { error }
      }

      updateAuthState({ profile: data })
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.'
      })

      return { error: null }
    } catch (err: any) {
      toast({
        title: 'Update Error',
        description: err.message || 'Failed to update profile',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [authState.user, supabase, updateAuthState, toast])

  // Utility functions
  const clearError = useCallback(() => {
    updateAuthState({ error: null })
  }, [updateAuthState])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('❌ Failed to get access token:', error)
      return null
    }
  }, [supabase])

  const contextValue: AuthContextType = {
    // State
    ...authState,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    signInWithDiscord,
    resetPassword,
    
    // Profile actions
    refreshProfile,
    updateProfile,
    
    // Utility
    clearError,
    getAccessToken
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export the hook with a different name for easier migration
export const useAuthFixed = useAuth