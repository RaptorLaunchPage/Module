'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  Server, 
  Settings, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface GuildData {
  id: string
  guild_id: string
  guild_name: string
  guild_icon: string | null
  connected_team_id: string | null
  last_sync: string | null
  enabled_modules: string[]
  member_count: number | null
  is_active: boolean
  bot_nickname: string | null
  settings: Record<string, any>
  teams?: {
    id: string
    name: string
    tier: string
  }[]
}

const AVAILABLE_MODULES = [
  {
    id: 'performance',
    name: 'Performance Tracking',
    description: 'OCR-based performance data upload and AI analysis',
    icon: '📊',
    requiresPremium: false
  },
  {
    id: 'attendance',
    name: 'Attendance System',
    description: 'Track practice and match attendance with AI summaries',
    icon: '📅',
    requiresPremium: false
  },
  {
    id: 'tryouts',
    name: 'Tryout Management',
    description: 'Manage player recruitment and evaluations',
    icon: '👥',
    requiresPremium: false
  },
  {
    id: 'digest',
    name: 'Daily Digest',
    description: 'Automated daily summaries and reports',
    icon: '📰',
    requiresPremium: false
  },
  {
    id: 'scrims',
    name: 'Scrim Manager',
    description: 'Create and manage scrim tournaments',
    icon: '⚔️',
    requiresPremium: true
  },
  {
    id: 'tournaments',
    name: 'Tournament System',
    description: 'Full tournament management with brackets',
    icon: '🏆',
    requiresPremium: true
  }
]

export default function GuildBotControls() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [guildData, setGuildData] = useState<GuildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [botNickname, setBotNickname] = useState('')
  const [enabledModules, setEnabledModules] = useState<string[]>([])

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    if (guildId) {
      fetchGuildData()
    }
  }, [guildId])

  const fetchGuildData = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('discord_servers')
        .select(`
          id,
          guild_id,
          guild_name,
          guild_icon,
          connected_team_id,
          last_sync,
          enabled_modules,
          member_count,
          is_active,
          bot_nickname,
          settings,
          teams:connected_team_id (
            id,
            name,
            tier
          )
        `)
        .eq('guild_id', guildId)
        .single()

      if (error) throw error

      setGuildData(data)
      setBotNickname(data.bot_nickname || '')
      setEnabledModules(data.enabled_modules || [])

    } catch (error) {
      console.error('Error fetching guild data:', error)
      toast.error('Failed to load server data')
    } finally {
      setLoading(false)
    }
  }

  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    if (!canManage) {
      toast.error('You do not have permission to modify bot settings')
      return
    }

    setEnabledModules(prev => 
      enabled 
        ? [...prev, moduleId]
        : prev.filter(id => id !== moduleId)
    )
  }

  const handleSaveSettings = async () => {
    if (!canManage || !guildData) {
      toast.error('You do not have permission to modify bot settings')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          bot_nickname: botNickname || null,
          enabled_modules: enabledModules,
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Bot settings saved successfully')
      await fetchGuildData() // Refresh data

    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save bot settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncBot = async () => {
    if (!canManage) {
      toast.error('You do not have permission to sync the bot')
      return
    }

    try {
      setSaving(true)

      // Call bot sync API
      const response = await fetch(`/api/discord/sync-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      if (!response.ok) throw new Error('Sync failed')

      toast.success('Bot sync initiated successfully')
      await fetchGuildData() // Refresh data

    } catch (error) {
      console.error('Error syncing bot:', error)
      toast.error('Failed to sync bot')
    } finally {
      setSaving(false)
    }
  }

  const handleKickBot = async () => {
    if (!canManage || profile?.role !== 'admin') {
      toast.error('You do not have permission to remove the bot')
      return
    }

    if (!confirm('Are you sure you want to remove RaptorBot from this server? This action cannot be undone.')) {
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Bot removed from server')
      await fetchGuildData()

    } catch (error) {
      console.error('Error removing bot:', error)
      toast.error('Failed to remove bot')
    } finally {
      setSaving(false)
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

  if (!guildData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Server className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Server Not Found</h3>
          <p className="text-muted-foreground">
            This Discord server is not connected to the CRM or you don't have access to it.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    if (!guildData.is_active) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Inactive
      </Badge>
    }
    
    const lastSync = guildData.last_sync ? new Date(guildData.last_sync) : null
    const isStale = !lastSync || lastSync < new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    if (isStale) {
      return <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-600">
        <AlertTriangle className="w-3 h-3" />
        Sync Issues
      </Badge>
    }
    
    return <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
      <CheckCircle className="w-3 h-3" />
      Active
    </Badge>
  }

  return (
    <div className="space-y-6">
      {/* Server Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {guildData.guild_icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guildData.guild_id}/${guildData.guild_icon}.png`}
                  alt={guildData.guild_name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Server className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">{guildData.guild_name}</CardTitle>
                <div className="flex items-center gap-4 mt-2">
                  {getStatusBadge()}
                  {guildData.member_count && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {guildData.member_count} members
                    </div>
                  )}
                  {guildData.last_sync && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Last sync: {new Date(guildData.last_sync).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSyncBot}
                disabled={!canManage || saving}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                Sync Bot
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {guildData.teams && guildData.teams[0] && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Connected Team:</span>
              <Badge variant="outline">{guildData.teams[0].name}</Badge>
              <Badge variant="secondary" className="text-xs">
                {guildData.teams[0].tier}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bot Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bot Nickname */}
          <div className="space-y-2">
            <Label htmlFor="bot-nickname">Bot Nickname</Label>
            <Input
              id="bot-nickname"
              value={botNickname}
              onChange={(e) => setBotNickname(e.target.value)}
              placeholder="RaptorBot"
              disabled={!canManage}
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              Set a custom nickname for the bot in this server
            </p>
          </div>

          <Separator />

          {/* Module Toggles */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Bot Modules</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enable or disable specific bot features for this server
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_MODULES.map((module) => {
                const isEnabled = enabledModules.includes(module.id)
                const isPremium = module.requiresPremium
                const canToggle = canManage && (!isPremium || guildData.teams?.[0]?.tier !== 'Free')

                return (
                  <Card key={module.id} className={`relative ${!canToggle ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{module.icon}</span>
                            <h4 className="font-semibold">{module.name}</h4>
                            {isPremium && (
                              <Badge variant="secondary" className="text-xs">
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                          disabled={!canToggle}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveSettings}
                disabled={!canManage || saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            {profile?.role === 'admin' && (
              <Button
                onClick={handleKickBot}
                disabled={saving}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove Bot
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Notice */}
      {!canManage && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            You have read-only access to this server's bot settings. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}