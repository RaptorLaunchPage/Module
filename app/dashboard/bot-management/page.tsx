'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Server, 
  Users, 
  Bot, 
  Activity, 
  Settings, 
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthV2 } from '@/hooks/use-auth-v2'
import { DashboardPermissions } from '@/lib/dashboard-permissions'

interface DiscordServer {
  id: string
  guild_id: string
  guild_name: string
  guild_icon: string | null
  connected_team_id: string | null
  last_sync: string | null
  enabled_modules: string[]
  member_count: number | null
  is_active: boolean
  teams?: {
    id: string
    name: string
    tier: string
  }
}

interface BotStats {
  totalServers: number
  activeServers: number
  totalModules: number
  aiUsageThisMonth: number
}

export default function BotManagementOverview() {
  const { profile } = useAuthV2()
  const [servers, setServers] = useState<DiscordServer[]>([])
  const [stats, setStats] = useState<BotStats>({
    totalServers: 0,
    activeServers: 0,
    totalModules: 0,
    aiUsageThisMonth: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    fetchServersAndStats()
  }, [profile?.team_id])

  const fetchServersAndStats = async () => {
    try {
      setLoading(true)

      // Build query based on user role
      let query = supabase
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
          teams:connected_team_id (
            id,
            name,
            tier
          )
        `)

      // Filter by team if not admin/manager
      if (!DashboardPermissions.shouldSeeAllData(profile?.role) && profile?.team_id) {
        query = query.eq('connected_team_id', profile.team_id)
      }

      const { data: serversData, error } = await query
        .order('guild_name', { ascending: true })

      if (error) throw error

      setServers(serversData || [])

      // Calculate stats
      const totalServers = serversData?.length || 0
      const activeServers = serversData?.filter(s => s.is_active).length || 0
      const totalModules = serversData?.reduce((sum, s) => sum + (s.enabled_modules?.length || 0), 0) || 0

      // Get AI usage stats (simplified for now)
      const aiUsageThisMonth = Math.floor(Math.random() * 1000) // TODO: Implement actual AI usage tracking

      setStats({
        totalServers,
        activeServers,
        totalModules,
        aiUsageThisMonth
      })

    } catch (error) {
      console.error('Error fetching servers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredServers = servers.filter(server =>
    server.guild_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.teams?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      performance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      attendance: 'bg-green-500/10 text-green-400 border-green-500/20',
      tryouts: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      digest: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      scrims: 'bg-red-500/10 text-red-400 border-red-500/20',
      tournaments: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    }
    return colors[module] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  const getServerStatus = (server: DiscordServer) => {
    if (!server.is_active) {
      return { icon: XCircle, color: 'text-red-400', label: 'Inactive' }
    }
    if (!server.last_sync || new Date(server.last_sync) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return { icon: AlertCircle, color: 'text-yellow-400', label: 'Sync Issues' }
    }
    return { icon: CheckCircle, color: 'text-green-400', label: 'Active' }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Servers</p>
                <p className="text-2xl font-bold">{stats.totalServers}</p>
              </div>
              <Server className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Servers</p>
                <p className="text-2xl font-bold">{stats.activeServers}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Modules</p>
                <p className="text-2xl font-bold">{stats.totalModules}</p>
              </div>
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Usage (Month)</p>
                <p className="text-2xl font-bold">{stats.aiUsageThisMonth}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search servers by name or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={fetchServersAndStats}
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Servers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredServers.map((server) => {
          const status = getServerStatus(server)
          const StatusIcon = status.icon

          return (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {server.guild_icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${server.guild_id}/${server.guild_icon}.png`}
                        alt={server.guild_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Server className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{server.guild_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-sm ${status.color}`}>{status.label}</span>
                        {server.member_count && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {server.member_count}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Link href={`/dashboard/bot-management/${server.guild_id}`}>
                    <Button size="sm" className="shrink-0">
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Connected Team */}
                {server.teams && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Connected Team</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{server.teams.name}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {server.teams.tier}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Enabled Modules */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">
                    Enabled Modules ({server.enabled_modules?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {server.enabled_modules?.length ? (
                      server.enabled_modules.map((module) => (
                        <Badge
                          key={module}
                          variant="outline"
                          className={`text-xs ${getModuleColor(module)}`}
                        >
                          {module}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No modules enabled</span>
                    )}
                  </div>
                </div>

                {/* Last Sync */}
                {server.last_sync && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      Last sync: {new Date(server.last_sync).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredServers.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Discord Servers Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'No servers match your search criteria.'
                : 'Connect RaptorBot to Discord servers to manage them here.'
              }
            </p>
            {!searchTerm && (
              <Button variant="outline" asChild>
                <Link href="/dashboard/discord-portal">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to Discord Portal
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}