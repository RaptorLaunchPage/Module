'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  ExternalLink,
  Activity,
  MessageSquare
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface WebhookData {
  id: string
  hook_url: string
  type: 'team' | 'admin' | 'global'
  channel_name: string | null
  active: boolean
  created_at: string
  team_id: string | null
  teams?: {
    name: string
  }
}

interface CommunicationLog {
  id: string
  webhook_id: string
  message_type: string
  status: 'success' | 'failed' | 'pending' | 'retry'
  payload: any
  response_code: number | null
  error_message: string | null
  retry_count: number
  created_at: string
}

interface CreateWebhookData {
  hook_url: string
  type: 'team' | 'admin' | 'global'
  channel_name: string
}

const WEBHOOK_TYPES = {
  team: { label: 'Team Channel', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', description: 'General team notifications' },
  admin: { label: 'Admin Channel', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', description: 'Administrative alerts' },
  global: { label: 'Global Channel', color: 'bg-green-500/10 text-green-400 border-green-500/20', description: 'System-wide notifications' }
}

const LOG_STATUSES = {
  success: { label: 'Success', color: 'text-green-400', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircle },
  pending: { label: 'Pending', color: 'text-yellow-400', icon: Clock },
  retry: { label: 'Retrying', color: 'text-orange-400', icon: Activity }
}

export default function WebhooksManager() {
  const params = useParams()
  const { profile } = useAuthV2()
  const guildId = params.guild_id as string
  
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [logs, setLogs] = useState<CommunicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newWebhook, setNewWebhook] = useState<CreateWebhookData>({
    hook_url: '',
    type: 'team',
    channel_name: ''
  })

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    if (guildId) {
      fetchWebhooks()
      fetchLogs()
    }
  }, [guildId])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      
      // First get the team connected to this guild
      const { data: serverData } = await supabase
        .from('discord_servers')
        .select('connected_team_id')
        .eq('guild_id', guildId)
        .single()

      if (!serverData?.connected_team_id) {
        setWebhooks([])
        return
      }

      const { data, error } = await supabase
        .from('discord_webhooks')
        .select(`
          id,
          hook_url,
          type,
          channel_name,
          active,
          created_at,
          team_id,
          teams:team_id (
            name
          )
        `)
        .eq('team_id', serverData.connected_team_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setWebhooks(data || [])

    } catch (error) {
      console.error('Error fetching webhooks:', error)
      toast.error('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      
      // Get logs for all webhooks associated with this guild's team
      const { data: serverData } = await supabase
        .from('discord_servers')
        .select('connected_team_id')
        .eq('guild_id', guildId)
        .single()

      if (!serverData?.connected_team_id) {
        setLogs([])
        return
      }

      const { data, error } = await supabase
        .from('communication_logs')
        .select(`
          id,
          webhook_id,
          message_type,
          status,
          payload,
          response_code,
          error_message,
          retry_count,
          created_at
        `)
        .eq('team_id', serverData.connected_team_id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setLogs(data || [])

    } catch (error) {
      console.error('Error fetching logs:', error)
      toast.error('Failed to load delivery logs')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleCreateWebhook = async () => {
    if (!canManage) {
      toast.error('You do not have permission to create webhooks')
      return
    }

    if (!newWebhook.hook_url || !newWebhook.channel_name) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate webhook URL format
    if (!newWebhook.hook_url.includes('discord.com/api/webhooks/')) {
      toast.error('Please enter a valid Discord webhook URL')
      return
    }

    try {
      setCreating(true)

      // Get the team ID for this guild
      const { data: serverData } = await supabase
        .from('discord_servers')
        .select('connected_team_id')
        .eq('guild_id', guildId)
        .single()

      if (!serverData?.connected_team_id) {
        throw new Error('No team connected to this server')
      }

      const { error } = await supabase
        .from('discord_webhooks')
        .insert({
          hook_url: newWebhook.hook_url,
          type: newWebhook.type,
          channel_name: newWebhook.channel_name,
          active: true,
          team_id: serverData.connected_team_id,
          created_by: profile?.id
        })

      if (error) throw error

      toast.success('Webhook created successfully')
      setShowCreateDialog(false)
      setNewWebhook({
        hook_url: '',
        type: 'team',
        channel_name: ''
      })
      await fetchWebhooks()

    } catch (error) {
      console.error('Error creating webhook:', error)
      toast.error('Failed to create webhook')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleWebhook = async (webhookId: string, active: boolean) => {
    if (!canManage) {
      toast.error('You do not have permission to modify webhooks')
      return
    }

    try {
      const { error } = await supabase
        .from('discord_webhooks')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', webhookId)

      if (error) throw error

      toast.success(`Webhook ${active ? 'enabled' : 'disabled'}`)
      await fetchWebhooks()

    } catch (error) {
      console.error('Error updating webhook:', error)
      toast.error('Failed to update webhook')
    }
  }

  const handleTestWebhook = async (webhookId: string, hookUrl: string) => {
    if (!canManage) {
      toast.error('You do not have permission to test webhooks')
      return
    }

    try {
      setTesting(webhookId)

      const testMessage = {
        embeds: [{
          title: '🤖 RaptorBot Test Message',
          description: 'This is a test message from the CRM bot management system.',
          color: 0x00ff00,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Raptors Esports CRM'
          }
        }]
      }

      const response = await fetch(hookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      toast.success('Test message sent successfully')
      
      // Log the test
      await supabase
        .from('communication_logs')
        .insert({
          webhook_id: webhookId,
          message_type: 'test_message',
          status: 'success',
          payload: testMessage,
          response_code: response.status,
          team_id: webhooks.find(w => w.id === webhookId)?.team_id
        })

      await fetchLogs()

    } catch (error: any) {
      console.error('Error testing webhook:', error)
      toast.error(`Test failed: ${error.message}`)
      
      // Log the failure
      await supabase
        .from('communication_logs')
        .insert({
          webhook_id: webhookId,
          message_type: 'test_message',
          status: 'failed',
          payload: { test: true },
          error_message: error.message,
          team_id: webhooks.find(w => w.id === webhookId)?.team_id
        })

      await fetchLogs()
    } finally {
      setTesting(null)
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!canManage || profile?.role !== 'admin') {
      toast.error('You do not have permission to delete webhooks')
      return
    }

    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('discord_webhooks')
        .delete()
        .eq('id', webhookId)

      if (error) throw error

      toast.success('Webhook deleted successfully')
      await fetchWebhooks()
      await fetchLogs()

    } catch (error) {
      console.error('Error deleting webhook:', error)
      toast.error('Failed to delete webhook')
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
            <Webhook className="w-6 h-6" />
            Webhook Configuration
          </h2>
          <p className="text-muted-foreground">
            Manage Discord webhooks for bot notifications and messages
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              disabled={!canManage}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL *</Label>
                <Input
                  id="webhook-url"
                  value={newWebhook.hook_url}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, hook_url: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <p className="text-xs text-muted-foreground">
                  Copy the webhook URL from your Discord channel settings
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-type">Type *</Label>
                  <Select
                    value={newWebhook.type}
                    onValueChange={(value: 'team' | 'admin' | 'global') => 
                      setNewWebhook(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WEBHOOK_TYPES).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel-name">Channel Name *</Label>
                  <Input
                    id="channel-name"
                    value={newWebhook.channel_name}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, channel_name: e.target.value }))}
                    placeholder="general"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWebhook}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Add Webhook'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {webhooks.map((webhook) => {
          const webhookType = WEBHOOK_TYPES[webhook.type]
          
          return (
            <Card key={webhook.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      #{webhook.channel_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={webhookType.color}>
                        {webhookType.label}
                      </Badge>
                      <Badge variant={webhook.active ? 'default' : 'secondary'}>
                        {webhook.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestWebhook(webhook.id, webhook.hook_url)}
                      disabled={!canManage || testing === webhook.id || !webhook.active}
                    >
                      <Send className={`w-4 h-4 mr-1 ${testing === webhook.id ? 'animate-pulse' : ''}`} />
                      {testing === webhook.id ? 'Testing...' : 'Test'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Webhook URL (masked) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={webhook.hook_url.replace(/\/([^\/]+)\/([^\/]+)$/, '/****/****')}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(webhook.hook_url.split('/').slice(0, -2).join('/'), '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Team Info */}
                {webhook.teams && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Team:</span>
                    <Badge variant="outline">{webhook.teams.name}</Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(webhook.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleWebhook(webhook.id, !webhook.active)}
                        >
                          {webhook.active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {profile?.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {webhooks.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Webhook className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Webhooks Configured</h3>
            <p className="text-muted-foreground mb-4">
              Add Discord webhooks to receive bot notifications in your server channels.
            </p>
            {canManage && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Webhook
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Delivery Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Delivery Logs
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={logsLoading}
            >
              {logsLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.length > 0 ? (
              logs.map((log) => {
                const status = LOG_STATUSES[log.status]
                const StatusIcon = status.icon
                
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <div>
                        <div className="font-medium text-sm">{log.message_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${status.color}`}>
                        {status.label}
                      </Badge>
                      {log.response_code && (
                        <Badge variant="secondary" className="text-xs">
                          {log.response_code}
                        </Badge>
                      )}
                      {log.retry_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Retry #{log.retry_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No delivery logs yet</p>
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
            You have read-only access to webhook configuration. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}