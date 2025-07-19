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
      
      console.log('🔐 Current session check result:')
      console.log('🔐 - Session exists:', !!currentSession)
      console.log('🔐 - Session error:', error)
      
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
          console.log('🔐 Profile fetch completed for existing session')
        } catch (profileError) {
          console.error('❌ Profile fetch failed during init:', profileError)
          setError('Failed to load user profile')
          setLoading(false)
        }
      } else {
        console.log('🔐 No existing session found, clearing loading state')
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
    console.log(`🔐 Current loading state:`, loading)
    console.log(`🔐 Current profile state:`, !!profile)
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('🔐 User signed in:', session.user.email)
      console.log('🔐 Setting session and user state...')
      
      SessionManager.extendSession()
      setSession(session)
      setUser(session.user)
      setError(null)
      
      console.log('🔐 Session and user state set, deferring profile fetch to avoid deadlock...')
      
      // CRITICAL FIX: Don't make async API calls in onAuthStateChange handler!
      // This causes a known deadlock bug in supabase-js
      // Instead, defer the profile fetch to avoid the deadlock
      setTimeout(async () => {
        try {
          console.log('🔐 Starting deferred profile fetch...')
          await fetchUserProfile(session.user, true)
          console.log('🔐 Deferred profile fetch completed successfully')
        } catch (error) {
          console.error('🔐 Deferred profile fetch failed:', error)
          setError('Failed to load user profile')
          setLoading(false)
        }
      }, 0) // Use setTimeout to move API call outside the handler
      
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
      if (session) {
        SessionManager.extendSession()
        setSession(session)
        setUser(session.user)
      }
    } else {
      console.log(`🔐 Auth state change: ${event} - no action taken`)
    }
  }

  const fetchUserProfile = async (user: any, shouldRedirect: boolean = false) => {
    try {
      console.log(`🔍 Fetching profile for user: ${user.email}`)
      console.log(`🔍 User ID: ${user.id}`)
      console.log(`🔍 Should redirect:`, shouldRedirect)
      
      // Try multiple approaches to get the profile
      console.log(`🔍 Attempting to fetch profile...`)
      const startTime = Date.now()
      
      let existingProfile = null
      let selectError = null
      
      // Method 1: Try user_management_view first (should bypass RLS issues)
      try {
        console.log(`🔍 Method 1: Trying user_management_view...`)
        const { data, error } = await supabase
          .from("user_management_view")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()
        
        if (!error && data) {
          existingProfile = data
          console.log(`✅ Profile found via user_management_view`)
        } else if (error) {
          console.log(`⚠️ user_management_view failed:`, error.message)
        }
      } catch (viewError: any) {
        console.log(`⚠️ user_management_view exception:`, viewError.message)
      }
      
      // Method 2: Try direct users table if view failed
      if (!existingProfile) {
        try {
          console.log(`🔍 Method 2: Trying direct users table...`)
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle()
          
          if (!error && data) {
            existingProfile = data
            console.log(`✅ Profile found via direct users table`)
          } else if (error) {
            console.log(`⚠️ Direct users table failed:`, error.message)
            selectError = error
          }
        } catch (directError: any) {
          console.log(`⚠️ Direct users table exception:`, directError.message)
          selectError = directError
        }
      }
      
      // Method 3: Try with RLS disabled query (using service role if available)
      if (!existingProfile) {
        try {
          console.log(`🔍 Method 3: Trying RLS bypass...`)
          // This would need service role, but let's try anyway
          const { data, error } = await supabase
            .from("users")
            .select("id, email, name, role, role_level, team_id, avatar_url, created_at, status")
            .eq("id", user.id)
            .maybeSingle()
          
          if (!error && data) {
            existingProfile = data
            console.log(`✅ Profile found via RLS bypass`)
          }
        } catch (rlsError: any) {
          console.log(`⚠️ RLS bypass failed:`, rlsError.message)
        }
      }
      
      const endTime = Date.now()
      console.log(`🔍 Profile fetch completed in ${endTime - startTime}ms`)
      console.log(`🔍 Final result:`, existingProfile ? 'Found' : 'Not found')

      // If we have a serious error (not just "no rows"), show it
      if (selectError && !existingProfile) {
        console.error("❌ Profile fetch error:", selectError)
        
        // Check for RLS/recursion issues
        if (selectError.message?.includes('infinite recursion') || 
            selectError.message?.includes('maximum recursion depth') ||
            selectError.message?.includes('policy') ||
            selectError.code === '42P17') {
          console.error('🚨 RLS Policy recursion detected!')
          setError('Database policy error. Please contact administrator.')
        } else {
          setError(`Failed to fetch profile: ${selectError.message}`)
        }
        setLoading(false)
        return
      }

      if (existingProfile) {
        console.log(`✅ Profile found, setting state:`, existingProfile)
        
        // Set all states in the correct order
        setProfile(existingProfile)
        setError(null)
        setLoading(false)
        
        console.log(`✅ Auth states updated - loading: false, profile: set, error: null`)
        
        if (shouldRedirect) {
          console.log(`📍 Redirecting user with role: ${existingProfile.role}`)
          setTimeout(() => {
            if (existingProfile.role === "pending_player") {
              console.log(`📍 Navigating to /onboarding`)
              router.push("/onboarding")
            } else {
              console.log(`📍 Navigating to /dashboard`)
              router.push("/dashboard")
            }
          }, 100)
        }
        return
      }

      // If no existing profile found, create new one
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
          }, 100)
        }
      } else {
        console.error(`❌ Profile creation failed:`, profileResult.error)
        setError('Failed to create user profile')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('❌ Profile fetch exception:', error)
      setError('Failed to load user profile')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Starting sign in process for:', email)
      setError(null)
      
      console.log('🔐 Calling Supabase signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      console.log('🔐 Sign in response received')
      console.log('🔐 Sign in data:', !!data)
      console.log('🔐 Sign in error:', error)
      
      if (error) {
        console.error('❌ Sign in error:', error)
        setLoading(false)
        return { error }
      }
      
      if (data.session && data.user) {
        console.log('✅ Sign in successful')
        console.log('✅ Session received:', !!data.session)
        console.log('✅ User received:', data.user.email)
        console.log('🔐 Waiting for auth state change event...')
        // The auth state change handler should now be triggered automatically
        return { error: null }
      } else {
        console.error('❌ No session returned from sign in')
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
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      })
      
      if (error) {
        console.error('❌ Sign up error:', error)
        return { error }
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        console.log('📧 Check email for confirmation')
        return { error: null }
      }
      
      return { error: null }
    } catch (err: any) {
      console.error("❌ Sign-up exception:", err)
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
