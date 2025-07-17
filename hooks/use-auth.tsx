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
    initializeAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth state change:", event, session?.user?.email)
        handleAuthStateChange(event, session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const initializeAuth = async () => {
    try {
      console.log('🔍 Initializing auth...')
      setLoading(true)
      setError(null)
      
      // Get current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session fetch error:', error)
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        console.log('✅ Valid session found:', session.user.email)
        SessionManager.extendSession()
        setSession(session)
        setUser(session.user)
        
        // Fetch profile for authenticated user
        await fetchUserProfile(session.user)
      } else {
        console.log('❌ No session found')
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setSession(null)
      setUser(null)
      setProfile(null)
      setError('Failed to initialize authentication')
      setLoading(false)
    }
  }

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    try {
      if (event === 'SIGNED_IN' && session?.user) {
        SessionManager.extendSession()
        setSession(session)
        setUser(session.user)
        setError(null)
        
        // Fetch or create profile
        await fetchUserProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        await SessionManager.logout()
        setSession(null)
        setUser(null)
        setProfile(null)
        setError(null)
        setLoading(false)
      } else {
        setSession(session)
        setUser(session?.user || null)
      }
    } catch (error) {
      console.error('Auth state change error:', error)
      setError('Authentication state error')
    }
  }

  const fetchUserProfile = async (user: any) => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔍 Fetching profile for user: ${user.id} (${user.email})`)

      // First, try to get existing profile
      const { data: existingProfile, error: selectError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (selectError && selectError.code !== "PGRST116") {
        console.error("Profile fetch error:", selectError)
        setError(`Failed to fetch profile: ${selectError.message}`)
        setLoading(false)
        return
      }

      if (existingProfile) {
        console.log(`✅ Profile found for user: ${user.email}`)
        setProfile(existingProfile)
        setLoading(false)
        return
      }

      // Profile doesn't exist, create it
      console.log(`🔧 Profile not found, creating for user: ${user.email}`)
      
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      
      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email,
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log(`✅ Profile created successfully for user: ${user.email}`)
        setProfile(profileResult.profile)
        setLoading(false)
        return
      }

      // Profile creation failed
      console.error(`❌ Profile creation failed for user: ${user.email}`)
      const errorMessage = profileResult.error || "Failed to create profile"
      setError(errorMessage)
      setLoading(false)

    } catch (err: any) {
      console.error("Profile creation/fetch error:", err)
      setError(err.message || "Could not create or fetch profile")
      setLoading(false)
    }
  }

  const retryProfileCreation = async () => {
    if (!user) {
      setError("No user logged in")
      return
    }
    
    setError(null)
    await fetchUserProfile(user)
  }

  const clearError = () => {
    setError(null)
  }

  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setLoading(false)
        return { error }
      }
      
      // Don't set loading to false here - let the auth state change handle it
      return { error: null }
    } catch (err: any) {
      console.error("Sign-in exception:", err)
      setLoading(false)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      setLoading(true)
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
      
      setLoading(false)
      return { error }
    } catch (err: any) {
      console.error("Sign-up exception:", err)
      setLoading(false)
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Clear all auth state first
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setLoading(false)
    } catch (err: any) {
      console.error("Sign out error:", err)
      setError(err.message)
      setLoading(false)
    }
  }

  const resetPassword = async (email: string): Promise<{ error: any | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/confirm`
      })
      return { error }
    } catch (err: any) {
      console.error("Reset password exception:", err)
      return { error: err }
    }
  }

  const signInWithDiscord = async (): Promise<void> => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/auth/confirm`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error("Discord OAuth sign-in error:", err)
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
