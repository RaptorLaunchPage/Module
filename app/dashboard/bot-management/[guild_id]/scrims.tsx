'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Users, 
  Clock,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface Scrim {
  id: string
  name: string
  description: string | null
  scheduled_date: string
  start_time: string
  end_time: string | null
  max_teams: number
  prize_pool: number | null
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
  created_by: string
  guild_id: string
  registered_teams: number
  slots_filled: number
  created_at: string
}

interface CreateScrimData {
  name: string
  description: string
  scheduled_date: string
  start_time: string
  end_time: string
  max_teams: number
  prize_pool: number | null
}

const SCRIM_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Edit },
  open: { label: 'Open for Registration', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  completed: { label: 'Completed', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Trophy },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle }
}

export default function ScrimsManager() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [scrims, setScrims] = useState<Scrim[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newScrim, setNewScrim] = useState<CreateScrimData>({
    name: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    max_teams: 16,
    prize_pool: null
  })

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit
  
  // Check if user has reached scrim limits (example: 3 for free users)
  const hasReachedLimit = scrims.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length >= 3

  useEffect(() => {
    if (guildId) {
      fetchScrims()
    }
  }, [guildId])

  const fetchScrims = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('scrims')
        .select(`
          id,
          name,
          description,
          scheduled_date,
          start_time,
          end_time,
          max_teams,
          prize_pool,
          status,
          created_by,
          guild_id,
          created_at,
          registered_teams:assigned_slots(count),
          slots_filled:assigned_slots(count)
        `)
        .eq('guild_id', guildId)
        .order('scheduled_date', { ascending: false })

      if (error) throw error

      // Transform the data to flatten the counts
      const transformedData = data?.map(scrim => ({
        ...scrim,
        registered_teams: scrim.registered_teams?.[0]?.count || 0,
        slots_filled: scrim.slots_filled?.[0]?.count || 0
      })) || []

      setScrims(transformedData)

    } catch (error) {
      console.error('Error fetching scrims:', error)
      toast.error('Failed to load scrims')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateScrim = async () => {
    if (!canManage) {
      toast.error('You do not have permission to create scrims')
      return
    }

    if (hasReachedLimit) {
      toast.error('You have reached the maximum number of active scrims (3)')
      return
    }

    if (!newScrim.name || !newScrim.scheduled_date || !newScrim.start_time) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setCreating(true)

      const { error } = await supabase
        .from('scrims')
        .insert({
          name: newScrim.name,
          description: newScrim.description || null,
          scheduled_date: newScrim.scheduled_date,
          start_time: newScrim.start_time,
          end_time: newScrim.end_time || null,
          max_teams: newScrim.max_teams,
          prize_pool: newScrim.prize_pool,
          status: 'draft',
          guild_id: guildId,
          created_by: profile?.id
        })

      if (error) throw error

      toast.success('Scrim created successfully')
      setShowCreateDialog(false)
      setNewScrim({
        name: '',
        description: '',
        scheduled_date: '',
        start_time: '',
        end_time: '',
        max_teams: 16,
        prize_pool: null
      })
      await fetchScrims()

    } catch (error) {
      console.error('Error creating scrim:', error)
      toast.error('Failed to create scrim')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateScrimStatus = async (scrimId: string, newStatus: string) => {
    if (!canManage) {
      toast.error('You do not have permission to update scrims')
      return
    }

    try {
      const { error } = await supabase
        .from('scrims')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', scrimId)

      if (error) throw error

      toast.success('Scrim status updated')
      await fetchScrims()

    } catch (error) {
      console.error('Error updating scrim:', error)
      toast.error('Failed to update scrim status')
    }
  }

  const handleDeleteScrim = async (scrimId: string) => {
    if (!canManage || profile?.role !== 'admin') {
      toast.error('You do not have permission to delete scrims')
      return
    }

    if (!confirm('Are you sure you want to delete this scrim? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('scrims')
        .delete()
        .eq('id', scrimId)

      if (error) throw error

      toast.success('Scrim deleted successfully')
      await fetchScrims()

    } catch (error) {
      console.error('Error deleting scrim:', error)
      toast.error('Failed to delete scrim')
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
            <Trophy className="w-6 h-6" />
            Scrim Management
          </h2>
          <p className="text-muted-foreground">
            Create and manage scrim tournaments for your Discord server
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              disabled={!canManage || hasReachedLimit}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Scrim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Scrim</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scrim-name">Scrim Name *</Label>
                  <Input
                    id="scrim-name"
                    value={newScrim.name}
                    onChange={(e) => setNewScrim(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Evening Scrims #1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-teams">Max Teams</Label>
                  <Input
                    id="max-teams"
                    type="number"
                    value={newScrim.max_teams}
                    onChange={(e) => setNewScrim(prev => ({ ...prev, max_teams: parseInt(e.target.value) || 16 }))}
                    min="2"
                    max="64"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newScrim.description}
                  onChange={(e) => setNewScrim(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the scrim rules, format, etc..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newScrim.scheduled_date}
                    onChange={(e) => setNewScrim(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newScrim.start_time}
                    onChange={(e) => setNewScrim(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newScrim.end_time}
                    onChange={(e) => setNewScrim(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prize-pool">Prize Pool (optional)</Label>
                <Input
                  id="prize-pool"
                  type="number"
                  value={newScrim.prize_pool || ''}
                  onChange={(e) => setNewScrim(prev => ({ ...prev, prize_pool: parseInt(e.target.value) || null }))}
                  placeholder="Enter prize amount"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateScrim}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Scrim'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Limit Warning */}
      {hasReachedLimit && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            You have reached the maximum number of active scrims (3). Complete or cancel existing scrims to create new ones.
          </AlertDescription>
        </Alert>
      )}

      {/* Scrims List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {scrims.map((scrim) => {
          const status = SCRIM_STATUSES[scrim.status]
          const StatusIcon = status.icon
          const isUpcoming = new Date(scrim.scheduled_date) > new Date()

          return (
            <Card key={scrim.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{scrim.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                      {isUpcoming && (
                        <Badge variant="secondary" className="text-xs">
                          Upcoming
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {canManage && scrim.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateScrimStatus(scrim.id, 'open')}
                      >
                        Open Registration
                      </Button>
                    )}
                    {canManage && scrim.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateScrimStatus(scrim.id, 'in_progress')}
                      >
                        Start Scrim
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Description */}
                {scrim.description && (
                  <p className="text-sm text-muted-foreground">
                    {scrim.description}
                  </p>
                )}

                {/* Schedule Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(scrim.scheduled_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {scrim.start_time}
                      {scrim.end_time && ` - ${scrim.end_time}`}
                    </span>
                  </div>
                </div>

                {/* Team Registration */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {scrim.registered_teams}/{scrim.max_teams} teams registered
                    </span>
                  </div>
                  {scrim.prize_pool && (
                    <Badge variant="outline" className="text-xs">
                      💰 ${scrim.prize_pool}
                    </Badge>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((scrim.registered_teams / scrim.max_teams) * 100, 100)}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(scrim.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    {canManage && (
                      <>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {profile?.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteScrim(scrim.id)}
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

      {scrims.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scrims Created</h3>
            <p className="text-muted-foreground mb-4">
              Create your first scrim tournament to get started with competitive matches.
            </p>
            {canManage && !hasReachedLimit && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Scrim
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permissions Notice */}
      {!canManage && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            You have read-only access to scrims. Contact an administrator to create or manage scrims.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}