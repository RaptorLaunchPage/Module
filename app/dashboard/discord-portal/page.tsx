"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  MessageSquare, 
  Webhook, 
  Settings, 
  Activity, 
  CheckCircle, 
  XCircle,
  Clock,
  Plus,
  AlertTriangle
} from "lucide-react"
import { DashboardPermissions } from "@/lib/dashboard-permissions"

interface CommunicationStats {
  totalMessages: number
  successfulMessages: number
  failedMessages: number
  successRate: number
  messageTypeStats: Record<string, number>
}

export default function CommunicationPage() {
  const { profile, getToken } = useAuth()
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("30days")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  const permissions = DashboardPermissions.getPermissions(profile?.role)

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData()
    }
  }, [profile, selectedTimePeriod, customStartDate, customEndDate])

  const loadDashboardData = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      
      // Calculate date range for time period filtering
      const getDateRange = () => {
        const now = new Date()
        let startDate = null
        
        switch (selectedTimePeriod) {
          case "today":
            startDate = new Date()
            startDate.setHours(0, 0, 0, 0)
            break
          case "7days":
            startDate = new Date()
            startDate.setDate(now.getDate() - 7)
            break
          case "30days":
            startDate = new Date()
            startDate.setDate(now.getDate() - 30)
            break
          case "custom":
            if (customStartDate) {
              startDate = new Date(customStartDate)
            }
            break
          default:
            break
        }
        
        return startDate
      }

      const startDate = getDateRange()
      const logsParams = new URLSearchParams()
      logsParams.append('limit', '100')
      if (startDate) {
        logsParams.append('startDate', startDate.toISOString())
      }
      if (selectedTimePeriod === "custom" && customEndDate) {
        const endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
        logsParams.append('endDate', endDate.toISOString())
      }

      // Load webhooks and stats in parallel
      const [webhooksResponse, logsResponse] = await Promise.all([
        fetch('/api/discord-portal/webhooks', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/discord-portal/logs?${logsParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json()
        setWebhooks(webhooksData || [])
      } else {
        const errorText = await webhooksResponse.text()
        throw new Error(`Failed to load webhooks: ${webhooksResponse.status} ${errorText}`)
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        const logs = logsData || []
        
        // Calculate stats from logs
        const totalMessages = logs.length
        const successfulMessages = logs.filter((log: any) => log.status === 'success').length
        const failedMessages = logs.filter((log: any) => log.status === 'failed').length
        const successRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0

        const messageTypeStats = logs.reduce((acc: Record<string, number>, log: any) => {
          acc[log.message_type] = (acc[log.message_type] || 0) + 1
          return acc
        }, {})

        setStats({
          totalMessages,
          successfulMessages,
          failedMessages,
          successRate,
          messageTypeStats
        })
      } else {
        const errorText = await logsResponse.text()
        throw new Error(`Failed to load message logs: ${logsResponse.status} ${errorText}`)
      }
      
      setDataFetched(true)
    } catch (error) {
      console.error('Error loading Discord Portal dashboard:', error)
      setError('Failed to load Discord Portal data. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

      if (!permissions.viewDiscordPortal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to access the Discord Portal.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading Discord Portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <MessageSquare className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discord Portal</h1>
            <p className="text-muted-foreground">
              Manage Discord notifications, webhooks, and message logs
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Custom Date Range */}
        {selectedTimePeriod === "custom" && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview or No Data State */}
      {!dataFetched || (dataFetched && !stats) || (stats && stats.totalMessages === 0) ? (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <MessageSquare className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Discord Messages Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by setting up webhooks and sending your first Discord notification.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <a href="/dashboard/discord-portal/webhooks">
                  <Webhook className="h-4 w-4 mr-2" />
                  Setup Webhooks
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/dashboard/discord-portal/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Settings
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedTimePeriod === "today" ? "Today" :
               selectedTimePeriod === "7days" ? "Last 7 days" :
               selectedTimePeriod === "30days" ? "Last 30 days" :
               selectedTimePeriod === "custom" ? "Custom range" : "All time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.successfulMessages || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.successRate?.toFixed(1) || 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failedMessages || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks.length}</div>
            <p className="text-xs text-muted-foreground">
              {webhooks.filter(w => w.active).length} active
            </p>
          </CardContent>
        </Card>
      </div>
      )}  {/* End of stats conditional */}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Management
            </CardTitle>
            <CardDescription>
              Configure Discord webhooks for your teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/dashboard/discord-portal/webhooks">
                <Plus className="mr-2 h-4 w-4" />
                Manage Webhooks
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Message Logs
            </CardTitle>
            <CardDescription>
              View communication history and retry failed messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard/discord-portal/logs">
                <Clock className="mr-2 h-4 w-4" />
                View Logs
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automation Settings
            </CardTitle>
            <CardDescription>
              Configure automatic notifications for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard/discord-portal/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Message Types
          </CardTitle>
          <CardDescription>
            Breakdown of message types sent recently
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.messageTypeStats && Object.keys(stats.messageTypeStats).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.messageTypeStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p>No recent messages</p>
              <p className="text-sm">Messages will appear here once you start sending notifications</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}