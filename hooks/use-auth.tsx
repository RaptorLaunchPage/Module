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
        
        // Fetch profile for existing session
        await fetchUserProfile(currentSession.user, false)
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
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('🔐 User signed in:', session.user.email)
      SessionManager.extendSession()
      setSession(session)
      setUser(session.user)
      setError(null)
      
      // Fetch profile and redirect
      await fetchUserProfile(session.user, true)
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
    }
  }

  const fetchUserProfile = async (user: any, shouldRedirect: boolean = false) => {
    try {
      console.log(`🔍 Fetching profile for user: ${user.email}`)
      
      // Get existing profile
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
        console.log(`✅ Profile found:`, existingProfile)
        setProfile(existingProfile)
        setLoading(false)
        
        if (shouldRedirect) {
          setTimeout(() => {
            if (existingProfile.role === "pending_player") {
              router.push("/onboarding")
            } else {
              router.push("/dashboard")
            }
          }, 100)
        }
        return
      }

      // Create new profile
      console.log(`🔧 Creating new profile for: ${user.email}`)
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      
      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email,
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log(`✅ Profile created:`, profileResult.profile)
        setProfile(profileResult.profile)
        setLoading(false)
        
        if (shouldRedirect) {
          setTimeout(() => {
            router.push("/onboarding")
          }, 100)
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
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('❌ Sign in error:', error)
        return { error }
      }
      
      if (data.session && data.user) {
        console.log('✅ Sign in successful')
        return { error: null }
      } else {
        console.error('❌ No session returned')
        return { error: { message: 'Authentication failed' } }
      }
    } catch (err: any) {
      console.error("❌ Sign-in exception:", err)
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
