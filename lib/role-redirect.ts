import type { UserRole } from './dashboard-permissions'

/**
 * Role-based redirect utility
 * Determines the appropriate dashboard page based on user role and onboarding status
 */

export interface UserProfile {
  role: UserRole
  onboarding_completed?: boolean
  team_id?: string | null
  [key: string]: any
}

/**
 * Get the default dashboard path for a user based on their role and profile
 */
export function getRoleBasedDashboardPath(profile: UserProfile): string {
  // Handle onboarding requirement first
  if (profile.role === 'pending_player' && !profile.onboarding_completed) {
    return '/onboarding'
  }

  // Role-based dashboard routing
  switch (profile.role) {
    case 'admin':
      return '/dashboard/user-management' // Admin starts with user management
    
    case 'manager':
      return '/dashboard/team-management' // Managers focus on team operations
    
    case 'coach':
      return '/dashboard/analytics' // Coaches focus on performance analytics
    
    case 'analyst':
      return '/dashboard/analytics' // Analysts also focus on analytics
    
    case 'player':
      return '/dashboard/performance' // Players see their own performance first
    
    case 'pending_player':
      return '/dashboard' // Pending players get basic dashboard (shouldn't reach here due to onboarding check)
    
    default:
      return '/dashboard' // Fallback to general dashboard
  }
}

/**
 * Check if a user should be automatically redirected after login
 */
export function shouldAutoRedirectAfterLogin(
  currentPath: string,
  isFromAuthPage: boolean
): boolean {
  // Don't redirect if already on a dashboard page
  if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/onboarding')) {
    return false
  }

  // Redirect if coming from auth pages or on homepage after login
  return isFromAuthPage || currentPath === '/'
}

/**
 * Get redirect priority based on profile requirements
 */
export function getRedirectPriority(profile: UserProfile): {
  path: string
  priority: 'critical' | 'high' | 'normal'
  reason: string
} {
  // Critical: Onboarding required
  if (profile.role === 'pending_player' && !profile.onboarding_completed) {
    return {
      path: '/onboarding',
      priority: 'critical',
      reason: 'Onboarding required'
    }
  }

  // High: Agreement might be required (handled by auth flow)
  // Normal: Role-based dashboard
  const dashboardPath = getRoleBasedDashboardPath(profile)
  
  return {
    path: dashboardPath,
    priority: 'normal',
    reason: `Role-based dashboard for ${profile.role}`
  }
}