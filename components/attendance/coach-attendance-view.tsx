"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Users, 
  Calendar, 
  BarChart3, 
  UserCheck,
  Clock,
  Target,
  Trophy,
  Coffee,
  Flag,
  TrendingUp,
  User
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

interface CoachAttendanceViewProps {
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
  sessions: Session[]
  attendances: Attendance[]
  stats: AttendanceStats
  onRefresh: () => void
}

export function CoachAttendanceView({ 
  userProfile, 
  teams, 
  users, 
  sessions, 
  attendances, 
  stats, 
  onRefresh 
}: CoachAttendanceViewProps) {
  // Get coach's team
  const myTeam = teams.find(team => team.coach_id === userProfile?.id)
  const myPlayers = users.filter(user => user.team_id === myTeam?.id && user.role === 'player')
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500'
      case 'absent': return 'bg-red-500'
      case 'late': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getPlayerAttendanceRate = (playerId: string) => {
    const playerAttendances = attendances.filter(a => a.player_id === playerId)
    if (playerAttendances.length === 0) return 0
    const presentCount = playerAttendances.filter(a => a.status === 'present').length
    return (presentCount / playerAttendances.length) * 100
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid grid-cols-3 bg-white/10 backdrop-blur-md border-white/20">
        <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">Overview</TabsTrigger>
        <TabsTrigger value="players" className="data-[state=active]:bg-white/20">My Team</TabsTrigger>
        <TabsTrigger value="sessions" className="data-[state=active]:bg-white/20">Sessions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Coach Actions */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Coach Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <UserCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Target className="h-4 w-4 mr-2" />
                Schedule Practice
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Player Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Team Players</p>
                  <p className="text-2xl font-bold text-white">{myPlayers.length}</p>
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
                  <p className="text-sm text-white/80">Sessions This Week</p>
                  <p className="text-2xl font-bold text-white">{sessions.filter(s => s.team_id === myTeam?.id).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Team Attendance</p>
                  <p className="text-2xl font-bold text-white">92%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Sessions */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions
                .filter(s => s.team_id === myTeam?.id && s.date === new Date().toISOString().split('T')[0])
                .map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Target className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{session.title}</h3>
                        <p className="text-white/60 text-sm">{session.start_time} - {session.end_time}</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </Button>
                  </div>
                ))}
              {sessions.filter(s => s.team_id === myTeam?.id && s.date === new Date().toISOString().split('T')[0]).length === 0 && (
                <p className="text-white/60 text-center py-8">No sessions scheduled for today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="players" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Team: {myTeam?.name || 'No Team Assigned'}</CardTitle>
            <CardDescription className="text-white/80">
              Manage your team players and track their attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPlayers.map((player) => {
                  const attendanceRate = getPlayerAttendanceRate(player.id)
                  const recentAttendances = attendances
                    .filter(a => a.player_id === player.id)
                    .slice(0, 5)

                  return (
                    <Card key={player.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar>
                            <AvatarImage src={player.avatar_url || ''} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-white font-medium">{player.name}</h3>
                            <p className="text-white/60 text-sm">{player.in_game_role || 'Player'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-white/80 text-sm">Attendance Rate</span>
                            <Badge className={attendanceRate >= 90 ? 'bg-green-500' : attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}>
                              {attendanceRate.toFixed(1)}%
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-white/80 text-sm mb-2">Recent Sessions</p>
                            <div className="flex gap-1">
                              {recentAttendances.map((attendance, index) => (
                                <div 
                                  key={index}
                                  className={`w-3 h-3 rounded-full ${getStatusColor(attendance.status)}`}
                                  title={attendance.status}
                                />
                              ))}
                              {Array.from({ length: Math.max(0, 5 - recentAttendances.length) }).map((_, index) => (
                                <div 
                                  key={`empty-${index}`}
                                  className="w-3 h-3 rounded-full bg-gray-600"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60">No players assigned to your team yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions" className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Team Sessions</CardTitle>
            <CardDescription className="text-white/80">
              View and manage your team's practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions
                .filter(s => s.team_id === myTeam?.id)
                .slice(0, 10)
                .map((session) => {
                  const sessionAttendances = attendances.filter(a => a.session_id === session.id)
                  const presentCount = sessionAttendances.filter(a => a.status === 'present').length
                  const totalCount = sessionAttendances.length

                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Target className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{session.title}</h3>
                          <p className="text-white/60 text-sm">
                            {new Date(session.date).toLocaleDateString()} • {session.start_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white text-sm">{presentCount}/{totalCount}</p>
                          <p className="text-white/60 text-xs">Present</p>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white">
                          {session.session_type}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}