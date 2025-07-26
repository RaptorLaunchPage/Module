'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart3, 
  Upload, 
  Brain, 
  Filter, 
  Download, 
  RefreshCw,
  Calendar,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthV2 } from '@/hooks/use-auth-v2'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface PerformanceRecord {
  id: string
  player_id: string
  team_id: string
  match_number: number
  map: string
  placement: number
  kills: number
  assists: number
  damage: number
  survival_time: number
  slot: string
  created_at: string
  ai_analysis: any
  users?: {
    name: string
    display_name: string
  }[]
}

interface PerformanceSettings {
  ocr_enabled: boolean
  ai_analysis_enabled: boolean
  auto_analysis: boolean
  analysis_threshold: number
  allowed_uploaders: string[]
}

interface PerformanceStats {
  totalRecords: number
  thisWeekRecords: number
  averageKills: number
  averageDamage: number
  topPerformer: string
  aiAnalysisCount: number
}

export default function PerformanceManager() {
  const params = useParams()
  const { profile } = useAuthV2()
  const guildId = params.guild_id as string
  
  const [records, setRecords] = useState<PerformanceRecord[]>([])
  const [stats, setStats] = useState<PerformanceStats>({
    totalRecords: 0,
    thisWeekRecords: 0,
    averageKills: 0,
    averageDamage: 0,
    topPerformer: '',
    aiAnalysisCount: 0
  })
  const [settings, setSettings] = useState<PerformanceSettings>({
    ocr_enabled: true,
    ai_analysis_enabled: true,
    auto_analysis: true,
    analysis_threshold: 5,
    allowed_uploaders: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    dateRange: '7d',
    player: 'all',
    map: 'all'
  })

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    if (guildId) {
      fetchPerformanceData()
      fetchSettings()
    }
  }, [guildId, filters])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Get the team connected to this guild
      const { data: serverData } = await supabase
        .from('discord_servers')
        .select('connected_team_id')
        .eq('guild_id', guildId)
        .single()

      if (!serverData?.connected_team_id) {
        setRecords([])
        return
      }

      // Build date filter
      let dateFilter = new Date()
      switch (filters.dateRange) {
        case '7d':
          dateFilter.setDate(dateFilter.getDate() - 7)
          break
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30)
          break
        case '90d':
          dateFilter.setDate(dateFilter.getDate() - 90)
          break
        default:
          dateFilter.setFullYear(dateFilter.getFullYear() - 1)
      }

      let query = supabase
        .from('performance_records')
        .select(`
          id,
          player_id,
          team_id,
          match_number,
          map,
          placement,
          kills,
          assists,
          damage,
          survival_time,
          slot,
          created_at,
          ai_analysis,
          users:player_id (
            name,
            display_name
          )
        `)
        .eq('team_id', serverData.connected_team_id)
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.player !== 'all') {
        query = query.eq('player_id', filters.player)
      }
      if (filters.map !== 'all') {
        query = query.eq('map', filters.map)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error

      setRecords(data || [])

      // Calculate stats
      const totalRecords = data?.length || 0
      const thisWeekRecords = data?.filter(r => 
        new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0
      
      const averageKills = totalRecords > 0 
        ? Math.round((data?.reduce((sum, r) => sum + r.kills, 0) || 0) / totalRecords * 10) / 10
        : 0
      
      const averageDamage = totalRecords > 0 
        ? Math.round((data?.reduce((sum, r) => sum + r.damage, 0) || 0) / totalRecords)
        : 0

      const aiAnalysisCount = data?.filter(r => r.ai_analysis).length || 0

      // Find top performer
      const playerStats = data?.reduce((acc: any, record) => {
        const playerId = record.player_id
        if (!acc[playerId]) {
          acc[playerId] = {
            name: record.users?.[0]?.display_name || record.users?.[0]?.name || 'Unknown',
            totalKills: 0,
            totalDamage: 0,
            matches: 0
          }
        }
        acc[playerId].totalKills += record.kills
        acc[playerId].totalDamage += record.damage
        acc[playerId].matches += 1
        return acc
      }, {})

      let topPerformer = ''
      if (playerStats) {
        const topPlayer = Object.entries(playerStats).reduce((top: any, [id, stats]: [string, any]) => {
          const avgKills = stats.totalKills / stats.matches
          const topAvgKills = top ? top.stats.totalKills / top.stats.matches : 0
          return avgKills > topAvgKills ? { id, stats } : top
        }, null)
        topPerformer = topPlayer?.stats.name || ''
      }

      setStats({
        totalRecords,
        thisWeekRecords,
        averageKills,
        averageDamage,
        topPerformer,
        aiAnalysisCount
      })

    } catch (error) {
      console.error('Error fetching performance data:', error)
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      // Get settings from discord_servers or a dedicated settings table
      const { data: serverData } = await supabase
        .from('discord_servers')
        .select('settings')
        .eq('guild_id', guildId)
        .single()

      if (serverData?.settings?.performance) {
        setSettings({
          ...settings,
          ...serverData.settings.performance
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleSaveSettings = async () => {
    if (!canManage) {
      toast.error('You do not have permission to modify settings')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          settings: {
            performance: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Performance settings saved')

    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTriggerAnalysis = async (recordId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to trigger analysis')
      return
    }

    try {
      setAnalyzing(recordId)

      const response = await fetch('/api/discord/performance/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record_id: recordId })
      })

      if (!response.ok) throw new Error('Analysis failed')

      toast.success('AI analysis triggered successfully')
      await fetchPerformanceData()

    } catch (error) {
      console.error('Error triggering analysis:', error)
      toast.error('Failed to trigger AI analysis')
    } finally {
      setAnalyzing(null)
    }
  }

  const handleExportData = async () => {
    try {
      const csvData = records.map(record => ({
        Date: new Date(record.created_at).toLocaleDateString(),
        Player: record.users?.[0]?.display_name || record.users?.[0]?.name || 'Unknown',
        Map: record.map,
        Placement: record.placement,
        Kills: record.kills,
        Assists: record.assists,
        Damage: record.damage,
        'Survival Time': record.survival_time,
        Slot: record.slot
      }))

      const csv = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-data-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Performance data exported')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Performance System
          </h2>
          <p className="text-muted-foreground">
            Manage OCR uploads, AI analysis, and performance tracking
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={records.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button
            variant="outline"
            onClick={fetchPerformanceData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
              </div>
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{stats.thisWeekRecords}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Kills</p>
                <p className="text-2xl font-bold">{stats.averageKills}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Damage</p>
                <p className="text-2xl font-bold">{stats.averageDamage}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Analyzed</p>
                <p className="text-2xl font-bold">{stats.aiAnalysisCount}</p>
              </div>
              <Brain className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold truncate">{stats.topPerformer || 'N/A'}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Performance Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OCR Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">OCR Upload System</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable OCR Uploads</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow players to upload performance screenshots
                  </p>
                </div>
                <Switch
                  checked={settings.ocr_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, ocr_enabled: checked }))
                  }
                  disabled={!canManage}
                />
              </div>
            </div>

            {/* AI Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AI Analysis</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable AI Analysis</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate AI summaries for performance data
                  </p>
                </div>
                <Switch
                  checked={settings.ai_analysis_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, ai_analysis_enabled: checked }))
                  }
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto Analysis</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically analyze new uploads
                  </p>
                </div>
                <Switch
                  checked={settings.auto_analysis}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, auto_analysis: checked }))
                  }
                  disabled={!canManage || !settings.ai_analysis_enabled}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Analysis Threshold</Label>
                <Input
                  type="number"
                  value={settings.analysis_threshold}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      analysis_threshold: parseInt(e.target.value) || 5 
                    }))
                  }
                  disabled={!canManage}
                  min="1"
                  max="50"
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum records before triggering batch analysis
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Date Range:</Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Performance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.length > 0 ? (
              records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <div className="font-medium">
                        {record.users?.display_name || record.users?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{record.map}</div>
                      <div className="text-xs text-muted-foreground">Map</div>
                    </div>
                    <div>
                      <div className="font-medium">#{record.placement}</div>
                      <div className="text-xs text-muted-foreground">Placement</div>
                    </div>
                    <div>
                      <div className="font-medium">{record.kills}/{record.assists}</div>
                      <div className="text-xs text-muted-foreground">K/A</div>
                    </div>
                    <div>
                      <div className="font-medium">{record.damage.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Damage</div>
                    </div>
                    <div>
                      <div className="font-medium">{record.survival_time}s</div>
                      <div className="text-xs text-muted-foreground">Survival</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {record.ai_analysis ? (
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Analyzed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No Analysis
                      </Badge>
                    )}
                    
                    {canManage && !record.ai_analysis && settings.ai_analysis_enabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTriggerAnalysis(record.id)}
                        disabled={analyzing === record.id}
                        className="flex items-center gap-1"
                      >
                        <Brain className={`w-3 h-3 ${analyzing === record.id ? 'animate-pulse' : ''}`} />
                        {analyzing === record.id ? 'Analyzing...' : 'Analyze'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No performance records found</p>
                <p className="text-sm text-muted-foreground">
                  Records will appear here when players upload performance data
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Notice */}
      {!canManage && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            You have read-only access to performance data. Contact an administrator to modify settings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}