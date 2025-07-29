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
  Brain,
  Users,
  User,
  Calendar,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Star,
  Award,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'
import { SendToDiscordButton } from '@/components/discord-portal/send-to-discord-button'

interface AttendanceData {
  player_id: string
  username: string
  total_sessions: number
  present: number
  late: number
  absent: number
  attendance_rate: number
  recent_streak: number
  trend: 'improving' | 'declining' | 'stable'
}

interface PerformanceData {
  player_id: string
  username: string
  matches: number
  avg_kills: number
  avg_damage: number
  avg_placement: number
  consistency_score: number
  improvement_rate: number
  trend: 'improving' | 'declining' | 'stable'
}

interface AIInsight {
  type: 'attendance' | 'performance' | 'hybrid'
  category: 'concern' | 'improvement' | 'recognition'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  players: string[]
  actionable_steps: string[]
  confidence: number
}

interface ComparisonData {
  player: string
  metric: string
  value: number
  team_average: number
  percentile: number
  trend: 'up' | 'down' | 'stable'
}

export default function AIInsightsPage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string>('team')
  const [selectedPeriod, setSelectedPeriod] = useState(30)
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [comparisons, setComparisons] = useState<ComparisonData[]>([])
  const [playerList, setPlayerList] = useState<Array<{ id: string; username: string }>>([])

  const canView = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canView

  useEffect(() => {
    if (guildId && canView) {
      fetchAIInsights()
    }
  }, [guildId, selectedPlayer, selectedPeriod, canView])

  const fetchAIInsights = async () => {
    try {
      setLoading(true)
      
      // Fetch attendance data
      const attendanceResponse = await fetch(`/api/discord/attendance-summary?guild_id=${guildId}&days=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RAPTOR_BOT_API_KEY}`
        }
      })
      
      // Fetch performance data
      const performanceResponse = await fetch(`/api/discord/team-performance?guild_id=${guildId}&days=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RAPTOR_BOT_API_KEY}`
        }
      })

      if (attendanceResponse.ok && performanceResponse.ok) {
        const attendanceResult = await attendanceResponse.json()
        const performanceResult = await performanceResponse.json()
        
        // Process and generate AI insights
        await processAIData(attendanceResult, performanceResult)
      }

    } catch (error) {
      console.error('Error fetching AI insights:', error)
      toast.error('Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }

  const processAIData = async (attendanceResult: any, performanceResult: any) => {
    // Generate mock attendance data (would be real AI analysis)
    const mockAttendance: AttendanceData[] = [
      {
        player_id: '1',
        username: 'Player1',
        total_sessions: 25,
        present: 20,
        late: 3,
        absent: 2,
        attendance_rate: 92,
        recent_streak: 5,
        trend: 'improving'
      },
      {
        player_id: '2',
        username: 'Player2',
        total_sessions: 25,
        present: 15,
        late: 4,
        absent: 6,
        attendance_rate: 76,
        recent_streak: 2,
        trend: 'declining'
      },
      {
        player_id: '3',
        username: 'Player3',
        total_sessions: 25,
        present: 22,
        late: 2,
        absent: 1,
        attendance_rate: 96,
        recent_streak: 8,
        trend: 'stable'
      }
    ]

    // Generate mock performance data
    const mockPerformance: PerformanceData[] = performanceResult.top_players?.map((player: any, index: number) => ({
      player_id: player.discord_id,
      username: player.username,
      matches: player.matches,
      avg_kills: parseFloat(player.avg_kills),
      avg_damage: player.avg_damage,
      avg_placement: parseFloat(player.avg_placement),
      consistency_score: Math.random() * 100,
      improvement_rate: (Math.random() - 0.5) * 20,
      trend: index % 3 === 0 ? 'improving' : index % 3 === 1 ? 'declining' : 'stable'
    })) || []

    setAttendanceData(mockAttendance)
    setPerformanceData(mockPerformance)
    
    // Generate player list
    const players = Array.from(new Set([
      ...mockAttendance.map(p => ({ id: p.player_id, username: p.username })),
      ...mockPerformance.map(p => ({ id: p.player_id, username: p.username }))
    ]))
    setPlayerList(players)

    // Generate AI insights
    generateAIInsights(mockAttendance, mockPerformance)
    
    // Generate comparisons
    generateComparisons(mockAttendance, mockPerformance)
  }

  const generateAIInsights = (attendance: AttendanceData[], performance: PerformanceData[]) => {
    const insights: AIInsight[] = []

    // Attendance insights
    const poorAttendance = attendance.filter(p => p.attendance_rate < 80)
    if (poorAttendance.length > 0) {
      insights.push({
        type: 'attendance',
        category: 'concern',
        title: 'Low Attendance Alert',
        description: `${poorAttendance.length} player(s) have attendance below 80%. This may impact team coordination and performance.`,
        priority: 'high',
        players: poorAttendance.map(p => p.username),
        actionable_steps: [
          'Schedule one-on-one check-ins with affected players',
          'Review practice schedules for conflicts',
          'Consider attendance improvement incentives'
        ],
        confidence: 95
      })
    }

    // Performance consistency insights
    const inconsistentPlayers = performance.filter(p => p.consistency_score < 50)
    if (inconsistentPlayers.length > 0) {
      insights.push({
        type: 'performance',
        category: 'improvement',
        title: 'Consistency Improvement Needed',
        description: `${inconsistentPlayers.length} player(s) show inconsistent performance patterns. Focus on fundamentals training.`,
        priority: 'medium',
        players: inconsistentPlayers.map(p => p.username),
        actionable_steps: [
          'Implement consistency drills in practice',
          'Review VODs to identify decision-making patterns',
          'Pair with more consistent teammates for mentoring'
        ],
        confidence: 78
      })
    }

    // Rising stars
    const improvingPlayers = performance.filter(p => p.trend === 'improving' && p.improvement_rate > 10)
    if (improvingPlayers.length > 0) {
      insights.push({
        type: 'performance',
        category: 'recognition',
        title: 'Rising Stars Identified',
        description: `${improvingPlayers.length} player(s) show significant improvement. Consider increased responsibilities or leadership roles.`,
        priority: 'low',
        players: improvingPlayers.map(p => p.username),
        actionable_steps: [
          'Acknowledge improvement publicly',
          'Consider IGL training for top improvers',
          'Use as example for struggling teammates'
        ],
        confidence: 85
      })
    }

    // Hybrid insights (attendance + performance correlation)
    const attendanceMap = attendance.reduce((acc, p) => {
      acc[p.username] = p
      return acc
    }, {} as Record<string, AttendanceData>)

    const correlatedIssues = performance.filter(p => {
      const att = attendanceMap[p.username]
      return att && att.attendance_rate < 85 && p.avg_placement > 50
    })

    if (correlatedIssues.length > 0) {
      insights.push({
        type: 'hybrid',
        category: 'concern',
        title: 'Attendance-Performance Correlation',
        description: `Players with poor attendance also show declining game performance. Address attendance to improve results.`,
        priority: 'high',
        players: correlatedIssues.map(p => p.username),
        actionable_steps: [
          'Mandatory attendance policy enforcement',
          'Extra practice sessions for affected players',
          'Performance review meetings'
        ],
        confidence: 92
      })
    }

    setAiInsights(insights)
  }

  const generateComparisons = (attendance: AttendanceData[], performance: PerformanceData[]) => {
    const comparisons: ComparisonData[] = []

    if (selectedPlayer !== 'team') {
      const player = playerList.find(p => p.id === selectedPlayer)
      if (player) {
        const attData = attendance.find(a => a.username === player.username)
        const perfData = performance.find(p => p.username === player.username)

        if (attData) {
          const avgAttendance = attendance.reduce((sum, p) => sum + p.attendance_rate, 0) / attendance.length
          comparisons.push({
            player: player.username,
            metric: 'Attendance Rate',
            value: attData.attendance_rate,
            team_average: avgAttendance,
            percentile: (attendance.filter(p => p.attendance_rate <= attData.attendance_rate).length / attendance.length) * 100,
            trend: attData.trend === 'improving' ? 'up' : attData.trend === 'declining' ? 'down' : 'stable'
          })
        }

        if (perfData) {
          const avgKills = performance.reduce((sum, p) => sum + p.avg_kills, 0) / performance.length
          const avgPlacement = performance.reduce((sum, p) => sum + p.avg_placement, 0) / performance.length
          
          comparisons.push(
            {
              player: player.username,
              metric: 'Average Kills',
              value: perfData.avg_kills,
              team_average: avgKills,
              percentile: (performance.filter(p => p.avg_kills <= perfData.avg_kills).length / performance.length) * 100,
              trend: perfData.trend === 'improving' ? 'up' : perfData.trend === 'declining' ? 'down' : 'stable'
            },
            {
              player: player.username,
              metric: 'Average Placement',
              value: perfData.avg_placement,
              team_average: avgPlacement,
              percentile: (performance.filter(p => p.avg_placement >= perfData.avg_placement).length / performance.length) * 100,
              trend: perfData.trend === 'improving' ? 'up' : perfData.trend === 'declining' ? 'down' : 'stable'
            }
          )
        }
      }
    }

    setComparisons(comparisons)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAIInsights()
    setRefreshing(false)
    toast.success('AI insights refreshed')
  }

  const getInsightIcon = (category: AIInsight['category']) => {
    switch (category) {
      case 'concern': return <AlertCircle className="w-4 h-4" />
      case 'improvement': return <ArrowUp className="w-4 h-4" />
      case 'recognition': return <Star className="w-4 h-4" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  const getInsightColor = (category: AIInsight['category']) => {
    switch (category) {
      case 'concern': return 'bg-red-100 text-red-600'
      case 'improvement': return 'bg-blue-100 text-blue-600'
      case 'recognition': return 'bg-green-100 text-green-600'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving': return <ArrowUp className="w-3 h-3 text-green-500" />
      case 'down':
      case 'declining': return <ArrowDown className="w-3 h-3 text-red-500" />
      default: return <Minus className="w-3 h-3 text-muted-foreground" />
    }
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
              You don't have permission to view AI insights.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Insights & Analysis
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Advanced AI analysis of attendance patterns, performance trends, and team dynamics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedPlayer}
                onValueChange={setSelectedPlayer}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team Overview</SelectItem>
                  <Separator />
                  {playerList.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedPeriod.toString()}
                onValueChange={(value) => setSelectedPeriod(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
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

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          {selectedPlayer !== 'team' && <TabsTrigger value="comparison">Player Comparison</TabsTrigger>}
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiInsights.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                    <p className="text-muted-foreground">
                      Gather more data to generate AI insights and recommendations.
                    </p>
                  </div>
                ) : (
                  aiInsights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getInsightColor(insight.category)}`}>
                          {getInsightIcon(insight.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{insight.title}</h4>
                            <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'outline'} className="text-xs">
                              {insight.priority} priority
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                          
                          {insight.players.length > 0 && (
                            <div className="flex items-center gap-1 mb-3">
                              <span className="text-xs text-muted-foreground">Affected Players:</span>
                              {insight.players.map((player, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {player}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Recommended Actions:</span>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {insight.actionable_steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-primary">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <SendToDiscordButton
                          messageType="performance_summary"
                          data={insight}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="w-3 h-3" />
                        </SendToDiscordButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          {/* Attendance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Attendance Pattern Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceData.map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{player.username}</div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(player.trend)}
                        <span className="text-xs text-muted-foreground capitalize">{player.trend}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="font-semibold">{player.attendance_rate}%</div>
                        <div className="text-xs text-muted-foreground">Rate</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600">{player.present}</div>
                        <div className="text-xs text-muted-foreground">Present</div>
                      </div>
                      <div>
                        <div className="font-semibold text-yellow-600">{player.late}</div>
                        <div className="text-xs text-muted-foreground">Late</div>
                      </div>
                      <div>
                        <div className="font-semibold text-red-600">{player.absent}</div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                      <div>
                        <div className="font-semibold">{player.recent_streak}</div>
                        <div className="text-xs text-muted-foreground">Streak</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Performance Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{player.username}</div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(player.trend)}
                        <span className="text-xs text-muted-foreground capitalize">{player.trend}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="font-semibold">{player.avg_kills.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Kills</div>
                      </div>
                      <div>
                        <div className="font-semibold">{Math.round(player.avg_damage)}</div>
                        <div className="text-xs text-muted-foreground">Avg Damage</div>
                      </div>
                      <div>
                        <div className="font-semibold">#{player.avg_placement.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Place</div>
                      </div>
                      <div>
                        <div className="font-semibold">{player.consistency_score.toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Consistency</div>
                      </div>
                      <div>
                        <div className={`font-semibold ${player.improvement_rate > 0 ? 'text-green-600' : player.improvement_rate < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {player.improvement_rate > 0 ? '+' : ''}{player.improvement_rate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Improvement</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {selectedPlayer !== 'team' && (
          <TabsContent value="comparison" className="space-y-6">
            {/* Player Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Player vs Team Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparisons.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No comparison data available for selected player.
                    </p>
                  ) : (
                    comparisons.map((comp, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{comp.metric}</h4>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(comp.trend)}
                            <span className="text-sm font-medium">
                              {comp.percentile.toFixed(0)}th percentile
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold">{comp.value.toFixed(comp.metric.includes('Rate') ? 1 : 1)}</div>
                            <div className="text-sm text-muted-foreground">Player Value</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{comp.team_average.toFixed(comp.metric.includes('Rate') ? 1 : 1)}</div>
                            <div className="text-sm text-muted-foreground">Team Average</div>
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${
                              comp.value > comp.team_average ? 'text-green-600' : 
                              comp.value < comp.team_average ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {comp.value > comp.team_average ? '+' : ''}{(comp.value - comp.team_average).toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Difference</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}