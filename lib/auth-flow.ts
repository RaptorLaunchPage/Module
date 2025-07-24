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

class AuthFlowManager {
  private static instance: AuthFlowManager
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
  private isInitialLogin: boolean = true // Track if this is initial login or navigation

  static getInstance(): AuthFlowManager {
    if (!AuthFlowManager.instance) {
      AuthFlowManager.instance = new AuthFlowManager()
    }
    return AuthFlowManager.instance
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

  // Update state and notify listeners
  private setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(listener => listener(this.state))
  }

  // Initialize the auth system
  async initialize(isInitialLoad: boolean = true): Promise<AuthFlowResult> {
    this.isInitialLogin = isInitialLoad
    
    console.log(`🚀 Auth initialize called with isInitialLoad: ${isInitialLoad}`)
    
    // Add timeout only for initial login, not for navigation
    if (isInitialLoad) {
      console.log('⏰ Using timeout for initial login')
      const initPromise = this.performInitialize()
      const timeoutPromise = new Promise<AuthFlowResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Authentication initialization timeout'))
        }, 12000) // 12 second timeout only for initial login
      })

      try {
        return await Promise.race([initPromise, timeoutPromise])
      } catch (error: any) {
        console.error('❌ Auth initialization failed or timed out:', error)
        
        // For initial login timeout, try session recovery
        if (error.message.includes('timeout')) {
          return await this.attemptSessionRecovery()
        }
        
        this.setState({
          isInitialized: true,
          isLoading: false,
          error: error.message || 'Authentication initialization failed'
        })
        return { success: false, shouldRedirect: false, error: error.message }
      }
    } else {
      // For navigation, no timeout - just perform initialization
      console.log('🚀 No timeout for navigation - performing direct initialization')
      return await this.performInitialize()
    }
  }

  // Attempt to recover session without full re-authentication
  private async attemptSessionRecovery(): Promise<AuthFlowResult> {
    try {
      console.log('🔄 Attempting session recovery...')
      
      // Check if we have a valid session in storage
      const existingSession = SessionStorage.getSession()
      const accessToken = SessionStorage.getAccessToken()
      
      if (existingSession && accessToken) {
        console.log('📱 Found existing session, validating...')
        
        // Try to get user info without timeout
        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        
        if (user && !error) {
          console.log('✅ Session recovered successfully')
          
          // Start from agreement checking stage as requested
          this.setState({
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
            user: existingSession.user,
            profile: null, // Will be loaded separately
            agreementStatus: { requiresAgreement: false, isChecked: false }
          })
          
          // Load profile in background without timeout
          this.loadProfileInBackground(user, existingSession)
          
          return { 
            success: true, 
            shouldRedirect: true, 
            redirectPath: '/agreement-review' // Start from agreement checking
          }
        }
      }
      
      // If session recovery fails, redirect to login
      console.log('❌ Session recovery failed, redirecting to login')
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: 'Session expired. Please sign in again.'
      })
      
      return { 
        success: true, 
        shouldRedirect: true, 
        redirectPath: '/auth/login' 
      }
      
    } catch (error: any) {
      console.error('❌ Session recovery error:', error)
      
      // Fallback to login
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: 'Please sign in again.'
      })
      
      return { 
        success: true, 
        shouldRedirect: true, 
        redirectPath: '/auth/login' 
      }
    }
  }

  // Load profile in background without blocking UI
  private async loadProfileInBackground(user: User, sessionData: SessionData) {
    try {
      console.log('🔄 Loading profile in background...')
      
      const profile = await this.performLoadUserProfile(user)
      
      if (profile) {
        // Check agreement status
        const agreementStatus = await this.checkAgreementStatus(profile)
        
        this.setState({
          profile,
          agreementStatus
        })
      }
    } catch (error: any) {
      console.error('❌ Background profile loading failed:', error)
      // Don't fail the entire auth flow for profile loading issues
      this.setState({
        error: 'Profile loading failed. Some features may be limited.'
      })
    }
  }

  // Actual initialization logic
  private async performInitialize(): Promise<AuthFlowResult> {
    try {
      console.log('🚀 Initializing auth flow...')
      this.setState({ isLoading: true, error: null })

      // Check for existing session in storage
      const existingSession = SessionStorage.getSession()
      const accessToken = SessionStorage.getAccessToken()

      if (existingSession && accessToken && !SessionStorage.isTokenExpired()) {
        console.log('🔄 Restoring session from storage')
        
        // Validate session with Supabase (no timeout for navigation)
        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        
        if (user && !error) {
          return await this.processAuthenticatedUser(user, existingSession)
        } else {
          console.log('⚠️ Stored session invalid, clearing...')
          SessionStorage.clearSession()
        }
      }

      // Check for active Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        console.log('🔄 Active Supabase session found')
        return await this.handleSupabaseSession(session)
      }

      // No active session
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

    } catch (error: any) {
      console.error('❌ Auth initialization failed:', error)
      this.setState({
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Authentication initialization failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Handle Supabase session (login, token refresh, etc.)
  async handleSupabaseSession(session: Session): Promise<AuthFlowResult> {
    try {
      console.log('🔐 Processing Supabase session...')
      
      const user = session.user
      
      // Load user profile with timeout only during initial login
      const profile = await this.loadUserProfile(user)
      if (!profile) {
        throw new Error('Failed to load user profile')
      }

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
        agreementAccepted: false // Will be checked below
      }

      // Store session
      SessionStorage.setSession(sessionData)

      return await this.processAuthenticatedUser(user, sessionData)

    } catch (error: any) {
      console.error('❌ Session handling failed:', error)
      SessionStorage.clearSession()
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Session processing failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Process authenticated user
  private async processAuthenticatedUser(user: User, sessionData: SessionData): Promise<AuthFlowResult> {
    try {
      console.log('👤 Processing authenticated user...')
      
      // Load user profile if not already loaded
      let profile = this.state.profile
      if (!profile) {
        profile = await this.loadUserProfile(user)
        if (!profile) {
          throw new Error('Failed to load user profile')
        }
      }

      // Check agreement status
      const agreementStatus = await this.checkAgreementStatus(profile)

      // Update auth state
      this.setState({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        user: sessionData.user,
        profile,
        agreementStatus,
        error: null
      })

      // Determine redirect path
      if (agreementStatus.requiresAgreement) {
        return {
          success: true,
          shouldRedirect: true,
          redirectPath: '/agreement-review'
        }
      }

      // Check for intended route
      let redirectPath = '/dashboard'
      if (typeof window !== 'undefined') {
        const intendedRoute = localStorage.getItem('raptor-intended-route')
        if (intendedRoute && intendedRoute !== '/auth/login') {
          redirectPath = intendedRoute
          localStorage.removeItem('raptor-intended-route')
        }
      }

      return {
        success: true,
        shouldRedirect: true,
        redirectPath
      }

    } catch (error: any) {
      console.error('❌ User processing failed:', error)
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'User processing failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Load user profile from database
  private async loadUserProfile(user: User): Promise<any> {
    console.log(`👤 Loading user profile, isInitialLogin: ${this.isInitialLogin}`)
    
    // Add timeout only for initial login, not for navigation
    if (this.isInitialLogin) {
      console.log('⏰ Using timeout for profile loading (initial login)')
      const profilePromise = this.performLoadUserProfile(user)
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Profile loading timeout'))
        }, 15000) // 15 second timeout only for initial login
      })

      try {
        return await Promise.race([profilePromise, timeoutPromise])
      } catch (error: any) {
        console.error('❌ Profile loading failed or timed out:', error)
        throw error
      }
    } else {
      // For navigation, no timeout - just load the profile
      console.log('🚀 No timeout for profile loading (navigation)')
      return await this.performLoadUserProfile(user)
    }
  }

  // Actual profile loading logic
  private async performLoadUserProfile(user: User): Promise<any> {
    try {
      console.log(`🔍 Loading profile for user: ${user.email}`)

      // Check for existing profile
      const { data: existingProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError && profileError.code !== "PGRST116") {
        throw new Error(`Profile fetch failed: ${profileError.message}`)
      }

      if (existingProfile) {
        console.log('✅ Profile loaded successfully:', existingProfile.role)
        return existingProfile
      }

      // Create new profile
      console.log('🔧 Creating new profile...')
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
        console.log('✅ Profile created successfully')
        return profileResult.profile
      } else {
        throw new Error(profileResult.error || 'Failed to create profile')
      }

    } catch (error: any) {
      console.error('❌ Profile loading error:', error)
      throw error
    }
  }

  // Check agreement status
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
        throw new Error(`Agreement check failed: ${error.message}`)
      }

      if (!agreement) {
        return {
          requiresAgreement: true,
          isChecked: true,
          status: 'missing',
          required_version: requiredVersion
        }
      }

      if (agreement.version < requiredVersion) {
        return {
          requiresAgreement: true,
          isChecked: true,
          status: 'outdated',
          current_version: agreement.version,
          required_version: requiredVersion
        }
      }

      if (agreement.status !== 'accepted') {
        return {
          requiresAgreement: true,
          isChecked: true,
          status: agreement.status as any,
          current_version: agreement.version,
          required_version: requiredVersion
        }
      }

      return {
        requiresAgreement: false,
        isChecked: true,
        status: 'current',
        current_version: agreement.version,
        required_version: requiredVersion
      }

    } catch (error: any) {
      console.error('❌ Agreement status check failed:', error)
      return {
        requiresAgreement: true,
        isChecked: true,
        status: 'error',
        required_version: getRequiredAgreementVersion(profile.role)
      }
    }
  }

  // Update profile data without full re-initialization
  async updateProfile(updatedProfile: any): Promise<void> {
    try {
      console.log('🔄 Updating profile data in auth state...')
      
      this.setState({
        profile: updatedProfile
      })

      // Update session storage with new profile data
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

      // Clear local state first
      SessionStorage.clearSession()
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true },
        error: null
      })

      // Sign out from Supabase
      await supabase.auth.signOut()

      console.log('✅ Sign out complete')

    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      // Still clear local state even if Supabase signout fails
    }
  }
}

// Export singleton instance
const authFlow = AuthFlowManager.getInstance()
export default authFlow