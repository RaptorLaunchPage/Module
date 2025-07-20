"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import { supabase } from "@/lib/supabase"
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
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  signInWithDiscord: () => Promise<void>
  clearError: () => void
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
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  // Initialize auth system - simplified approach
  useEffect(() => {
    console.log('🚀 AuthProvider initializing...')
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 AUTH STATE CHANGE DETECTED:`)
      console.log(`   Event: ${event}`)
      console.log(`   Session exists: ${!!session}`)
      console.log(`   User email: ${session?.user?.email || 'NO USER'}`)
      console.log(`   User ID: ${session?.user?.id || 'NO ID'}`)
      console.log(`   Session object:`, session)
      
      handleAuthChange(event, session)
    })

    // Mark as initialized
    setInitialized(true)
    setLoading(false)
    console.log('✅ Auth system initialized with listener attached')
    
    return () => {
      console.log('🔍 AuthProvider cleanup')
      subscription.unsubscribe()
    }
  }, [])

  // Handle auth state changes - COMPLETELY REDESIGNED
  const handleAuthChange = async (event: string, session: Session | null) => {
    console.log(`🔄 PROCESSING AUTH CHANGE: ${event}`)
    console.log(`   Current state - loading: ${loading}, user: ${!!user}, profile: ${!!profile}`)
    
    try {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ HANDLING SIGNED_IN EVENT')
        console.log('   Setting session and user state...')
        setSession(session)
        setUser(session.user)
        setError(null)
        setLoading(true)
        
        console.log('   Calling loadUserProfile...')
        await loadUserProfile(session.user)
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 HANDLING SIGNED_OUT EVENT')
        clearAuthState()
        
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 HANDLING TOKEN_REFRESHED EVENT')
        setSession(session)
        setUser(session.user)
        
      } else if (event === 'INITIAL_SESSION' && session) {
        console.log('🔄 HANDLING INITIAL_SESSION EVENT')
        setSession(session)
        setUser(session.user)
        setLoading(true)
        await loadUserProfile(session.user)
      } else {
        console.log(`⚠️ UNHANDLED AUTH EVENT: ${event}`)
        console.log(`   Session exists: ${!!session}`)
        console.log(`   Event details:`, { event, session })
      }
    } catch (error) {
      console.error('❌ AUTH CHANGE ERROR:', error)
      console.error('   Error type:', typeof error)
      console.error('   Error details:', error)
      setError('Authentication error occurred')
      setLoading(false)
    }
  }

  // Load user profile - simplified
  const loadUserProfile = async (user: any) => {
    try {
      console.log(`🔍 Loading profile for: ${user.email}`)
      
      // Check for existing profile
      const { data: existingProfile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        throw new Error(`Profile fetch failed: ${error.message}`)
      }

      if (existingProfile) {
        console.log('✅ Profile loaded:', existingProfile.email)
        setProfile(existingProfile)
        setLoading(false)
        
        // Auto-redirect after successful profile load
        setTimeout(() => {
          if (existingProfile.role === "pending_player") {
            router.push("/onboarding")
          } else {
            router.push("/dashboard")
          }
        }, 100)
        return
      }

      // Create new profile
      console.log('🔧 Creating new profile...')
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      
      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email,
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log('✅ Profile created successfully')
        setProfile(profileResult.profile)
        setLoading(false)
        
        // Redirect new users to onboarding
        setTimeout(() => {
          router.push("/onboarding")
        }, 100)
      } else {
        throw new Error(profileResult.error || "Failed to create profile")
      }

    } catch (error: any) {
      console.error('❌ Profile load error:', error)
      setError(error.message || "Failed to load profile")
      setLoading(false)
    }
  }

  // Clear all auth state
  const clearAuthState = () => {
    setSession(null)
    setUser(null)
    setProfile(null)
    setError(null)
    setLoading(false)
  }

  // Sign in function - simplified
  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 SIGN IN ATTEMPT STARTING for:', email)
      setError(null)
      
      console.log('📞 Calling supabase.auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      console.log('📞 signInWithPassword response received:')
      console.log('   Error:', error)
      console.log('   Data:', data)
      console.log('   Session:', data?.session)
      console.log('   User:', data?.user)
      
      if (error) {
        console.error('❌ SIGN IN FAILED:', error.message)
        console.error('   Error code:', error.status)
        console.error('   Error details:', error)
        return { error }
      }
      
      console.log('✅ SIGN IN SUCCESSFUL - Auth state change should fire now')
      console.log('   Waiting for onAuthStateChange to be triggered...')
      return { error: null }
      
    } catch (err: any) {
      console.error('❌ SIGN IN EXCEPTION:', err)
      console.error('   Exception type:', typeof err)
      console.error('   Exception details:', err)
      return { error: err }
    }
  }

  // Sign up function - simplified
  const signUp = async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Sign up attempt:', email)
      setError(null)
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${getSiteUrl()}/auth/confirm`
        }
      })
      
      if (error) {
        console.error('❌ Sign up failed:', error.message)
      } else {
        console.log('✅ Sign up successful - check email')
      }
      
      return { error }
      
    } catch (err: any) {
      console.error('❌ Sign up exception:', err)
      return { error: err }
    }
  }

  // Sign out function - simplified
  const signOut = async () => {
    try {
      console.log('🔐 Signing out...')
      
      // Clear state immediately
      clearAuthState()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Redirect
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
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/dashboard`
        }
      })
      
      if (error) throw error
    } catch (error: any) {
      console.error('Discord sign in error:', error)
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
        clearError
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
