'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Bot, 
  Server, 
  Settings, 
  Trophy, 
  Users, 
  Webhook, 
  BarChart3,
  Calendar,
  ToggleLeft,
  ArrowLeft,
  Shield
} from 'lucide-react'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { useAuthV2 } from '@/hooks/use-auth-v2'

interface BotManagementLayoutProps {
  children: React.ReactNode
}

export default function BotManagementLayout({ children }: BotManagementLayoutProps) {
  const pathname = usePathname()
  const { profile } = useAuthV2()
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null)
  
  // Extract guild_id from pathname if we're in a guild-specific page
  const guildIdMatch = pathname.match(/\/bot-management\/([^\/]+)/)
  const currentGuildId = guildIdMatch ? guildIdMatch[1] : null

  // Check permissions
  const canManageBot = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit
  const canViewBot = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canView

  if (!canViewBot) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <CardTitle className="text-red-400">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the bot management module.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator if you need access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const guildNavItems = [
    {
      id: 'overview',
      label: 'Bot Controls',
      icon: Bot,
      path: '',
      description: 'General bot settings and controls'
    },
    {
      id: 'scrims',
      label: 'Scrims',
      icon: Trophy,
      path: '/scrims',
      description: 'Manage scrim tournaments'
    },
    {
      id: 'tournaments',
      label: 'Tournaments',
      icon: Trophy,
      path: '/tournaments',
      description: 'Tournament management'
    },
    {
      id: 'tryouts',
      label: 'Tryouts',
      icon: Users,
      path: '/tryouts',
      description: 'Player recruitment system'
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      icon: Webhook,
      path: '/webhooks',
      description: 'Discord webhook configuration'
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: BarChart3,
      path: '/performance',
      description: 'Performance tracking & AI analysis'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Calendar,
      path: '/attendance',
      description: 'Practice attendance management'
    },
    {
      id: 'features',
      label: 'Feature Toggles',
      icon: ToggleLeft,
      path: '/features',
      description: 'Enable/disable bot features',
      adminOnly: true
    }
  ]

  const filteredNavItems = guildNavItems.filter(item => 
    !item.adminOnly || profile?.role === 'admin'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {currentGuildId && (
              <Link href="/dashboard/bot-management">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Bot className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {currentGuildId ? 'Server Management' : 'Bot Management'}
              </h1>
              <p className="text-muted-foreground">
                {currentGuildId 
                  ? 'Manage RaptorBot features for this Discord server'
                  : 'Control RaptorBot across all connected Discord servers'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Bot className="w-3 h-3" />
            RaptorBot v2.0
          </Badge>
          {!canManageBot && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              View Only
            </Badge>
          )}
        </div>
      </div>

      {/* Guild-specific navigation */}
      {currentGuildId && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {filteredNavItems.map((item) => {
                const isActive = pathname.endsWith(item.path) || 
                  (item.path === '' && pathname === `/dashboard/bot-management/${currentGuildId}`)
                
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/bot-management/${currentGuildId}${item.path}`}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  )
}