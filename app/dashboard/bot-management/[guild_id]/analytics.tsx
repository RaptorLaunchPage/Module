'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Trophy,
  Calendar,
  Terminal,
  RefreshCw,
  AlertCircle,
  Award,
  Target,
  Zap,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface AnalyticsData {
  server_info: {
    guild_id: string
    guild_name: string
    member_count: number
    active_users_24h: number
    active_users_7d: number
  }
  bot_usage: {
    total_commands: number
    commands_24h: number
    commands_7d: number
    unique_users_24h: number
    unique_users_7d: number
    uptime_percentage: number
  }
  command_stats: Array<{
    command: string
    usage_count: number
    unique_users: number
    success_rate: number
    avg_response_time: number
  }>
  attendance_stats: {
    total_sessions: number
    avg_attendance_rate: number
    most_attended_team: string
    least_attended_team: string
    improvement_trend: 'up' | 'down' | 'stable'
  }
  performance_stats: {
    total_matches: number
    total_uploads: number
    avg_team_placement: number
    top_performing_team: string
    most_active_team: string
    improvement_trend: 'up' | 'down' | 'stable'
  }
  growth_metrics: {
    new_users_7d: number
    new_users_30d: number
    retention_rate: number
    engagement_score: number
  }
}

export default function AnalyticsPage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(7)
  const [refreshing, setRefreshing] = useState(false)

  const canView = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canView

  useEffect(() => {
    if (guildId && canView) {
      fetchAnalytics()
    }
  }, [guildId, selectedPeriod, canView])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // In reality, this would fetch from various API endpoints
      // For now, we'll generate mock analytics data
      await generateMockAnalytics()
      
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const generateMockAnalytics = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockData: AnalyticsData = {
      server_info: {
        guild_id: guildId,
        guild_name: 'Raptor Esports',
        member_count: 156,
        active_users_24h: 42,
        active_users_7d: 89
      },
      bot_usage: {
        total_commands: 2847,
        commands_24h: 127,
        commands_7d: 643,
        unique_users_24h: 28,
        unique_users_7d: 67,
        uptime_percentage: 99.2
      },
      command_stats: [
        { command: 'performance', usage_count: 156, unique_users: 23, success_rate: 94.5, avg_response_time: 1240 },
        { command: 'attendance', usage_count: 134, unique_users: 31, success_rate: 98.1, avg_response_time: 340 },
        { command: 'stats', usage_count: 98, unique_users: 18, success_rate: 96.8, avg_response_time: 780 },
        { command: 'reviewteam', usage_count: 67, unique_users: 12, success_rate: 91.2, avg_response_time: 2100 },
        { command: 'digest', usage_count: 45, unique_users: 8, success_rate: 97.8, avg_response_time: 1560 },
        { command: 'screate', usage_count: 23, unique_users: 5, success_rate: 100.0, avg_response_time: 890 },
        { command: 'attendanceai', usage_count: 19, unique_users: 7, success_rate: 89.5, avg_response_time: 3200 }
      ],
      attendance_stats: {
        total_sessions: 89,
        avg_attendance_rate: 87.3,
        most_attended_team: 'Team Alpha',
        least_attended_team: 'Team Delta',
        improvement_trend: 'up'
      },
      performance_stats: {
        total_matches: 234,
        total_uploads: 187,
        avg_team_placement: 18.7,
        top_performing_team: 'Team Beta',
        most_active_team: 'Team Alpha',
        improvement_trend: 'up'
      },
      growth_metrics: {
        new_users_7d: 12,
        new_users_30d: 34,
        retention_rate: 78.5,
        engagement_score: 8.4
      }
    }

    setAnalytics(mockData)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
    toast.success('Analytics data refreshed')
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'down': return <ArrowDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEngagementLevel = (score: number) => {
    if (score >= 8) return { label: 'Excellent', color: 'text-green-600' }
    if (score >= 6) return { label: 'Good', color: 'text-yellow-600' }
    if (score >= 4) return { label: 'Fair', color: 'text-orange-600' }
    return { label: 'Poor', color: 'text-red-600' }
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <CardTitle className="text-red-400">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You don't have permission to view analytics data.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">
            Unable to load analytics data. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Server Analytics Dashboard
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Comprehensive analytics for bot usage, team performance, and server engagement.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedPeriod.toString()}
                onValueChange={(value) => setSelectedPeriod(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24h</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{analytics.server_info.member_count}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {analytics.server_info.active_users_7d} active this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bot Commands</p>
                <p className="text-2xl font-bold">{analytics.bot_usage.commands_7d}</p>
              </div>
              <Terminal className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {analytics.bot_usage.commands_24h} in last 24h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{analytics.attendance_stats.avg_attendance_rate}%</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              {getTrendIcon(analytics.attendance_stats.improvement_trend)}
              <span>Trending {analytics.attendance_stats.improvement_trend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bot Uptime</p>
                <p className="text-2xl font-bold">{analytics.bot_usage.uptime_percentage}%</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Excellent reliability
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Bot Usage</TabsTrigger>
          <TabsTrigger value="commands">Command Stats</TabsTrigger>
          <TabsTrigger value="teams">Team Performance</TabsTrigger>
          <TabsTrigger value="growth">Growth Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {/* Bot Usage Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analytics.bot_usage.total_commands}</div>
                    <div className="text-sm text-muted-foreground">Total Commands</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analytics.bot_usage.unique_users_7d}</div>
                    <div className="text-sm text-muted-foreground">Active Users (7d)</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Commands Today</span>
                    <span className="font-medium">{analytics.bot_usage.commands_24h}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Commands This Week</span>
                    <span className="font-medium">{analytics.bot_usage.commands_7d}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unique Users Today</span>
                    <span className="font-medium">{analytics.bot_usage.unique_users_24h}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{analytics.growth_metrics.engagement_score}</div>
                  <div className="text-sm text-muted-foreground">Engagement Score</div>
                  <Badge 
                    variant="outline" 
                    className={`mt-2 ${getEngagementLevel(analytics.growth_metrics.engagement_score).color}`}
                  >
                    {getEngagementLevel(analytics.growth_metrics.engagement_score).label}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Retention Rate</span>
                    <span className="font-medium">{analytics.growth_metrics.retention_rate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>New Users (7d)</span>
                    <span className="font-medium">{analytics.growth_metrics.new_users_7d}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>New Users (30d)</span>
                    <span className="font-medium">{analytics.growth_metrics.new_users_30d}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          {/* Command Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Command Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.command_stats.map((command, index) => (
                  <div key={command.command} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">/{command.command}</div>
                        <div className="text-sm text-muted-foreground">
                          {command.unique_users} unique users
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="font-semibold">{command.usage_count}</div>
                        <div className="text-xs text-muted-foreground">Uses</div>
                      </div>
                      <div>
                        <div className={`font-semibold ${getSuccessRateColor(command.success_rate)}`}>
                          {command.success_rate}%
                        </div>
                        <div className="text-xs text-muted-foreground">Success</div>
                      </div>
                      <div>
                        <div className="font-semibold">{command.avg_response_time}ms</div>
                        <div className="text-xs text-muted-foreground">Avg Time</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {/* Team Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{analytics.attendance_stats.avg_attendance_rate}%</div>
                  <div className="text-sm text-muted-foreground">Average Attendance Rate</div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {getTrendIcon(analytics.attendance_stats.improvement_trend)}
                    <span className="text-sm text-muted-foreground">
                      {analytics.attendance_stats.improvement_trend === 'up' ? 'Improving' : 
                       analytics.attendance_stats.improvement_trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Sessions</span>
                    <span className="font-medium">{analytics.attendance_stats.total_sessions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Best Team</span>
                    <Badge variant="outline" className="text-xs">
                      {analytics.attendance_stats.most_attended_team}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Needs Improvement</span>
                    <Badge variant="outline" className="text-xs">
                      {analytics.attendance_stats.least_attended_team}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">#{analytics.performance_stats.avg_team_placement}</div>
                  <div className="text-sm text-muted-foreground">Average Team Placement</div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {getTrendIcon(analytics.performance_stats.improvement_trend)}
                    <span className="text-sm text-muted-foreground">
                      Performance {analytics.performance_stats.improvement_trend === 'up' ? 'improving' : 
                                  analytics.performance_stats.improvement_trend === 'down' ? 'declining' : 'stable'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Matches</span>
                    <span className="font-medium">{analytics.performance_stats.total_matches}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data Uploads</span>
                    <span className="font-medium">{analytics.performance_stats.total_uploads}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Top Performer</span>
                    <Badge variant="outline" className="text-xs">
                      {analytics.performance_stats.top_performing_team}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Most Active</span>
                    <Badge variant="outline" className="text-xs">
                      {analytics.performance_stats.most_active_team}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          {/* Growth Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Server Growth & Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.growth_metrics.new_users_7d}</div>
                  <div className="text-sm text-muted-foreground">New Users (7d)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytics.growth_metrics.new_users_30d}</div>
                  <div className="text-sm text-muted-foreground">New Users (30d)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{analytics.growth_metrics.retention_rate}%</div>
                  <div className="text-sm text-muted-foreground">Retention Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{analytics.growth_metrics.engagement_score}/10</div>
                  <div className="text-sm text-muted-foreground">Engagement Score</div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="bg-muted/50 p-6 rounded-lg text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Detailed Growth Charts</h3>
                <p className="text-muted-foreground">
                  Interactive growth charts and trend analysis will be implemented here, showing user acquisition, 
                  retention curves, and engagement patterns over time.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}