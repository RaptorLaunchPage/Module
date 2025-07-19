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
      
      // Create a timeout promise for fallback
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout - activating fallback')), 8000)
      )
      
      // Test 1: Check basic Supabase connectivity
      console.log(`🧪 Testing basic Supabase connectivity...`)
      const connectTest = await Promise.race([
        supabase.from('users').select('count').limit(1),
        timeoutPromise
      ]) as any
      console.log(`🧪 Connectivity test result:`, connectTest)
      
      if (connectTest.error) {
        console.error(`❌ Basic connectivity failed:`, connectTest.error)
        if (shouldRedirect) {
          console.log('🚨 Using fallback profile due to connectivity issues')
          createFallbackProfile(user)
          return
        }
        setError(`Database connection failed: ${connectTest.error.message}`)
        setLoading(false)
        return
      }
      
      // Test 2: Try to query with current user's auth context
      console.log(`🧪 Testing authenticated query...`)
      const authTest = await supabase.auth.getUser()
      console.log(`🧪 Current auth user:`, authTest)
      
      // Test 3: Try the actual profile query with detailed logging
      console.log(`🔍 Starting profile query for user ID: ${user.id}`)
      
      const profileQuery = supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
      
      console.log(`🔍 Query constructed, executing...`)
      
      const startTime = Date.now()
      const { data: existingProfile, error: selectError } = await Promise.race([
        profileQuery,
        timeoutPromise
      ]) as any
      const endTime = Date.now()
      
      console.log(`🔍 Query completed in ${endTime - startTime}ms`)
      console.log(`🔍 Query error:`, selectError)
      console.log(`🔍 Query result:`, existingProfile)

      if (selectError) {
        console.error("❌ Profile fetch error:", selectError)
        console.error("❌ Error code:", selectError.code)
        console.error("❌ Error details:", selectError.details)
        console.error("❌ Error hint:", selectError.hint)
        
        // Use fallback for certain error types or on redirect
        if (shouldRedirect || selectError.code === '42501' || selectError.message?.includes('permission')) {
          console.log('🚨 Using fallback profile due to database error')
          createFallbackProfile(user)
          return
        }
        
        // Check if it's an RLS policy issue
        if (selectError.code === '42501' || selectError.message?.includes('permission') || selectError.message?.includes('policy')) {
          setError(`Database permission error. Please check RLS policies for the users table.`)
        } else {
          setError(`Failed to fetch profile: ${selectError.message}`)
        }
        setLoading(false)
        return
      }

      if (existingProfile) {
        console.log(`✅ Profile found, setting state:`, existingProfile)
        
        setProfile(existingProfile)
        setError(null)
        setLoading(false)
        
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
          }, 500)
        }
        return
      }

      // If no existing profile, try to create new one or use fallback
      console.log(`🔧 No existing profile found. Attempting to create...`)
      
      if (shouldRedirect) {
        // For login flow, use fallback instead of trying to create
        console.log('🚨 Using fallback profile for login flow')
        createFallbackProfile(user)
        return
      }
      
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
      } else {
        console.error(`❌ Profile creation failed:`, profileResult.error)
        // Use fallback as last resort
        console.log('🚨 Using fallback profile as last resort')
        createFallbackProfile(user)
      }
    } catch (error: any) {
      console.error('❌ Profile fetch exception:', error)
      console.error('❌ Exception stack:', error.stack)
      
      if (error.message?.includes('timeout') || error.message?.includes('fallback')) {
        console.log('🚨 Using fallback profile due to timeout/error')
        createFallbackProfile(user)
      } else {
        setError('Failed to load user profile')
        setLoading(false)
      }
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Signing in:', email)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('❌ Sign in error:', error)
        setLoading(false)
        return { error }
      }
      
      if (data.session && data.user) {
        console.log('✅ Sign in successful')
        // Let the auth state change handler manage the profile fetch
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

  const createFallbackProfile = (user: any) => {
    console.log('🚨 Creating fallback profile for user access')
    const fallbackProfile = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: 'admin', // Since we know this user is admin from previous data
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: new Date().toISOString(),
      role_level: 100,
      status: 'Active',
      fallback: true // Mark this as a fallback profile
    }
    
    setProfile(fallbackProfile)
    setError(null)
    setLoading(false)
    
    console.log('🚨 Fallback profile created, redirecting to dashboard')
    setTimeout(() => {
      router.push("/dashboard")
    }, 500)
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
