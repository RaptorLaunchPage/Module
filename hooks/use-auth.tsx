"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { SecureProfileCreation } from "@/lib/secure-profile-creation"
import type { Session, User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: any
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  retryProfileCreation: () => void
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  signInWithDiscord: () => Promise<void>
  clearError: () => void
  isInitialized: boolean
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to get the correct site URL for redirects
const getSiteUrl = () => {
  let url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
  url = url.startsWith('http') ? url : `https://${url}`
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const router = useRouter()

  // Clear all auth state
  const clearAuthState = useCallback(() => {
    console.log('🧹 Clearing auth state')
    setSession(null)
    setUser(null)
    setProfile(null)
    setError(null)
    setLoading(false)
    setIsAuthenticating(false)
  }, [])

  // Load user profile
  const loadUserProfile = useCallback(async (userData: User) => {
    try {
      console.log(`🔍 Loading profile for user: ${userData.email}`)
      
      // Check for existing profile
      const { data: existingProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.id)
        .maybeSingle()

      if (profileError && profileError.code !== "PGRST116") {
        throw new Error(`Profile fetch failed: ${profileError.message}`)
      }

      if (existingProfile) {
        console.log('✅ Profile loaded successfully:', existingProfile.role)
        setProfile(existingProfile)
        return existingProfile
      }

      // Create new profile
      console.log('🔧 Creating new profile...')
      const provider = userData.app_metadata?.provider || 'email'
      const userName = userData.user_metadata?.name || userData.user_metadata?.full_name || userData.email?.split('@')[0] || 'User'
      
      const profileResult = await SecureProfileCreation.createProfile(
        userData.id,
        userData.email || '',
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log('✅ Profile created successfully')
        setProfile(profileResult.profile)
        return profileResult.profile
      } else {
        throw new Error(profileResult.error || "Failed to create profile")
      }

    } catch (error: any) {
      console.error('❌ Profile load error:', error)
      throw error
    }
  }, [])

  // Handle auth state changes
  const handleAuthChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log(`🔄 AUTH EVENT: ${event}`)
    
    try {
      if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out')
        clearAuthState()
        return
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && newSession?.user) {
        console.log(`✅ Processing ${event} event`)
        
        setSession(newSession)
        setUser(newSession.user)
        setError(null)
        
        try {
          const profileData = await loadUserProfile(newSession.user)
          setLoading(false)
          
          // Only redirect if we're not already authenticating and not already on the right page
          if (!isAuthenticating && typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            let targetPath = '/dashboard'
            
            if (profileData?.role === 'pending_player') {
              targetPath = '/onboarding'
            }
            
            // Only redirect if we're not already on the target path
            if (currentPath !== targetPath && !currentPath.startsWith(targetPath)) {
              console.log(`📍 Redirecting to ${targetPath}`)
              router.push(targetPath)
            }
          }
        } catch (profileError: any) {
          console.error('❌ Profile loading failed:', profileError)
          setError(profileError.message || 'Failed to load user profile')
          setLoading(false)
        }
      }
    } catch (error: any) {
      console.error('❌ Auth change error:', error)
      setError('Authentication error occurred')
      setLoading(false)
    }
  }, [router, loadUserProfile, clearAuthState, isAuthenticating])

  // Initialize auth system
  useEffect(() => {
    console.log('🚀 Initializing auth system...')
    
    let mounted = true
    
    const initAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (mounted) {
            handleAuthChange(event, session)
          }
        })

        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (initialSession?.user) {
            console.log('🔄 Initial session found')
            await handleAuthChange('INITIAL_SESSION', initialSession)
          } else {
            console.log('🔄 No initial session')
            setLoading(false)
          }
          
          setIsInitialized(true)
        }

        return () => {
          mounted = false
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setError('Failed to initialize authentication')
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

    const cleanup = initAuth()
    
    return () => {
      mounted = false
      cleanup.then(fn => fn && fn())
    }
  }, [handleAuthChange])

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Sign in attempt:', email)
      setError(null)
      setIsAuthenticating(true)
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (signInError) {
        console.error('❌ Sign in failed:', signInError.message)
        setIsAuthenticating(false)
        return { error: signInError }
      }
      
      console.log('✅ Sign in successful')
      // Don't set isAuthenticating to false here - let the auth state change handle it
      return { error: null }
      
    } catch (err: any) {
      console.error('❌ Sign in exception:', err)
      setIsAuthenticating(false)
      return { error: err }
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Sign up attempt:', email)
      setError(null)
      
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
      } else {
        console.log('✅ Sign up successful - check email')
      }
      
      return { error: signUpError }
      
    } catch (err: any) {
      console.error('❌ Sign up exception:', err)
      return { error: err }
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      console.log('🚪 Signing out...')
      
      // Clear state immediately for better UX
      clearAuthState()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Redirect to home
      router.push('/')
      
    } catch (error) {
      console.error('❌ Sign out error:', error)
      // Still clear state and redirect even if sign out fails
      clearAuthState()
      router.push('/')
    }
  }

  // Reset password
  const resetPassword = async (email: string): Promise<{ error: any | null }> => {
    try {
      setError(null)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset-password`
      })
      
      return { error }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Discord sign in
  const signInWithDiscord = async () => {
    try {
      setError(null)
      setIsAuthenticating(true)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/dashboard`
        }
      })
      
      if (error) {
        setIsAuthenticating(false)
        throw error
      }
    } catch (error: any) {
      console.error('Discord sign in error:', error)
      setIsAuthenticating(false)
      throw error
    }
  }

  // Retry profile creation
  const retryProfileCreation = async () => {
    if (!user) {
      setError("No user logged in")
      return
    }
    
    console.log('🔄 Retrying profile creation')
    setError(null)
    setLoading(true)
    await loadUserProfile(user)
  }

  // Refresh profile
  const refreshProfile = async () => {
    if (!user) {
      console.log('❌ No user to refresh profile for')
      return
    }
    
    console.log('🔄 Refreshing profile')
    setError(null)
    setProfile(null)
    await loadUserProfile(user)
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  // Get current access token
  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        retryProfileCreation,
        refreshProfile,
        resetPassword,
        signInWithDiscord,
        clearError,
        isInitialized,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
