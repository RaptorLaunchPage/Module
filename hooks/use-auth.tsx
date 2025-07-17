"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { SessionManager } from "@/lib/session-manager"
import { SecureProfileCreation } from "@/lib/secure-profile-creation"
import { EmergencyAdminService } from "@/lib/emergency-admin-service"
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
  
  // Prevent multiple profile creation attempts
  const profileCreationInProgress = useRef(false)
  const lastProfileCheck = useRef<string | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing auth...')
        
        // Get current session from Supabase first
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session fetch error:', error)
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
        if (session) {
          console.log('✅ Valid session found:', session.user?.email)
          // Update session manager with actual session
          SessionManager.extendSession()
          setSession(session)
          setUser(session.user || null)
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
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth state change:", event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session) {
          SessionManager.extendSession()
          setSession(session)
          setUser(session.user || null)
        } else if (event === 'SIGNED_OUT') {
          await SessionManager.logout()
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        } else {
          setSession(session)
          setUser(session?.user || null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Profile fetching with debouncing and proper checks
  useEffect(() => {
    if (user && !profileCreationInProgress.current) {
      const userId = user.id
      
      // Prevent duplicate profile checks for the same user
      if (lastProfileCheck.current === userId) {
        return
      }
      
      lastProfileCheck.current = userId
      fetchProfile(userId)
    } else if (!user && session === null) {
      setProfile(null)
      setLoading(false)
    }
  }, [user, session])

  const fetchProfile = async (userId: string) => {
    if (profileCreationInProgress.current) {
      console.log('⏳ Profile creation already in progress, skipping...')
      return
    }

    try {
      profileCreationInProgress.current = true
      setError(null)
      console.log(`🔍 Fetching profile for user: ${userId}`)

      // 1 – Check if profile already exists
      const { data: existing, error: selectErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (selectErr && selectErr.code !== "PGRST116") {
        console.error("[Profile] Error selecting user profile:", selectErr, { userId })
        throw selectErr
      }

      if (existing) {
        console.log(`✅ Profile found for user: ${userId}`)
        setProfile(existing)
        setLoading(false)
        return
      }

      console.log(`🔧 Profile not found, creating for user: ${userId}`)

      // 2 – Profile doesn't exist, create it using secure profile creation only
      const provider = user?.app_metadata?.provider || 'email'
      const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'User'
      
      const profileResult = await SecureProfileCreation.createProfile(
        userId,
        user?.email!,
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log(`✅ Profile created successfully for user: ${userId}`)
        setProfile(profileResult.profile)
        setLoading(false)
        return
      }

      // 3 – Profile creation failed
      console.error(`❌ Profile creation failed for user: ${userId}`)
      const errorMessage = profileResult.error || "Profile creation failed"
      setError(errorMessage)
      setLoading(false)

    } catch (err: any) {
      console.error("[Profile] Profile creation / fetch error:", err, { stack: err?.stack, userId, email: user?.email })
      setError(err.message || "Could not create / fetch profile")
      setLoading(false)
    } finally {
      profileCreationInProgress.current = false
    }
  }

  const retryProfileCreation = () => {
    if (user && !profileCreationInProgress.current) {
      lastProfileCheck.current = null // Reset to allow retry
      setLoading(true)
      setError(null)
      fetchProfile(user.id)
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    } catch (err: any) {
      console.error("Sign-in exception:", err)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
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
      return { error }
    } catch (err: any) {
      console.error("Sign-up exception:", err)
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      // Clear all auth state immediately first
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)
      setLoading(false)
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err: any) {
      console.error("Sign out error:", err)
      setError(err.message)
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

  const value = { session, user, profile, loading, error, signIn, signUp, signOut, retryProfileCreation, resetPassword, signInWithDiscord }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
