"use client"

import React, { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoleAccess } from "@/lib/role-system"
import { useToast } from "@/hooks/use-toast"
import { 
  CalendarCheck, 
  Users, 
  Settings, 
  Clock, 
  BarChart3,
  UserCheck,
  Plus,
  Filter,
  Eye,
  Target,
  Trophy,
  Coffee,
  Gamepad2,
  Crown,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import type { Database } from "@/lib/supabase"
import type { UserRole } from "@/lib/role-system"

// Import role-specific components
import { AdminAttendanceView } from "./admin-attendance-view"
import { ManagerAttendanceView } from "./manager-attendance-view"
import { CoachAttendanceView } from "./coach-attendance-view"
import { PlayerAttendanceView } from "./player-attendance-view"

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

interface RoleBasedAttendanceDashboardProps {
  userProfile: UserProfile | null
}

export function RoleBasedAttendanceDashboard({ userProfile }: RoleBasedAttendanceDashboardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AttendanceStats>({
    totalSessions: 0,
    attendedSessions: 0,
    attendanceRate: 0,
    presentToday: 0,
    totalPlayersToday: 0,
    upcomingSessions: 0
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])

  const userRole = userProfile?.role as UserRole
  const canManageAttendance = RoleAccess.hasPermission(userRole, 'viewAllPerformance')
  const canViewAllTeams = RoleAccess.hasPermission(userRole, 'viewAllTeams')

  useEffect(() => {
    if (userProfile) {
      loadDashboardData()
    }
  }, [userProfile])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTeams(),
        loadUsers(),
        loadSessions(),
        loadAttendances(),
        loadStats()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load attendance dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      let query = supabase.from("teams").select("*")
      
      if (!canViewAllTeams && userProfile?.team_id) {
        query = query.eq('id', userProfile.team_id)
      }
      
      const { data, error } = await query
      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  const loadUsers = async () => {
    try {
      let query = supabase.from("users").select("*")
      
      if (!canViewAllTeams && userProfile?.team_id) {
        query = query.eq('team_id', userProfile.team_id)
      }
      
      const { data, error } = await query
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order('date', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const loadAttendances = async () => {
    try {
      const { data, error } = await supabase
        .from("attendances")
        .select("*")
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      setAttendances(data || [])
    } catch (error) {
      console.error('Error loading attendances:', error)
    }
  }

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's sessions
      const { data: todaySessions } = await supabase
        .from("sessions")
        .select("id")
        .eq('date', today)
      
      // Get today's attendances
      const { data: todayAttendances } = await supabase
        .from("attendances")
        .select("player_id, status")
        .in('session_id', todaySessions?.map(s => s.id) || [])
      
      const presentToday = todayAttendances?.filter(a => a.status === 'present').length || 0
      const totalPlayersToday = new Set(todayAttendances?.map(a => a.player_id)).size || 0
      
      // Get user's personal stats if they're a player
      let personalStats = { totalSessions: 0, attendedSessions: 0, attendanceRate: 0 }
      if (userRole === 'player' && userProfile?.id) {
        const { data: userAttendances } = await supabase
          .from("attendances")
          .select("status")
          .eq('player_id', userProfile.id)
        
        const totalSessions = userAttendances?.length || 0
        const attendedSessions = userAttendances?.filter(a => a.status === 'present').length || 0
        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0
        
        personalStats = { totalSessions, attendedSessions, attendanceRate }
      }
      
      // Get upcoming sessions
      const { data: upcomingSessions } = await supabase
        .from("sessions")
        .select("id")
        .gte('date', today)
      
      setStats({
        ...personalStats,
        presentToday,
        totalPlayersToday,
        upcomingSessions: upcomingSessions?.length || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const refreshData = () => {
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading attendance dashboard...</p>
        </div>
      </div>
    )
  }

  const getRoleBasedComponent = () => {
    const commonProps = {
      userProfile,
      teams,
      users,
      sessions,
      attendances,
      stats,
      onRefresh: refreshData
    }

    switch (userRole) {
      case 'admin':
        return <AdminAttendanceView {...commonProps} />
      case 'manager':
        return <ManagerAttendanceView {...commonProps} />
      case 'coach':
        return <CoachAttendanceView {...commonProps} />
      case 'player':
        return <PlayerAttendanceView {...commonProps} />
      default:
        return (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80">
                Your role ({userRole}) doesn't have access to the attendance system.
                Please contact an administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="h-8 w-8 text-white" />
            Attendance Dashboard
          </h1>
          <p className="text-white/80 mt-1">
            {userRole === 'player' ? 'Track your attendance and session history' 
             : userRole === 'coach' ? 'Manage your team\'s attendance' 
             : 'Comprehensive attendance management'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          {userRole === 'player' && (
            <Card className="px-4 py-2 bg-white/10 backdrop-blur-md border-white/20">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm text-white/80">Your Rate</p>
                  <p className="font-semibold text-white">{stats.attendanceRate.toFixed(1)}%</p>
                </div>
              </div>
            </Card>
          )}
          
          <Card className="px-4 py-2 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm text-white/80">Present Today</p>
                <p className="font-semibold text-white">{stats.presentToday}/{stats.totalPlayersToday}</p>
              </div>
            </div>
          </Card>
          
          <Card className="px-4 py-2 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm text-white/80">Upcoming</p>
                <p className="font-semibold text-white">{stats.upcomingSessions}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Role-based content */}
      {getRoleBasedComponent()}
    </div>
  )
}