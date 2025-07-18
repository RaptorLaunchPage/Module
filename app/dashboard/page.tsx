"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { DashboardData, type DashboardDataOptions } from '@/lib/dashboard-data'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  RefreshCw,
  Gamepad2,
  Zap,
  Shield,
  Crosshair,
  Medal,
  Star,
  Crown,
  Flame
} from 'lucide-react'
import Link from 'next/link'
import { PerformanceDashboard } from '@/components/performance/performance-dashboard'

interface DashboardStats {
  totalMatches: number
  totalKills: number
  avgDamage: number
  avgSurvival: number
  kdRatio: number
  totalExpense: number
  totalProfitLoss: number
  activeTeams: number
  activePlayers: number
  todayMatches: number
  weekMatches: number
  avgPlacement: number
}

interface TopPerformer {
  id: string
  name: string
  value: number
  metric: string
  team?: string
}

interface TeamPerformance {
  id: string
  name: string
  matches: number
  kills: number
  avgDamage: number
  kdRatio: number
  winRate: number
}

export default function NewDashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topPerformers, setTopPerformers] = useState<{
    topTeam: TeamPerformance | null
    topPlayer: TopPerformer | null
    highestKills: TopPerformer | null
    highestDamage: TopPerformer | null
  }>({
    topTeam: null,
    topPlayer: null,
    highestKills: null,
    highestDamage: null
  })
  const [recentPerformances, setRecentPerformances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30')

  const userRole = profile?.role as UserRole
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)
  const canAccessFinance = DashboardPermissions.getDataPermissions(userRole, 'finance').canView
  const canAccessUsers = DashboardPermissions.getDataPermissions(userRole, 'users').canView
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)

  useEffect(() => {
    if (profile) {
      loadDashboardData()
    }
  }, [profile, selectedTimeframe])

  const loadDashboardData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    
    try {
      const options: DashboardDataOptions = {
        role: userRole,
        userId: profile.id,
        teamId: profile.team_id,
        timeframe: selectedTimeframe,
        includeFinance: canAccessFinance,
        includeUsers: canAccessUsers
      }

      const dashboardData = new DashboardData(options)
      
      const [
        dashboardStats,
        topPerformersData,
        recentPerformancesData
      ] = await Promise.all([
        dashboardData.getOverviewStats(),
        dashboardData.getTopPerformers(),
        dashboardData.getRecentPerformances(10)
      ])

      setStats(dashboardStats)
      setTopPerformers(topPerformersData)
      setRecentPerformances(recentPerformancesData)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile.name || profile.email}! Here's your {roleInfo.label.toLowerCase()} overview.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <Activity className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          {canAccessFinance && (
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Finance</span>
            </TabsTrigger>
          )}
          {canAccessUsers && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Key Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Matches</p>
                        <p className="text-2xl font-bold">{stats?.totalMatches || 0}</p>
                      </div>
                      <Gamepad2 className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm font-medium">Total Kills</p>
                        <p className="text-2xl font-bold">{stats?.totalKills || 0}</p>
                      </div>
                      <Crosshair className="h-8 w-8 text-red-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Avg Damage</p>
                        <p className="text-2xl font-bold">{stats?.avgDamage?.toFixed(0) || 0}</p>
                      </div>
                      <Zap className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">K/D Ratio</p>
                        <p className="text-2xl font-bold">{stats?.kdRatio?.toFixed(2) || '0.00'}</p>
                      </div>
                      <Target className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Avg Survival</p>
                        <p className="text-2xl font-bold">{stats?.avgSurvival?.toFixed(1) || '0.0'}min</p>
                      </div>
                      <Shield className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {canAccessFinance && (
                  <>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Total Expense</p>
                            <p className="text-2xl font-bold">₹{stats?.totalExpense || 0}</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Total P/L</p>
                            <p className={`text-2xl font-bold ${(stats?.totalProfitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{stats?.totalProfitLoss || 0}
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {shouldSeeAllData && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Active Teams</p>
                          <p className="text-2xl font-bold">{stats?.activeTeams || 0}</p>
                        </div>
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Performers Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Top Performing Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topPerformers.topTeam ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{topPerformers.topTeam.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {topPerformers.topTeam.matches} matches • {topPerformers.topTeam.winRate.toFixed(1)}% win rate
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            #{1}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Kills</p>
                            <p className="font-semibold">{topPerformers.topTeam.kills}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Damage</p>
                            <p className="font-semibold">{topPerformers.topTeam.avgDamage.toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">K/D</p>
                            <p className="font-semibold">{topPerformers.topTeam.kdRatio.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No team data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-blue-500" />
                      Top Performing Player
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topPerformers.topPlayer ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{topPerformers.topPlayer.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {topPerformers.topPlayer.team && `Team: ${topPerformers.topPlayer.team}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {topPerformers.topPlayer.metric}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{topPerformers.topPlayer.value}</p>
                          <p className="text-sm text-muted-foreground">Performance Score</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No player data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Records Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-red-500" />
                      Highest Kills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topPerformers.highestKills ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{topPerformers.highestKills.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {topPerformers.highestKills.team && `Team: ${topPerformers.highestKills.team}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">{topPerformers.highestKills.value}</p>
                          <p className="text-sm text-muted-foreground">kills</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No kills data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Highest Damage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topPerformers.highestDamage ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{topPerformers.highestDamage.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {topPerformers.highestDamage.team && `Team: ${topPerformers.highestDamage.team}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">{topPerformers.highestDamage.value}</p>
                          <p className="text-sm text-muted-foreground">damage</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No damage data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Performance History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Performance History
                  </CardTitle>
                  <CardDescription>Recent match performances</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentPerformances.length > 0 ? (
                    <PerformanceDashboard 
                      performances={recentPerformances} 
                      users={[]} 
                      currentUser={profile}
                      showFilters={false}
                      compact={true}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No recent performance data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Performance Module</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed performance tracking and analysis
                </p>
                <Link href="/dashboard/performance">
                  <Button>
                    Go to Performance
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canAccessFinance && (
          <TabsContent value="finance">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Finance Module</h3>
                  <p className="text-muted-foreground mb-4">
                    Manage expenses, prize pools, and financial reports
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link href="/dashboard/team-management/expenses">
                      <Button variant="outline">
                        Expenses
                      </Button>
                    </Link>
                    <Link href="/dashboard/team-management/prize-pool">
                      <Button variant="outline">
                        Prize Pool
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="analytics">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Analytics & Reports</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced analytics and detailed reporting
                </p>
                <Link href="/dashboard/analytics">
                  <Button>
                    Go to Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Reports</h3>
                <p className="text-muted-foreground mb-4">
                  Generate and download detailed reports
                </p>
                <Link href="/dashboard/performance-report">
                  <Button>
                    Performance Reports
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}