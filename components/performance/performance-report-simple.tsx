"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, BarChart3, Calendar, Filter, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface PerformanceData {
  match_number: number
  map: string
  placement: number
  kills: number
  assists: number
  damage: number
  survival_time: number
  created_at: string
  player_name: string
  team_name: string
  organizer: string
  player_id: string
  team_id: string
  slot: string
}

interface FilterState {
  teamId: string
  playerId: string
  map: string
  matchNumber: string
  dateFrom: string
  dateTo: string
}

export function PerformanceReportSimple() {
  // Early error boundary - wrap everything in try-catch
  try {
    const { profile } = useAuth()
    const { toast } = useToast()

    console.log('🎯 PerformanceReportSimple rendering, profile:', profile)

    const [performances, setPerformances] = useState<PerformanceData[]>([])
    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<any[]>([])
    const [players, setPlayers] = useState<any[]>([])
    const [maps, setMaps] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<FilterState>({
      teamId: '',
      playerId: '',
      map: '',
      matchNumber: '',
      dateFrom: '',
      dateTo: ''
    })

    // Safe role checking with detailed logging
    const getSafeRole = () => {
      try {
        console.log('🔍 Checking profile role:', profile?.role)
        return profile?.role?.toLowerCase() || ''
      } catch (err) {
        console.error('❌ Error getting role:', err)
        return ''
      }
    }

    const safeRole = getSafeRole()
    const hasFullAccess = safeRole && ["admin", "manager", "analyst"].includes(safeRole)
    const isCoach = safeRole === "coach"
    const isPlayer = safeRole === "player"

    console.log('🎭 Role info:', { safeRole, hasFullAccess, isCoach, isPlayer })

    useEffect(() => {
      console.log('🚀 PerformanceReportSimple useEffect triggered')
      
      const initializeComponent = async () => {
        try {
          // Basic validation
          if (!profile) {
            console.log('⏳ No profile yet, waiting...')
            setLoading(false)
            return
          }

          console.log('✅ Profile found:', profile.id, profile.role)

          // Role validation
          const allowedRoles = ["admin", "manager", "coach", "analyst", "player"]
          if (!safeRole || !allowedRoles.includes(safeRole)) {
            console.log('❌ Access denied for role:', safeRole)
            setError(`Access denied. Required role: ${allowedRoles.join(', ')}. Current role: ${safeRole}`)
            setLoading(false)
            return
          }

          console.log('🔓 Access granted, loading data...')
          await loadInitialData()
          
        } catch (err) {
          console.error('💥 Error in initializeComponent:', err)
          setError(`Initialization error: ${err instanceof Error ? err.message : String(err)}`)
          setLoading(false)
        }
      }

      initializeComponent()
    }, [profile?.id, profile?.role]) // More specific dependencies

    const loadInitialData = async () => {
      console.log('📊 Loading initial data...')
      setLoading(true)
      setError(null)
      
      try {
        // Load filter options first
        console.log('🔽 Loading filter options...')
        await loadFilterOptions()
        
        // Then load performance data
        console.log('🔽 Loading performance data...')
        await loadPerformanceData()
        
        console.log('✅ Initial data loaded successfully')
      } catch (err) {
        console.error('❌ Error loading initial data:', err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(`Failed to load data: ${errorMessage}`)
        
        // Set empty states on error
        setPerformances([])
        setTeams([])
        setPlayers([])
        setMaps([])
      } finally {
        setLoading(false)
      }
    }

    const loadFilterOptions = async () => {
      console.log('🏷️ Loading filter options...')
      
      try {
        // Load teams with error handling
        console.log('📋 Loading teams...')
        let teamsQuery = supabase.from('teams').select('id, name, coach_id')
        if (isCoach && profile?.id) {
          teamsQuery = teamsQuery.eq('coach_id', profile.id)
        }
        const { data: teamsData, error: teamsError } = await teamsQuery
        
        if (teamsError) {
          console.error('❌ Error loading teams:', teamsError)
          setTeams([])
        } else {
          console.log('✅ Teams loaded:', teamsData?.length || 0)
          setTeams(teamsData || [])
        }

        // Load players with error handling
        console.log('👥 Loading players...')
        let playersQuery = supabase.from('users').select('id, name, team_id').neq('role', 'pending_player')
        if (isPlayer && profile?.id) {
          playersQuery = playersQuery.eq('id', profile.id)
        } else if (isCoach && teamsData && teamsData.length > 0) {
          const coachTeams = teamsData.map(t => t.id).filter(Boolean)
          if (coachTeams.length > 0) {
            playersQuery = playersQuery.in('team_id', coachTeams)
          }
        }
        const { data: playersData, error: playersError } = await playersQuery
        
        if (playersError) {
          console.error('❌ Error loading players:', playersError)
          setPlayers([])
        } else {
          console.log('✅ Players loaded:', playersData?.length || 0)
          setPlayers(playersData || [])
        }

        // Load maps with error handling
        console.log('🗺️ Loading maps...')
        const { data: mapsData, error: mapsError } = await supabase
          .from('performances')
          .select('map')
          .not('map', 'is', null)
          
        if (mapsError) {
          console.error('❌ Error loading maps:', mapsError)
          setMaps([])
        } else {
          const uniqueMaps = [...new Set(mapsData?.map(p => p.map).filter(Boolean) || [])]
          console.log('✅ Maps loaded:', uniqueMaps.length)
          setMaps(uniqueMaps)
        }

        console.log('✅ Filter options loaded successfully')
      } catch (err) {
        console.error('❌ Error in loadFilterOptions:', err)
        // Set empty states on error
        setTeams([])
        setPlayers([])
        setMaps([])
        throw err // Re-throw to be handled by parent
      }
    }

    const loadPerformanceData = async () => {
      console.log('🎮 Loading performance data...')
      
      try {
        // First, load performances data
        let query = supabase
          .from('performances')
          .select(`
            match_number,
            map,
            placement,
            kills,
            assists,
            damage,
            survival_time,
            created_at,
            player_id,
            team_id,
            slot
          `)
          .order('created_at', { ascending: false })

        // Apply role-based filtering
        if (isPlayer && profile?.id) {
          console.log('🎯 Filtering for player:', profile.id)
          query = query.eq('player_id', profile.id)
        } else if (isCoach && profile?.id) {
          console.log('👨‍🏫 Loading coach teams for filtering...')
          // For coaches, we need to load their teams first to filter properly
          const { data: coachTeams, error: coachTeamsError } = await supabase
            .from('teams')
            .select('id')
            .eq('coach_id', profile.id)
          
          if (coachTeamsError) {
            console.error('❌ Error loading coach teams:', coachTeamsError)
            setPerformances([])
            return
          }
          
          const teamIds = coachTeams?.map(t => t.id) || []
          console.log('👨‍🏫 Coach teams:', teamIds)
          
          if (teamIds.length > 0) {
            query = query.in('team_id', teamIds)
          } else {
            // Coach has no teams, return empty
            console.log('⚠️ Coach has no teams')
            setPerformances([])
            return
          }
        }

        // Apply filters
        if (filters.teamId) {
          query = query.eq('team_id', filters.teamId)
        }
        if (filters.playerId) {
          query = query.eq('player_id', filters.playerId)
        }
        if (filters.map) {
          query = query.eq('map', filters.map)
        }
        if (filters.matchNumber) {
          query = query.eq('match_number', parseInt(filters.matchNumber))
        }
        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom + 'T00:00:00')
        }
        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo + 'T23:59:59')
        }

        console.log('🔍 Executing performance query...')
        const { data: performanceData, error } = await query

        if (error) {
          console.error('❌ Performance query error:', error)
          throw error
        }

        console.log('📊 Performance data loaded:', performanceData?.length || 0, 'records')

        if (!performanceData || performanceData.length === 0) {
          console.log('📭 No performance data found')
          setPerformances([])
          return
        }

        // Get unique IDs for batch loading related data
        const playerIds = [...new Set(performanceData.map(p => p.player_id).filter(Boolean))]
        const teamIds = [...new Set(performanceData.map(p => p.team_id).filter(Boolean))]
        const slotIds = [...new Set(performanceData.map(p => p.slot).filter(Boolean))]

        console.log('🔗 Loading related data:', { playerIds: playerIds.length, teamIds: teamIds.length, slotIds: slotIds.length })

        // Load related data in parallel with error handling
        const [usersData, teamsData, slotsData] = await Promise.allSettled([
          // Load users
          playerIds.length > 0 
            ? supabase.from('users').select('id, name').in('id', playerIds)
            : Promise.resolve({ data: [], error: null }),
          // Load teams  
          teamIds.length > 0
            ? supabase.from('teams').select('id, name').in('id', teamIds)
            : Promise.resolve({ data: [], error: null }),
          // Load slots
          slotIds.length > 0
            ? supabase.from('slots').select('id, organizer').in('id', slotIds)
            : Promise.resolve({ data: [], error: null })
        ])

        // Extract data with error handling
        const users = usersData.status === 'fulfilled' ? (usersData.value.data || []) : []
        const teams = teamsData.status === 'fulfilled' ? (teamsData.value.data || []) : []
        const slots = slotsData.status === 'fulfilled' ? (slotsData.value.data || []) : []

        // Log any errors
        if (usersData.status === 'rejected') console.error('❌ Error loading users:', usersData.reason)
        if (teamsData.status === 'rejected') console.error('❌ Error loading teams:', teamsData.reason)
        if (slotsData.status === 'rejected') console.error('❌ Error loading slots:', slotsData.reason)

        console.log('✅ Related data loaded:', { users: users.length, teams: teams.length, slots: slots.length })

        // Create lookup maps for efficient joining
        const usersMap = new Map(users.map(u => [u.id, u]))
        const teamsMap = new Map(teams.map(t => [t.id, t]))
        const slotsMap = new Map(slots.map(s => [s.id, s]))

        // Transform data with proper joins
        const transformedData: PerformanceData[] = performanceData.map(p => ({
          match_number: p.match_number,
          map: p.map,
          placement: p.placement || 0,
          kills: p.kills || 0,
          assists: p.assists || 0,
          damage: p.damage || 0,
          survival_time: p.survival_time || 0,
          created_at: p.created_at,
          player_name: usersMap.get(p.player_id)?.name || 'Unknown Player',
          team_name: teamsMap.get(p.team_id)?.name || 'Unknown Team',
          organizer: slotsMap.get(p.slot)?.organizer || 'Unknown Organizer',
          player_id: p.player_id,
          team_id: p.team_id || '',
          slot: p.slot || ''
        }))

        console.log('🎯 Data transformation complete:', transformedData.length, 'records')

        setPerformances(transformedData)

        console.log('✅ Performance data loading complete')
      } catch (err) {
        console.error('❌ Error in loadPerformanceData:', err)
        throw err // Re-throw to be handled by parent
      }
    }

    const handleFilterChange = (key: keyof FilterState, value: string) => {
      console.log('🔧 Filter changed:', key, '=', value)
      try {
        setFilters(prev => ({ ...prev, [key]: value }))
      } catch (err) {
        console.error('❌ Error updating filter:', err)
      }
    }

    const applyFilters = async () => {
      console.log('🔍 Applying filters:', filters)
      try {
        setLoading(true)
        await loadPerformanceData()
      } catch (err) {
        console.error('❌ Error applying filters:', err)
        setError(`Error applying filters: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    const clearFilters = async () => {
      console.log('🧹 Clearing filters')
      try {
        setFilters({
          teamId: '',
          playerId: '',
          map: '',
          matchNumber: '',
          dateFrom: '',
          dateTo: ''
        })
        setLoading(true)
        await loadPerformanceData()
      } catch (err) {
        console.error('❌ Error clearing filters:', err)
        setError(`Error clearing filters: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    // Early return for no access
    if (error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )
    }

    // Early return for loading
    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Performance Report</CardTitle>
            <CardDescription>Loading performance data...</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      )
    }

    // Early return for no profile
    if (!profile) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Performance Report</CardTitle>
            <CardDescription>Please log in to view performance data</CardDescription>
          </CardHeader>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Report
            </CardTitle>
            <CardDescription>
              Detailed performance data and match history
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(hasFullAccess || isCoach) && (
                <div className="space-y-2">
                  <Label htmlFor="team-filter">Team</Label>
                  <Select value={filters.teamId} onValueChange={(value) => handleFilterChange('teamId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Teams</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(hasFullAccess || isCoach) && (
                <div className="space-y-2">
                  <Label htmlFor="player-filter">Player</Label>
                  <Select value={filters.playerId} onValueChange={(value) => handleFilterChange('playerId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Players</SelectItem>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="map-filter">Map</Label>
                <Select value={filters.map} onValueChange={(value) => handleFilterChange('map', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select map" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Maps</SelectItem>
                    {maps.map((map) => (
                      <SelectItem key={map} value={map}>
                        {map}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="match-filter">Match Number</Label>
                <Input
                  id="match-filter"
                  type="number"
                  placeholder="Enter match number"
                  value={filters.matchNumber}
                  onChange={(e) => handleFilterChange('matchNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-from">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Data</CardTitle>
            <CardDescription>
              {performances.length} records found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performances.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No performance data found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters or add some performance data
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Match #</TableHead>
                      <TableHead>Map</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Kills</TableHead>
                      <TableHead>Assists</TableHead>
                      <TableHead>Damage</TableHead>
                      <TableHead>Survival Time</TableHead>
                      <TableHead>Organizer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performances.map((performance, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(performance.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{performance.player_name}</TableCell>
                        <TableCell>{performance.team_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">#{performance.match_number}</Badge>
                        </TableCell>
                        <TableCell>{performance.map}</TableCell>
                        <TableCell>
                          <Badge variant={performance.placement <= 3 ? "default" : "secondary"}>
                            #{performance.placement}
                          </Badge>
                        </TableCell>
                        <TableCell>{performance.kills}</TableCell>
                        <TableCell>{performance.assists}</TableCell>
                        <TableCell>{performance.damage.toLocaleString()}</TableCell>
                        <TableCell>{performance.survival_time}s</TableCell>
                        <TableCell>{performance.organizer}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )

  } catch (err) {
    // Top-level error boundary
    console.error('💥 CRITICAL ERROR in PerformanceReportSimple:', err)
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Critical Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              A critical error occurred while rendering the Performance Report. 
              Please check the browser console for details.
              Error: {err instanceof Error ? err.message : String(err)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
}