"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddPerformance } from "@/components/performance/add-performance"
import { OCRExtract } from "@/components/performance/ocr-extract"
import { PerformanceDashboard } from "@/components/performance/performance-dashboard"
import { PlayerPerformanceSubmit } from "@/components/performance/player-performance-submit"
import { PerformanceReportSimple } from "@/components/performance/performance-report-simple"
import { 
  Target, 
  Plus, 
  Camera, 
  FileText, 
  Gamepad2, 
  Crosshair, 
  Zap, 
  Shield,
  Filter,
  BarChart3
} from "lucide-react"
import type { Database } from "@/lib/supabase"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

type Performance = Database["public"]["Tables"]["performances"]["Row"] & {
  slot?: {
    id: string
    time_range: string
    date: string
  } | null
  users?: {
    id: string
    name: string
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
}
type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function PerformancePage() {
  const { profile } = useAuth()
  const [performances, setPerformances] = useState<Performance[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [addPerformanceOpen, setAddPerformanceOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all")
  const [selectedMap, setSelectedMap] = useState<string>("all")

  useEffect(() => {
    fetchPerformances()
    fetchUsers()
    fetchTeams()
  }, [profile])

  const fetchPerformances = async () => {
    if (!profile) return

    try {
      let query = supabase
        .from("performances")
        .select(`
          *,
          users!inner(id, name, email),
          teams!inner(id, name),
          slots(id, time_range, date)
        `)

      // Apply role-based filtering
      if (profile.role === "player") {
        query = query.eq("player_id", profile.id)
      } else if (profile.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      }
      // Admin, manager, and analyst can see all performances (no filtering)

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setPerformances(data || [])
    } catch (error) {
      console.error("Error fetching performances:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("name")

      if (error) {
        console.error("Database error fetching users:", error)
        setUsers([])
        return
      }
      
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      setUsers([])
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*").order("name")

      if (error) {
        console.error("Database error fetching teams:", error)
        setTeams([])
        return
      }
      
      setTeams(data || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
      setTeams([])
    }
  }

  // Role-based permissions using unified system
  const userRole = profile?.role as UserRole
  const performancePermissions = DashboardPermissions.getDataPermissions(userRole, 'performance')
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)
  
  const isAnalyst = profile?.role === "analyst"
  const canViewDashboard = performancePermissions.canView
  const canAddPerformance = performancePermissions.canCreate
  const canUseOCR = performancePermissions.canCreate && ['admin', 'manager', 'coach'].includes(userRole)
  const canSubmitPerformance = userRole === 'player'
  const canViewReport = performancePermissions.canView

  // Filter performances based on selected filters
  const filteredPerformances = performances.filter(perf => {
    if (selectedTeam !== "all" && perf.team_id !== selectedTeam) return false
    if (selectedPlayer !== "all" && perf.player_id !== selectedPlayer) return false
    if (selectedMap !== "all" && perf.map !== selectedMap) return false
    return true
  })

  // Calculate stats for filtered performances
  const stats = {
    totalMatches: filteredPerformances.length,
    totalKills: filteredPerformances.reduce((sum, p) => sum + (p.kills || 0), 0),
    avgDamage: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.damage || 0), 0) / filteredPerformances.length : 0,
    avgSurvival: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.survival_time || 0), 0) / filteredPerformances.length : 0,
    kdRatio: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.kills || 0), 0) / filteredPerformances.length : 0,
    todayMatches: filteredPerformances.filter(p => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(p.created_at) >= today
    }).length,
    weekMatches: filteredPerformances.filter(p => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(p.created_at) >= weekAgo
    }).length
  }

  // Get unique values for filters
  const availableTeams = teams.filter(team => 
    performances.some(p => p.team_id === team.id)
  )
  const availablePlayers = users.filter(user => 
    performances.some(p => p.player_id === user.id)
  )
  const availableMaps = [...new Set(performances.map(p => p.map).filter(Boolean))]

  const requiresUsers = canViewDashboard || canAddPerformance || canUseOCR

  // If user has no access to any tab, render nothing
  if (!canViewDashboard && !canAddPerformance && !canUseOCR && !canSubmitPerformance && !canViewReport) {
    return null
  }

  if (!profile) {
    return <div className="text-center py-8 text-muted-foreground">Loading user profile...</div>
  }

  if (requiresUsers && users.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">No User Data Available</h2>
        <p className="text-muted-foreground">
          Unable to load user data. Please contact your administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Performance Tracking</h1>
          <p className="text-muted-foreground">Track and analyze match performance data</p>
        </div>
        {(canAddPerformance && !isAnalyst) && (
          <Dialog open={addPerformanceOpen} onOpenChange={setAddPerformanceOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Performance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Performance Data</DialogTitle>
                <DialogDescription>
                  Choose how you'd like to add performance data
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Manual Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Manual Performance Entry</DialogTitle>
                      <DialogDescription>
                        Enter performance data manually
                      </DialogDescription>
                    </DialogHeader>
                    <AddPerformance 
                      users={users}
                      onPerformanceAdded={() => {
                        fetchPerformances()
                        setAddPerformanceOpen(false)
                      }} 
                    />
                  </DialogContent>
                </Dialog>
                
                {canUseOCR && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Camera className="h-4 w-4 mr-2" />
                        Screenshot OCR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>OCR Performance Extract</DialogTitle>
                        <DialogDescription>
                          Upload a screenshot to extract performance data automatically
                        </DialogDescription>
                      </DialogHeader>
                      <OCRExtract 
                        users={users}
                        onPerformanceAdded={() => {
                          fetchPerformances()
                          setAddPerformanceOpen(false)
                        }} 
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          {canViewReport && (
            <TabsTrigger value="report" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </TabsTrigger>
          )}
          {canSubmitPerformance && (
            <TabsTrigger value="submit" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Submit</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter performance data by team, player, and map</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Player</label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Players" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Players</SelectItem>
                      {availablePlayers.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name || player.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Map</label>
                  <Select value={selectedMap} onValueChange={setSelectedMap}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Maps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Maps</SelectItem>
                      {availableMaps.map(map => (
                        <SelectItem key={map} value={map}>
                          {map}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Matches</p>
                    <p className="text-2xl font-bold">{stats.totalMatches}</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Kills</p>
                    <p className="text-2xl font-bold">{stats.totalKills}</p>
                  </div>
                  <Crosshair className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Avg Damage</p>
                    <p className="text-2xl font-bold">{stats.avgDamage.toFixed(0)}</p>
                  </div>
                  <Zap className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">K/D Ratio</p>
                    <p className="text-2xl font-bold">{stats.kdRatio.toFixed(2)}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Today Matches</p>
                    <p className="text-2xl font-bold">{stats.todayMatches}</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">This Week</p>
                    <p className="text-2xl font-bold">{stats.weekMatches}</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Avg Survival</p>
                    <p className="text-2xl font-bold">{stats.avgSurvival.toFixed(1)}min</p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Data */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>
          ) : filteredPerformances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No performance data found.</div>
          ) : (
            <PerformanceDashboard 
              performances={filteredPerformances} 
              users={users} 
              currentUser={profile}
              showFilters={false}
              compact={false}
            />
          )}
        </TabsContent>

        {canViewReport && (
          <TabsContent value="report">
            <PerformanceReportSimple />
          </TabsContent>
        )}

        {canSubmitPerformance && (
          <TabsContent value="submit">
            {profile && (() => {
              try {
                return <PlayerPerformanceSubmit onPerformanceAdded={fetchPerformances} />
              } catch (err) {
                return <div className="text-center py-8 text-red-500">An error occurred while loading the performance form. Please contact support.</div>
              }
            })()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
