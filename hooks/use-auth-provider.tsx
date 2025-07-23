"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SecureProfileCreation } from '@/lib/secure-profile-creation'
import { useSession } from '@/hooks/use-session'
import SessionStorage, { SessionData, TokenInfo } from '@/lib/session-storage'
import { IdleTimer } from '@/components/session/idle-timer'
import { TokenRefresher } from '@/components/session/token-refresher'
import { useToast } from '@/hooks/use-toast'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  // Session state (from useSession)
  user: SessionData['user'] | null
  profile: any
  isAuthenticated: boolean
  isExpired: boolean
  loading: boolean
  error: string | null
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  signInWithDiscord: () => Promise<void>
  
  // Profile actions
  refreshProfile: () => Promise<void>
  retryProfileCreation: () => void
  clearError: () => void
  
  // Session info
  lastActive: number
  getToken: () => Promise<string | null>
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to get the correct site URL for redirects
const getSiteUrl = () => {
  let url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
  url = url.startsWith('http') ? url : `https://${url}`
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const { toast } = useToast()
  const router = useRouter()
  
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

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

  // Initialize session from Supabase
  const initializeSession = useCallback(async (supabaseSession: Session) => {
    try {
      const user = supabaseSession.user
      const profileData = await loadUserProfile(user)
      
      // Create session data
      const tokenInfo: TokenInfo = {
        accessToken: supabaseSession.access_token,
        refreshToken: supabaseSession.refresh_token,
        expiresAt: Date.now() + (supabaseSession.expires_in * 1000),
        issuedAt: Date.now(),
        userId: user.id
      }

      const sessionData: SessionData = {
        user: {
          id: user.id,
          email: user.email || '',
          name: profileData.name || profileData.display_name,
          role: profileData.role
        },
        tokenInfo,
        lastActive: Date.now(),
        agreementAccepted: true // Will be updated by agreement context
      }

      // Initialize session
      session.initializeSession(sessionData)
      setError(null)
      
      console.log('✅ Session initialized successfully')
      
      // Don't redirect here - let the route guard handle it to prevent conflicts
      
    } catch (error: any) {
      console.error('❌ Session initialization failed:', error)
      setError(error.message || 'Failed to initialize session')
      session.clearSession()
    }
  }, [session, loadUserProfile])

  // Handle Supabase auth state changes
  useEffect(() => {
    console.log('�� Setting up auth state listener...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log(`🔄 AUTH EVENT: ${event}`)
      
      try {
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out')
          session.clearSession()
          setProfile(null)
          setError(null)
          return
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && supabaseSession?.user) {
          console.log(`✅ Processing ${event} event`)
          await initializeSession(supabaseSession)
        }
      } catch (error: any) {
        console.error('❌ Auth change error:', error)
        setError('Authentication error occurred')
      }
    })

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        console.log('🔄 Initial session found')
        initializeSession(initialSession)
      }
      setIsInitialized(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initializeSession])

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Sign in attempt:', email)
      setError(null)
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (signInError) {
        console.error('❌ Sign in failed:', signInError.message)
        return { error: signInError }
      }
      
      console.log('✅ Sign in successful')
      return { error: null }
      
    } catch (err: any) {
      console.error('❌ Sign in exception:', err)
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
      
      // Clear session immediately for better UX
      session.clearSession()
      setProfile(null)
      setError(null)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Redirect to home
      router.push('/')
      
    } catch (error) {
      console.error('❌ Sign out error:', error)
      // Still clear state and redirect even if sign out fails
      session.clearSession()
      setProfile(null)
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
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/dashboard`
        }
      })
      
      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Discord sign in error:', error)
      throw error
    }
  }

  // Retry profile creation
  const retryProfileCreation = async () => {
    if (!session.user) {
      setError("No user logged in")
      return
    }
    
    console.log('🔄 Retrying profile creation')
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await loadUserProfile(user)
      }
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Refresh profile
  const refreshProfile = async () => {
    if (!session.user) {
      console.log('❌ No user to refresh profile for')
      return
    }
    
    console.log('🔄 Refreshing profile')
    setError(null)
    setProfile(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await loadUserProfile(user)
      }
    } catch (error: any) {
      setError(error.message)
    }
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  // Get current access token
  const getToken = async (): Promise<string | null> => {
    const token = SessionStorage.getAccessToken()
    if (token) return token
    
    // Try to get from Supabase if not in session storage
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    return currentSession?.access_token || null
  }

  // Handle logout from idle timer or token expiry
  const handleLogout = useCallback(() => {
    signOut()
  }, [])

  const contextValue: AuthContextType = {
    // Session state
    user: session.user,
    profile,
    isAuthenticated: session.isAuthenticated,
    isExpired: session.isExpired,
    loading: session.loading,
    error,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithDiscord,
    
    // Profile actions
    refreshProfile,
    retryProfileCreation,
    clearError,
    
    // Session info
    lastActive: session.lastActive,
    getToken,
    isInitialized
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {/* Session management components */}
      <IdleTimer onLogout={handleLogout} />
      <TokenRefresher onTokenExpired={handleLogout} />
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
