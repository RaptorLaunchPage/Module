"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar as CalendarIcon, 
  BarChart3, 
  UserCheck,
  Clock,
  Target,
  Trophy,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Star
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

interface PlayerAttendanceViewProps {
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
  sessions: Session[]
  attendances: Attendance[]
  stats: AttendanceStats
  onRefresh: () => void
}



export function PlayerAttendanceView({ 
  userProfile, 
  teams, 
  users, 
  sessions, 
  attendances, 
  stats, 
  onRefresh 
}: PlayerAttendanceViewProps) {
  const myTeam = teams.find(team => team.id === userProfile?.team_id)
  const myAttendances = attendances.filter(a => a.player_id === userProfile?.id)
  const mySessions = sessions.filter(s => s.team_id === userProfile?.team_id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-500'
      case 'absent': return 'text-red-500'
      case 'late': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle
      case 'absent': return XCircle
      case 'late': return AlertCircle
      default: return Clock
    }
  }

  const getAttendanceStreak = () => {
    const sortedAttendances = myAttendances
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    let streak = 0
    for (const attendance of sortedAttendances) {
      if (attendance.status === 'present') {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const upcomingSessions = mySessions
    .filter(s => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const recentAttendances = myAttendances
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(attendance => ({
      ...attendance,
      session: sessions.find(s => s.id === attendance.session_id)
    }))

  const attendanceStreak = getAttendanceStreak()

  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white/80">Attendance Rate</p>
                <p className="text-2xl font-bold text-white">{stats.attendanceRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white/80">Present</p>
                <p className="text-2xl font-bold text-white">{stats.attendedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Star className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-white/80">Current Streak</p>
                <p className="text-2xl font-bold text-white">{attendanceStreak}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/80">Total Sessions</p>
                <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Info */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Team Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-500/20 rounded-lg">
              <Trophy className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{myTeam?.name || 'No Team Assigned'}</h3>
              <p className="text-white/60">{myTeam?.tier} Tier • {userProfile?.in_game_role || 'Player'}</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {myTeam?.status || 'Unknown Status'}
                </Badge>
                <span className="text-white/60 text-sm">
                  Coach: {users.find(u => u.id === myTeam?.coach_id)?.name || 'Not Assigned'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Target className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{session.title}</h3>
                      <p className="text-white/60 text-sm">
                        {new Date(session.date).toLocaleDateString()} • {session.start_time} - {session.end_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/20 text-white">
                      {session.session_type}
                    </Badge>
                    {session.is_mandatory && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-center py-8">No upcoming sessions scheduled</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance History */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendances.length > 0 ? (
            <div className="space-y-3">
              {recentAttendances.map((attendance, index) => {
                const StatusIcon = getStatusIcon(attendance.status)
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`h-5 w-5 ${getStatusColor(attendance.status)}`} />
                      <div>
                        <h4 className="text-white font-medium">
                          {attendance.session?.title || 'Unknown Session'}
                        </h4>
                        <p className="text-white/60 text-sm">
                          {new Date(attendance.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      attendance.status === 'present' ? 'bg-green-500' :
                      attendance.status === 'absent' ? 'bg-red-500' :
                      attendance.status === 'late' ? 'bg-yellow-500' : 'bg-gray-500'
                    }>
                      {attendance.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-white/60 text-center py-8">No attendance history available</p>
          )}
        </CardContent>
      </Card>

      {/* Attendance Progress */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Monthly Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/80">Attendance Goal</span>
                <span className="text-white font-medium">{stats.attendanceRate.toFixed(1)}% / 90%</span>
              </div>
              <Progress 
                value={Math.min(stats.attendanceRate, 100)} 
                className="h-2 bg-white/20"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{stats.attendedSessions}</p>
                <p className="text-white/60 text-sm">Present</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{stats.totalSessions - stats.attendedSessions}</p>
                <p className="text-white/60 text-sm">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{attendanceStreak}</p>
                <p className="text-white/60 text-sm">Streak</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}