"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Plus, 
  UserCheck,
  Clock,
  Target,
  Trophy,
  Coffee,
  TrendingUp,
  Shield,
  AlertTriangle
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

interface ManagerAttendanceViewProps {
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
  sessions: Session[]
  attendances: Attendance[]
  stats: AttendanceStats
  onRefresh: () => void
}

export function ManagerAttendanceView({ 
  userProfile, 
  teams, 
  users, 
  sessions, 
  attendances, 
  stats, 
  onRefresh 
}: ManagerAttendanceViewProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500'
      case 'absent': return 'bg-red-500'
      case 'late': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid grid-cols-4 bg-white/10 backdrop-blur-md border-white/20">
        <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">Overview</TabsTrigger>
        <TabsTrigger value="teams" className="data-[state=active]:bg-white/20">Teams</TabsTrigger>
        <TabsTrigger value="sessions" className="data-[state=active]:bg-white/20">Sessions</TabsTrigger>
        <TabsTrigger value="reports" className="data-[state=active]:bg-white/20">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Manager Actions */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manager Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Session
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <UserCheck className="h-4 w-4 mr-2" />
                Mark Team Attendance
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Team Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Active Teams</p>
                  <p className="text-2xl font-bold text-white">{teams.filter(t => t.status === 'active').length}</p>
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
                  <p className="text-sm text-white/80">Sessions Today</p>
                  <p className="text-2xl font-bold text-white">{stats.upcomingSessions}</p>
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
                  <p className="text-sm text-white/80">Overall Attendance</p>
                  <p className="text-2xl font-bold text-white">89%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance Overview */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Team Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teams.slice(0, 5).map((team) => {
                const teamAttendances = attendances.filter(a => {
                  const session = sessions.find(s => s.id === a.session_id)
                  return session?.team_id === team.id
                })
                const attendanceRate = teamAttendances.length > 0 
                  ? (teamAttendances.filter(a => a.status === 'present').length / teamAttendances.length) * 100 
                  : 0

                return (
                  <div key={team.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Trophy className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{team.name}</h3>
                        <p className="text-white/60 text-sm">{team.tier} Tier</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-white font-medium">{attendanceRate.toFixed(1)}%</p>
                        <p className="text-white/60 text-sm">Attendance</p>
                      </div>
                      <Badge 
                        className={
                          attendanceRate >= 90 ? 'bg-green-500' : 
                          attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }
                      >
                        {attendanceRate >= 90 ? 'Excellent' : 
                         attendanceRate >= 75 ? 'Good' : 'Needs Attention'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="teams" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Team Management</CardTitle>
            <CardDescription className="text-white/80">
              Manage team sessions and attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">Team management interface coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Session Management</CardTitle>
            <CardDescription className="text-white/80">
              Create and manage training sessions and scrims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">Session management interface coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Attendance Reports</CardTitle>
            <CardDescription className="text-white/80">
              Generate and view detailed attendance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">Reports interface coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}