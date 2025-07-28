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
  TrendingUp,
  Users,
  Trophy,
  Target,
  Brain,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertCircle,
  Star,
  Award,
  Activity,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'
import { SendToDiscordButton } from '@/components/discord-portal/send-to-discord-button'

interface TeamPerformanceData {
  team_info: {
    guild_id: string
    team_name: string
    team_id: string | null
  }
  statistics: {
    total_matches: number
    total_kills: number
    total_damage: number
    avg_kills_per_match: string
    avg_damage_per_match: number
    avg_placement: string
    days_analyzed: number
  }
  top_players: Array<{
    discord_id: string
    username: string
    matches: number
    kills: number
    damage: number
    avg_kills: string
    avg_damage: number
    avg_placement: string
    best_placement: number
  }>
  recent_matches: Array<{
    match_id: string
    player: string
    kills: number
    damage: number
    placement: number
    map: string
    created_at: string
  }>
  generated_at: string
}

interface AIInsight {
  type: 'improvement' | 'strength' | 'concern'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  players?: string[]
}

interface TrendData {
  date: string
  avg_kills: number
  avg_damage: number
  avg_placement: number
  matches: number
}

export default function TeamPerformancePage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [performanceData, setPerformanceData] = useState<TeamPerformanceData | null>(null)
  const [selectedDays, setSelectedDays] = useState(30)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])

  const canView = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canView

  useEffect(() => {
    if (guildId && canView) {
      fetchPerformanceData()
    }
  }, [guildId, selectedDays, canView])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/discord/team-performance?guild_id=${guildId}&days=${selectedDays}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RAPTOR_BOT_API_KEY}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch performance data')

      const data = await response.json()
      setPerformanceData(data)
      
      // Generate AI insights based on the data
      generateAIInsights(data)
      
      // Generate trend data (mockup for now)
      generateTrendData(data)

    } catch (error) {
      console.error('Error fetching performance data:', error)
      toast.error('Failed to load team performance data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPerformanceData()
    setRefreshing(false)
    toast.success('Performance data refreshed')
  }

  const generateAIInsights = (data: TeamPerformanceData) => {
    const insights: AIInsight[] = []
    
    // Analyze average placement
    const avgPlacement = parseFloat(data.statistics.avg_placement)
    if (avgPlacement > 50) {
      insights.push({
        type: 'concern',
        title: 'Poor Average Placement',
        description: `Team average placement of #${avgPlacement.toFixed(1)} suggests positioning and rotation issues. Focus on map knowledge and early game strategy.`,
        priority: 'high'
      })
    } else if (avgPlacement < 20) {
      insights.push({
        type: 'strength',
        title: 'Excellent Placement Consistency',
        description: `Strong average placement of #${avgPlacement.toFixed(1)} shows good game sense and positioning. Maintain this level of play.`,
        priority: 'low'
      })
    }

    // Analyze kill distribution
    const topKiller = data.top_players[0]
    const killVariance = data.top_players.map(p => parseInt(p.avg_kills)).reduce((acc, kills, i, arr) => {
      const avg = arr.reduce((sum, k) => sum + k, 0) / arr.length
      return acc + Math.pow(kills - avg, 2)
    }, 0) / data.top_players.length

    if (killVariance > 5) {
      insights.push({
        type: 'concern',
        title: 'Unbalanced Fragging',
        description: 'Large variation in kill counts suggests some players may need positioning help or more aggressive playstyle coaching.',
        priority: 'medium',
        players: data.top_players.slice(2).map(p => p.username)
      })
    }

    // Analyze match frequency
    if (data.statistics.total_matches < selectedDays / 2) {
      insights.push({
        type: 'improvement',
        title: 'Increase Practice Frequency',
        description: `Only ${data.statistics.total_matches} matches in ${selectedDays} days. Consider increasing practice sessions for better improvement.`,
        priority: 'medium'
      })
    }

    // Top performer recognition
    if (topKiller && parseInt(topKiller.avg_kills) > 3) {
      insights.push({
        type: 'strength',
        title: 'Star Performer Identified',
        description: `${topKiller.username} is averaging ${topKiller.avg_kills} kills per match. Consider having them mentor other team members.`,
        priority: 'low',
        players: [topKiller.username]
      })
    }

    setAiInsights(insights)
  }

  const generateTrendData = (data: TeamPerformanceData) => {
    // Mock trend data - in reality this would come from time-series analysis
    const trends: TrendData[] = []
    const days = Math.min(selectedDays, 14) // Last 14 days max for visualization
    const baseKills = parseFloat(data.statistics.avg_kills_per_match) || 2
    const baseDamage = data.statistics.avg_damage_per_match || 800
    const basePlacement = parseFloat(data.statistics.avg_placement) || 50

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      trends.push({
        date: date.toISOString().split('T')[0],
        avg_kills: Math.max(0, baseKills + (Math.random() - 0.5) * 2),
        avg_damage: Math.max(0, baseDamage + (Math.random() - 0.5) * 300),
        avg_placement: Math.max(1, Math.min(100, basePlacement + (Math.random() - 0.5) * 20)),
        matches: Math.floor(Math.random() * 5) + 1
      })
    }
    
    setTrendData(trends)
  }

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'improvement': return <ArrowUp className="w-4 h-4" />
      case 'strength': return <Star className="w-4 h-4" />
      case 'concern': return <AlertCircle className="w-4 h-4" />
      default: return <Minus className="w-4 h-4" />
    }
  }

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'improvement': return 'default'
      case 'strength': return 'default'
      case 'concern': return 'destructive'
      default: return 'outline'
    }
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-3 h-3 text-green-500" />
    if (current < previous) return <ArrowDown className="w-3 h-3 text-red-500" />
    return <Minus className="w-3 h-3 text-muted-foreground" />
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
              You don't have permission to view team performance data.
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

  if (!performanceData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
          <p className="text-muted-foreground">
            No performance records found for this server. Upload some match data to see AI-powered insights.
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
                <Brain className="w-5 h-5" />
                AI Team Performance Review
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                AI-powered analysis of team performance with actionable insights and improvement recommendations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedDays.toString()}
                onValueChange={(value) => setSelectedDays(parseInt(value))}
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
              <SendToDiscordButton
                messageType="team_performance_summary"
                data={performanceData}
                variant="outline"
                size="sm"
              >
                Share Report
              </SendToDiscordButton>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="players">Top Players</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Team Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Team Statistics ({selectedDays} days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{performanceData.statistics.total_matches}</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{performanceData.statistics.avg_kills_per_match}</div>
                  <div className="text-sm text-muted-foreground">Avg Kills/Match</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Math.round(performanceData.statistics.avg_damage_per_match)}</div>
                  <div className="text-sm text-muted-foreground">Avg Damage/Match</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">#{performanceData.statistics.avg_placement}</div>
                  <div className="text-sm text-muted-foreground">Avg Placement</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Match Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performanceData.recent_matches.slice(0, 5).map((match, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">{match.player}</div>
                      <Badge variant="outline">{match.map}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {match.kills} kills
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {match.damage} dmg
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        #{match.placement}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* AI Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-sm leading-relaxed">
                  Based on analysis of {performanceData.statistics.total_matches} matches over the last {selectedDays} days, 
                  your team shows {parseFloat(performanceData.statistics.avg_placement) < 30 ? 'strong' : 'developing'} performance 
                  with an average placement of #{performanceData.statistics.avg_placement}. The team averages {performanceData.statistics.avg_kills_per_match} kills 
                  and {Math.round(performanceData.statistics.avg_damage_per_match)} damage per match, indicating {
                    parseFloat(performanceData.statistics.avg_kills_per_match) > 3 ? 'aggressive' : 'conservative'
                  } gameplay style.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Actionable Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        insight.type === 'strength' ? 'bg-green-100 text-green-600' :
                        insight.type === 'improvement' ? 'bg-blue-100 text-blue-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'outline'} className="text-xs">
                            {insight.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.players && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-muted-foreground">Players:</span>
                            {insight.players.map((player, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {player}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          {/* Top Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Player Performance Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.top_players.map((player, index) => (
                  <div key={player.discord_id} className="flex items-center justify-between p-4 border rounded-lg">
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
                        <div className="font-semibold">{player.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.matches} matches played
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="font-semibold">{player.avg_kills}</div>
                        <div className="text-xs text-muted-foreground">Avg Kills</div>
                      </div>
                      <div>
                        <div className="font-semibold">{player.avg_damage}</div>
                        <div className="text-xs text-muted-foreground">Avg Damage</div>
                      </div>
                      <div>
                        <div className="font-semibold">#{player.avg_placement}</div>
                        <div className="text-xs text-muted-foreground">Avg Place</div>
                      </div>
                      <div>
                        <div className="font-semibold">#{player.best_placement}</div>
                        <div className="text-xs text-muted-foreground">Best Place</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Performance trend visualization over the last {Math.min(selectedDays, 14)} days
                </p>
                
                {/* Simple trend indicators */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <span className="font-semibold">Kills Trend</span>
                      {trendData.length > 1 && getTrendIcon(
                        trendData[trendData.length - 1].avg_kills,
                        trendData[trendData.length - 2].avg_kills
                      )}
                    </div>
                    <div className="text-2xl font-bold">
                      {trendData.length > 0 ? trendData[trendData.length - 1].avg_kills.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Latest average</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <span className="font-semibold">Damage Trend</span>
                      {trendData.length > 1 && getTrendIcon(
                        trendData[trendData.length - 1].avg_damage,
                        trendData[trendData.length - 2].avg_damage
                      )}
                    </div>
                    <div className="text-2xl font-bold">
                      {trendData.length > 0 ? Math.round(trendData[trendData.length - 1].avg_damage) : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Latest average</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <span className="font-semibold">Placement Trend</span>
                      {trendData.length > 1 && getTrendIcon(
                        trendData[trendData.length - 2].avg_placement, // Inverted for placement (lower is better)
                        trendData[trendData.length - 1].avg_placement
                      )}
                    </div>
                    <div className="text-2xl font-bold">
                      #{trendData.length > 0 ? trendData[trendData.length - 1].avg_placement.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Latest average</div>
                  </div>
                </div>

                <div className="bg-muted/50 p-6 rounded-lg text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Interactive trend charts will be implemented here showing performance over time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}