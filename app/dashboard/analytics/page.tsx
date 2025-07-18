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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  Download, 
  Filter, 
  TrendingUp, 
  Target, 
  Users, 
  Calendar,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react'

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [teamData, setTeamData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30')
  const [selectedTeam, setSelectedTeam] = useState('all')

  const userRole = profile?.role as UserRole
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)
  const canExportPerformance = DashboardPermissions.getDataPermissions(userRole, 'performance').canExport
  const canExportTeams = DashboardPermissions.getDataPermissions(userRole, 'teams').canExport

  useEffect(() => {
    if (profile) {
      loadAnalyticsData()
    }
  }, [profile, selectedTimeframe, selectedTeam])

  const loadAnalyticsData = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const options: DashboardDataOptions = {
        userRole: profile.role as UserRole,
        userId: profile.id,
        teamId: selectedTeam === 'all' ? undefined : selectedTeam || profile.team_id || undefined,
        limit: 1000
      }

      const [performanceResult, teamResult] = await Promise.all([
        DashboardData.getPerformances(options),
        DashboardData.getTeams(options)
      ])

      setPerformanceData(performanceResult.data || [])
      setTeamData(teamResult.data || [])
    } catch (error) {
      console.error('Analytics data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (dataType: 'performance' | 'teams', format: 'csv' | 'json' = 'csv') => {
    if (!profile) return

    try {
      const options: DashboardDataOptions = {
        userRole: profile.role as UserRole,
        userId: profile.id,
        teamId: selectedTeam === 'all' ? undefined : selectedTeam || profile.team_id || undefined
      }

      const exportData = await DashboardData.exportData(dataType, options, format)
      
      const blob = new Blob([exportData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${dataType}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Export error:', error)
      alert('Export failed: ' + error.message)
    }
  }

  // Calculate analytics metrics
  const analytics = {
    totalMatches: performanceData.length,
    avgKills: performanceData.length > 0 ? 
      performanceData.reduce((sum, p) => sum + (p.kills || 0), 0) / performanceData.length : 0,
    avgDamage: performanceData.length > 0 ? 
      performanceData.reduce((sum, p) => sum + (p.damage || 0), 0) / performanceData.length : 0,
    avgPlacement: performanceData.length > 0 ? 
      performanceData.reduce((sum, p) => sum + (p.placement || 0), 0) / performanceData.length : 0,
    topPerformers: performanceData
      .reduce((acc: any[], p) => {
        const existing = acc.find(item => item.playerId === p.player_id)
        if (existing) {
          existing.totalKills += p.kills || 0
          existing.totalDamage += p.damage || 0
          existing.matches += 1
        } else {
          acc.push({
            playerId: p.player_id,
            playerName: p.users?.name || 'Unknown',
            totalKills: p.kills || 0,
            totalDamage: p.damage || 0,
            matches: 1
          })
        }
        return acc
      }, [])
      .sort((a, b) => b.totalKills - a.totalKills)
      .slice(0, 5),
    mapStats: performanceData
      .reduce((acc: any, p) => {
        if (!acc[p.map]) {
          acc[p.map] = { matches: 0, totalKills: 0, totalDamage: 0 }
        }
        acc[p.map].matches += 1
        acc[p.map].totalKills += p.kills || 0
        acc[p.map].totalDamage += p.damage || 0
        return acc
      }, {})
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
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600">
              Performance insights and data exports
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {performanceData.length} records
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Timeframe</label>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shouldSeeAllData && (
                <div>
                  <label className="text-sm font-medium">Team</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teamData.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-end">
                <Button onClick={loadAnalyticsData} variant="outline" disabled={loading}>
                  <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalMatches}</div>
              <p className="text-xs text-muted-foreground">
                Performance entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Kills</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgKills.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Per match
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Damage</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics.avgDamage)}</div>
              <p className="text-xs text-muted-foreground">
                Per match
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Placement</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{analytics.avgPlacement.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Average rank
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
            <TabsTrigger value="players">Player Rankings</TabsTrigger>
            <TabsTrigger value="maps">Map Statistics</TabsTrigger>
            <TabsTrigger value="export">Data Export</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>
                    {performanceData.length} matches analyzed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <LineChart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>No performance data available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Best Match</p>
                          <p className="font-semibold">
                            {Math.max(...performanceData.map(p => p.kills || 0))} kills
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Best Placement</p>
                          <p className="font-semibold">
                            #{Math.min(...performanceData.map(p => p.placement || 99))}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Kills</p>
                          <p className="font-semibold">
                            {performanceData.reduce((sum, p) => sum + (p.kills || 0), 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Damage</p>
                          <p className="font-semibold">
                            {performanceData.reduce((sum, p) => sum + (p.damage || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Matches</CardTitle>
                  <CardDescription>Latest performance entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {performanceData.slice(0, 5).map((match, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {match.users?.name || 'Unknown'} 
                          </p>
                          <p className="text-xs text-gray-500">
                            {match.map} • {new Date(match.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{match.kills} kills</p>
                          <p className="text-xs text-gray-500">#{match.placement}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Ranked by total kills</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topPerformers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No player data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topPerformers.map((player, index) => (
                      <div key={player.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={index < 3 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{player.playerName}</p>
                            <p className="text-sm text-gray-500">{player.matches} matches</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{player.totalKills} kills</p>
                          <p className="text-sm text-gray-500">
                            {Math.round(player.totalDamage / player.matches)} avg dmg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Map Performance</CardTitle>
                <CardDescription>Statistics by map</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.mapStats).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <PieChart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No map data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.mapStats).map(([map, stats]: [string, any]) => (
                      <div key={map} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{map}</p>
                          <p className="text-sm text-gray-500">{stats.matches} matches</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{stats.totalKills} total kills</p>
                          <p className="text-sm text-gray-500">
                            {Math.round(stats.totalKills / stats.matches)} avg kills
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Export</CardTitle>
                <CardDescription>
                  Download analytics data in various formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {canExportPerformance && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Performance Data</h4>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => handleExport('performance', 'csv')}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button 
                          onClick={() => handleExport('performance', 'json')}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {performanceData.length} performance records
                      </p>
                    </div>
                  )}

                  {canExportTeams && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Team Data</h4>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => handleExport('teams', 'csv')}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button 
                          onClick={() => handleExport('teams', 'json')}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {teamData.length} team records
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Export Info</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• CSV files can be opened in Excel or Google Sheets</p>
                    <p>• JSON files are suitable for technical analysis</p>
                    <p>• All exports respect your role-based data access permissions</p>
                    <p>• Large datasets may take a moment to prepare</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </NewDashboardLayout>
  )
}