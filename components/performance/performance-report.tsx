"use client"

import { useEffect, useState, useMemo } from "react"
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
import { Loader2, BarChart3, Trophy, Target, Zap, Users, Calendar, Filter, X } from "lucide-react"
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
  topKillPlayer: { name: string; kills: number }
  topDamagePlayer: { name: string; damage: number }
}

interface FilterState {
  teamId: string
  playerId: string
  map: string
  slotId: string
  matchNumber: string
  dateFrom: string
  dateTo: string
}

export function PerformanceReport() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [performances, setPerformances] = useState<PerformanceData[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [maps, setMaps] = useState<string[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [filters, setFilters] = useState<FilterState>({
    teamId: '',
    playerId: '',
    map: '',
    slotId: '',
    matchNumber: '',
    dateFrom: '',
    dateTo: ''
  })
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    teamId: '',
    playerId: '',
    map: '',
    slotId: '',
    matchNumber: '',
    dateFrom: '',
    dateTo: ''
  })

  // Check role-based access
  const hasFullAccess = profile?.role && ["admin", "manager", "analyst"].includes(profile.role.toLowerCase())
  const isCoach = profile?.role?.toLowerCase() === "coach"
  const isPlayer = profile?.role?.toLowerCase() === "player"

  // Redirect if no access
  useEffect(() => {
    if (!profile?.role || !["admin", "manager", "coach", "analyst", "player"].includes(profile.role.toLowerCase())) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      })
      return
    }
  }, [profile, toast])

  // Load filter options
  useEffect(() => {
    loadFilterOptions()
  }, [profile])

  // Load performance data
  useEffect(() => {
    if (profile) {
      loadPerformanceData()
    }
  }, [profile, appliedFilters])

  const loadFilterOptions = async () => {
    try {
      // Load teams
      let teamsQuery = supabase.from('teams').select('id, name, coach_id')
      if (isCoach) {
        teamsQuery = teamsQuery.eq('coach_id', profile?.id)
      }
      const { data: teamsData } = await teamsQuery
      setTeams(teamsData || [])

      // Load players
      let playersQuery = supabase.from('users').select('id, name, team_id').neq('role', 'pending_player')
      if (isPlayer) {
        playersQuery = playersQuery.eq('id', profile?.id)
      } else if (isCoach) {
        const coachTeams = teamsData?.map(t => t.id) || []
        if (coachTeams.length > 0) {
          playersQuery = playersQuery.in('team_id', coachTeams)
        }
      }
      const { data: playersData } = await playersQuery
      setPlayers(playersData || [])

      // Load maps
      const { data: mapsData } = await supabase
        .from('performances')
        .select('map')
        .not('map', 'is', null)
      const uniqueMaps = [...new Set(mapsData?.map(p => p.map) || [])]
      setMaps(uniqueMaps)

      // Load slots
      const { data: slotsData } = await supabase
        .from('slots')
        .select('id, organizer, date, time_range')
        .order('date', { ascending: false })
      setSlots(slotsData || [])

    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }

  const loadPerformanceData = async () => {
    setLoading(true)
    try {
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
          slot,
          users!performances_player_id_fkey(name),
          teams!performances_team_id_fkey(name),
          slots!performances_slot_fkey(organizer)
        `)
        .order('created_at', { ascending: false })

      // Apply role-based filtering
      if (isPlayer) {
        query = query.eq('player_id', profile?.id)
      } else if (isCoach) {
        const coachTeams = teams.filter(t => t.coach_id === profile?.id).map(t => t.id)
        if (coachTeams.length > 0) {
          query = query.in('team_id', coachTeams)
        } else {
          // Coach has no teams, return empty
          setPerformances([])
          setSummaryStats(null)
          setLoading(false)
          return
        }
      }

      // Apply filters
      if (appliedFilters.teamId) {
        query = query.eq('team_id', appliedFilters.teamId)
      }
      if (appliedFilters.playerId) {
        query = query.eq('player_id', appliedFilters.playerId)
      }
      if (appliedFilters.map) {
        query = query.eq('map', appliedFilters.map)
      }
      if (appliedFilters.slotId) {
        query = query.eq('slot', appliedFilters.slotId)
      }
      if (appliedFilters.matchNumber) {
        query = query.eq('match_number', parseInt(appliedFilters.matchNumber))
      }
      if (appliedFilters.dateFrom) {
        query = query.gte('created_at', appliedFilters.dateFrom)
      }
      if (appliedFilters.dateTo) {
        query = query.lte('created_at', appliedFilters.dateTo + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) throw error

      // Optimize: Transform data efficiently with reduced object creation
      const transformedData: PerformanceData[] = data?.map(p => {
        // Destructure to avoid repeated property access
        const { 
          match_number, map, placement, kills, assists, damage, 
          survival_time, created_at, player_id, team_id, slot,
          users, teams, slots 
        } = p
        
        return {
          match_number,
          map,
          placement,
          kills,
          assists,
          damage,
          survival_time,
          created_at,
          player_name: (users as any)?.name || 'Unknown',
          team_name: (teams as any)?.name || 'Unknown',
          organizer: (slots as any)?.organizer || 'Unknown',
          player_id,
          team_id,
          slot
        }
      }) || []

      setPerformances(transformedData)

    } catch (error) {
      console.error('Error loading performance data:', error)
      toast({
        title: "Error",
        description: "Failed to load performance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Memoize expensive calculations to prevent unnecessary recomputation
  const calculatedSummaryStats = useMemo(() => {
    if (performances.length === 0) {
      return null
    }

    const totalMatches = performances.length
    // Optimize: Use a single pass to calculate multiple statistics
    let totalKills = 0
    let totalDamage = 0
    let totalPlacement = 0
    const playerStats = {} as Record<string, { name: string; kills: number; damage: number }>

    for (const p of performances) {
      totalKills += p.kills
      totalDamage += p.damage
      totalPlacement += p.placement

      if (!playerStats[p.player_id]) {
        playerStats[p.player_id] = { name: p.player_name, kills: 0, damage: 0 }
      }
      playerStats[p.player_id].kills += p.kills
      playerStats[p.player_id].damage += p.damage
    }

    const avgPlacement = totalPlacement / totalMatches
    const avgKills = totalKills / totalMatches
    const avgDamage = totalDamage / totalMatches

    const topKillPlayer = Object.values(playerStats).reduce((max, player) => 
      player.kills > max.kills ? player : max, { name: 'N/A', kills: 0 })
    
    const topDamagePlayer = Object.values(playerStats).reduce((max, player) => 
      player.damage > max.damage ? player : max, { name: 'N/A', damage: 0 })

    return {
      totalMatches,
      totalKills,
      totalDamage,
      avgPlacement: Math.round(avgPlacement * 100) / 100,
      avgKills: Math.round(avgKills * 100) / 100,
      avgDamage: Math.round(avgDamage),
      topKillPlayer: { name: topKillPlayer.name, kills: topKillPlayer.kills },
      topDamagePlayer: { name: topDamagePlayer.name, damage: Math.round(topDamagePlayer.damage) }
    }
  }, [performances]) // Dependency array for useMemo

  // Update summaryStats state when the memoized value changes
  useEffect(() => {
    setSummaryStats(calculatedSummaryStats)
  }, [calculatedSummaryStats])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setAppliedFilters(filters)
  }

  const clearFilters = () => {
    setFilters({
      teamId: '',
      playerId: '',
      map: '',
      slotId: '',
      matchNumber: '',
      dateFrom: '',
      dateTo: ''
    })
    setAppliedFilters({
      teamId: '',
      playerId: '',
      map: '',
      slotId: '',
      matchNumber: '',
      dateFrom: '',
      dateTo: ''
    })
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