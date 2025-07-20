// DISABLED SESSION MANAGER - Replaced by simplified auth hook
// This class is kept for compatibility but all methods are no-ops

export class SessionManager {
  private static readonly SESSION_KEY = 'raptor-session-info'
  private static readonly ACTIVITY_KEY = 'raptor-last-activity'
  private static readonly SESSION_DURATION = 4 * 60 * 60 * 1000 // 4 hours in milliseconds
  private static activityTimer: NodeJS.Timeout | null = null

  /**
   * DISABLED - Initialize session management
   */
  static init() {
    console.log('🚫 SessionManager.init() - DISABLED to prevent auth conflicts')
    // NO-OP - All functionality moved to auth hook
  }

  /**
   * DISABLED - Update last activity timestamp
   */
  static updateActivity() {
    console.log('🚫 SessionManager.updateActivity() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Check if session is still valid
   */
  static isSessionValid(): boolean {
    console.log('🚫 SessionManager.isSessionValid() - DISABLED')
    return true // Always return true to avoid interference
  }

  /**
   * DISABLED - Set up activity listeners
   */
  private static setupActivityListeners() {
    console.log('🚫 SessionManager.setupActivityListeners() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Throttled activity update
   */
  private static throttledUpdateActivity = () => {
    console.log('🚫 SessionManager.throttledUpdateActivity() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Start the activity checker
   */
  private static startActivityChecker() {
    console.log('🚫 SessionManager.startActivityChecker() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Check session validity
   */
  static async checkSession() {
    console.log('🚫 SessionManager.checkSession() - DISABLED')
    // NO-OP - All session management handled by auth hook
  }

  /**
   * DISABLED - Store session information
   */
  private static storeSessionInfo(session: any) {
    console.log('🚫 SessionManager.storeSessionInfo() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Get stored session info
   */
  static getStoredSessionInfo() {
    console.log('🚫 SessionManager.getStoredSessionInfo() - DISABLED')
    return null // Always return null
  }

  /**
   * DISABLED - Handle session expiration
   */
  private static handleSessionExpired() {
    console.log('🚫 SessionManager.handleSessionExpired() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Logout user
   */
  static async logout(reason?: string) {
    console.log('🚫 SessionManager.logout() - DISABLED - Use auth hook signOut instead')
    // NO-OP - Auth hook handles logout
  }

  /**
   * DISABLED - Recover session after page refresh
   */
  static async recoverSession(): Promise<boolean> {
    console.log('🚫 SessionManager.recoverSession() - DISABLED')
    return false // Always return false
  }

  /**
   * Clear all session data - ONLY method that works
   */
  static clearSession() {
    if (typeof window === 'undefined') return
    
    console.log('🧹 SessionManager.clearSession() - Clearing localStorage only')
    try {
      localStorage.removeItem(this.SESSION_KEY)
      localStorage.removeItem(this.ACTIVITY_KEY)
      sessionStorage.removeItem('raptor-tab-active')
    } catch (error) {
      console.warn('Failed to clear session data:', error)
    }
  }

  /**
   * DISABLED - Refresh session if needed
   */
  static async refreshSession() {
    console.log('🚫 SessionManager.refreshSession() - DISABLED')
    return false // Always return false
  }

  /**
   * DISABLED - Extend session activity
   */
  static extendSession() {
    console.log('🚫 SessionManager.extendSession() - DISABLED')
    // NO-OP
  }

  /**
   * DISABLED - Get current session status
   */
  static getSessionStatus() {
    console.log('🚫 SessionManager.getSessionStatus() - DISABLED')
    return {
      isValid: true,
      lastActivity: null,
      storedSession: null
    }
  }
}

// DISABLED - No auto-initialization
console.log('🚫 SessionManager auto-init DISABLED - Auth hook handles all session management')