'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Target,
  Award
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface Tournament {
  id: string
  name: string
  description: string
  guild_id: string
  bracket_type: 'single' | 'double'
  max_teams: number
  entry_fee: number
  prize_pool: number
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
  registration_start: string
  registration_end: string
  tournament_start: string
  created_by: string
  created_at: string
  updated_at: string
  registered_teams?: TeamRegistration[]
  matches?: Match[]
}

interface TeamRegistration {
  id: string
  tournament_id: string
  team_name: string
  team_leader: string
  discord_id: string
  registration_status: 'registered' | 'confirmed' | 'disqualified'
  registered_at: string
}

interface Match {
  id: string
  tournament_id: string
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  winner_id: string | null
  team1_score: number
  team2_score: number
  status: 'pending' | 'in_progress' | 'completed' | 'bye'
  scheduled_time: string | null
  completed_at: string | null
}

export default function TournamentsPage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    bracket_type: 'single' as 'single' | 'double',
    max_teams: 16,
    entry_fee: 0,
    prize_pool: 0,
    registration_start: '',
    registration_end: '',
    tournament_start: ''
  })

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  useEffect(() => {
    if (guildId) {
      fetchTournaments()
    }
  }, [guildId])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          registered_teams:tournament_registrations(*),
          matches:tournament_matches(*)
        `)
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTournaments(data || [])

    } catch (error) {
      console.error('Error fetching tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTournament = async () => {
    if (!canManage) {
      toast.error('You do not have permission to create tournaments')
      return
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          ...newTournament,
          guild_id: guildId,
          created_by: profile?.id,
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Tournament created successfully')
      setShowCreateDialog(false)
      setNewTournament({
        name: '',
        description: '',
        bracket_type: 'single',
        max_teams: 16,
        entry_fee: 0,
        prize_pool: 0,
        registration_start: '',
        registration_end: '',
        tournament_start: ''
      })
      await fetchTournaments()

    } catch (error) {
      console.error('Error creating tournament:', error)
      toast.error('Failed to create tournament')
    }
  }

  const handleUpdateTournamentStatus = async (tournamentId: string, status: Tournament['status']) => {
    if (!canManage) {
      toast.error('You do not have permission to update tournament status')
      return
    }

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', tournamentId)

      if (error) throw error

      toast.success(`Tournament ${status}`)
      await fetchTournaments()

    } catch (error) {
      console.error('Error updating tournament status:', error)
      toast.error('Failed to update tournament status')
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to delete tournaments')
      return
    }

    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (error) throw error

      toast.success('Tournament deleted successfully')
      await fetchTournaments()

    } catch (error) {
      console.error('Error deleting tournament:', error)
      toast.error('Failed to delete tournament')
    }
  }

  const getStatusIcon = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />
      case 'open': return <Users className="w-4 h-4" />
      case 'in_progress': return <Play className="w-4 h-4" />
      case 'completed': return <Trophy className="w-4 h-4" />
      case 'cancelled': return <Pause className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return 'secondary'
      case 'open': return 'default'
      case 'in_progress': return 'destructive'
      case 'completed': return 'default'
      case 'cancelled': return 'outline'
      default: return 'outline'
    }
  }

  const generateBracket = (tournament: Tournament) => {
    const teams = tournament.registered_teams || []
    const rounds = Math.ceil(Math.log2(tournament.max_teams))
    
    // Simple bracket visualization (placeholder)
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tournament Bracket</h3>
        <div className="bg-muted/50 p-6 rounded-lg text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Interactive bracket visualization will be implemented here.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Registered Teams: {teams.length} / {tournament.max_teams}
          </p>
          <p className="text-sm text-muted-foreground">
            Bracket Type: {tournament.bracket_type === 'single' ? 'Single Elimination' : 'Double Elimination'}
          </p>
        </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Tournament Management
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Create and manage tournaments with brackets, registrations, and match tracking.
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button disabled={!canManage} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Tournament
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Tournament</DialogTitle>
                  <DialogDescription>
                    Set up a new tournament with custom rules and settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input
                      id="name"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter tournament name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTournament.description}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tournament rules and details"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bracket-type">Bracket Type</Label>
                      <Select
                        value={newTournament.bracket_type}
                        onValueChange={(value: 'single' | 'double') => 
                          setNewTournament(prev => ({ ...prev, bracket_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single Elimination</SelectItem>
                          <SelectItem value="double">Double Elimination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-teams">Max Teams</Label>
                      <Select
                        value={newTournament.max_teams.toString()}
                        onValueChange={(value) => 
                          setNewTournament(prev => ({ ...prev, max_teams: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8 Teams</SelectItem>
                          <SelectItem value="16">16 Teams</SelectItem>
                          <SelectItem value="32">32 Teams</SelectItem>
                          <SelectItem value="64">64 Teams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entry-fee">Entry Fee (₹)</Label>
                      <Input
                        id="entry-fee"
                        type="number"
                        value={newTournament.entry_fee}
                        onChange={(e) => setNewTournament(prev => ({ ...prev, entry_fee: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prize-pool">Prize Pool (₹)</Label>
                      <Input
                        id="prize-pool"
                        type="number"
                        value={newTournament.prize_pool}
                        onChange={(e) => setNewTournament(prev => ({ ...prev, prize_pool: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-start">Registration Start</Label>
                    <Input
                      id="reg-start"
                      type="datetime-local"
                      value={newTournament.registration_start}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, registration_start: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-end">Registration End</Label>
                    <Input
                      id="reg-end"
                      type="datetime-local"
                      value={newTournament.registration_end}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, registration_end: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tournament-start">Tournament Start</Label>
                    <Input
                      id="tournament-start"
                      type="datetime-local"
                      value={newTournament.tournament_start}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, tournament_start: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCreateTournament}
                      disabled={!newTournament.name}
                      className="flex-1"
                    >
                      Create Tournament
                    </Button>
                    <Button
                      onClick={() => setShowCreateDialog(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Tournament List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tournaments Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first tournament to get started with competitive play.
              </p>
              {canManage && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tournament
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tournament.name}</h3>
                          <Badge variant={getStatusColor(tournament.status)} className="flex items-center gap-1">
                            {getStatusIcon(tournament.status)}
                            {tournament.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tournament.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {tournament.registered_teams?.length || 0} / {tournament.max_teams} teams
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {tournament.bracket_type} elimination
                          </div>
                          {tournament.prize_pool > 0 && (
                            <div className="flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              ₹{tournament.prize_pool} prize pool
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(tournament.tournament_start).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            {tournament.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateTournamentStatus(tournament.id, 'open')}
                              >
                                Open Registration
                              </Button>
                            )}
                            {tournament.status === 'open' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateTournamentStatus(tournament.id, 'in_progress')}
                              >
                                Start Tournament
                              </Button>
                            )}
                            {tournament.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateTournamentStatus(tournament.id, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTournament(tournament)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteTournament(tournament.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <Dialog open={!!selectedTournament} onOpenChange={() => setSelectedTournament(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                {selectedTournament.name}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="registrations">Registrations</TabsTrigger>
                <TabsTrigger value="bracket">Bracket</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Badge variant={getStatusColor(selectedTournament.status)} className="mt-1">
                      {selectedTournament.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Bracket Type</Label>
                    <p className="mt-1">{selectedTournament.bracket_type} elimination</p>
                  </div>
                  <div>
                    <Label>Max Teams</Label>
                    <p className="mt-1">{selectedTournament.max_teams}</p>
                  </div>
                  <div>
                    <Label>Prize Pool</Label>
                    <p className="mt-1">₹{selectedTournament.prize_pool}</p>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-sm">{selectedTournament.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="registrations" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Leader</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTournament.registered_teams?.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell>{registration.team_name}</TableCell>
                        <TableCell>{registration.team_leader}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{registration.registration_status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(registration.registered_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    )) ?? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No registrations yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="bracket" className="space-y-4">
                {generateBracket(selectedTournament)}
              </TabsContent>

              <TabsContent value="matches" className="space-y-4">
                <p className="text-muted-foreground">
                  Match management interface will be implemented here for tracking tournament progress and results.
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Permissions Notice */}
      {!canManage && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            You have read-only access to tournament management. Contact an administrator to create or modify tournaments.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}