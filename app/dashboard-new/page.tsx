"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { DashboardData, type DashboardDataOptions } from '@/lib/dashboard-data'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { NewDashboardLayout } from '@/components/dashboard/new-dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Target, 
  Trophy, 
  TrendingUp, 
  Activity, 
  Calendar,
  DollarSign,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalUsers: number
  totalTeams: number
  totalPerformances: number
  totalMatches: number
  personalPerformances?: number
  recentActivity: any[]
}

export default function NewDashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPerformances, setRecentPerformances] = useState<any[]>([])
  const [recentTeams, setRecentTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userRole = profile?.role as UserRole
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)
  const canAccessFinance = DashboardPermissions.getDataPermissions(userRole, 'finance').canView
  const canAccessUsers = DashboardPermissions.getDataPermissions(userRole, 'users').canView
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)

  useEffect(() => {
    if (profile) {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      const options: DashboardDataOptions = {
        userRole: profile.role as UserRole,
        userId: profile.id,
        teamId: profile.team_id || undefined,
        limit: 10
      }

      // Load overview stats
      const statsResult = await DashboardData.getOverviewStats(options)
      if (statsResult.error) {
        throw new Error(statsResult.error)
      }
      setStats(statsResult.data)

      // Load recent performances
      const performancesResult = await DashboardData.getPerformances({ ...options, limit: 5 })
      if (performancesResult.error) {
        console.warn('Failed to load performances:', performancesResult.error)
      }
      setRecentPerformances(performancesResult.data)

      // Load recent teams if user can access them
      if (shouldSeeAllData || userRole === 'coach') {
        const teamsResult = await DashboardData.getTeams({ ...options, limit: 5 })
        if (teamsResult.error) {
          console.warn('Failed to load teams:', teamsResult.error)
        }
        setRecentTeams(teamsResult.data)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
      console.error('Dashboard data loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData()
  }

  const handleExport = async (dataType: 'performances' | 'teams' | 'users') => {
    if (!profile) return

    try {
      const options: DashboardDataOptions = {
        userRole: profile.role as UserRole,
        userId: profile.id,
        teamId: profile.team_id || undefined
      }

      const csvData = await DashboardData.exportData(dataType, options, 'csv')
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${dataType}-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Export error:', error)
      alert('Export failed: ' + error.message)
    }
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <NewDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile.name || profile.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your {roleInfo.label.toLowerCase()} dashboard
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className={`bg-${roleInfo.color}-100 text-${roleInfo.color}-800`}>
              {roleInfo.label}
            </Badge>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <Activity className="h-5 w-5" />
                <span className="font-medium">Error loading dashboard</span>
              </div>
              <p className="text-red-600 text-sm mt-2">{error}</p>
              <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Performance Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Performances</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPerformances}</div>
                <p className="text-xs text-muted-foreground">
                  {shouldSeeAllData ? 'Across all teams' : 'Your records'}
                </p>
              </CardContent>
            </Card>

            {/* Teams Stats */}
            {(shouldSeeAllData || userRole === 'coach') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Teams</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTeams}</div>
                  <p className="text-xs text-muted-foreground">
                    {shouldSeeAllData ? 'Active teams' : 'Your teams'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Users Stats */}
            {canAccessUsers && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Platform users
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Personal Performance (for players) */}
            {userRole === 'player' && stats.personalPerformances !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Performance</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.personalPerformances}</div>
                  <p className="text-xs text-muted-foreground">
                    Personal records
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Activity Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentPerformances.length}</div>
                <p className="text-xs text-muted-foreground">
                  Last 5 entries
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions & Recent Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for your role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/performance">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="mr-2 h-4 w-4" />
                  View Performance Data
                </Button>
              </Link>
              
              {DashboardPermissions.canAccessModule(userRole, 'teams') && (
                <Link href="/dashboard/teams">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Teams
                  </Button>
                </Link>
              )}
              
              {DashboardPermissions.canAccessModule(userRole, 'analytics') && (
                <Link href="/dashboard/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </Link>
              )}

              {DashboardPermissions.canAccessModule(userRole, 'users') && (
                <Link href="/dashboard/users">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
              )}

              {canAccessFinance && (
                <Link href="/dashboard/finance">
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Financial Reports
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Recent Performance Data */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Performance</CardTitle>
                <CardDescription>Latest performance entries</CardDescription>
              </div>
              {recentPerformances.length > 0 && (
                <Button
                  onClick={() => handleExport('performances')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentPerformances.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm">No performance data found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {shouldSeeAllData ? 'No data in the system yet' : 'No data for your access level'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPerformances.slice(0, 5).map((performance, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {performance.users?.name || 'Unknown Player'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {performance.map} • {performance.kills} kills • #{performance.placement}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {performance.teams?.name || 'Unknown Team'}
                      </Badge>
                    </div>
                  ))}
                  {recentPerformances.length > 5 && (
                    <Link href="/dashboard/performance">
                      <Button variant="ghost" size="sm" className="w-full">
                        View all performances
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export Section for Admin/Manager */}
        {shouldSeeAllData && (
          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Download reports and analytics data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button onClick={() => handleExport('performances')} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Performances
                </Button>
                <Button onClick={() => handleExport('teams')} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Teams
                </Button>
                {canAccessUsers && (
                  <Button onClick={() => handleExport('users')} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Users
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </NewDashboardLayout>
  )
}