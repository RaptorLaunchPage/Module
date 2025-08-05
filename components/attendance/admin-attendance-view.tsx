"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  Settings, 
  Users, 
  Calendar, 
  BarChart3, 
  Plus, 
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  Target,
  Trophy,
  Coffee
} from "lucide-react"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]
type Attendance = Database["public"]["Tables"]["attendances"]["Row"]
type Session = Database["public"]["Tables"]["sessions"]["Row"]

interface AttendanceStats {
  totalSessions: number
  attendedSessions: number
  attendanceRate: number
  presentToday: number
  totalPlayersToday: number
  upcomingSessions: number
}

interface AdminAttendanceViewProps {
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
  sessions: Session[]
  attendances: Attendance[]
  stats: AttendanceStats
  onRefresh: () => void
}

export function AdminAttendanceView({ 
  userProfile, 
  teams, 
  users, 
  sessions, 
  attendances, 
  stats, 
  onRefresh 
}: AdminAttendanceViewProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedDateRange, setSelectedDateRange] = useState<string>("week")
  const [selectedSessionType, setSelectedSessionType] = useState<string>("all")

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'practice': return Target
      case 'tournament': return Trophy
      case 'meeting': return Coffee
      default: return Calendar
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500'
      case 'absent': return 'bg-red-500'
      case 'late': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (selectedTeam !== "all" && session.team_id !== selectedTeam) return false
    if (selectedSessionType !== "all" && session.session_type !== selectedSessionType) return false
    return true
  })

  const recentAttendances = attendances
    .slice(0, 10)
    .map(attendance => ({
      ...attendance,
      user: users.find(u => u.id === attendance.player_id),
      session: sessions.find(s => s.id === attendance.session_id)
    }))

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid grid-cols-5 bg-white/10 backdrop-blur-md border-white/20">
        <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">Overview</TabsTrigger>
        <TabsTrigger value="sessions" className="data-[state=active]:bg-white/20">Sessions</TabsTrigger>
        <TabsTrigger value="attendance" className="data-[state=active]:bg-white/20">Attendance</TabsTrigger>
        <TabsTrigger value="analytics" className="data-[state=active]:bg-white/20">Analytics</TabsTrigger>
        <TabsTrigger value="settings" className="data-[state=active]:bg-white/20">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Quick Actions */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <UserCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Total Players</p>
                  <p className="text-2xl font-bold text-white">{users.filter(u => u.role === 'player').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Sessions This Month</p>
                  <p className="text-2xl font-bold text-white">{sessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Avg Attendance</p>
                  <p className="text-2xl font-bold text-white">87%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Active Teams</p>
                  <p className="text-2xl font-bold text-white">{teams.filter(t => t.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Attendance Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAttendances.map((attendance, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(attendance.status)} text-white`}>
                      {attendance.status}
                    </Badge>
                    <span className="text-white font-medium">
                      {attendance.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-white/60">
                      {attendance.session?.title || 'Unknown Session'}
                    </span>
                  </div>
                  <span className="text-white/60 text-sm">
                    {new Date(attendance.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions" className="space-y-6">
        {/* Session Filters */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-white">Team</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="bg-white/8 backdrop-blur-md border-white/25 text-white">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-white">Session Type</label>
                <Select value={selectedSessionType} onValueChange={setSelectedSessionType}>
                  <SelectTrigger className="bg-white/8 backdrop-blur-md border-white/25 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-white">Date Range</label>
                <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                  <SelectTrigger className="bg-white/8 backdrop-blur-md border-white/25 text-white">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Sessions</CardTitle>
            <Button onClick={onRefresh} size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const IconComponent = getSessionTypeIcon(session.session_type)
                const team = teams.find(t => t.id === session.team_id)
                
                return (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{session.title}</h3>
                        <p className="text-white/60 text-sm">
                          {team?.name} • {new Date(session.date).toLocaleDateString()} • {session.start_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-white/20 text-white">
                        {session.session_type}
                      </Badge>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="attendance" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Attendance Management</CardTitle>
            <CardDescription className="text-white/80">
              Comprehensive attendance tracking and management for all teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">Attendance management interface coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Analytics & Reports</CardTitle>
            <CardDescription className="text-white/80">
              Detailed analytics and reporting dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">Analytics dashboard coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">System Settings</CardTitle>
            <CardDescription className="text-white/80">
              Configure attendance system settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">Settings panel coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}