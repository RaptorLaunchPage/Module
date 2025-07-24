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

  static getInstance(): AuthFlowManager {
    if (!AuthFlowManager.instance) {
      AuthFlowManager.instance = new AuthFlowManager()
    }
    return AuthFlowManager.instance
  }

  // State management
  private setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState(): AuthState {
    return { ...this.state }
  }

  // Initialize the auth system
  async initialize(): Promise<AuthFlowResult> {
    // Add timeout to prevent infinite loading
    const initPromise = this.performInitialize()
    const timeoutPromise = new Promise<AuthFlowResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Authentication initialization timeout'))
      }, 12000) // 12 second timeout
    })

    try {
      return await Promise.race([initPromise, timeoutPromise])
    } catch (error: any) {
      console.error('❌ Auth initialization failed or timed out:', error)
      this.setState({
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Authentication initialization failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
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
        
        // Validate session with Supabase
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
      
      // Load user profile
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

  // Process authenticated user (check agreements, set redirects)
  private async processAuthenticatedUser(user: User, sessionData: SessionData): Promise<AuthFlowResult> {
    try {
      // Load fresh profile
      const profile = await this.loadUserProfile(user)
      if (!profile) {
        throw new Error('Failed to load user profile')
      }

      // Update state with authenticated user
      this.setState({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        user: sessionData.user,
        profile,
        error: null
      })

      // Check agreement status
      const agreementResult = await this.checkAgreementStatus(profile)
      
      // Determine redirect path
      let redirectPath = '/dashboard'
      
      if (profile.role === 'pending_player') {
        redirectPath = '/onboarding'
      } else if (agreementResult.requiresAgreement) {
        redirectPath = '/agreement-review'
      } else {
        // Check for intended route
        const intendedRoute = typeof window !== 'undefined' ? 
          localStorage.getItem('raptor-intended-route') : null
        
        if (intendedRoute && intendedRoute !== '/auth/login') {
          redirectPath = intendedRoute
          localStorage.removeItem('raptor-intended-route')
        }
      }

      console.log(`✅ Auth flow complete, redirecting to: ${redirectPath}`)
      
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
        error: error.message || 'User authentication failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Load user profile from database
  private async loadUserProfile(user: User): Promise<any> {
    // Add timeout to prevent infinite loading
    const profilePromise = this.performLoadUserProfile(user)
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Profile loading timeout'))
      }, 15000) // 15 second timeout
    })

    try {
      return await Promise.race([profilePromise, timeoutPromise])
    } catch (error: any) {
      console.error('❌ Profile loading failed or timed out:', error)
      throw error
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
        throw new Error(profileResult.error || "Failed to create profile")
      }

    } catch (error: any) {
      console.error('❌ Profile load error:', error)
      throw error
    }
  }

  // Check user agreement status
  private async checkAgreementStatus(profile: any): Promise<{ requiresAgreement: boolean; isChecked: boolean; status?: string }> {
    try {
      console.log('🔍 Checking agreement status for role:', profile.role)

      // Check if development override is enabled
      const isDev = process.env.NODE_ENV === 'development'
      const hasOverride = process.env.NEXT_PUBLIC_DISABLE_AGREEMENT_ENFORCEMENT === 'true'
      
      if (isDev && hasOverride) {
        console.log('🔧 Agreement enforcement disabled in development')
        this.setState({
          agreementStatus: { requiresAgreement: false, isChecked: true, status: 'bypassed' }
        })
        return { requiresAgreement: false, isChecked: true, status: 'bypassed' }
      }

      // Check if role requires agreement
      if (!isAgreementRole(profile.role)) {
        console.log('📝 Role does not require agreement')
        this.setState({
          agreementStatus: { requiresAgreement: false, isChecked: true, status: 'bypassed' }
        })
        return { requiresAgreement: false, isChecked: true, status: 'bypassed' }
      }

      // Fetch agreement status from API
      const token = SessionStorage.getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/agreements', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to check agreement status: ${response.statusText}`)
      }

      const data = await response.json()
      const agreementStatus = data.agreement_status

      console.log('📋 Agreement status:', agreementStatus.status)

      this.setState({
        agreementStatus: {
          requiresAgreement: agreementStatus.requires_agreement,
          isChecked: true,
          status: agreementStatus.status,
          current_version: agreementStatus.current_version,
          required_version: agreementStatus.required_version
        }
      })

      return {
        requiresAgreement: agreementStatus.requires_agreement,
        isChecked: true,
        status: agreementStatus.status
      }

    } catch (error: any) {
      console.error('❌ Agreement check failed:', error)
      
      // On error, don't block access but log the issue
      this.setState({
        agreementStatus: { requiresAgreement: false, isChecked: true, status: 'error' }
      })
      
      return { requiresAgreement: false, isChecked: true, status: 'error' }
    }
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthFlowResult> {
    try {
      console.log('🔐 Sign in attempt:', email)
      this.setState({ isLoading: true, error: null })

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (signInError) {
        console.error('❌ Sign in failed:', signInError.message)
        this.setState({ isLoading: false, error: signInError.message })
        return { success: false, shouldRedirect: false, error: signInError.message }
      }

      if (data.session) {
        console.log('✅ Sign in successful')
        return await this.handleSupabaseSession(data.session)
      }

      throw new Error('No session returned from sign in')

    } catch (error: any) {
      console.error('❌ Sign in exception:', error)
      this.setState({ isLoading: false, error: error.message })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Signing out...')

      // Clear session storage immediately
      SessionStorage.clearSession()
      
      // Update state
      this.setState({
        isAuthenticated: false,
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
          status: 'current'
        }
      })

      console.log('✅ Agreement accepted successfully')
      return true

    } catch (error: any) {
      console.error('❌ Agreement acceptance failed:', error)
      return false
    }
  }
}

export const authFlow = AuthFlowManager.getInstance()
export default authFlow