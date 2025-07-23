"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"
import { Settings, Save, AlertTriangle } from "lucide-react"

interface AutomationSetting {
  setting_key: string
  setting_value: boolean
  team_id?: string
}

const AUTOMATION_SETTINGS = [
  {
    key: 'auto_slot_create',
    label: 'Slot Creation',
    description: 'Send notifications when new slots are created'
  },
  {
    key: 'auto_roster_update',
    label: 'Roster Updates',
    description: 'Send notifications when team rosters change'
  },
  {
    key: 'auto_performance_alerts',
    label: 'Performance Alerts',
    description: 'Send performance summary notifications'
  },
  {
    key: 'auto_attendance_alerts',
    label: 'Attendance Alerts',
    description: 'Send attendance summary notifications'
  },
  {
    key: 'auto_daily_summary',
    label: 'Daily Summary',
    description: 'Send daily activity summaries'
  },
  {
    key: 'auto_weekly_digest',
    label: 'Weekly Digest',
    description: 'Send weekly performance digests'
  },
  {
    key: 'auto_system_alerts',
    label: 'System Alerts',
    description: 'Send important system notifications'
  },
  {
    key: 'auto_data_cleanup',
    label: 'Data Cleanup',
    description: 'Send notifications about data maintenance'
  }
]

export default function DiscordSettingsPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const userRole = profile?.role as UserRole
  const permissions = DashboardPermissions.getPermissions(userRole)

  useEffect(() => {
    if (profile && permissions.manageDiscordPortal) {
      fetchSettings()
    }
  }, [profile, permissions.manageDiscordPortal])

  const fetchSettings = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/discord-portal/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const settingsMap: Record<string, boolean> = {}
        
        data.forEach((setting: AutomationSetting) => {
          settingsMap[setting.setting_key] = setting.setting_value
        })
        
        setSettings(settingsMap)
      } else {
        throw new Error('Failed to fetch settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: "Error",
        description: "Failed to load automation settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    try {
      setSaving(true)
      const token = await getToken()
      
      const response = await fetch('/api/discord-portal/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          setting_key: key,
          setting_value: value
        })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast({
          title: "Success",
          description: "Automation setting updated",
        })
      } else {
        throw new Error('Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast({
        title: "Error",
        description: "Failed to update automation setting",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Profile</h3>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!permissions.manageDiscordPortal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to manage Discord Portal settings.
              </p>
            </div>
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
          <div>
            <h3 className="text-lg font-semibold">Loading Settings</h3>
            <p className="text-gray-600">Fetching automation preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discord Portal Settings</h1>
          <p className="text-muted-foreground">
            Configure automation settings for Discord notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">Automation</span>
        </div>
      </div>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Control which events automatically trigger Discord notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {AUTOMATION_SETTINGS.map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor={setting.key} className="text-base font-medium">
                  {setting.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {setting.description}
                </p>
              </div>
              <Switch
                id={setting.key}
                checked={settings[setting.key] || false}
                onCheckedChange={(checked) => updateSetting(setting.key, checked)}
                disabled={saving}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Automation settings apply to your team's Discord webhooks</p>
          <p>• Admin users can control global automation settings</p>
          <p>• Manual "Send to Discord" buttons work regardless of automation settings</p>
          <p>• Changes take effect immediately</p>
        </CardContent>
      </Card>
    </div>
  )
}