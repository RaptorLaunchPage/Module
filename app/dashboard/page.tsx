"use client"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, User, BarChart3, Shield, DollarSign, CalendarCheck, Wallet, Trophy } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PerformanceDashboard } from "@/components/performance/performance-dashboard"
import { ErrorBoundary } from "react-error-boundary"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type SlotExpense = Database["public"]["Tables"]["slot_expenses"]["Row"]
type Winning = Database["public"]["Tables"]["winnings"]["Row"]

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const [teamStats, setTeamStats] = useState({
    totalSlotsBooked: 0,
    totalExpense: 0,
    totalWinnings: 0,
    netProfit: 0,
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [performances, setPerformances] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [debugOpen, setDebugOpen] = useState(false)
  const [lastError, setLastError] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('player_dashboard_debug_error') || 'null')
      } catch {
        return null
      }
    }
    return null
  })
  const [team, setTeam] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])

  useEffect(() => {
    if (profile?.role === "player") {
      fetchPerformances()
      fetchUsers()
      if (profile.team_id) {
        fetchTeam()
        fetchSlots()
      }
    } else {
      fetchTeams()
      fetchPerformances()
      fetchUsers()
    }
  }, [profile])

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamStats(selectedTeamId)
    }
  }, [selectedTeamId])

  const safeSelect = async <T,>(
    table: string,
    column: string,
    teamId: string,
  ): Promise<T[]> => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .eq("team_id", teamId)
      if (error) {
        if (error.code === "42P01") {
          console.warn(`Table "${table}" does not exist – returning empty array`)
          return [] as T[]
        }
        throw error
      }
      return (data || []) as T[]
    } catch (err: any) {
      if (err?.code === "42P01") {
        console.warn(`Table "${table}" does not exist – returning empty array`)
        return [] as T[]
      }
      throw err
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*").order("name")
      if (error) throw error
      setTeams(data || [])
      if (data && data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const fetchTeamStats = async (teamId: string) => {
    try {
      // Slots count (uses head+count)
      let slotsCount = 0
      try {
        const { count, error } = await supabase
          .from("slots")
          .select("*", { count: "exact", head: true })
          .eq("team_id", teamId)
        if (error) throw error
        slotsCount = count || 0
      } catch (err: any) {
        if (err?.code === "42P01") {
          console.warn('[Dashboard] Table "slots" missing – defaulting to 0')
          slotsCount = 0
        } else {
          throw err
        }
      }

      // Expenses & Winnings
      const expenses = await safeSelect<Database["public"]["Tables"]["slot_expenses"]["Row"]>(
        "slot_expenses",
        "total",
        teamId,
      )
      const winnings = await safeSelect<Database["public"]["Tables"]["winnings"]["Row"]>(
        "winnings",
        "amount_won",
        teamId,
      )

      const totalExpense = expenses.reduce((sum, e) => sum + (e.total || 0), 0)
      const totalWinnings = winnings.reduce((sum, w) => sum + (w.amount_won || 0), 0)

      setTeamStats({
        totalSlotsBooked: slotsCount,
        totalExpense,
        totalWinnings,
        netProfit: totalWinnings - totalExpense,
      })
    } catch (error) {
      console.error("Error fetching team stats:", error)
    }
  }

  const fetchPerformances = async () => {
    if (!profile) return
    try {
      
      // First, fetch performances with basic data
      let query = supabase.from("performances").select("*")
      
      // For players, fetch team performances (not just their own)
      if (profile.role === "player" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      } else if (profile.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      }
      // For other roles, fetch all performances
      
      const { data: performanceData, error } = await query.order("created_at", { ascending: false })
      if (error) throw error
      
      // Now fetch slots data separately
      const { data: slotsData, error: slotsError } = await supabase
        .from("slots")
        .select("id, time_range, date")
      
      if (slotsError) {
        console.error("Error fetching slots:", slotsError)
        setPerformances(performanceData || [])
        return
      }
      
      // Join performance data with slot data
      const performancesWithSlots = (performanceData || []).map(performance => {
        const slotInfo = slotsData?.find(slot => slot.id === performance.slot)
        return {
          ...performance,
          slot: slotInfo || performance.slot // Use slot info if found, otherwise keep original
        }
      })
      
      setPerformances(performancesWithSlots)
    } catch (error) {
      console.error("Error fetching performances:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("name")
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*").eq("id", profile.team_id).single()
      if (!error) setTeam(data)
      else setTeam(null)
    } catch {
      setTeam(null)
    }
  }
  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase.from("slots").select("*").eq("team_id", profile.team_id)
      if (!error) setSlots(data || [])
      else setSlots([])
    } catch {
      setSlots([])
    }
  }

  const handleDebugError = (error: any) => {
    setLastError(error)
    if (typeof window !== 'undefined') {
      localStorage.setItem('player_dashboard_debug_error', JSON.stringify(error))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (profile?.role === "player") {
    // Filter users to only show team members
    const teamUsers = users.filter(user => user.team_id === profile.team_id)
    const usersEmpty = !teamUsers || teamUsers.length === 0

    // Calculate team stats only
    const teamPerformances = performances.filter(p => 
      teamUsers.some(user => user.id === p.player_id)
    )

    // Calculate individual player stats
    const playerPerformances = performances.filter(p => p.player_id === profile.id)
    const playerStats = {
      totalMatches: playerPerformances.length,
      totalKills: playerPerformances.reduce((sum, p) => sum + (p.kills || 0), 0),
      individualKD: playerPerformances.length > 0 ? 
        playerPerformances.reduce((sum, p) => sum + (p.kills || 0), 0) / playerPerformances.length : 0,
      avgPlacement: playerPerformances.length > 0 ? 
        playerPerformances.reduce((sum, p) => sum + (p.placement || 0), 0) / playerPerformances.length : 0,
      avgDamage: playerPerformances.length > 0 ? 
        playerPerformances.reduce((sum, p) => sum + (p.damage || 0), 0) / playerPerformances.length : 0
    }
    

    const calculateTeamStats = (perfs: any[]) => {
      if (perfs.length === 0) return { 
        totalMatches: 0, 
        avgPlacement: 0, 
        totalKills: 0, 
        topFragger: "N/A", 
        chickenCount: 0, 
        mostPlayedMap: "N/A", 
        overallKD: 0 
      }
      
      const totalMatches = perfs.length
      const totalKills = perfs.reduce((sum, p) => sum + (p.kills || 0), 0)
      const avgPlacement = perfs.reduce((sum, p) => sum + (p.placement || 0), 0) / totalMatches
      const chickenCount = perfs.filter(p => p.placement === 1).length
      
      // Calculate Team K/D ratio: Total Team Kills / Total Team Matches
      const overallKD = totalMatches > 0 ? totalKills / totalMatches : 0
      
      // Find top fragger
      const playerKills: Record<string, number> = {}
      perfs.forEach(p => {
        const playerName = teamUsers.find(u => u.id === p.player_id)?.name || "Unknown"
        if (!playerKills[playerName]) playerKills[playerName] = 0
        playerKills[playerName] += p.kills || 0
      })
      const topFragger = Object.keys(playerKills).reduce((a, b) => 
        playerKills[a] > playerKills[b] ? a : b, "N/A"
      )
      
      // Find most played map
      const mapCounts: Record<string, number> = {}
      perfs.forEach(p => {
        if (!mapCounts[p.map]) mapCounts[p.map] = 0
        mapCounts[p.map]++
      })
      const mostPlayedMap = Object.keys(mapCounts).reduce((a, b) => 
        mapCounts[a] > mapCounts[b] ? a : b, "N/A"
      )
      
      return { 
        totalMatches, 
        avgPlacement, 
        totalKills, 
        topFragger, 
        chickenCount, 
        mostPlayedMap, 
        overallKD 
      }
    }

    const teamStats = calculateTeamStats(teamPerformances)

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Player Dashboard</h1>
          <p className="text-muted-foreground">Your team's performance and statistics</p>
        </div>



        {/* Team Stats Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Performance</h2>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalMatches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Team Placement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{teamStats.avgPlacement.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Team Kills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalKills}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Fragger</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{teamStats.topFragger}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chicken Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">🏆 {teamStats.chickenCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Most Played Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{teamStats.mostPlayedMap}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Team KD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.overallKD.toFixed(2)}</div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Performance History */}
        <Card>
          <CardHeader>
            <CardTitle>Performance History</CardTitle>
            <CardDescription>Your team's recent performance data</CardDescription>
          </CardHeader>
          <CardContent>
            {usersEmpty ? (
              <div className="text-red-600">Unable to load team data. Please contact admin.</div>
            ) : (
              <ErrorBoundary FallbackComponent={({error}) => { handleDebugError(error); return <div className="text-red-600">Error: {error.message}</div> }}>
                <PerformanceDashboard performances={teamPerformances} users={teamUsers} currentUser={profile} />
              </ErrorBoundary>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "Full system access and user management"
      case "manager":
        return "Team management and performance oversight"
      case "coach":
        return "Team coaching and performance tracking"
      case "player":
        return "View personal performance and team stats"
      case "analyst":
        return "Performance analysis and reporting"
      case "pending_player":
      case "awaiting_approval":
        return "Profile under review - awaiting approval"
      default:
        return "Standard user access"
    }
  }

  const getAvailableModules = (role: string) => {
    const modules = []

    // Pending players have very limited access
    if (["pending_player", "awaiting_approval"].includes(role?.toLowerCase())) {
      modules.push({
        title: "Profile Management",
        description: "Update your personal information and settings",
        icon: User,
        href: "/dashboard/profile",
      })
      return modules // Return early, no other modules for pending players
    }

    if (role === "admin") {
      modules.push({
        title: "User Management",
        description: "Manage users, roles, and team assignments",
        icon: Users,
        href: "/dashboard/user-management",
      })
    }

    if (["admin", "manager", "coach"].includes(role)) {
      modules.push({
        title: "Team Management",
        description: "Manage teams, rosters, slots, expenses, and prize pools",
        icon: Shield,
        href: "/dashboard/team-management",
      })
    }

    modules.push({
      title: "Profile Management",
      description: "Update your personal information and settings",
      icon: User,
      href: "/dashboard/profile",
    })

    modules.push({
      title: "Performance Tracking",
      description: "Track and analyze performance metrics",
      icon: BarChart3,
      href: "/dashboard/performance",
    })

    return modules
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Raptor Esports CRM</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Role: {["pending_player", "awaiting_approval"].includes(profile?.role?.toLowerCase()) ? "AWAITING APPROVAL" : profile?.role?.toUpperCase()}
          </CardTitle>
          <CardDescription>{getRoleDescription(profile?.role || "")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Name: {profile?.name || "Not set"}</p>
            <p>Email: {profile?.email}</p>
            {profile?.team_id && <p>Team: {teams.find((t) => t.id === profile.team_id)?.name || profile.team_id}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Pending Player Status Card */}
      {["pending_player", "awaiting_approval"].includes(profile?.role?.toLowerCase()) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Shield className="h-5 w-5" />
              Profile Under Review
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Thank you for completing your registration! Our team is reviewing your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-yellow-800">
            <div className="space-y-2">
              <p className="text-sm">
                <strong>What happens next?</strong>
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Our team will review your gaming profile and experience</li>
                <li>You'll receive an email notification once approved (24-48 hours)</li>
                <li>After approval, you'll have full access to team features</li>
              </ul>
              <div className="mt-4">
                <p className="text-sm mb-2">
                  <strong>Questions?</strong> Join our Discord community!
                </p>
                <Button 
                  asChild 
                  size="sm" 
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                >
                  <a 
                    href="https://discord.gg/6986Kf3eG4" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Join Discord Server
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {["admin", "manager", "coach", "player"].includes(profile?.role?.toLowerCase()) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Team Overview
            </CardTitle>
            <CardDescription>
              <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTeamId ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Slots Booked</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{teamStats.totalSlotsBooked}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{teamStats.totalExpense}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Winnings</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{teamStats.totalWinnings}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${teamStats.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      ₹{teamStats.netProfit}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">Select a team to view its overview.</div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4">Available Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getAvailableModules(profile?.role || "").map((module) => (
            <Link key={module.title} href={module.href}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <module.icon className="h-5 w-5" />
                    {module.title}
                  </CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
