"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { supabase } from "@/lib/supabase"
import { SessionManager } from "@/lib/session-manager"
import { SecureProfileCreation } from "@/lib/secure-profile-creation"
import type { Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

type AuthContextType = {
  session: Session | null
  user: any
  profile: any
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  signInWithDiscord: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to get the correct site URL for redirects
const getSiteUrl = () => {
  let url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
  url = url.startsWith('http') ? url : `https://${url}`;
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Emergency fallback to prevent infinite loading
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (loading && !user && !session) {
        console.warn('🚨 Emergency timeout: Auth loading took too long, clearing loading state')
        setLoading(false)
        setError('Authentication timeout. Please try refreshing the page.')
      }
    }, 30000) // 30 second emergency timeout

    return () => clearTimeout(emergencyTimeout)
  }, [loading, user, session])

  // Initialize auth on mount
  useEffect(() => {
    console.log('🔍 AuthProvider mounting...')
    initializeAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)
    
    return () => {
      console.log('🔍 AuthProvider unmounting...')
      subscription.unsubscribe()
    }
  }, [])

  const initializeAuth = async () => {
    try {
      console.log('🔐 Initializing authentication...')
      
      // Get current session
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session fetch error:', error)
        setError('Failed to initialize authentication')
        setLoading(false)
        return
      }

      if (currentSession?.user) {
        console.log('🔐 Found existing session for:', currentSession.user.email)
        setSession(currentSession)
        setUser(currentSession.user)
        
        // Fetch profile for existing session without redirect (let user choose where to go)
        try {
          console.log('🔐 Fetching profile for existing session...')
          await fetchUserProfile(currentSession.user, false)
        } catch (profileError) {
          console.error('❌ Profile fetch failed during init:', profileError)
          setError('Failed to load user profile')
          setLoading(false)
        }
      } else {
        console.log('🔐 No existing session found')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      setError('Failed to initialize authentication')
      setLoading(false)
    }
  }

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log(`🔐 Auth state change: ${event}`)
    console.log(`🔐 Session exists:`, !!session)
    console.log(`🔐 User exists:`, !!session?.user)
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('🔐 User signed in:', session.user.email)
      console.log('🔐 Current loading state before profile fetch:', loading)
      
      SessionManager.extendSession()
      setSession(session)
      setUser(session.user)
      setError(null)
      
      try {
        console.log('🔐 Starting profile fetch...')
        await fetchUserProfile(session.user, true)
        console.log('🔐 Profile fetch completed successfully')
      } catch (error) {
        console.error('🔐 Profile fetch failed in auth state change:', error)
        setError('Failed to load user profile')
        setLoading(false)
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('🔐 User signed out')
      await SessionManager.logout()
      localStorage.removeItem('raptor-auth-state')
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)
      setLoading(false)
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('🔐 Token refreshed')
      setSession(session)
      setUser(session?.user || null)
    } else {
      console.log(`🔐 Unhandled auth event: ${event}`)
      // For unhandled events, ensure loading is cleared if we have no session
      if (!session) {
        setLoading(false)
      }
    }
  }

  const fetchUserProfile = async (user: any, shouldRedirect: boolean = false) => {
    try {
      console.log(`🔍 Fetching profile for user: ${user.email}`)
      console.log(`🔍 User ID: ${user.id}`)
      console.log(`🔍 Should redirect:`, shouldRedirect)
      
      // Get existing profile - remove the timeout race that might be causing issues
      const { data: existingProfile, error: selectError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      console.log(`🔍 Query completed. Error:`, selectError)
      console.log(`🔍 Query result:`, existingProfile)

      if (selectError && selectError.code !== "PGRST116") {
        console.error("❌ Profile fetch error:", selectError)
        setError(`Failed to fetch profile: ${selectError.message}`)
        setLoading(false)
        return
      }

      if (existingProfile) {
        console.log(`✅ Profile found, setting state:`, existingProfile)
        
        // Set profile first, then clear loading
        setProfile(existingProfile)
        setError(null) // Clear any previous errors
        setLoading(false)
        
        if (shouldRedirect) {
          console.log(`📍 Redirecting user with role: ${existingProfile.role}`)
          // Use a longer timeout to ensure state is set
          setTimeout(() => {
            if (existingProfile.role === "pending_player") {
              console.log(`📍 Navigating to /onboarding`)
              router.push("/onboarding")
            } else {
              console.log(`📍 Navigating to /dashboard`)
              router.push("/dashboard")
            }
          }, 500) // Increased timeout to ensure state is properly set
        }
        return
      }

      // If no existing profile, create new one
      console.log(`🔧 No existing profile found. Creating new profile for: ${user.email}`)
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      
      console.log(`🔧 Profile creation data:`, { userId: user.id, email: user.email, name: userName, provider })
      
      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email,
        userName,
        provider
      )

      console.log(`🔧 Profile creation result:`, profileResult)

      if (profileResult.success && profileResult.profile) {
        console.log(`✅ Profile created, setting state:`, profileResult.profile)
        
        setProfile(profileResult.profile)
        setError(null)
        setLoading(false)
        
        if (shouldRedirect) {
          console.log(`📍 Redirecting new user to onboarding`)
          setTimeout(() => {
            router.push("/onboarding")
          }, 500)
        }
      } else {
        console.error(`❌ Profile creation failed:`, profileResult.error)
        setError('Failed to create user profile')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Profile fetch exception:', error)
      setError('Failed to load user profile')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Signing in:', email)
      setError(null)
      
      // Add timeout to signIn as well
      const signInPromise = supabase.auth.signInWithPassword({ email, password })
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout after 10 seconds')), 10000)
      )
      
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any
      
      if (error) {
        console.error('❌ Sign in error:', error)
        setLoading(false) // Ensure loading is cleared on error
        return { error }
      }
      
      if (data.session && data.user) {
        console.log('✅ Sign in successful')
        // Don't set loading false here - let the auth state change handle it
        return { error: null }
      } else {
        console.error('❌ No session returned')
        setLoading(false)
        return { error: { message: 'Authentication failed' } }
      }
    } catch (err: any) {
      console.error("❌ Sign-in exception:", err)
      setLoading(false)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Signing up:', email)
      setError(null)
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${getSiteUrl()}/auth/confirm`
        },
      })
      
      return { error }
    } catch (err: any) {
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      console.log('🔐 Signing out...')
      
      // Clear local state immediately
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)
      setLoading(false)
      
      // Clear session data
      SessionManager.clearSession()
      localStorage.removeItem('raptor-auth-state')
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Redirect
      router.push('/')
    } catch (error) {
      console.error('❌ Sign out error:', error)
      // Clear state anyway
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)
      setLoading(false)
      router.push('/')
    }
  }

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

  const signInWithDiscord = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/auth/confirm`
        }
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Discord sign in error:', error)
      throw error
    }
  }

  const clearError = () => {
    setError(null)
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
        resetPassword,
        signInWithDiscord,
        clearError,
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
