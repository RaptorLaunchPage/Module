"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MarkAttendance } from "@/components/attendance/mark-attendance"
import { AttendanceLogs } from "@/components/attendance/attendance-logs"
import { AttendanceStats } from "@/components/attendance/attendance-stats"
import { 
  CalendarCheck, 
  Plus, 
  Clock, 
  Users, 
  Filter,
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react"
import type { Database } from "@/lib/supabase"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

type Attendance = Database["public"]["Tables"]["attendances"]["Row"] & {
  users?: {
    id: string
    name: string
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
  marked_by_user?: {
    id: string
    name: string
    email: string
  } | null
}

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function AttendancePage() {
  const { profile } = useAuth()
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedSession, setSelectedSession] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("")

  useEffect(() => {
    fetchAttendances()
    fetchUsers()
    fetchTeams()
  }, [profile])

  const fetchAttendances = async () => {
    if (!profile) return

    try {
      let query = supabase
        .from("attendances")
        .select(`
          *,
          users!player_id(id, name, email),
          teams!inner(id, name),
          marked_by_user:users!marked_by(id, name, email)
        `)

      // Apply role-based filtering
      if (profile.role === "player") {
        query = query.eq("player_id", profile.id)
      } else if (profile.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      }
      // Admin, manager, and analyst can see all attendances (no filtering)

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setAttendances(data || [])
    } catch (error) {
      console.error("Error fetching attendances:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from("users")
        .select("*")

      // Apply role-based filtering for users
      if (profile?.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      } else if (profile?.role === "player") {
        query = query.eq("id", profile.id)
      }

      const { data, error } = await query.order("name")
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchTeams = async () => {
    try {
      let query = supabase
        .from("teams")
        .select("*")

      // Apply role-based filtering for teams
      if (profile?.role === "coach" && profile.team_id) {
        query = query.eq("id", profile.team_id)
      } else if (profile?.role === "player" && profile.team_id) {
        query = query.eq("id", profile.team_id)
      }

      const { data, error } = await query.order("name")
      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  // Filter attendances based on selected filters
  const filteredAttendances = attendances.filter(attendance => {
    if (selectedTeam !== "all" && attendance.team_id !== selectedTeam) return false
    if (selectedSession !== "all" && attendance.session_time !== selectedSession) return false
    if (selectedDate && attendance.date !== selectedDate) return false
    return true
  })

  // Permission checks
  const userRole = profile?.role as UserRole
  const canMarkAttendance = userRole && ['admin', 'manager', 'coach', 'player'].includes(userRole)
  const canViewAllTeams = userRole && ['admin', 'manager'].includes(userRole)

  // Get quick stats
  const todayAttendances = attendances.filter(a => a.date === new Date().toISOString().split('T')[0])
  const presentToday = todayAttendances.filter(a => a.status === 'Present' || a.status === 'Auto (Match)').length
  const totalPlayersToday = todayAttendances.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarCheck className="h-8 w-8 text-primary" />
              Attendance Management
            </h1>
            <p className="text-gray-600 mt-1">
              Track practice sessions and match attendance
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Present Today</p>
                  <p className="font-semibold">{presentToday}/{totalPlayersToday}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {canViewAllTeams && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Team</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block">Session</label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                    <SelectItem value="Match">Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTeam("all")
                    setSelectedSession("all")
                    setSelectedDate("")
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="mark" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mark" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Mark Attendance
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance Logs
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mark">
            {canMarkAttendance ? (
              <MarkAttendance 
                onAttendanceMarked={fetchAttendances}
                userProfile={profile}
                teams={teams}
                users={users}
              />
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Permission Required
                    </h3>
                    <p className="text-gray-600">
                      You don't have permission to mark attendance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <AttendanceLogs 
              attendances={filteredAttendances}
              onRefresh={fetchAttendances}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="stats">
            <AttendanceStats 
              attendances={attendances}
              teams={teams}
              users={users}
              userRole={userRole}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}