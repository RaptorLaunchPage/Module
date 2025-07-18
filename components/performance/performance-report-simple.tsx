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
import { Loader2, BarChart3, Trophy, Target, Zap, Calendar, Filter, X } from "lucide-react"
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

interface SummaryStats {
  totalMatches: number
  totalKills: number
  totalDamage: number
  avgPlacement: number
  avgKills: number
  avgDamage: number
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
  const { profile } = useAuth()
  const { toast } = useToast()

  const [performances, setPerformances] = useState<PerformanceData[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [maps, setMaps] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterState>({
    teamId: '',
    playerId: '',
    map: '',
    matchNumber: '',
    dateFrom: '',
    dateTo: ''
  })

  // Check role-based access
  const hasFullAccess = profile?.role && ["admin", "manager", "analyst"].includes(profile.role.toLowerCase())
  const isCoach = profile?.role?.toLowerCase() === "coach"
  const isPlayer = profile?.role?.toLowerCase() === "player"

  useEffect(() => {
    if (!profile?.role || !["admin", "manager", "coach", "analyst", "player"].includes(profile.role.toLowerCase())) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      })
      return
    }
    
    // Load data once when component mounts
    loadInitialData()
  }, [profile])

  const loadInitialData = async () => {
    if (!profile) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      // Load filter options first
      await loadFilterOptions()
      // Then load performance data
      await loadPerformanceData()
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: "Error",
        description: `Failed to load performance data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
      // Set empty state on error
      setPerformances([])
      setSummaryStats(null)
    } finally {
      setLoading(false)
    }
  }

  const loadFilterOptions = async () => {
    try {
      // Load teams
      let teamsQuery = supabase.from('teams').select('id, name, coach_id')
      if (isCoach && profile?.id) {
        teamsQuery = teamsQuery.eq('coach_id', profile.id)
      }
      const { data: teamsData, error: teamsError } = await teamsQuery
      if (teamsError) {
        console.error('Error loading teams:', teamsError)
        setTeams([])
      } else {
        setTeams(teamsData || [])
      }

      // Load players  
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
        console.error('Error loading players:', playersError)
        setPlayers([])
      } else {
        setPlayers(playersData || [])
      }

      // Load maps
      const { data: mapsData, error: mapsError } = await supabase
        .from('performances')
        .select('map')
        .not('map', 'is', null)
      if (mapsError) {
        console.error('Error loading maps:', mapsError)
        setMaps([])
      } else {
        const uniqueMaps = [...new Set(mapsData?.map(p => p.map).filter(Boolean) || [])]
        setMaps(uniqueMaps)
      }

    } catch (error) {
      console.error('Error loading filter options:', error)
      // Set empty states on error
      setTeams([])
      setPlayers([])
      setMaps([])
    }
  }

  const loadPerformanceData = async () => {
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
        query = query.eq('player_id', profile.id)
      } else if (isCoach && profile?.id) {
        // For coaches, we need to load their teams first to filter properly
        const { data: coachTeams, error: coachTeamsError } = await supabase
          .from('teams')
          .select('id')
          .eq('coach_id', profile.id)
        
        if (coachTeamsError) {
          console.error('Error loading coach teams:', coachTeamsError)
          setPerformances([])
          setSummaryStats(null)
          return
        }
        
        const teamIds = coachTeams?.map(t => t.id) || []
        if (teamIds.length > 0) {
          query = query.in('team_id', teamIds)
        } else {
          // Coach has no teams, return empty
          setPerformances([])
          setSummaryStats(null)
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
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59')
      }

      const { data: performanceData, error } = await query

      if (error) throw error

      if (!performanceData || performanceData.length === 0) {
        setPerformances([])
        setSummaryStats(null)
        return
      }

      // Get unique IDs for batch loading related data
      const playerIds = [...new Set(performanceData.map(p => p.player_id).filter(Boolean))]
      const teamIds = [...new Set(performanceData.map(p => p.team_id).filter(Boolean))]
      const slotIds = [...new Set(performanceData.map(p => p.slot).filter(Boolean))]

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
      if (usersData.status === 'rejected') console.error('Error loading users:', usersData.reason)
      if (teamsData.status === 'rejected') console.error('Error loading teams:', teamsData.reason)
      if (slotsData.status === 'rejected') console.error('Error loading slots:', slotsData.reason)

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

      setPerformances(transformedData)
      calculateSummaryStats(transformedData)

    } catch (error) {
      console.error('Error loading performance data:', error)
    }
  }

  const calculateSummaryStats = (data: PerformanceData[]) => {
    if (data.length === 0) {
      setSummaryStats(null)
      return
    }

    const totalMatches = data.length
    const totalKills = data.reduce((sum, p) => sum + p.kills, 0)
    const totalDamage = data.reduce((sum, p) => sum + p.damage, 0)
    const avgPlacement = data.reduce((sum, p) => sum + p.placement, 0) / totalMatches
    const avgKills = totalKills / totalMatches
    const avgDamage = totalDamage / totalMatches

    setSummaryStats({
      totalMatches,
      totalKills,
      totalDamage,
      avgPlacement: Math.round(avgPlacement * 100) / 100,
      avgKills: Math.round(avgKills * 100) / 100,
      avgDamage: Math.round(avgDamage)
    })
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    loadPerformanceData()
  }

  const clearFilters = () => {
    setFilters({
      teamId: '',
      playerId: '',
      map: '',
      matchNumber: '',
      dateFrom: '',
      dateTo: ''
    })
    // Reload data without filters
    loadPerformanceData()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Report</h2>
          <p className="text-muted-foreground">
            {isPlayer ? "Your match performance data" : "Advanced performance analytics and reporting"}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalMatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Placement</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.avgPlacement}</div>
              <Badge variant={summaryStats.avgPlacement <= 3 ? "default" : "secondary"}>
                {summaryStats.avgPlacement <= 3 ? "Excellent" : "Good"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Kills</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.avgKills}</div>
              <div className="text-xs text-muted-foreground">
                Total: {summaryStats.totalKills}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Damage</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.avgDamage}</div>
              <div className="text-xs text-muted-foreground">
                Total: {summaryStats.totalDamage.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter performance data by various criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Team Filter */}
            {hasFullAccess && (
              <div className="space-y-2">
                <Label htmlFor="team-filter">Team</Label>
                <Select value={filters.teamId} onValueChange={(value) => handleFilterChange('teamId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Player Filter */}
            {!isPlayer && (
              <div className="space-y-2">
                <Label htmlFor="player-filter">Player</Label>
                <Select value={filters.playerId} onValueChange={(value) => handleFilterChange('playerId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All players" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All players</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Map Filter */}
            <div className="space-y-2">
              <Label htmlFor="map-filter">Map</Label>
              <Select value={filters.map} onValueChange={(value) => handleFilterChange('map', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All maps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All maps</SelectItem>
                  {maps.map((map) => (
                    <SelectItem key={map} value={map}>
                      {map}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Match Number Filter */}
            <div className="space-y-2">
              <Label htmlFor="match-filter">Match Number</Label>
              <Input
                id="match-filter"
                type="number"
                placeholder="All matches"
                value={filters.matchNumber}
                onChange={(e) => handleFilterChange('matchNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            {/* Date To */}
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

          <div className="flex gap-2">
            <Button onClick={applyFilters}>Apply Filters</Button>
            <Button variant="outline" onClick={clearFilters}>
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
            {performances.length > 0 
              ? `Showing ${performances.length} performance records` 
              : "No performance data found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performances.length === 0 ? (
            <Alert>
              <AlertDescription>
                No performance data found. Try adjusting your filters or ensure data has been added.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Match #</TableHead>
                    {!isPlayer && <TableHead>Player</TableHead>}
                    {hasFullAccess && <TableHead>Team</TableHead>}
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
                      <TableCell>{format(new Date(performance.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{performance.match_number}</TableCell>
                      {!isPlayer && <TableCell>{performance.player_name}</TableCell>}
                      {hasFullAccess && <TableCell>{performance.team_name}</TableCell>}
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
}