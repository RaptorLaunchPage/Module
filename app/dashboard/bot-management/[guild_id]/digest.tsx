'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Clock,
  Send,
  Eye,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle,
  Activity,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface GuildSettings {
  digest_enabled: boolean
  digest_schedule: 'daily' | 'weekly' | 'both'
  digest_webhook_url: string
  digest_time: string
  last_digest_sent: string | null
}

interface DigestData {
  digest_type: string
  period: {
    from: string
    to: string
    days: number
  }
  team_info: {
    guild_id: string
    team_id: string | null
    team_name: string
  }
  summary: {
    performance: {
      total_matches: number
      total_kills: number
      total_damage: number
      avg_placement: string
      best_placement: number | null
      top_performer: {
        username: string
        kills: number
        damage: number
        matches: number
      } | null
    }
    attendance: {
      total_records: number
      present: number
      late: number
      absent: number
      unique_players: number
      attendance_rate: string
    }
    highlights: string[]
  }
  generated_at: string
}

export default function DigestPage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [settings, setSettings] = useState<GuildSettings>({
    digest_enabled: false,
    digest_schedule: 'daily',
    digest_webhook_url: '',
    digest_time: '09:00',
    last_digest_sent: null
  })
  const [previewData, setPreviewData] = useState<DigestData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    if (guildId) {
      fetchSettings()
    }
  }, [guildId])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('discord_servers')
        .select('settings')
        .eq('guild_id', guildId)
        .single()

      if (error) throw error

      const guildSettings = data.settings || {}
      setSettings({
        digest_enabled: guildSettings.digest_enabled || false,
        digest_schedule: guildSettings.digest_schedule || 'daily',
        digest_webhook_url: guildSettings.digest_webhook_url || '',
        digest_time: guildSettings.digest_time || '09:00',
        last_digest_sent: guildSettings.last_digest_sent || null
      })

    } catch (error) {
      console.error('Error fetching digest settings:', error)
      toast.error('Failed to load digest settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!canManage) {
      toast.error('You do not have permission to modify digest settings')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          settings: {
            ...settings,
            updated_at: new Date().toISOString()
          }
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Digest settings saved successfully')

    } catch (error) {
      console.error('Error saving digest settings:', error)
      toast.error('Failed to save digest settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewDigest = async (type: 'daily' | 'weekly') => {
    try {
      setPreviewLoading(true)
      
      const response = await fetch(`/api/discord/digest?guild_id=${guildId}&type=${type}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RAPTOR_BOT_API_KEY}`
        }
      })

      if (!response.ok) throw new Error('Failed to generate preview')

      const data = await response.json()
      setPreviewData(data)

    } catch (error) {
      console.error('Error generating digest preview:', error)
      toast.error('Failed to generate digest preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleTestDigest = async () => {
    if (!canManage) {
      toast.error('You do not have permission to test digest')
      return
    }

    if (!settings.digest_webhook_url) {
      toast.error('Please set a webhook URL first')
      return
    }

    try {
      setTesting(true)

      const response = await fetch('/api/discord/digest/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RAPTOR_BOT_API_KEY}`
        },
        body: JSON.stringify({
          guild_id: guildId,
          webhook_url: settings.digest_webhook_url,
          type: settings.digest_schedule
        })
      })

      if (!response.ok) throw new Error('Test failed')

      toast.success('Test digest sent successfully!')

    } catch (error) {
      console.error('Error testing digest:', error)
      toast.error('Failed to send test digest')
    } finally {
      setTesting(false)
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily Digest Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configure automated daily and weekly digest reports for your Discord server.
            Digests include performance summaries, attendance reports, and team highlights.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Digest Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="digest-enabled"
                  checked={settings.digest_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, digest_enabled: checked }))
                  }
                  disabled={!canManage}
                />
                <Label htmlFor="digest-enabled">Enable Daily Digest</Label>
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-2">
                <Label>Digest Schedule</Label>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'both'] as const).map((schedule) => (
                    <Button
                      key={schedule}
                      variant={settings.digest_schedule === schedule ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, digest_schedule: schedule }))}
                      disabled={!canManage}
                      className="capitalize"
                    >
                      {schedule}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Daily: Every day at set time | Weekly: Every Monday | Both: Daily + weekly summary on Monday
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Discord Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={settings.digest_webhook_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, digest_webhook_url: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  disabled={!canManage}
                />
                <p className="text-sm text-muted-foreground">
                  Webhook URL for the channel where digest messages will be sent
                </p>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <Label htmlFor="digest-time">Delivery Time (UTC)</Label>
                <Input
                  id="digest-time"
                  type="time"
                  value={settings.digest_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, digest_time: e.target.value }))}
                  disabled={!canManage}
                  className="max-w-xs"
                />
              </div>

              {/* Last Sent */}
              {settings.last_digest_sent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Last digest sent: {new Date(settings.last_digest_sent).toLocaleString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={!canManage || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>

                <Button
                  onClick={handleTestDigest}
                  disabled={!canManage || testing || !settings.digest_webhook_url}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {testing ? 'Sending...' : 'Test Digest'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {/* Preview Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Digest Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePreviewDigest('daily')}
                  disabled={previewLoading}
                  variant="outline"
                  size="sm"
                >
                  Preview Daily
                </Button>
                <Button
                  onClick={() => handlePreviewDigest('weekly')}
                  disabled={previewLoading}
                  variant="outline"
                  size="sm"
                >
                  Preview Weekly
                </Button>
                {previewLoading && (
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview Content */}
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Digest Preview - {previewData.digest_type}</span>
                  <Badge variant="outline">
                    {previewData.period.days} day{previewData.period.days !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Team Performance */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Performance Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{previewData.summary.performance.total_matches}</div>
                      <div className="text-sm text-muted-foreground">Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{previewData.summary.performance.total_kills}</div>
                      <div className="text-sm text-muted-foreground">Total Kills</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">#{previewData.summary.performance.avg_placement}</div>
                      <div className="text-sm text-muted-foreground">Avg Placement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {previewData.summary.performance.best_placement || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Best Placement</div>
                    </div>
                  </div>
                  
                  {previewData.summary.performance.top_performer && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium">Top Performer</div>
                      <div className="text-lg">
                        <strong>{previewData.summary.performance.top_performer.username}</strong> - {previewData.summary.performance.top_performer.kills} kills
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Attendance Summary */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Attendance Overview
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{previewData.summary.attendance.present}</div>
                      <div className="text-sm text-muted-foreground">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{previewData.summary.attendance.late}</div>
                      <div className="text-sm text-muted-foreground">Late</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{previewData.summary.attendance.absent}</div>
                      <div className="text-sm text-muted-foreground">Absent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{previewData.summary.attendance.attendance_rate}</div>
                      <div className="text-sm text-muted-foreground">Rate</div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Highlights */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Highlights
                  </h3>
                  {previewData.summary.highlights.length > 0 ? (
                    <ul className="space-y-1">
                      {previewData.summary.highlights.map((highlight, index) => (
                        <li key={index} className="text-sm">• {highlight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notable highlights for this period</p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Generated at: {new Date(previewData.generated_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Digest History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Digest history tracking is coming soon. This will show past digest deliveries and their status.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permissions Notice */}
      {!canManage && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            You have read-only access to digest settings. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}