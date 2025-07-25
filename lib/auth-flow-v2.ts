import { supabase } from '@/lib/supabase'
import { SecureProfileCreation } from '@/lib/secure-profile-creation'
import SessionStorage, { SessionData, TokenInfo } from '@/lib/session-storage'
import { isAgreementRole, getRequiredAgreementVersion } from '@/lib/agreement-versions'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  user: SessionData['user'] | null
  profile: any
  agreementStatus: {
    requiresAgreement: boolean
    isChecked: boolean
    status?: 'missing' | 'outdated' | 'declined' | 'pending' | 'current' | 'bypassed' | 'error'
    current_version?: number
    required_version?: number
  }
  error: string | null
}

export interface AuthFlowResult {
  success: boolean
  shouldRedirect: boolean
  redirectPath?: string
  error?: string
}

class AuthFlowV2Manager {
  private static instance: AuthFlowV2Manager
  private state: AuthState = {
    isAuthenticated: false,
    isInitialized: false,
    isLoading: true,
    user: null,
    profile: null,
    agreementStatus: {
      requiresAgreement: false,
      isChecked: false
    },
    error: null
  }
  private listeners: Set<(state: AuthState) => void> = new Set()
  private profileCache: Map<string, any> = new Map()
  private initPromise: Promise<AuthFlowResult> | null = null

  static getInstance(): AuthFlowV2Manager {
    if (!AuthFlowV2Manager.instance) {
      AuthFlowV2Manager.instance = new AuthFlowV2Manager()
    }
    return AuthFlowV2Manager.instance
  }

  private constructor() {}

  // Subscribe to state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Get current state
  getState(): AuthState {
    return { ...this.state }
  }

  // Force complete loading state (emergency fallback)
  forceCompleteLoading(): void {
    console.log('🚨 Auth flow: Force completing loading state')
    this.setState({
      isInitialized: true,
      isLoading: false,
      error: 'Loading was forced to complete due to timeout'
    })
  }

  // Update state and notify listeners
  private setState(updates: Partial<AuthState>) {
    const prevState = { ...this.state }
    this.state = { ...this.state, ...updates }
    
    // Log state changes for debugging
    if (updates.isLoading !== undefined || updates.isAuthenticated !== undefined) {
      console.log('🔄 Auth state change:', {
        from: { isLoading: prevState.isLoading, isAuthenticated: prevState.isAuthenticated, hasProfile: !!prevState.profile },
        to: { isLoading: this.state.isLoading, isAuthenticated: this.state.isAuthenticated, hasProfile: !!this.state.profile },
        timestamp: new Date().toISOString()
      })
    }
    
    this.listeners.forEach(listener => listener(this.state))
  }

  // Initialize authentication - always fast and reliable
  async initialize(isInitialLoad: boolean = true): Promise<AuthFlowResult> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      console.log('🔄 Auth flow: Initialization already in progress, waiting...')
      return this.initPromise
    }

    // If already initialized and authenticated, return current state unless forcing reload
    if (this.state.isInitialized && this.state.isAuthenticated && !isInitialLoad) {
      console.log('✅ Auth flow: Already initialized and authenticated, returning current state')
      return { 
        success: true, 
        shouldRedirect: false 
      }
    }

    // If initialized but not authenticated (signed out state), only reinitialize if explicitly requested
    if (this.state.isInitialized && !this.state.isAuthenticated && !isInitialLoad) {
      console.log('🏠 Auth flow: In signed-out state, not reinitializing unless requested')
      return { success: true, shouldRedirect: false }
    }

    console.log(`🚀 Auth flow: Starting initialization (isInitialLoad: ${isInitialLoad})`)
    this.initPromise = this.performInitialize(isInitialLoad)
    
    try {
      const result = await this.initPromise
      return result
    } finally {
      this.initPromise = null
    }
  }

  // Actual initialization logic - streamlined and fast
  private async performInitialize(isInitialLoad: boolean): Promise<AuthFlowResult> {
    try {
      console.log('🚀 Starting streamlined auth initialization...')
      this.setState({ isLoading: true, error: null })

      // Add timeout protection for the entire initialization process
      const initializationPromise = this.doInitialization(isInitialLoad)
      const timeoutPromise = new Promise<AuthFlowResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Authentication initialization timed out after 10 seconds'))
        }, 10000)
      })

      return await Promise.race([initializationPromise, timeoutPromise])

    } catch (error: any) {
      console.error('❌ Auth initialization failed:', error)
      
      // Ensure we always set loading to false
      this.setState({
        isInitialized: true,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true },
        error: error.message || 'Authentication initialization failed'
      })
      
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Separate the actual initialization logic
  private async doInitialization(isInitialLoad: boolean): Promise<AuthFlowResult> {
    // Step 1: Check for existing session
    const existingSession = SessionStorage.getSession()
    const accessToken = SessionStorage.getAccessToken()

    if (existingSession && accessToken && !SessionStorage.isTokenExpired()) {
      console.log('✅ Valid session found in storage')
      
      // Try to restore user with cached profile if available
      const cachedProfile = this.profileCache.get(existingSession.user.id)
      if (cachedProfile) {
        console.log('✅ Using cached profile data')
        return await this.setAuthenticatedState(existingSession, cachedProfile, false) // Don't redirect on restore
      }

      // Validate session with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(accessToken)
      
      if (user && !error) {
        // Load profile in parallel
        const profile = await this.loadUserProfileFast(user)
        if (profile) {
          this.profileCache.set(user.id, profile)
          return await this.setAuthenticatedState(existingSession, profile, false) // Don't redirect on restore
        }
      } else {
        console.log('⚠️ Stored session invalid, clearing...')
        SessionStorage.clearSession()
        this.profileCache.clear()
      }
    }

    // Step 2: Check for active Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      console.log('🔄 Active Supabase session found, processing...')
      return await this.handleSupabaseSession(session)
    }

    // Step 3: No active session
    console.log('📝 No active session found')
    this.setState({
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
      user: null,
      profile: null,
      agreementStatus: { requiresAgreement: false, isChecked: true }
    })

    return { success: true, shouldRedirect: false }

     }

  // Fast profile loading with proper error handling
  private async loadUserProfileFast(user: User): Promise<any> {
    try {
      console.log(`🔍 Loading profile for user: ${user.email}`)

      // First, check users table (main profile storage)
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (userError && userError.code !== "PGRST116") {
        throw new Error(`User profile fetch failed: ${userError.message}`)
      }

      if (userProfile) {
        console.log('✅ User profile loaded successfully:', userProfile.role)
        return userProfile
      }

      // If no user profile, try profiles table
      const { data: legacyProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileError && profileError.code !== "PGRST116") {
        console.log('⚠️ Legacy profile fetch error:', profileError.message)
      }

      // Create new profile if none exists
      console.log('🔧 Creating new user profile...')
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 'User'

      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email || '',
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log('✅ New profile created successfully')
        return profileResult.profile
      } else {
        throw new Error(profileResult.error || 'Failed to create profile')
      }

    } catch (error: any) {
      console.error('❌ Profile loading error:', error)
      throw error
    }
  }

  // Set authenticated state with profile
  private async setAuthenticatedState(sessionData: SessionData, profile: any, shouldRedirect: boolean = false): Promise<AuthFlowResult> {
    try {
      // Check agreement status
      const agreementStatus = await this.checkAgreementStatus(profile)

      // Update auth state - ENSURE loading is false
      this.setState({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false, // Explicitly set to false
        user: sessionData.user,
        profile,
        agreementStatus,
        error: null
      })
      
      console.log('✅ Authentication state set successfully - isLoading: false')

      // Priority 1: Agreement requirements
      if (agreementStatus.requiresAgreement) {
        return {
          success: true,
          shouldRedirect: true,
          redirectPath: '/agreement-review'
        }
      }

      // Priority 2: Onboarding requirements (pending_player who hasn't completed onboarding)
      if (profile.role === 'pending_player' && !profile.onboarding_completed) {
        return {
          success: true,
          shouldRedirect: true,
          redirectPath: '/onboarding'
        }
      }

      // Priority 3: Only redirect on explicit request (login, signup confirmation)
      if (shouldRedirect) {
        // Check for intended route
        let redirectPath = '/dashboard'
        if (typeof window !== 'undefined') {
          const intendedRoute = localStorage.getItem('raptor-intended-route')
          if (intendedRoute && intendedRoute !== '/auth/login' && intendedRoute !== '/auth/signup') {
            redirectPath = intendedRoute
            localStorage.removeItem('raptor-intended-route')
          }
        }

        return {
          success: true,
          shouldRedirect: true,
          redirectPath
        }
      }

      // For normal navigation/page refresh, don't redirect - just update state
      console.log('✅ Auth state updated, no redirect needed for normal navigation')
      return {
        success: true,
        shouldRedirect: false
      }

    } catch (error: any) {
      console.error('❌ Setting authenticated state failed:', error)
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Authentication state setup failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Handle Supabase session (login, token refresh, etc.)
  async handleSupabaseSession(session: Session): Promise<AuthFlowResult> {
    try {
      console.log('🔐 Processing Supabase session...')
      
      const user = session.user
      
      // Load user profile
      const profile = await this.loadUserProfileFast(user)
      if (!profile) {
        throw new Error('Failed to load user profile')
      }

      // Cache the profile
      this.profileCache.set(user.id, profile)

      // Create session data
      const tokenInfo: TokenInfo = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: Date.now() + (session.expires_in * 1000),
        issuedAt: Date.now(),
        userId: user.id
      }

      const sessionData: SessionData = {
        user: {
          id: user.id,
          email: user.email || '',
          name: profile.name || profile.display_name || user.email?.split('@')[0],
          role: profile.role
        },
        tokenInfo,
        lastActive: Date.now(),
        agreementAccepted: false
      }

      // Store session
      SessionStorage.setSession(sessionData)

      return await this.setAuthenticatedState(sessionData, profile, true) // Redirect on login

    } catch (error: any) {
      console.error('❌ Session handling failed:', error)
      SessionStorage.clearSession()
      this.profileCache.clear()
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Session processing failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Fast agreement status check
  private async checkAgreementStatus(profile: any): Promise<typeof this.state.agreementStatus> {
    try {
      if (!isAgreementRole(profile.role)) {
        return {
          requiresAgreement: false,
          isChecked: true,
          status: 'bypassed'
        }
      }

      const requiredVersion = getRequiredAgreementVersion(profile.role)
      
      const { data: agreement, error } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', profile.id)
        .eq('role', profile.role)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Agreement check failed:', error.message)
        return {
          requiresAgreement: false,
          isChecked: true,
          status: 'bypassed'
        }
      }

      if (!agreement) {
        return {
          requiresAgreement: true,
          isChecked: true,
          status: 'missing',
          required_version: requiredVersion
        }
      }

      if (agreement.agreement_version < requiredVersion) {
        return {
          requiresAgreement: true,
          isChecked: true,
          status: 'outdated',
          current_version: agreement.agreement_version,
          required_version: requiredVersion
        }
      }

      if (agreement.status !== 'accepted') {
        return {
          requiresAgreement: true,
          isChecked: true,
          status: agreement.status as any,
          current_version: agreement.agreement_version,
          required_version: requiredVersion
        }
      }

      return {
        requiresAgreement: false,
        isChecked: true,
        status: 'current',
        current_version: agreement.agreement_version,
        required_version: requiredVersion
      }

    } catch (error: any) {
      console.error('❌ Agreement status check failed:', error)
      return {
        requiresAgreement: false,
        isChecked: true,
        status: 'bypassed'
      }
    }
  }

  // Sign in
  async signIn(email: string, password: string): Promise<AuthFlowResult> {
    try {
      console.log('🔐 Signing in user:', email)
      this.setState({ isLoading: true, error: null })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Sign in failed:', error.message)
        this.setState({
          isLoading: false,
          error: error.message
        })
        return { success: false, shouldRedirect: false, error: error.message }
      }

      if (data.session?.user) {
        console.log('✅ Sign in successful')
        return await this.handleSupabaseSession(data.session)
      }

      throw new Error('No session returned from sign in')

    } catch (error: any) {
      console.error('❌ Sign in error:', error)
      this.setState({
        isLoading: false,
        error: error.message || 'Sign in failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Signing out user...')

      // Clear local state first to prevent any race conditions
      SessionStorage.clearSession()
      this.profileCache.clear()
      
      // Set a clear signed-out state
      this.setState({
        isAuthenticated: false,
        isInitialized: true, // Keep initialized as true to prevent restarts
        isLoading: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true },
        error: null
      })

      // Sign out from Supabase - do this after clearing local state
      // to prevent the SIGNED_OUT event from re-triggering signOut
      await supabase.auth.signOut()

      console.log('✅ Sign out complete - user fully logged out')

    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      
      // Still ensure we're in a clean signed-out state even if Supabase fails
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true },
        error: 'Sign out may have been incomplete'
      })
    }
  }

  // Accept agreement
  async acceptAgreement(): Promise<boolean> {
    try {
      const { profile } = this.state
      if (!profile) {
        throw new Error('No profile available')
      }

      const token = SessionStorage.getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }

      const requiredVersion = getRequiredAgreementVersion(profile.role)

      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: profile.role,
          version: requiredVersion,
          status: 'accepted'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to accept agreement: ${response.statusText}`)
      }

      // Update agreement status
      this.setState({
        agreementStatus: {
          requiresAgreement: false,
          isChecked: true,
          status: 'current',
          current_version: requiredVersion,
          required_version: requiredVersion
        }
      })

      return true

    } catch (error: any) {
      console.error('❌ Agreement acceptance failed:', error)
      return false
    }
  }

  // Update profile
  async updateProfile(updatedProfile: any): Promise<void> {
    try {
      console.log('🔄 Updating profile data in auth state...')
      
      this.setState({
        profile: updatedProfile
      })

      // Update cache
      this.profileCache.set(updatedProfile.id, updatedProfile)

      // Update session storage
      const currentSession = SessionStorage.getSession()
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          user: {
            ...currentSession.user,
            name: updatedProfile.name || updatedProfile.display_name || currentSession.user.name,
            role: updatedProfile.role || currentSession.user.role
          }
        }
        SessionStorage.setSession(updatedSession)
      }

      console.log('✅ Profile updated successfully')
    } catch (error: any) {
      console.error('❌ Profile update error:', error)
      throw error
    }
  }

  // Refresh profile data without full re-initialization
  async refreshProfile(): Promise<void> {
    try {
      console.log('🔄 Refreshing profile data...')
      
      if (!this.state.isAuthenticated || !this.state.user) {
        throw new Error('Cannot refresh profile - not authenticated')
      }

      // Get fresh user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No active session found')
      }

      // Load fresh profile data
      const profile = await this.loadUserProfileFast(session.user)
      if (!profile) {
        throw new Error('Failed to load fresh profile data')
      }

      // Update state with fresh profile
      this.setState({
        profile
      })

      // Update cache
      this.profileCache.set(session.user.id, profile)

      console.log('✅ Profile refreshed successfully')
    } catch (error: any) {
      console.error('❌ Profile refresh error:', error)
      throw error
    }
  }
}

// Export singleton instance
const authFlowV2 = AuthFlowV2Manager.getInstance()
export default authFlowV2