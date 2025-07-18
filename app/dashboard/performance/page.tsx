"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddPerformance } from "@/components/performance/add-performance"
import { OCRExtract } from "@/components/performance/ocr-extract"
import { PerformanceDashboard } from "@/components/performance/performance-dashboard"
import { PlayerPerformanceSubmit } from "@/components/performance/player-performance-submit"
import { PerformanceReportSimple } from "@/components/performance/performance-report-simple"
import type { Database } from "@/lib/supabase"

type Performance = Database["public"]["Tables"]["performances"]["Row"] & {
  slot?: {
    id: string
    time_range: string
    date: string
  } | null
}
type UserProfile = Database["public"]["Tables"]["users"]["Row"]

export default function PerformancePage() {
  const { profile } = useAuth()
  const [performances, setPerformances] = useState<Performance[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerformances()
    fetchUsers()
  }, [profile])

  const fetchPerformances = async () => {
    if (!profile) return

    try {
      let query = supabase.from("performances").select("*")

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
        // Set empty array so component doesn't crash
        setUsers([])
        return
      }
      
      console.log("Users fetched successfully:", data?.length || 0, "records")
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      // Set empty array so component doesn't crash
      setUsers([])
    }
  }

  // Role-based tab logic
  const isAdmin = profile?.role === "admin"
  const isManager = profile?.role === "manager"
  const isAdminOrManager = isAdmin || isManager
  const isCoach = profile?.role === "coach"
  const isPlayer = profile?.role === "player"
  const isAnalyst = profile?.role === "analyst"
  const canViewDashboard = isAdminOrManager || isCoach || isAnalyst
  const canAddPerformance = isAdminOrManager || isCoach
  const canUseOCR = isAdminOrManager || isCoach
  const canSubmitPerformance = isPlayer
  const canViewReport = true // All roles can view report
  const requiresUsers = canViewDashboard || canAddPerformance || canUseOCR;
  // If user has no access to any tab, render nothing
  if (!canViewDashboard && !canAddPerformance && !canUseOCR && !canSubmitPerformance && !canViewReport) {
    return null
  }

  if (!profile) {
    return <div className="text-center py-8 text-muted-foreground">Loading user profile...</div>;
  }

  if (requiresUsers && users.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-yellow-600">
          <p>Unable to load user directory. Some features may be limited.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Role: {profile.role} | User ID: {profile.id}
          </p>
        </div>
        <Tabs defaultValue="report" className="space-y-4">
          <TabsList>
            {canViewDashboard && <TabsTrigger value="dashboard">📈 Dashboard</TabsTrigger>}
            {canViewReport && <TabsTrigger value="report">📊 Performance Report</TabsTrigger>}
            {canSubmitPerformance && <TabsTrigger value="submit">🎮 Submit Performance</TabsTrigger>}
          </TabsList>
          {canViewDashboard && (
            <TabsContent value="dashboard">
              <div className="text-center py-8 text-muted-foreground">No user data found.</div>
            </TabsContent>
          )}
          {canViewReport && (
            <TabsContent value="report">
              <PerformanceReportSimple />
            </TabsContent>
          )}
          {canSubmitPerformance && (
            <TabsContent value="submit">
              <PlayerPerformanceSubmit onPerformanceAdded={fetchPerformances} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Tracking</h1>
        <p className="text-muted-foreground">Track and analyze match performance data</p>
      </div>
      <Tabs defaultValue={canViewDashboard ? "dashboard" : canSubmitPerformance ? "submit" : canAddPerformance ? "add" : undefined} className="space-y-4">
        <TabsList>
          {canViewDashboard && <TabsTrigger value="dashboard">📈 Dashboard</TabsTrigger>}
          {canViewReport && <TabsTrigger value="report">📊 Performance Report</TabsTrigger>}
          {canSubmitPerformance && <TabsTrigger value="submit">🎮 Submit Performance</TabsTrigger>}
          {canAddPerformance && !isAnalyst && <TabsTrigger value="add">➕ Add Performance</TabsTrigger>}
          {canUseOCR && !isAnalyst && <TabsTrigger value="ocr">📷 OCR Extract</TabsTrigger>}
        </TabsList>
        {canViewDashboard && (
          <TabsContent value="dashboard">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>
            ) : (!performances || performances.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">No performance data found.</div>
            ) : (!users || users.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">No user data found.</div>
            ) : (
              <PerformanceDashboard performances={performances} users={users} currentUser={profile} />
            )}
          </TabsContent>
        )}
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
                return <div className="text-center py-8 text-red-500">An error occurred while loading the performance form. Please contact support.</div>;
              }
            })()}
          </TabsContent>
        )}
        {canAddPerformance && !isAnalyst && (
          <TabsContent value="add">
            {users.length > 0 ? (
              <AddPerformance users={users} onPerformanceAdded={fetchPerformances} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Loading user data required for this feature...
              </div>
            )}
          </TabsContent>
        )}
        {canUseOCR && !isAnalyst && (
          <TabsContent value="ocr">
            {users.length > 0 ? (
              <OCRExtract users={users} onPerformanceAdded={fetchPerformances} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Loading user data required for this feature...
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
