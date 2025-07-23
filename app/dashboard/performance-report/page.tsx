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

export default function PerformanceReportPage() {
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
    teamId: 'all',
    playerId: 'all',
    map: 'all',
    slotId: 'all',
    matchNumber: '',
    dateFrom: '',
    dateTo: ''
  })
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    teamId: 'all',
    playerId: 'all',
    map: 'all',
    slotId: 'all',
    matchNumber: '',
    dateFrom: '',
    dateTo: ''
  })

  // Check role-based access - ensure profile is loaded first
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
      const currentIsCoach = profile?.role?.toLowerCase() === "coach"
      // For coach role, wait for teams to be loaded
      if (currentIsCoach && teams.length === 0) {
        return // Don't load performance data yet for coaches until teams are loaded
      }
      loadPerformanceData()
    }
  }, [profile, appliedFilters, teams])

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

      // Apply role-based filtering - admin and manager see ALL data
      const currentRole = profile?.role?.toLowerCase()
      
      if (currentRole === 'player') {
        query = query.eq('player_id', profile?.id)
      } else if (currentRole === 'coach') {
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
      // Admin, manager, and analyst see all data without filtering

      // Apply filters
      if (appliedFilters.teamId && appliedFilters.teamId !== 'all') {
        query = query.eq('team_id', appliedFilters.teamId)
      }
      if (appliedFilters.playerId && appliedFilters.playerId !== 'all') {
        query = query.eq('player_id', appliedFilters.playerId)
      }
      if (appliedFilters.map && appliedFilters.map !== 'all') {
        query = query.eq('map', appliedFilters.map)
      }
      if (appliedFilters.slotId && appliedFilters.slotId !== 'all') {
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

      // Transform data
      const transformedData: PerformanceData[] = data?.map(p => ({
        match_number: p.match_number,
        map: p.map,
        placement: p.placement,
        kills: p.kills,
        assists: p.assists,
        damage: p.damage,
        survival_time: p.survival_time,
        created_at: p.created_at,
        player_name: (p.users as any)?.name || 'Unknown',
        team_name: (p.teams as any)?.name || 'Unknown',
        organizer: (p.slots as any)?.organizer || 'Unknown',
        player_id: p.player_id,
        team_id: p.team_id,
        slot: p.slot
      })) || []

      setPerformances(transformedData)
      calculateSummaryStats(transformedData)

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

    // Find top performers
    const playerStats = data.reduce((acc, p) => {
      if (!acc[p.player_id]) {
        acc[p.player_id] = { name: p.player_name, kills: 0, damage: 0 }
      }
      acc[p.player_id].kills += p.kills
      acc[p.player_id].damage += p.damage
      return acc
    }, {} as Record<string, { name: string; kills: number; damage: number }>)

    const topKillPlayer = Object.values(playerStats).reduce((max, player) => 
      player.kills > max.kills ? player : max, { name: 'N/A', kills: 0 })
    
    const topDamagePlayer = Object.values(playerStats).reduce((max, player) => 
      player.damage > max.damage ? player : max, { name: 'N/A', damage: 0 })

    setSummaryStats({
      totalMatches,
      totalKills,
      totalDamage,
      avgPlacement: Math.round(avgPlacement * 100) / 100,
      avgKills: Math.round(avgKills * 100) / 100,
      avgDamage: Math.round(avgDamage),
      topKillPlayer: { name: topKillPlayer.name, kills: topKillPlayer.kills },
      topDamagePlayer: { name: topDamagePlayer.name, damage: Math.round(topDamagePlayer.damage) }
    })
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setAppliedFilters(filters)
  }

  const clearFilters = () => {
    const emptyFilters = {
      teamId: 'all',
      playerId: 'all',
      map: 'all',
      slotId: 'all',
      matchNumber: '',
      dateFrom: '',
      dateTo: ''
    }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  const getPlacementBadge = (placement: number) => {
    if (placement <= 3) return "bg-yellow-100 text-yellow-800"
    if (placement <= 10) return "bg-green-100 text-green-800"
    return "bg-gray-100 text-gray-800"
  }

  if (!profile?.role || !["admin", "manager", "coach", "analyst", "player"].includes(profile.role.toLowerCase())) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Report</h1>
          <p className="text-muted-foreground">
            {isPlayer ? "Your match performance data" : "Advanced performance analytics and reporting"}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {profile.role?.replace('_', ' ').toUpperCase()} VIEW
        </Badge>
      </div>

      {/* Filters - Hidden for players */}
      {!isPlayer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter performance data by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Team Filter */}
              {(hasFullAccess || isCoach) && (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={filters.teamId} onValueChange={(value) => handleFilterChange('teamId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Player Filter */}
              <div className="space-y-2">
                <Label>Player</Label>
                <Select value={filters.playerId} onValueChange={(value) => handleFilterChange('playerId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Map Filter */}
              <div className="space-y-2">
                <Label>Map</Label>
                <Select value={filters.map} onValueChange={(value) => handleFilterChange('map', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select map" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Maps</SelectItem>
                    {maps.map(map => (
                      <SelectItem key={map} value={map}>{map}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Slot Filter */}
              <div className="space-y-2">
                <Label>Slot</Label>
                <Select value={filters.slotId} onValueChange={(value) => handleFilterChange('slotId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Slots</SelectItem>
                    {slots.map(slot => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.organizer} - {format(new Date(slot.date), 'MMM dd, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Match Number Filter */}
              <div className="space-y-2">
                <Label>Match Number</Label>
                <Input
                  type="number"
                  placeholder="Enter match number"
                  value={filters.matchNumber}
                  onChange={(e) => handleFilterChange('matchNumber', e.target.value)}
                />
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalMatches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Placement</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{summaryStats.avgPlacement}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Kills</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalKills}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {summaryStats.avgKills} per match
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Damage</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalDamage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {summaryStats.avgDamage.toLocaleString()} per match
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Kill Player</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{summaryStats.topKillPlayer.name}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.topKillPlayer.kills} kills
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Damage Player</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{summaryStats.topDamagePlayer.name}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.topDamagePlayer.damage.toLocaleString()} damage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Data
          </CardTitle>
          <CardDescription>
            {performances.length} matches found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : performances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No performance data found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match #</TableHead>
                    <TableHead>Map</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Kills</TableHead>
                    <TableHead>Assists</TableHead>
                    <TableHead>Damage</TableHead>
                    <TableHead>Survival Time</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performances.map((performance, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{performance.match_number}</TableCell>
                      <TableCell>{performance.map}</TableCell>
                      <TableCell>
                        <Badge className={getPlacementBadge(performance.placement)}>
                          #{performance.placement}
                        </Badge>
                      </TableCell>
                      <TableCell>{performance.kills}</TableCell>
                      <TableCell>{performance.assists}</TableCell>
                      <TableCell>{performance.damage.toLocaleString()}</TableCell>
                      <TableCell>{Math.round(performance.survival_time)}s</TableCell>
                      <TableCell>{performance.player_name}</TableCell>
                      <TableCell>{performance.team_name}</TableCell>
                      <TableCell>{performance.organizer}</TableCell>
                      <TableCell>{format(new Date(performance.created_at), 'MMM dd, yyyy')}</TableCell>
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