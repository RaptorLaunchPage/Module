"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check session manager first
        const isValid = SessionManager.isSessionValid()
        console.log('🔍 Session validity check:', isValid)
        
        if (!isValid) {
          console.log('⚠️ Session expired, clearing auth state')
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
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
        
        if (session) {
          console.log('✅ Valid session found:', session.user?.email)
          SessionManager.extendSession() // Update activity
        }
        
        setSession(session)
        setUser(session?.user || null)
        // Do not set loading to false here; wait for profile
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
        } else if (event === 'SIGNED_OUT') {
          // Clear session data when user signs out
          await SessionManager.logout()
        }
        setSession(session)
        setUser(session?.user || null)
        // Do not set loading to false here; wait for profile
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // After any login (email or OAuth), ensure profile is created/fetched
  useEffect(() => {
    if (user) {
      fetchProfile(user.id)
    } else if (session === null) {
      setProfile(null)
      setLoading(false)
    }
  }, [user, session])

  const fetchProfile = async (userId: string) => {
    try {
      setError(null)

      // 1 – Do we already have a profile?
      const { data: existing, error: selectErr } = await supabase.from("users").select("*").eq("id", userId).single()

      if (selectErr && selectErr.code !== "PGRST116") {
        // PGRST116 = row not found (that’s fine – we’ll create below)
        console.error("[Profile] Error selecting user profile:", selectErr, { userId })
        throw selectErr
      }

      if (existing) {
        // Profile exists, use it
        setProfile(existing)
        setLoading(false)
        return
      }

      // 2 – Profile doesn't exist, create it using emergency admin service
      console.log("🔧 Creating profile for user:", userId, user?.email)
      // Determine provider (email, discord, etc.)
      const provider = user?.app_metadata?.provider || 'email'
      // Try emergency profile creation function first
      const { data: emergencyData, error: emergencyError } = await supabase.rpc('emergency_create_profile', {
        user_id: userId,
        user_email: user?.email!,
        user_name: user?.user_metadata?.name || user?.user_metadata?.full_name || 'User',
        provider // pass provider to the RPC if supported
      })

      if (!emergencyError && emergencyData?.success) {
        setProfile(emergencyData.profile)
        setLoading(false)
        return
      }

      if (emergencyError) {
        console.error("[Profile] Emergency RPC profile creation error:", emergencyError, { userId, email: user?.email })
      }

      // Fallback to emergency admin service
      const emergencyResult = await EmergencyAdminService.createSuperAdmin(
        userId,
        user?.email!,
        user?.user_metadata?.name || user?.user_metadata?.full_name || 'User',
        provider
      )

      if (emergencyResult.success) {
        // Profile created successfully, fetch it
        const { data: newProfile, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single()

        if (fetchError) {
          console.error("[Profile] Profile created but fetch failed:", fetchError, { userId })
          throw new Error("Profile created but could not fetch: " + fetchError.message)
        }

        setProfile(newProfile)
        setLoading(false)
        return
      }

      if (!emergencyResult.success) {
        console.error("[Profile] EmergencyAdminService.createSuperAdmin failed:", emergencyResult, { userId, email: user?.email })
      }

      // Fallback to secure profile creation
      const profileResult = await SecureProfileCreation.createProfile(
        userId,
        user?.email!,
        user?.user_metadata?.name || user?.user_metadata?.full_name || undefined,
        provider
      )

      if (!profileResult.success) {
        console.error("[Profile] SecureProfileCreation.createProfile failed:", profileResult, { userId, email: user?.email })
        throw new Error(profileResult.error || "Profile creation failed")
      }

      // 3 – Set the created profile
      setProfile(profileResult.profile)
      setLoading(false)
    } catch (err: any) {
      console.error("[Profile] Profile creation / fetch error:", err, { stack: err?.stack, userId, email: user?.email })
      setError(err.message || "Could not create / fetch profile")
      setLoading(false)
    }
  }

  const retryProfileCreation = () => {
    if (user) {
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
