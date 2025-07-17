"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddPerformance } from "@/components/performance/add-performance"
import { OCRExtract } from "@/components/performance/ocr-extract"
import { PerformanceDashboard } from "@/components/performance/performance-dashboard"
import { PlayerPerformanceSubmit } from "@/components/performance/player-performance-submit"
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
      let query = supabase.from("performances").select("*, slot:slot(id, time_range, date)")

      // Apply role-based filtering
      if (profile.role === "player") {
        query = query.eq("player_id", profile.id)
      } else if (profile.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      }
      // Admin, manager, and analyst can see all

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

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const canEdit = profile?.role && ["admin", "manager", "coach"].includes(profile.role.toLowerCase())
  const canViewDashboard = profile?.role && ["admin", "manager"].includes(profile.role.toLowerCase())

  if (!profile || !users) {
    return <div className="text-center py-8 text-muted-foreground">Loading user data...</div>;
  }
  if (users.length === 0) {
    return <div className="text-center py-8 text-red-500">No user records found. Please contact support or ensure your player profile is set up.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Tracking</h1>
        <p className="text-muted-foreground">Track and analyze match performance data</p>
      </div>

      <Tabs defaultValue={canViewDashboard ? "dashboard" : profile?.role === "player" ? "submit" : canEdit ? "add" : undefined} className="space-y-4">
        <TabsList>
          {canViewDashboard && <TabsTrigger value="dashboard">📈 Dashboard</TabsTrigger>}
          {profile?.role === "player" && <TabsTrigger value="submit">🎮 Submit Performance</TabsTrigger>}
          {canEdit && <TabsTrigger value="add">➕ Add Performance</TabsTrigger>}
          {canEdit && <TabsTrigger value="ocr">📷 OCR Extract</TabsTrigger>}
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

        {profile?.role === "player" && (
          <TabsContent value="submit">
            {/* Robust null check for profile and team/slots */}
            {profile && (() => {
              try {
                return <PlayerPerformanceSubmit onPerformanceAdded={fetchPerformances} />
              } catch (err) {
                return <div className="text-center py-8 text-red-500">An error occurred while loading the performance form. Please contact support.</div>;
              }
            })()}
          </TabsContent>
        )}

        {canEdit && (
          <TabsContent value="add">
            <AddPerformance users={users} onPerformanceAdded={fetchPerformances} />
          </TabsContent>
        )}

        {canEdit && (
          <TabsContent value="ocr">
            <OCRExtract users={users} onPerformanceAdded={fetchPerformances} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
