"use client"

import React from 'react'
import { DashboardPermissions, UserRole } from '@/lib/dashboard-permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Target, 
  Users, 
  DollarSign, 
  CalendarCheck,
  TrendingUp,
  Award,
  AlertCircle,
  Crown,
  Shield,
  UserCheck,
  MessageSquare,
  Settings,
  Plus,
  ArrowRight
} from 'lucide-react'

interface DashboardWidget {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  value?: string | number
  change?: string
  trend?: 'up' | 'down' | 'stable'
  action?: {
    label: string
    href: string
  }
  allowedRoles: UserRole[]
  priority: number // Lower number = higher priority
}

interface RoleDashboardProps {
  userRole: UserRole
  profile: any
  stats?: any
}

const DASHBOARD_WIDGETS: DashboardWidget[] = [
  // Admin Widgets
  {
    id: 'total-users',
    title: 'Total Users',
    description: 'All registered users',
    icon: Users,
    allowedRoles: ['admin'],
    priority: 1,
    action: {
      label: 'Manage Users',
      href: '/dashboard/user-management'
    }
  },
  {
    id: 'system-health',
    title: 'System Health',
    description: 'Platform status',
    icon: Settings,
    allowedRoles: ['admin'],
    priority: 2,
    action: {
      label: 'View Settings',
      href: '/dashboard/admin/settings'
    }
  },
  {
    id: 'financial-overview',
    title: 'Financial Overview',
    description: 'Total revenue and expenses',
    icon: DollarSign,
    allowedRoles: ['admin', 'manager'],
    priority: 3,
    action: {
      label: 'View Finance',
      href: '/dashboard/finance'
    }
  },

  // Manager Widgets
  {
    id: 'team-performance',
    title: 'Team Performance',
    description: 'Overall team statistics',
    icon: TrendingUp,
    allowedRoles: ['admin', 'manager', 'coach'],
    priority: 1,
    action: {
      label: 'View Analytics',
      href: '/dashboard/analytics'
    }
  },
  {
    id: 'active-teams',
    title: 'Active Teams',
    description: 'Teams currently active',
    icon: Users,
    allowedRoles: ['admin', 'manager', 'coach'],
    priority: 2,
    action: {
      label: 'Manage Teams',
      href: '/dashboard/team-management/teams'
    }
  },
  {
    id: 'attendance-rate',
    title: 'Attendance Rate',
    description: 'Weekly attendance average',
    icon: CalendarCheck,
    allowedRoles: ['admin', 'manager', 'coach'],
    priority: 3,
    action: {
      label: 'View Attendance',
      href: '/dashboard/attendance'
    }
  },

  // Coach Widgets
  {
    id: 'player-progress',
    title: 'Player Progress',
    description: 'Individual player development',
    icon: Target,
    allowedRoles: ['admin', 'manager', 'coach'],
    priority: 1,
    action: {
      label: 'Track Performance',
      href: '/dashboard/performance'
    }
  },
  {
    id: 'upcoming-sessions',
    title: 'Upcoming Sessions',
    description: 'Scheduled training sessions',
    icon: CalendarCheck,
    allowedRoles: ['admin', 'manager', 'coach', 'player'],
    priority: 2,
    action: {
      label: 'View Schedule',
      href: '/dashboard/attendance'
    }
  },

  // Player Widgets
  {
    id: 'personal-stats',
    title: 'Personal Stats',
    description: 'Your performance metrics',
    icon: BarChart3,
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    priority: 1,
    action: {
      label: 'View Details',
      href: '/dashboard/analytics'
    }
  },
  {
    id: 'recent-matches',
    title: 'Recent Matches',
    description: 'Latest game results',
    icon: Award,
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    priority: 2,
    action: {
      label: 'View Performance',
      href: '/dashboard/performance'
    }
  },

  // Analyst Widgets
  {
    id: 'data-insights',
    title: 'Data Insights',
    description: 'Key performance indicators',
    icon: BarChart3,
    allowedRoles: ['admin', 'manager', 'analyst'],
    priority: 1,
    action: {
      label: 'View Analytics',
      href: '/dashboard/analytics'
    }
  },
  {
    id: 'reporting-tools',
    title: 'Reporting Tools',
    description: 'Generate custom reports',
    icon: TrendingUp,
    allowedRoles: ['admin', 'manager', 'analyst'],
    priority: 2,
    action: {
      label: 'Create Report',
      href: '/dashboard/analytics'
    }
  }
]

const QUICK_ACTIONS: Record<UserRole, Array<{
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}>> = {
  admin: [
    {
      label: 'Add New User',
      href: '/dashboard/user-management',
      icon: UserCheck,
      description: 'Register a new team member'
    },
    {
      label: 'System Settings',
      href: '/dashboard/admin/settings',
      icon: Settings,
      description: 'Configure platform settings'
    },
    {
      label: 'View Reports',
      href: '/dashboard/analytics',
      icon: BarChart3,
      description: 'Access detailed analytics'
    },
    {
      label: 'Discord Setup',
      href: '/dashboard/discord-portal',
      icon: MessageSquare,
      description: 'Manage Discord integration'
    }
  ],
  manager: [
    {
      label: 'Team Overview',
      href: '/dashboard/team-management/teams',
      icon: Users,
      description: 'Manage team rosters'
    },
    {
      label: 'Financial Reports',
      href: '/dashboard/finance',
      icon: DollarSign,
      description: 'View financial data'
    },
    {
      label: 'Performance Analytics',
      href: '/dashboard/analytics',
      icon: TrendingUp,
      description: 'Analyze team performance'
    },
    {
      label: 'Schedule Management',
      href: '/dashboard/attendance',
      icon: CalendarCheck,
      description: 'Manage training schedules'
    }
  ],
  coach: [
    {
      label: 'Track Performance',
      href: '/dashboard/performance',
      icon: Target,
      description: 'Record player stats'
    },
    {
      label: 'Attendance',
      href: '/dashboard/attendance',
      icon: CalendarCheck,
      description: 'Mark attendance'
    },
    {
      label: 'Team Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      description: 'View team insights'
    },
    {
      label: 'Player Development',
      href: '/dashboard/team-management/teams',
      icon: Users,
      description: 'Monitor player growth'
    }
  ],
  analyst: [
    {
      label: 'Data Analysis',
      href: '/dashboard/analytics',
      icon: BarChart3,
      description: 'Analyze performance data'
    },
    {
      label: 'Performance Tracking',
      href: '/dashboard/performance',
      icon: Target,
      description: 'Track detailed metrics'
    },
    {
      label: 'Generate Reports',
      href: '/dashboard/analytics',
      icon: TrendingUp,
      description: 'Create custom reports'
    }
  ],
  player: [
    {
      label: 'My Performance',
      href: '/dashboard/performance',
      icon: Target,
      description: 'View your stats'
    },
    {
      label: 'My Profile',
      href: '/dashboard/profile',
      icon: Users,
      description: 'Update your profile'
    },
    {
      label: 'Team Schedule',
      href: '/dashboard/attendance',
      icon: CalendarCheck,
      description: 'View training schedule'
    }
  ],
  pending_player: [
    {
      label: 'Complete Profile',
      href: '/dashboard/profile',
      icon: Users,
      description: 'Finish profile setup'
    }
  ],
  awaiting_approval: [
    {
      label: 'Complete Profile',
      href: '/dashboard/profile',
      icon: Users,
      description: 'Finish profile setup'
    }
  ]
}

export function RoleBasedDashboard({ userRole, profile, stats }: RoleDashboardProps) {
  // Get widgets allowed for this role
  const allowedWidgets = DASHBOARD_WIDGETS
    .filter(widget => widget.allowedRoles.includes(userRole))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6) // Limit to 6 widgets

  // Get quick actions for this role
  const quickActions = QUICK_ACTIONS[userRole] || []

  // Get role information
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)

  return (
    <div className="space-y-8">
      {/* Role Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {profile?.display_name || profile?.full_name || 'User'}!
            </h1>
            <Badge 
              variant="outline" 
              className={`border-${roleInfo.color}-400 text-${roleInfo.color}-400 bg-${roleInfo.color}-900/20`}
            >
              {roleInfo.label}
            </Badge>
          </div>
          <p className="text-white/70">
            {getRoleWelcomeMessage(userRole)}
          </p>
        </div>
        
        {/* Role Icon */}
        <div className={`p-4 rounded-full bg-${roleInfo.color}-900/20 border border-${roleInfo.color}-400/20`}>
          {getRoleIcon(userRole)}
        </div>
      </div>

      {/* Stats Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allowedWidgets.map((widget) => (
          <DashboardWidgetCard
            key={widget.id}
            widget={widget}
            stats={stats}
          />
        ))}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="bg-black/40 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all duration-200 cursor-pointer group"
                onClick={() => window.location.href = action.href}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white group-hover:text-white/90">
                        {action.label}
                      </h3>
                      <p className="text-xs text-white/60 mt-1">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white/60 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Role-Specific Alerts */}
      <RoleSpecificAlerts userRole={userRole} profile={profile} />
    </div>
  )
}

function DashboardWidgetCard({ widget, stats }: { widget: DashboardWidget; stats?: any }) {
  const value = getWidgetValue(widget.id, stats)
  const change = getWidgetChange(widget.id, stats)
  
  return (
    <Card className="bg-black/40 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all duration-200 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/90">
          {widget.title}
        </CardTitle>
        <widget.icon className="h-4 w-4 text-white/60" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-white">
            {value || '—'}
          </div>
          <p className="text-xs text-white/60">
            {widget.description}
          </p>
          {change && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">{change}</span>
            </div>
          )}
          {widget.action && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => window.location.href = widget.action!.href}
            >
              {widget.action.label}
              <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RoleSpecificAlerts({ userRole, profile }: { userRole: UserRole; profile: any }) {
  const alerts = getRoleAlerts(userRole, profile)
  
  if (alerts.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Important Notices</h2>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <Card 
            key={index}
            className={`bg-${alert.type}-900/20 backdrop-blur-lg border border-${alert.type}-400/40 shadow-xl`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 text-${alert.type}-400 mt-0.5`} />
                <div className="flex-1">
                  <h3 className={`font-medium text-${alert.type}-200`}>
                    {alert.title}
                  </h3>
                  <p className={`text-sm text-${alert.type}-300 mt-1`}>
                    {alert.message}
                  </p>
                  {alert.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`mt-2 text-${alert.type}-200 hover:text-${alert.type}-100 hover:bg-${alert.type}-800/30`}
                      onClick={() => window.location.href = alert.action!.href}
                    >
                      {alert.action.label}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Helper Functions
function getRoleIcon(role: UserRole) {
  switch (role) {
    case 'admin':
      return <Shield className="h-8 w-8 text-red-400" />
    case 'manager':
      return <Crown className="h-8 w-8 text-purple-400" />
    case 'coach':
      return <Users className="h-8 w-8 text-blue-400" />
    case 'analyst':
      return <BarChart3 className="h-8 w-8 text-indigo-400" />
    case 'player':
      return <Target className="h-8 w-8 text-green-400" />
    default:
      return <UserCheck className="h-8 w-8 text-gray-400" />
  }
}

function getRoleWelcomeMessage(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Manage the entire esports platform and oversee all operations.'
    case 'manager':
      return 'Coordinate teams, manage finances, and drive organizational success.'
    case 'coach':
      return 'Train players, track performance, and build winning strategies.'
    case 'analyst':
      return 'Analyze performance data and provide strategic insights.'
    case 'player':
      return 'Track your progress, view stats, and stay connected with your team.'
    default:
      return 'Complete your profile setup to access all features.'
  }
}

function getWidgetValue(widgetId: string, stats?: any): string | number {
  if (!stats) return '—'
  
  switch (widgetId) {
    case 'total-users':
      return stats.totalUsers || 0
    case 'team-performance':
      return stats.avgPerformance ? `${stats.avgPerformance}%` : '—'
    case 'active-teams':
      return stats.activeTeams || 0
    case 'attendance-rate':
      return stats.attendanceRate ? `${stats.attendanceRate}%` : '—'
    case 'personal-stats':
      return stats.personalScore || '—'
    case 'recent-matches':
      return stats.recentMatches || 0
    case 'financial-overview':
      return stats.totalRevenue ? `₹${stats.totalRevenue}` : '—'
    default:
      return '—'
  }
}

function getWidgetChange(widgetId: string, stats?: any): string | null {
  if (!stats) return null
  
  switch (widgetId) {
    case 'team-performance':
      return stats.performanceChange ? `+${stats.performanceChange}%` : null
    case 'attendance-rate':
      return stats.attendanceChange ? `+${stats.attendanceChange}%` : null
    default:
      return null
  }
}

function getRoleAlerts(role: UserRole, profile: any): Array<{
  type: 'yellow' | 'red' | 'blue'
  title: string
  message: string
  action?: { label: string; href: string }
}> {
  const alerts = []

  // Common alerts for incomplete profiles
  if (!profile?.full_name || !profile?.device_model) {
    alerts.push({
      type: 'yellow' as const,
      title: 'Profile Incomplete',
      message: 'Complete your profile to access all features and improve team coordination.',
      action: { label: 'Complete Profile', href: '/dashboard/profile' }
    })
  }

  // Role-specific alerts
  switch (role) {
    case 'admin':
      alerts.push({
        type: 'blue' as const,
        title: 'System Update Available',
        message: 'New features and security updates are available for the platform.',
        action: { label: 'View Updates', href: '/dashboard/admin/settings' }
      })
      break
    
    case 'player':
      if (profile?.bgmi_tier === 'bronze' || !profile?.bgmi_tier) {
        alerts.push({
          type: 'yellow' as const,
          title: 'Rank Up Opportunity',
          message: 'Your current BGMI tier suggests room for improvement. Check out training resources.',
          action: { label: 'View Performance', href: '/dashboard/performance' }
        })
      }
      break
  }

  return alerts
}