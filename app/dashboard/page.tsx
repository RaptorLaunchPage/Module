"use client"

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { dataService } from '@/lib/optimized-data-service'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTabs, TabsContent, type TabItem } from '@/components/ui/enhanced-tabs'
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
  Flame,
  ChevronRight,
  Play,
  Clock,
  Plus,
  MessageSquare,
  Webhook
} from 'lucide-react'
import Link from 'next/link'
// Removed PerformanceDashboard import as we're using a simplified version

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
  // Enhanced admin stats
  totalTeams: number
  overallMatches: number
  roi: number
  overallAttendanceRate: number
  totalWinnings: number
  activeWebhooks: number
  totalDiscordMessages: number
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
  totalMatches: number
  avgKills: number
  avgDamage: number
  avgPlacement: number
  kdRatio: number
  winRate: number
}

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
}

export default function OptimizedDashboardPage() {
  const { profile, user } = useAuth()
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
  const [dataFetched, setDataFetched] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30')
  const [cacheStats, setCacheStats] = useState<any>(null)

  const userRole = profile?.role as UserRole
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)
  const canAccessFinance = DashboardPermissions.getDataPermissions(userRole, 'finance').canView
  const canAccessUsers = DashboardPermissions.getDataPermissions(userRole, 'users').canView
  const canAccessAnalytics = DashboardPermissions.canAccessModule(userRole, 'analytics')
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)

  // Memoized quick actions based on user role
  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = []
    
    if (userRole === 'player') {
      actions.push(
        { title: 'Submit Performance', description: 'Log your match results', href: '/dashboard/performance', icon: Target, color: 'bg-blue-500' },
        { title: 'My Team Performance', description: 'View team performance data', href: '/dashboard/performance', icon: BarChart3, color: 'bg-green-500' },
        { title: 'Team Roster', description: 'View team information', href: '/dashboard/team-management/roster', icon: Users, color: 'bg-purple-500' },
        { title: 'Attendance', description: 'Mark attendance', href: '/dashboard/attendance', icon: Calendar, color: 'bg-orange-500' }
      )
    } else if (userRole === 'coach') {
      actions.push(
        { title: 'Team Performance', description: 'Analyze team metrics', href: '/dashboard/analytics', icon: BarChart3, color: 'bg-green-500' },
        { title: 'Manage Roster', description: 'Update team roster', href: '/dashboard/team-management/roster', icon: Users, color: 'bg-purple-500' },
        { title: 'Book Slots', description: 'Schedule tournament slots', href: '/dashboard/team-management/slots', icon: Calendar, color: 'bg-orange-500' }
      )
    } else if (userRole === 'admin' || userRole === 'manager') {
      actions.push(
        { title: 'Team Management', description: 'Manage all teams', href: '/dashboard/team-management', icon: Users, color: 'bg-purple-500' },
        { title: 'User Management', description: 'Manage users and roles', href: '/dashboard/user-management', icon: Shield, color: 'bg-red-500' },
        { title: 'Finance Overview', description: 'Track expenses and winnings', href: '/dashboard/finance', icon: DollarSign, color: 'bg-green-500' },
        { title: 'Analytics', description: 'View comprehensive reports', href: '/dashboard/analytics', icon: BarChart3, color: 'bg-blue-500' }
      )
    }
    
    return actions
  }, [userRole])

  useEffect(() => {
    if (profile) {
      loadDashboardData()
      // Preload essential data in background
      dataService.preloadEssentialData(profile.id, profile.role)
    }
  }, [profile, selectedTimeframe])

  // Refresh cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(dataService.getCacheStats())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const normalizeStats = (baseStats: any): DashboardStats => {
    return {
      totalMatches: baseStats.totalMatches || 0,
      totalKills: baseStats.totalKills || 0,
      avgDamage: baseStats.avgDamage || 0,
      avgSurvival: baseStats.avgSurvival || 0,
      kdRatio: baseStats.kdRatio || 0,
      totalExpense: baseStats.totalExpense || 0,
      totalProfitLoss: baseStats.totalProfitLoss || 0,
      activeTeams: baseStats.activeTeams || 0,
      activePlayers: baseStats.activePlayers || 0,
      todayMatches: baseStats.todayMatches || 0,
      weekMatches: baseStats.weekMatches || 0,
      avgPlacement: baseStats.avgPlacement || 0,
      // Default values for admin-only stats
      totalTeams: 0,
      overallMatches: baseStats.totalMatches || 0,
      roi: 0,
      overallAttendanceRate: 0,
      totalWinnings: Math.max(0, baseStats.totalProfitLoss || 0),
      activeWebhooks: 0,
      totalDiscordMessages: 0
    }
  }

  const loadEnhancedAdminStats = async (baseStats: any): Promise<DashboardStats> => {
    try {
      const [teamsResponse, attendanceResponse, webhooksResponse, logsResponse] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/sessions/daily-practice'),
        fetch('/api/discord-portal/webhooks'),
        fetch('/api/discord-portal/logs')
      ])

      // Calculate total teams
      const teamsData = teamsResponse.ok ? await teamsResponse.json() : []
      const totalTeams = Array.isArray(teamsData) ? teamsData.length : 0
      const activeTeams = Array.isArray(teamsData) ? teamsData.filter(t => t.status === 'active').length : 0

      // Calculate attendance rate
      let overallAttendanceRate = 0
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        const sessions = attendanceData.sessions || []
        const totalSessions = sessions.length
        const attendedSessions = sessions.filter((s: any) => 
          s.attendances && s.attendances.some((a: any) => ['present', 'late'].includes(a.status))
        ).length
        overallAttendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0
      }

      // Calculate Discord stats
      let activeWebhooks = 0
      let totalDiscordMessages = 0
      
      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json()
        const webhooks = Array.isArray(webhooksData?.webhooks) ? webhooksData.webhooks : 
                        Array.isArray(webhooksData) ? webhooksData : []
        activeWebhooks = webhooks.filter((w: any) => w.active).length
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        const logs = Array.isArray(logsData?.logs) ? logsData.logs : 
                    Array.isArray(logsData) ? logsData : []
        totalDiscordMessages = logs.length
      }

      // Calculate ROI (assuming total winnings exist in base stats)
      const roi = baseStats.totalExpense > 0 ? 
        ((baseStats.totalProfitLoss - baseStats.totalExpense) / baseStats.totalExpense) * 100 : 0

      return {
        totalMatches: baseStats.totalMatches || 0,
        totalKills: baseStats.totalKills || 0,
        avgDamage: baseStats.avgDamage || 0,
        avgSurvival: baseStats.avgSurvival || 0,
        kdRatio: baseStats.kdRatio || 0,
        totalExpense: baseStats.totalExpense || 0,
        totalProfitLoss: baseStats.totalProfitLoss || 0,
        activeTeams: baseStats.activeTeams || 0,
        activePlayers: baseStats.activePlayers || 0,
        todayMatches: baseStats.todayMatches || 0,
        weekMatches: baseStats.weekMatches || 0,
        avgPlacement: baseStats.avgPlacement || 0,
        totalTeams,
        overallMatches: baseStats.totalMatches || 0,
        roi,
        overallAttendanceRate,
        totalWinnings: Math.max(0, baseStats.totalProfitLoss || 0),
        activeWebhooks,
        totalDiscordMessages
      }
    } catch (error) {
      console.warn('Failed to load enhanced admin stats:', error)
      return {
        ...baseStats,
        totalTeams: 0,
        overallMatches: baseStats.totalMatches,
        roi: 0,
        overallAttendanceRate: 0,
        totalWinnings: 0,
        activeWebhooks: 0,
        totalDiscordMessages: 0
      }
    }
  }

  const loadDashboardData = async () => {
    if (!profile) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Loading dashboard data...')
      const startTime = Date.now()
      
      // Use optimized data service with caching
      const dashboardStats = await dataService.getDashboardStats(profile.id, selectedTimeframe)
      
      // Enhance stats for admin/manager roles
      if (['admin', 'manager'].includes(userRole)) {
        const enhancedStats = await loadEnhancedAdminStats(dashboardStats)
        setStats(enhancedStats)
      } else {
        setStats(normalizeStats(dashboardStats))
      }
      
      // Load recent performances with caching
      const performances = await dataService.getPerformances({ 
        days: 7, 
        limit: 10,
        ...(userRole === 'player' && { playerId: profile.id }),
        ...(userRole === 'coach' && profile.team_id && { teamId: profile.team_id })
      })
      setRecentPerformances(performances)
      
      // Calculate top performers
      await calculateTopPerformers()
      
      const endTime = Date.now()
      console.log(`✅ Dashboard loaded in ${endTime - startTime}ms`)
      setDataFetched(true)
      
    } catch (error: any) {
      console.error('Dashboard loading error:', error)
      setError(error.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const calculateTopPerformers = async () => {
    try {
      const teams = await dataService.getTeams(userRole, profile?.id)
      const users = await dataService.getUsers()
      const performances = await dataService.getPerformances({ days: parseInt(selectedTimeframe) })
      
      if (performances.length === 0) return

      // Find top team performance
      const teamPerformances = new Map<string, { kills: number; damage: number; matches: number; placements: number[] }>()
      
      performances.forEach(perf => {
        if (!perf.team_id) return
        
        const existing = teamPerformances.get(perf.team_id) || { kills: 0, damage: 0, matches: 0, placements: [] }
        existing.kills += perf.kills || 0
        existing.damage += perf.damage || 0
        existing.matches += 1
        existing.placements.push(perf.placement || 0)
        teamPerformances.set(perf.team_id, existing)
      })

      const topTeamEntry = Array.from(teamPerformances.entries())
        .map(([teamId, stats]) => {
          const team = teams.find(t => t.id === teamId)
          const avgPlacement = stats.placements.reduce((a, b) => a + b, 0) / stats.placements.length
          const wins = stats.placements.filter(p => p === 1).length
          
          return {
            id: teamId,
            name: team?.name || 'Unknown Team',
            totalMatches: stats.matches,
            avgKills: stats.kills / stats.matches,
            avgDamage: stats.damage / stats.matches,
            avgPlacement,
            kdRatio: stats.kills / Math.max(stats.matches - wins, 1),
            winRate: (wins / stats.matches) * 100
          }
        })
        .sort((a, b) => b.winRate - a.winRate)[0]

      // Find top individual performers
      const playerStats = new Map<string, { kills: number; damage: number; matches: number }>()
      
      performances.forEach(perf => {
        const existing = playerStats.get(perf.player_id) || { kills: 0, damage: 0, matches: 0 }
        existing.kills += perf.kills || 0
        existing.damage += perf.damage || 0
        existing.matches += 1
        playerStats.set(perf.player_id, existing)
      })

      const playerEntries = Array.from(playerStats.entries())
        .map(([playerId, stats]) => {
          const user = users.find(u => u.id === playerId)
          return {
            id: playerId,
            name: user?.name || 'Unknown Player',
            avgKills: stats.kills / stats.matches,
            avgDamage: stats.damage / stats.matches,
            totalKills: stats.kills,
            totalDamage: stats.damage,
            team: user?.team_id
          }
        })

      const topKillsPlayer = playerEntries.sort((a, b) => b.avgKills - a.avgKills)[0]
      const topDamagePlayer = playerEntries.sort((a, b) => b.avgDamage - a.avgDamage)[0]
      const topOverallPlayer = playerEntries.sort((a, b) => (b.avgKills + b.avgDamage/100) - (a.avgKills + a.avgDamage/100))[0]

      setTopPerformers({
        topTeam: topTeamEntry || null,
        topPlayer: topOverallPlayer ? {
          id: topOverallPlayer.id,
          name: topOverallPlayer.name,
          value: topOverallPlayer.avgKills + topOverallPlayer.avgDamage/100,
          metric: 'Overall Score',
          team: topOverallPlayer.team || undefined
        } : null,
        highestKills: topKillsPlayer ? {
          id: topKillsPlayer.id,
          name: topKillsPlayer.name,
          value: topKillsPlayer.avgKills,
          metric: 'Avg Kills',
          team: topKillsPlayer.team || undefined
        } : null,
        highestDamage: topDamagePlayer ? {
          id: topDamagePlayer.id,
          name: topDamagePlayer.name,
          value: topDamagePlayer.avgDamage,
          metric: 'Avg Damage',
          team: topDamagePlayer.team || undefined
        } : null
      })

    } catch (error) {
      console.error('Error calculating top performers:', error)
    }
  }

  const handleRefresh = () => {
    dataService.clearCache()
    loadDashboardData()
  }

  const formatNumber = (num: number, decimals: number = 0): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(decimals)
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Profile</h3>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.name || 'User'}! 
              <Badge variant="outline" className="ml-2">{roleInfo.label}</Badge>
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.name || user?.email || 'User'}!
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-500">
                <Activity className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Failed to Load Dashboard</h3>
                <p className="text-gray-600 mt-2">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.name || 'User'}! 
                           <Badge variant="outline" className="ml-2">{roleInfo.label}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Metrics Cards or No Data State */}
      {dataFetched && stats && stats.totalMatches === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <Activity className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Welcome to Your Dashboard!</h3>
            <p className="text-muted-foreground mb-6">
              Start by exploring the features available to you as a {roleInfo.label.toLowerCase()}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {quickActions.slice(0, 2).map((action, index) => (
                <Button key={index} asChild variant={index === 0 ? "default" : "outline"}>
                  <a href={action.href}>
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Team & Organization Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team & Organization Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Teams</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.totalTeams || 0)}</p>
                      <p className="text-blue-200 text-xs">{formatNumber(stats?.activeTeams || 0)} active</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Active Players</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.activePlayers || 0)}</p>
                      <p className="text-green-200 text-xs">Across all teams</p>
                    </div>
                    <Shield className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Overall Matches</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.overallMatches || 0)}</p>
                      <p className="text-orange-200 text-xs">{formatNumber(stats?.todayMatches || 0)} today</p>
                    </div>
                    <Target className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Combined K/D</p>
                      <p className="text-2xl font-bold">{(stats?.kdRatio || 0).toFixed(2)}</p>
                      <p className="text-purple-200 text-xs">{formatNumber(stats?.totalKills || 0)} total kills</p>
                    </div>
                    <Crosshair className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Financial Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Total Winnings</p>
                      <p className="text-2xl font-bold">${formatNumber(stats?.totalWinnings || 0)}</p>
                      <p className="text-emerald-200 text-xs">Prize money earned</p>
                    </div>
                    <Trophy className="h-8 w-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold">${formatNumber(stats?.totalExpense || 0)}</p>
                      <p className="text-red-200 text-xs">Operational costs</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm font-medium">ROI</p>
                      <p className="text-2xl font-bold">{(stats?.roi || 0).toFixed(1)}%</p>
                      <p className="text-cyan-200 text-xs">Return on investment</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-cyan-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance & Attendance */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance & Attendance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium">Attendance Rate</p>
                      <p className="text-2xl font-bold">{(stats?.overallAttendanceRate || 0).toFixed(1)}%</p>
                      <p className="text-indigo-200 text-xs">Overall attendance</p>
                    </div>
                    <Calendar className="h-8 w-8 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Avg Damage</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.avgDamage || 0)}</p>
                      <p className="text-pink-200 text-xs">Combined average</p>
                    </div>
                    <Zap className="h-8 w-8 text-pink-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Avg Survival</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.avgSurvival || 0)}s</p>
                      <p className="text-yellow-200 text-xs">Average survival time</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100 text-sm font-medium">Top Performance</p>
                      <p className="text-xl font-bold">{topPerformers.topPlayer?.name || 'N/A'}</p>
                      <p className="text-teal-200 text-xs">{topPerformers.topPlayer?.value || 0} kills avg</p>
                    </div>
                    <Star className="h-8 w-8 text-teal-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Communication & Discord */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication & Discord
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-violet-500 to-violet-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Active Webhooks</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.activeWebhooks || 0)}</p>
                      <p className="text-violet-200 text-xs">Discord integrations</p>
                    </div>
                    <Webhook className="h-8 w-8 text-violet-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-slate-500 to-slate-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-100 text-sm font-medium">Messages Sent</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.totalDiscordMessages || 0)}</p>
                      <p className="text-slate-200 text-xs">Total Discord messages</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-slate-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Live Leaderboard</p>
                      <p className="text-xl font-bold">{topPerformers.topTeam?.name || 'N/A'}</p>
                      <p className="text-amber-200 text-xs">Top performing team</p>
                    </div>
                    <Crown className="h-8 w-8 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}  {/* End of metrics conditional */}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump to your most used features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <ResponsiveTabs 
        tabs={[
          {
            value: "overview",
            label: "Overview",
            icon: BarChart3
          },
          {
            value: "performance",
            label: "Performance",
            icon: Target
          },
          {
            value: "analytics",
            label: "Analytics",
            icon: TrendingUp,
            hidden: !canAccessAnalytics
          },
          {
            value: "management",
            label: "Management",
            icon: Users,
            hidden: !(canAccessFinance || canAccessUsers)
          }
        ]}
        defaultValue="overview"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="space-y-4"
      >

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Overview */}
            {canAccessFinance && stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Expenses</span>
                      <span className="text-lg font-bold text-red-600">₹{formatNumber(stats.totalExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net P&L</span>
                      <span className={`text-lg font-bold ${stats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{formatNumber(Math.abs(stats.totalProfitLoss))}
                        {stats.totalProfitLoss < 0 && ' (Loss)'}
                      </span>
                    </div>
                    <Link href="/dashboard/finance">
                      <Button variant="outline" className="w-full">
                        View Finance Details
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>Best performance in last {selectedTimeframe} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.topPlayer && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-semibold text-sm">{topPerformers.topPlayer.name}</p>
                        <p className="text-xs text-muted-foreground">{topPerformers.topPlayer.metric}: {topPerformers.topPlayer.value.toFixed(1)}</p>
                      </div>
                    </div>
                  )}
                  
                  {topPerformers.topTeam && shouldSeeAllData && (
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 backdrop-blur-md border-blue-500/20 rounded-lg">
                      <Trophy className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-semibold text-sm">{topPerformers.topTeam.name}</p>
                        <p className="text-xs text-muted-foreground">Win Rate: {topPerformers.topTeam.winRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                  
                  {!topPerformers.topPlayer && !topPerformers.topTeam && (
                    <div className="text-center py-4">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No performance data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Matches
              </CardTitle>
              <CardDescription>Latest performance entries</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPerformances.length > 0 ? (
                <div className="space-y-2">
                  {recentPerformances.slice(0, 5).map((perf, index) => (
                                          <div key={perf.id} className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-md border-white/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{perf.map || 'Unknown Map'}</p>
                        <p className="text-xs text-muted-foreground">
                          Placement: #{perf.placement || 'N/A'} • {perf.kills || 0} kills • {formatNumber(perf.damage || 0)} damage
                        </p>
                      </div>
                      <Badge variant={perf.placement === 1 ? 'default' : 'secondary'}>
                        {perf.placement === 1 ? '🥇 Win' : `#${perf.placement || 'N/A'}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Matches</h3>
                  <p className="text-muted-foreground mb-4">Start submitting performance data to see your recent activity</p>
                  <Link href="/dashboard/performance">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Performance
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Quick performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Performance Dashboard</h3>
                <p className="text-muted-foreground mb-4">View detailed performance analytics</p>
                <Link href="/dashboard/performance">
                  <Button>
                    <Target className="h-4 w-4 mr-2" />
                    Open Performance Module
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canAccessAnalytics && (
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>Detailed performance analytics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/analytics">
                  <Button className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Open Full Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(canAccessFinance || canAccessUsers) && (
          <TabsContent value="management">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {canAccessUsers && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage users, roles, and permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Active Players</span>
                        <span className="text-lg font-bold">{stats?.activePlayers || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Active Teams</span>
                        <span className="text-lg font-bold">{stats?.activeTeams || 0}</span>
                      </div>
                      <Link href="/dashboard/user-management">
                        <Button variant="outline" className="w-full">
                          Manage Users
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {canAccessFinance && (
                <Card>
                  <CardHeader>
                    <CardTitle>Finance Management</CardTitle>
                    <CardDescription>Track expenses, winnings, and financial performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/finance">
                      <Button variant="outline" className="w-full">
                        Open Finance Module
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </ResponsiveTabs>

      {/* Cache Performance Stats (only in development) */}
      {process.env.NODE_ENV === 'development' && cacheStats && (
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="text-sm">Cache Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="font-medium">Entries:</span> {cacheStats.totalEntries}
              </div>
              <div>
                <span className="font-medium">Memory:</span> {cacheStats.memoryUsage}
              </div>
              <div>
                <span className="font-medium">Pending:</span> {cacheStats.pendingRequests}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}