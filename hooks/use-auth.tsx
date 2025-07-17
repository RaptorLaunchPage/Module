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
  retryProfileCreation: () => void
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

  // Initialize auth on mount
  useEffect(() => {
    console.log('🔍 AuthProvider mounting...')
    initializeAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth state change:", event, session?.user?.email || 'no user')
        await handleAuthStateChange(event, session)
      }
    )

    return () => {
      console.log('🔍 AuthProvider unmounting...')
      subscription.unsubscribe()
    }
  }, [])

  const initializeAuth = async () => {
    try {
      console.log('🔍 Initializing auth...')
      setLoading(true)
      setError(null)
      
      // Try to recover session first (for page refreshes)
      const sessionRecovered = await SessionManager.recoverSession()
      
      // Get current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session fetch error:', error)
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        console.log('✅ Valid session found:', session.user.email)
        if (sessionRecovered) {
          console.log('✅ Session was recovered from page refresh')
        }
        SessionManager.extendSession()
        setSession(session)
        setUser(session.user)
        
        // Fetch profile for authenticated user - ensure loading is managed properly
        await fetchUserProfile(session.user, false) // Don't redirect on init
      } else {
        console.log('❌ No session found')
        SessionManager.clearSession()
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      SessionManager.clearSession()
      setSession(null)
      setUser(null)
      setProfile(null)
      setError('Failed to initialize authentication')
      setLoading(false)
    }
  }

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    try {
      console.log(`🔐 Handling auth state change: ${event}`)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 User signed in:', session.user.email)
        SessionManager.extendSession()
        setSession(session)
        setUser(session.user)
        setError(null)
        setLoading(true) // Start loading for profile fetch
        
        // Fetch or create profile
        await fetchUserProfile(session.user, true) // Pass true to indicate this is from sign in
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 User signed out')
        await SessionManager.logout()
        setSession(null)
        setUser(null)
        setProfile(null)
        setError(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔐 Token refreshed for:', session?.user?.email)
        setSession(session)
        setUser(session?.user || null)
      } else {
        console.log(`🔐 Other auth event: ${event}`)
        setSession(session)
        setUser(session?.user || null)
      }
    } catch (error) {
      console.error('❌ Auth state change error:', error)
      setError('Authentication state error')
      setLoading(false)
    }
  }

  const fetchUserProfile = async (user: any, shouldRedirect: boolean = false) => {
    try {
      console.log(`🔍 Fetching profile for user: ${user.id} (${user.email})`)
      setError(null)

      // First, try to get existing profile
      const { data: existingProfile, error: selectError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (selectError && selectError.code !== "PGRST116") {
        console.error("❌ Profile fetch error:", selectError)
        setError(`Failed to fetch profile: ${selectError.message}`)
        setLoading(false)
        return
      }

      if (existingProfile) {
        console.log(`✅ Profile found for user: ${user.email}`, existingProfile)
        setProfile(existingProfile)
        setLoading(false)
        
        // Redirect to appropriate page if this is from a sign in
        if (shouldRedirect) {
          if (existingProfile.role === "pending_player") {
            console.log('📍 Redirecting to onboarding...')
            router.push("/onboarding")
          } else {
            console.log('📍 Redirecting to dashboard...')
            router.push("/dashboard")
          }
        }
        return
      }

      // Profile doesn't exist, create it
      console.log(`🔧 Profile not found, creating for user: ${user.email}`)
      
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      
      console.log(`🔧 Creating profile with data:`, {
        userId: user.id,
        email: user.email,
        name: userName,
        provider
      })
      
      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email,
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log(`✅ Profile created successfully for user: ${user.email}`, profileResult.profile)
        setProfile(profileResult.profile)
        setLoading(false)
        
        // Redirect to onboarding for new users
        if (shouldRedirect) {
          console.log('📍 Redirecting to onboarding for new user...')
          router.push("/onboarding")
        }
        return
      }

      // Profile creation failed
      console.error(`❌ Profile creation failed for user: ${user.email}`, profileResult.error)
      const errorMessage = profileResult.error || "Failed to create profile"
      setError(errorMessage)
      setLoading(false)

    } catch (err: any) {
      console.error("❌ Profile creation/fetch error:", err)
      setError(err.message || "Could not create or fetch profile")
      setLoading(false)
    }
  }

  const retryProfileCreation = async () => {
    if (!user) {
      setError("No user logged in")
      return
    }
    
    console.log('🔄 Retrying profile creation for:', user.email)
    setError(null)
    setLoading(true)
    await fetchUserProfile(user, false) // Don't redirect on retry
  }

  const clearError = () => {
    setError(null)
  }

  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Attempting sign in for:', email)
      setError(null)
      
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('❌ Sign in error:', error)
        return { error }
      }
      
      console.log('✅ Sign in successful, waiting for auth state change...')
      // Success - auth state change will handle the rest
      return { error: null }
    } catch (err: any) {
      console.error("❌ Sign-in exception:", err)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Attempting sign up for:', email)
      setError(null)
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: `${getSiteUrl()}/auth/confirm`
        },
      })
      
      if (error) {
        console.error('❌ Sign up error:', error)
      } else {
        console.log('✅ Sign up successful, check email for confirmation')
      }
      
      return { error }
    } catch (err: any) {
      console.error("❌ Sign-up exception:", err)
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      console.log('🔐 Signing out...')
      // Don't set loading during logout to avoid showing loading screens
      
      // Clear all auth state first
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      console.log('✅ Sign out successful, redirecting to homepage')
      
      // Redirect to homepage after successful logout
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (err: any) {
      console.error("❌ Sign out error:", err)
      setError(err.message)
      // Still clear auth state even if signout fails
      setSession(null)
      setUser(null)
      setProfile(null)
      
      // Force redirect to homepage even if logout fails
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  const resetPassword = async (email: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Requesting password reset for:', email)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/confirm`
      })
      return { error }
    } catch (err: any) {
      console.error("❌ Reset password exception:", err)
      return { error: err }
    }
  }

  const signInWithDiscord = async (): Promise<void> => {
    try {
      console.log('🔐 Attempting Discord OAuth...')
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/auth/confirm`,
        },
      })
      if (error) throw error
      console.log('✅ Discord OAuth initiated, redirecting...')
    } catch (err: any) {
      console.error("❌ Discord OAuth sign-in error:", err)
      setError(err.message || "Could not sign in with Discord")
    }
  }

  const value = { 
    session, 
    user, 
    profile, 
    loading, 
    error, 
    signIn, 
    signUp, 
    signOut, 
    retryProfileCreation, 
    resetPassword, 
    signInWithDiscord,
    clearError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
