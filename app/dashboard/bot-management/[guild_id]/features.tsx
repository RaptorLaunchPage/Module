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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  ToggleLeft, 
  Crown, 
  Lock, 
  Unlock,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Star,
  Zap,
  Users,
  Trophy,
  Brain,
  Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthV2 } from '@/hooks/use-auth-v2'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface GuildFeatures {
  id: string
  guild_id: string
  guild_name: string
  connected_team_id: string | null
  is_premium: boolean
  is_org_owned: boolean
  feature_overrides: Record<string, any>
  custom_limits: Record<string, number>
  teams?: {
    id: string
    name: string
    tier: string
  }[]
}

interface FeatureDefinition {
  id: string
  name: string
  description: string
  icon: any
  category: 'core' | 'premium' | 'enterprise'
  defaultEnabled: boolean
  requiresPremium: boolean
  customizable: boolean
}

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // Core Features (Free)
  {
    id: 'performance_tracking',
    name: 'Performance Tracking',
    description: 'Basic OCR performance upload and tracking',
    icon: Trophy,
    category: 'core',
    defaultEnabled: true,
    requiresPremium: false,
    customizable: false
  },
  {
    id: 'attendance_system',
    name: 'Attendance System',
    description: 'Track practice and match attendance',
    icon: Calendar,
    category: 'core',
    defaultEnabled: true,
    requiresPremium: false,
    customizable: false
  },
  {
    id: 'basic_webhooks',
    name: 'Basic Webhooks',
    description: 'Simple Discord webhook notifications',
    icon: Settings,
    category: 'core',
    defaultEnabled: true,
    requiresPremium: false,
    customizable: false
  },
  
  // Premium Features
  {
    id: 'ai_analysis',
    name: 'AI Performance Analysis',
    description: 'Advanced AI insights and performance analysis',
    icon: Brain,
    category: 'premium',
    defaultEnabled: false,
    requiresPremium: true,
    customizable: true
  },
  {
    id: 'scrim_management',
    name: 'Scrim Management',
    description: 'Create and manage scrim tournaments',
    icon: Trophy,
    category: 'premium',
    defaultEnabled: false,
    requiresPremium: true,
    customizable: true
  },
  {
    id: 'tournament_system',
    name: 'Tournament System',
    description: 'Full tournament management with brackets',
    icon: Crown,
    category: 'premium',
    defaultEnabled: false,
    requiresPremium: true,
    customizable: true
  },
  {
    id: 'advanced_tryouts',
    name: 'Advanced Tryouts',
    description: 'Comprehensive tryout management system',
    icon: Users,
    category: 'premium',
    defaultEnabled: false,
    requiresPremium: true,
    customizable: true
  },
  
  // Enterprise Features
  {
    id: 'unlimited_scrims',
    name: 'Unlimited Scrims',
    description: 'Remove scrim creation limits',
    icon: Zap,
    category: 'enterprise',
    defaultEnabled: false,
    requiresPremium: true,
    customizable: true
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: 'Priority customer support and assistance',
    icon: Shield,
    category: 'enterprise',
    defaultEnabled: false,
    requiresPremium: true,
    customizable: false
  }
]

const DEFAULT_LIMITS = {
  scrims_per_month: 3,
  tournaments_per_month: 1,
  tryouts_per_month: 2,
  ai_analysis_per_month: 50,
  webhook_count: 3,
  storage_mb: 100
}

export default function FeatureToggles() {
  const params = useParams()
  const { profile } = useAuthV2()
  const guildId = params.guild_id as string
  
  const [guildFeatures, setGuildFeatures] = useState<GuildFeatures | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({})
  const [customLimits, setCustomLimits] = useState<Record<string, number>>(DEFAULT_LIMITS)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (guildId && isAdmin) {
      fetchGuildFeatures()
    }
  }, [guildId, isAdmin])

  const fetchGuildFeatures = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('discord_servers')
        .select(`
          id,
          guild_id,
          guild_name,
          connected_team_id,
          is_premium,
          is_org_owned,
          feature_overrides,
          custom_limits,
          teams:connected_team_id (
            id,
            name,
            tier
          )
        `)
        .eq('guild_id', guildId)
        .single()

      if (error) throw error

      setGuildFeatures(data)
      setFeatureOverrides(data.feature_overrides || {})
      setCustomLimits({ ...DEFAULT_LIMITS, ...(data.custom_limits || {}) })

    } catch (error) {
      console.error('Error fetching guild features:', error)
      toast.error('Failed to load guild features')
    } finally {
      setLoading(false)
    }
  }

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    if (!isAdmin) {
      toast.error('Only administrators can modify feature settings')
      return
    }

    setFeatureOverrides(prev => ({
      ...prev,
      [featureId]: enabled
    }))
  }

  const handleLimitChange = (limitKey: string, value: number) => {
    if (!isAdmin) {
      toast.error('Only administrators can modify limits')
      return
    }

    setCustomLimits(prev => ({
      ...prev,
      [limitKey]: value
    }))
  }

  const handleSaveChanges = async () => {
    if (!isAdmin || !guildFeatures) {
      toast.error('You do not have permission to save changes')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          feature_overrides: featureOverrides,
          custom_limits: customLimits,
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Feature settings saved successfully')
      await fetchGuildFeatures()

    } catch (error) {
      console.error('Error saving features:', error)
      toast.error('Failed to save feature settings')
    } finally {
      setSaving(false)
    }
  }

  const handleGrantPremium = async () => {
    if (!isAdmin || !guildFeatures) {
      toast.error('You do not have permission to grant premium access')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          is_premium: true,
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success('Premium access granted to this server')
      await fetchGuildFeatures()

    } catch (error) {
      console.error('Error granting premium:', error)
      toast.error('Failed to grant premium access')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkOrgOwned = async () => {
    if (!isAdmin || !guildFeatures) {
      toast.error('You do not have permission to mark as org-owned')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('discord_servers')
        .update({
          is_org_owned: !guildFeatures.is_org_owned,
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guildId)

      if (error) throw error

      toast.success(`Server ${guildFeatures.is_org_owned ? 'unmarked' : 'marked'} as org-owned`)
      await fetchGuildFeatures()

    } catch (error) {
      console.error('Error updating org ownership:', error)
      toast.error('Failed to update org ownership')
    } finally {
      setSaving(false)
    }
  }

  const isFeatureEnabled = (feature: FeatureDefinition) => {
    // Check if feature is overridden
    if (featureOverrides.hasOwnProperty(feature.id)) {
      return featureOverrides[feature.id]
    }

    // Check default availability
    if (!feature.requiresPremium) {
      return feature.defaultEnabled
    }

    // Premium features require premium access or org ownership
    return (guildFeatures?.is_premium || guildFeatures?.is_org_owned) && feature.defaultEnabled
  }

  const canToggleFeature = (feature: FeatureDefinition) => {
    return isAdmin && (feature.customizable || guildFeatures?.is_org_owned)
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      core: 'text-blue-400 border-blue-400',
      premium: 'text-purple-400 border-purple-400',
      enterprise: 'text-orange-400 border-orange-400'
    }
    return colors[category as keyof typeof colors] || 'text-gray-400 border-gray-400'
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      core: Settings,
      premium: Star,
      enterprise: Crown
    }
    return icons[category as keyof typeof icons] || Settings
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <CardTitle className="text-red-400">Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Only administrators can access feature toggles and premium controls.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact a system administrator if you need access to these settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
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

  if (!guildFeatures) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Server Not Found</h3>
          <p className="text-muted-foreground">
            Could not load feature settings for this Discord server.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ToggleLeft className="w-6 h-6" />
            Feature Toggles
          </h2>
          <p className="text-muted-foreground">
            Manage premium features and custom limits for this Discord server
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Server Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{guildFeatures.guild_name}</h3>
              <p className="text-sm text-muted-foreground">
                Connected Team: {guildFeatures.teams?.[0]?.name || 'None'}
                {guildFeatures.teams?.[0]?.tier && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {guildFeatures.teams[0].tier}
                  </Badge>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {guildFeatures.is_premium ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Free
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {guildFeatures.is_org_owned ? (
                  <Badge variant="default" className="flex items-center gap-1 bg-orange-500">
                    <Shield className="w-3 h-3" />
                    Org-Owned
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    External
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-4">
            {!guildFeatures.is_premium && (
              <Button
                onClick={handleGrantPremium}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Grant Premium Access
              </Button>
            )}
            
            <Button
              onClick={handleMarkOrgOwned}
              disabled={saving}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {guildFeatures.is_org_owned ? 'Remove Org Ownership' : 'Mark as Org-Owned'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      {['core', 'premium', 'enterprise'].map((category) => {
        const categoryFeatures = FEATURE_DEFINITIONS.filter(f => f.category === category)
        const CategoryIcon = getCategoryIcon(category)
        
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CategoryIcon className="w-5 h-5" />
                {category.charAt(0).toUpperCase() + category.slice(1)} Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryFeatures.map((feature) => {
                  const FeatureIcon = feature.icon
                  const enabled = isFeatureEnabled(feature)
                  const canToggle = canToggleFeature(feature)
                  
                  return (
                    <Card key={feature.id} className={`relative ${!canToggle && !enabled ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <FeatureIcon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <h4 className="font-semibold">{feature.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${getCategoryColor(feature.category)}`}>
                              {feature.category}
                            </Badge>
                            
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked)}
                              disabled={!canToggle}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {enabled ? (
                              <div className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="w-3 h-3" />
                                Enabled
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <XCircle className="w-3 h-3" />
                                Disabled
                              </div>
                            )}
                          </div>
                          
                          {feature.requiresPremium && !guildFeatures.is_premium && !guildFeatures.is_org_owned && (
                            <div className="flex items-center gap-1 text-orange-400">
                              <Lock className="w-3 h-3" />
                              Requires Premium
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Custom Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Custom Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(customLimits).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm font-medium">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleLimitChange(key, parseInt(e.target.value) || 0)}
                  disabled={!isAdmin}
                  min="0"
                  max={key.includes('mb') ? 10000 : 1000}
                />
                <p className="text-xs text-muted-foreground">
                  {key === 'storage_mb' ? 'Storage limit in megabytes' : 
                   key.includes('per_month') ? 'Monthly limit' : 'Maximum allowed'}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Custom Limits Notice</h4>
                <p className="text-sm text-muted-foreground">
                  Custom limits override default restrictions. Setting limits too high may impact system performance. 
                  Use responsibly and monitor usage patterns.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveChanges}
          disabled={saving}
          size="lg"
          className="flex items-center gap-2"
        >
          {saving ? 'Saving Changes...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  )
}