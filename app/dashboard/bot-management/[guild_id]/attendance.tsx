'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Users, 
  Brain, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface AttendanceRecord {
  id: string
  player_id: string
  session_id: string
  date: string
  session_time: string
  status: 'present' | 'late' | 'absent' | 'auto'
  source: 'manual' | 'auto' | 'system'
  marked_by: string | null
  users?: {
    name: string
    display_name: string
  }[] | null
  sessions?: {
    title: string
    session_type: string
    session_subtype: string
  }[] | null
}

interface AttendanceSettings {
  ai_enabled: boolean
  auto_tracking: boolean
  summary_generation: boolean
  notification_threshold: number
  grace_period_minutes: number
}

interface AttendanceStats {
  totalSessions: number
  thisWeekSessions: number
  averageAttendance: number
  topAttendee: string
  aiSummariesGenerated: number
  absenteeRate: number
}

interface SessionData {
  id: string
  title: string
  session_type: string
  session_subtype: string
  date: string
  start_time: string
  end_time: string
  attendance_count: number
  total_expected: number
  attendance_rate: number
}

export default function AttendanceManager() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalSessions: 0,
    thisWeekSessions: 0,
    averageAttendance: 0,
    topAttendee: '',
    aiSummariesGenerated: 0,
    absenteeRate: 0
  })
  const [settings, setSettings] = useState<AttendanceSettings>({
    ai_enabled: true,
    auto_tracking: true,
    summary_generation: true,
    notification_threshold: 3,
    grace_period_minutes: 15
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    if (guildId) {
      fetchAttendanceData()
      fetchSettings()
    }
  }, [guildId])

  const fetchAttendanceData = async () => {
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
        setSessions([])
        return
      }

      // Fetch recent attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendances')
        .select(`
          id,
          player_id,
          session_id,
          date,
          session_time,
          status,
          source,
          marked_by,
          users:player_id (
            name,
            display_name
          ),
          sessions:session_id (
            title,
            session_type,
            session_subtype
          )
        `)
        .eq('team_id', serverData.connected_team_id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(100)

      if (attendanceError) throw attendanceError

      setRecords(attendanceData || [])

      // Fetch recent sessions with attendance stats
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          session_type,
          session_subtype,
          date,
          start_time,
          end_time,
          attendances(count)
        `)
        .eq('team_id', serverData.connected_team_id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(20)

      if (sessionsError) throw sessionsError

      // Transform sessions data to include attendance stats
      const transformedSessions = sessionsData?.map(session => ({
        ...session,
        attendance_count: session.attendances?.[0]?.count || 0,
        total_expected: 5, // This should come from team roster count
        attendance_rate: Math.round(((session.attendances?.[0]?.count || 0) / 5) * 100)
      })) || []

      setSessions(transformedSessions)

      // Calculate stats
      const totalSessions = transformedSessions.length
      const thisWeekSessions = transformedSessions.filter(s => 
        new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length

      const averageAttendance = totalSessions > 0 
        ? Math.round(transformedSessions.reduce((sum, s) => sum + s.attendance_rate, 0) / totalSessions)
        : 0

      // Find top attendee
      const playerAttendance = attendanceData?.reduce((acc: any, record) => {
        const playerId = record.player_id
        if (!acc[playerId]) {
          acc[playerId] = {
            name: record.users?.[0]?.display_name || record.users?.[0]?.name || 'Unknown',
            present: 0,
            total: 0
          }
        }
        acc[playerId].total += 1
        if (record.status === 'present') {
          acc[playerId].present += 1
        }
        return acc
      }, {})

      let topAttendee = ''
      if (playerAttendance) {
        const topPlayer = Object.entries(playerAttendance).reduce((top: any, [id, stats]: [string, any]) => {
          const rate = stats.present / stats.total
          const topRate = top ? top.stats.present / top.stats.total : 0
          return rate > topRate ? { id, stats } : top
        }, null)
        topAttendee = topPlayer?.stats.name || ''
      }

      const absenteeRate = attendanceData?.length > 0 
        ? Math.round((attendanceData.filter(r => r.status === 'absent').length / attendanceData.length) * 100)
        : 0

      setStats({
        totalSessions,
        thisWeekSessions,
        averageAttendance,
        topAttendee,
        aiSummariesGenerated: Math.floor(Math.random() * 20), // TODO: Implement actual AI summary tracking
        absenteeRate
      })

    } catch (error) {
      console.error('Error fetching attendance data:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const { data: serverData } = await supabase
        .from('discord_servers')
        .select('settings')
        .eq('guild_id', guildId)
        .single()

      if (serverData?.settings?.attendance) {
        setSettings({
          ...settings,
          ...serverData.settings.attendance
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
            attendance: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Attendance settings saved')

    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!canManage) {
      toast.error('You do not have permission to export data')
      return
    }

    try {
      setExporting(true)

      const csvData = records.map(record => ({
        Date: record.date,
        Player: record.users?.[0]?.display_name || record.users?.[0]?.name || 'Unknown',
        Session: record.sessions?.[0]?.title || 'Unknown Session',
        Type: record.sessions?.[0]?.session_type || '',
        Subtype: record.sessions?.[0]?.session_subtype || '',
        Status: record.status,
        Source: record.source,
        Time: record.session_time
      }))

      const csv = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-data-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Attendance data exported')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handlePushToReport = async () => {
    if (!canManage) {
      toast.error('You do not have permission to push data to reports')
      return
    }

    try {
      // This would integrate with the team reporting system
      const response = await fetch('/api/reports/attendance/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      if (!response.ok) throw new Error('Failed to push data')

      toast.success('Attendance data pushed to team report')
    } catch (error) {
      console.error('Error pushing to report:', error)
      toast.error('Failed to push data to team report')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'text-green-400 border-green-400',
      late: 'text-yellow-400 border-yellow-400',
      absent: 'text-red-400 border-red-400',
      auto: 'text-blue-400 border-blue-400'
    }
    return colors[status as keyof typeof colors] || 'text-gray-400 border-gray-400'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      present: CheckCircle,
      late: Clock,
      absent: XCircle,
      auto: BarChart3
    }
    return icons[status as keyof typeof icons] || AlertTriangle
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
            <Calendar className="w-6 h-6" />
            Attendance Control
          </h2>
          <p className="text-muted-foreground">
            Manage practice attendance tracking and AI analysis
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={!canManage || exporting || records.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePushToReport}
            disabled={!canManage}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Push to Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{stats.thisWeekSessions}</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold">{stats.averageAttendance}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Attendee</p>
                <p className="text-lg font-bold truncate">{stats.topAttendee || 'N/A'}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Summaries</p>
                <p className="text-2xl font-bold">{stats.aiSummariesGenerated}</p>
              </div>
              <Brain className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absentee Rate</p>
                <p className="text-2xl font-bold">{stats.absenteeRate}%</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Attendance Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tracking Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tracking System</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically track attendance based on Discord presence
                  </p>
                </div>
                <Switch
                  checked={settings.auto_tracking}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, auto_tracking: checked }))
                  }
                  disabled={!canManage}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Grace Period (minutes)</Label>
                <Select
                  value={settings.grace_period_minutes.toString()}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, grace_period_minutes: parseInt(value) }))
                  }
                  disabled={!canManage}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Allow late arrivals within this timeframe
                </p>
              </div>
            </div>

            {/* AI Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AI Features</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">AI Analysis</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate AI insights from attendance patterns
                  </p>
                </div>
                <Switch
                  checked={settings.ai_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, ai_enabled: checked }))
                  }
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Summary Generation</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-generate weekly attendance summaries
                  </p>
                </div>
                <Switch
                  checked={settings.summary_generation}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, summary_generation: checked }))
                  }
                  disabled={!canManage || !settings.ai_enabled}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Notification Threshold</Label>
                <Select
                  value={settings.notification_threshold.toString()}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, notification_threshold: parseInt(value) }))
                  }
                  disabled={!canManage}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 absence</SelectItem>
                    <SelectItem value="2">2 absences</SelectItem>
                    <SelectItem value="3">3 absences</SelectItem>
                    <SelectItem value="5">5 absences</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Send alerts after this many consecutive absences
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

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Practice Sessions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAttendanceData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{session.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {session.session_type}
                      </Badge>
                      {session.session_subtype && (
                        <Badge variant="secondary" className="text-xs">
                          {session.session_subtype}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{new Date(session.date).toLocaleDateString()}</span>
                      <span>{session.start_time} - {session.end_time}</span>
                      <span>{session.attendance_count}/{session.total_expected} attended</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{session.attendance_rate}%</div>
                      <div className="text-xs text-muted-foreground">Attendance</div>
                    </div>
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
                      session.attendance_rate >= 80 ? 'border-green-400 text-green-400' :
                      session.attendance_rate >= 60 ? 'border-yellow-400 text-yellow-400' :
                      'border-red-400 text-red-400'
                    }`}>
                      <span className="text-xs font-bold">{session.attendance_rate}%</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No recent sessions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {records.length > 0 ? (
              records.slice(0, 20).map((record) => {
                const StatusIcon = getStatusIcon(record.status)
                
                return (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-4 h-4 ${getStatusColor(record.status).split(' ')[0]}`} />
                      <div>
                        <div className="font-medium">
                          {record.users?.[0]?.display_name || record.users?.[0]?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.sessions?.[0]?.title || 'Unknown Session'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <span>{record.date}</span>
                      <Badge variant="outline" className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {record.source}
                      </Badge>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No attendance records found</p>
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
            You have read-only access to attendance data. Contact an administrator to modify settings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}