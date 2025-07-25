import { supabase } from '@/lib/supabase'
import { SecureProfileCreation } from '@/lib/secure-profile-creation'
import { isAgreementRole, getRequiredAgreementVersion } from '@/lib/agreement-versions'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthProfile {
  id: string
  name: string
  email: string
  role: string
  onboarding_completed?: boolean
  [key: string]: any
}

export interface AgreementStatus {
  requiresAgreement: boolean
  status?: 'missing' | 'outdated' | 'current' | 'bypassed'
  current_version?: number
  required_version?: number
}

export interface AuthState {
  isInitialized: boolean
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  profile: AuthProfile | null
  agreementStatus: AgreementStatus
  error: string | null
}

export interface AuthResult {
  success: boolean
  error?: string
  redirectPath?: string
}

class AuthFlowV3 {
  private static instance: AuthFlowV3
  private state: AuthState = {
    isInitialized: false,
    isLoading: false,
    isAuthenticated: false,
    user: null,
    profile: null,
    agreementStatus: { requiresAgreement: false },
    error: null
  }
  
  private listeners: Set<(state: AuthState) => void> = new Set()
  private profileCache = new Map<string, AuthProfile>()
  private sessionCache: { session: Session; profile: AuthProfile; timestamp: number } | null = null
  private initPromise: Promise<AuthResult> | null = null

  static getInstance(): AuthFlowV3 {
    if (!AuthFlowV3.instance) {
      AuthFlowV3.instance = new AuthFlowV3()
    }
    return AuthFlowV3.instance
  }

  private constructor() {
    // Set up Supabase auth listener
    this.setupAuthListener()
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 Auth event: ${event}`)
      
      try {
        if (event === 'SIGNED_OUT') {
          this.handleSignOut()
        } else if (event === 'SIGNED_IN' && session) {
          await this.handleSignIn(session)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          await this.handleTokenRefresh(session)
        }
      } catch (error: any) {
        console.error('❌ Auth event error:', error)
        this.setState({ error: error.message })
      }
    })
  }

  // Subscribe to state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  // Get current state
  getState(): AuthState {
    return { ...this.state }
  }

  // Update state and notify listeners
  private setState(updates: Partial<AuthState>) {
    const prevState = { ...this.state }
    this.state = { ...this.state, ...updates }
    
    // Debug logging for important state changes
    if (updates.isAuthenticated !== undefined || updates.isLoading !== undefined) {
      console.log('🔄 Auth state:', {
        isAuthenticated: this.state.isAuthenticated,
        isLoading: this.state.isLoading,
        hasProfile: !!this.state.profile,
        error: this.state.error
      })
    }
    
    this.listeners.forEach(listener => listener(this.state))
  }

  // Initialize authentication
  async initialize(): Promise<AuthResult> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise
    }

    // If already initialized, return current state
    if (this.state.isInitialized) {
      return { success: true }
    }

    console.log('🚀 Initializing auth...')
    this.initPromise = this.performInitialization()
    
    try {
      const result = await this.initPromise
      return result
    } finally {
      this.initPromise = null
    }
  }

  private async performInitialization(): Promise<AuthResult> {
    try {
      this.setState({ isLoading: true, error: null })

      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn('⚠️ Session check error:', error.message)
      }

      if (session?.user) {
        console.log('✅ Found existing session')
        await this.processSession(session)
      } else {
        console.log('📝 No active session')
        this.setState({
          isInitialized: true,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          profile: null,
          agreementStatus: { requiresAgreement: false }
        })
      }

      return { success: true }
    } catch (error: any) {
      console.error('❌ Auth initialization failed:', error)
      this.setState({
        isInitialized: true,
        isLoading: false,
        isAuthenticated: false,
        error: error.message
      })
      return { success: false, error: error.message }
    }
  }

  // Process a Supabase session
  private async processSession(session: Session): Promise<void> {
    const user = session.user
    
    // Check cache first
    if (this.sessionCache && 
        this.sessionCache.session.user.id === user.id &&
        Date.now() - this.sessionCache.timestamp < 5 * 60 * 1000) { // 5 minute cache
      console.log('✅ Using cached session data')
      await this.setAuthenticatedState(this.sessionCache.session, this.sessionCache.profile)
      return
    }

    // Load fresh profile
    const profile = await this.loadProfile(user)
    if (!profile) {
      throw new Error('Failed to load user profile')
    }

    // Update cache
    this.sessionCache = {
      session,
      profile,
      timestamp: Date.now()
    }
    this.profileCache.set(user.id, profile)

    await this.setAuthenticatedState(session, profile)
  }

  // Load user profile
  private async loadProfile(user: User): Promise<AuthProfile | null> {
    try {
      console.log(`🔍 Loading profile for ${user.email}`)

      // Check cache first
      const cached = this.profileCache.get(user.id)
      if (cached) {
        console.log('✅ Using cached profile')
        return cached
      }

      // Load from database
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (profile) {
        console.log('✅ Profile loaded from database')
        return profile as AuthProfile
      }

      // Create new profile if none exists
      console.log('🔧 Creating new profile')
      const result = await SecureProfileCreation.createProfile(
        user.id,
        user.email || '',
        user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        user.app_metadata?.provider || 'email'
      )

      if (result.success && result.profile) {
        return result.profile as AuthProfile
      }

      throw new Error(result.error || 'Failed to create profile')
    } catch (error: any) {
      console.error('❌ Profile loading failed:', error)
      return null
    }
  }

  // Set authenticated state
  private async setAuthenticatedState(session: Session, profile: AuthProfile): Promise<void> {
    const user: AuthUser = {
      id: session.user.id,
      email: session.user.email || '',
      name: profile.name || profile.email?.split('@')[0] || 'User',
      role: profile.role
    }

    // Check agreement status
    const agreementStatus = await this.checkAgreementStatus(profile)

    this.setState({
      isInitialized: true,
      isLoading: false,
      isAuthenticated: true,
      user,
      profile,
      agreementStatus,
      error: null
    })

    console.log('✅ User authenticated successfully')
  }

  // Check agreement status
  private async checkAgreementStatus(profile: AuthProfile): Promise<AgreementStatus> {
    try {
      if (!isAgreementRole(profile.role)) {
        return { requiresAgreement: false, status: 'bypassed' }
      }

      const requiredVersion = getRequiredAgreementVersion(profile.role)
      
      const { data: agreement } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', profile.id)
        .eq('role', profile.role)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!agreement) {
        return {
          requiresAgreement: true,
          status: 'missing',
          required_version: requiredVersion
        }
      }

      if (agreement.agreement_version < requiredVersion) {
        return {
          requiresAgreement: true,
          status: 'outdated',
          current_version: agreement.agreement_version,
          required_version: requiredVersion
        }
      }

      if (agreement.status === 'accepted') {
        return {
          requiresAgreement: false,
          status: 'current',
          current_version: agreement.agreement_version,
          required_version: requiredVersion
        }
      }

      return {
        requiresAgreement: true,
        status: agreement.status as any,
        current_version: agreement.agreement_version,
        required_version: requiredVersion
      }
    } catch (error: any) {
      console.error('❌ Agreement check failed:', error)
      return { requiresAgreement: false, status: 'bypassed' }
    }
  }

  // Handle sign in
  private async handleSignIn(session: Session): Promise<void> {
    console.log('🔐 Processing sign in')
    await this.processSession(session)
  }

  // Handle token refresh
  private async handleTokenRefresh(session: Session): Promise<void> {
    console.log('🔄 Token refreshed')
    // Update cache timestamp but don't reload profile
    if (this.sessionCache && this.sessionCache.session.user.id === session.user.id) {
      this.sessionCache.session = session
      this.sessionCache.timestamp = Date.now()
    }
  }

  // Handle sign out
  private handleSignOut(): void {
    console.log('🚪 Processing sign out')
    this.clearCache()
    this.setState({
      isInitialized: true,
      isLoading: false,
      isAuthenticated: false,
      user: null,
      profile: null,
      agreementStatus: { requiresAgreement: false },
      error: null
    })
  }

  // Clear all caches
  private clearCache(): void {
    this.sessionCache = null
    this.profileCache.clear()
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('raptor-session-data')
      localStorage.removeItem('raptor-access-token')
      localStorage.removeItem('raptor-last-active')
    }
  }

  // Public methods for auth actions
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 Signing in:', email)
      this.setState({ isLoading: true, error: null })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        this.setState({ isLoading: false, error: error.message })
        return { success: false, error: error.message }
      }

      // The auth listener will handle the rest
      return { success: true }
    } catch (error: any) {
      const message = error.message || 'Sign in failed'
      this.setState({ isLoading: false, error: message })
      return { success: false, error: message }
    }
  }

  async signOut(): Promise<AuthResult> {
    try {
      console.log('🚪 Signing out')
      await supabase.auth.signOut()
      return { success: true }
    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      // Force local sign out even if Supabase fails
      this.handleSignOut()
      return { success: true }
    }
  }

  async acceptAgreement(): Promise<boolean> {
    try {
      const { profile } = this.state
      if (!profile) return false

      const session = await supabase.auth.getSession()
      if (!session.data.session) return false

      const requiredVersion = getRequiredAgreementVersion(profile.role)

      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: profile.role,
          version: requiredVersion,
          status: 'accepted'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to accept agreement')
      }

      // Update state
      this.setState({
        agreementStatus: {
          requiresAgreement: false,
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

  async refreshProfile(): Promise<void> {
    if (!this.state.user) return

    const session = await supabase.auth.getSession()
    if (session.data.session) {
      // Clear cache and reload
      this.profileCache.delete(this.state.user.id)
      this.sessionCache = null
      await this.processSession(session.data.session)
    }
  }

  updateProfile(updatedProfile: AuthProfile): void {
    this.setState({ profile: updatedProfile })
    this.profileCache.set(updatedProfile.id, updatedProfile)
    
    // Update cache
    if (this.sessionCache) {
      this.sessionCache.profile = updatedProfile
    }
  }

  // Get redirect path based on current state
  getRedirectPath(): string | null {
    const { isAuthenticated, profile, agreementStatus } = this.state

    if (!isAuthenticated || !profile) {
      return null
    }

    // Agreement required
    if (agreementStatus.requiresAgreement) {
      return '/agreement-review'
    }

    // Onboarding required
    if (profile.role === 'pending_player' && !profile.onboarding_completed) {
      return '/onboarding'
    }

    // Check for intended route
    if (typeof window !== 'undefined') {
      const intended = localStorage.getItem('raptor-intended-route')
      if (intended && intended !== '/auth/login' && intended !== '/auth/signup') {
        localStorage.removeItem('raptor-intended-route')
        return intended
      }
    }

    return '/dashboard'
  }
}

// Export singleton instance
const authFlowV3 = AuthFlowV3.getInstance()
export default authFlowV3