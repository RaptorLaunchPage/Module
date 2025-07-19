"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { dataService } from "@/lib/optimized-data-service"
import { CacheInvalidation } from "@/lib/cache-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit, Plus, Users, Crown, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

type Team = Database["public"]["Tables"]["teams"]["Row"] & {
  coach?: { name: string; email: string } | null
}
type User = Database["public"]["Tables"]["users"]["Row"]

export default function OptimizedTeamsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [coaches, setCoaches] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    tier: "Tier 1",
    coach_id: "",
    status: "active" as const,
  })

  const userRole = profile?.role as UserRole
  const teamPermissions = DashboardPermissions.getDataPermissions(userRole, 'teams')

  useEffect(() => {
    fetchData()
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log('🚀 Loading teams data with caching...')
      const startTime = Date.now()
      
      // Use optimized data service with caching
      const [teamsData, coachesData] = await Promise.all([
        dataService.getTeams(userRole, profile?.id),
        dataService.getUsers({ role: 'coach' })
      ])
      
      // Fetch coach details for teams (this could be optimized further with joins)
      const teamsWithCoaches = await Promise.all(
        teamsData.map(async (team) => {
          if (team.coach_id) {
            const coach = coachesData.find(c => c.id === team.coach_id)
            return {
              ...team,
              coach: coach ? { name: coach.name || 'Unknown', email: coach.email } : null
            }
          }
          return { ...team, coach: null }
        })
      )
      
      setTeams(teamsWithCoaches)
      setCoaches(coachesData)
      
      const endTime = Date.now()
      console.log(`✅ Teams data loaded in ${endTime - startTime}ms`)
      
    } catch (error: any) {
      console.error("Error fetching teams:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch teams.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    setFormLoading(true)
    try {
      const { data, error } = await supabase
        .from("teams")
        .insert([formData])
        .select()
        .single()

      if (error) throw error

      // Invalidate cache and refresh
      CacheInvalidation.onTeamUpdate(data.id)
      
      toast({
        title: "Success",
        description: "Team created successfully!",
      })

      setShowCreateDialog(false)
      resetForm()
      fetchData() // Refresh with cache invalidation
      
    } catch (error: any) {
      console.error("Error creating team:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create team.",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam) return

    setFormLoading(true)
    try {
      const { error } = await supabase
        .from("teams")
        .update(formData)
        .eq("id", editingTeam.id)

      if (error) throw error

      // Invalidate cache and refresh
      CacheInvalidation.onTeamUpdate(editingTeam.id)

      toast({
        title: "Success",
        description: "Team updated successfully!",
      })

      setEditingTeam(null)
      resetForm()
      fetchData() // Refresh with cache invalidation
      
    } catch (error: any) {
      console.error("Error updating team:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update team.",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId)

      if (error) throw error

      // Invalidate cache and refresh
      CacheInvalidation.onTeamUpdate(teamId)

      toast({
        title: "Success",
        description: "Team deleted successfully!",
      })

      fetchData() // Refresh with cache invalidation
      
    } catch (error: any) {
      console.error("Error deleting team:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete team.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      tier: "Tier 1",
      coach_id: "",
      status: "active",
    })
  }

  const openEditDialog = (team: Team) => {
    setEditingTeam(team)
    setFormData({
      name: team.name,
      tier: team.tier || "Tier 1",
      coach_id: team.coach_id || "",
      status: (team.status as any) || "active",
    })
  }

  const closeEditDialog = () => {
    setEditingTeam(null)
    resetForm()
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Tier 1": return "bg-yellow-100 text-yellow-800"
      case "Tier 2": return "bg-blue-100 text-blue-800"
      case "Tier 3": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-red-100 text-red-800"
      case "suspended": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (!teamPermissions.canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-red-500 mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to view teams.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teams Management
            </CardTitle>
            <CardDescription>
              Manage your organization's teams and their coaches
            </CardDescription>
          </div>
          {teamPermissions.canCreate && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Add a new team to your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter team name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tier">Tier</Label>
                    <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tier 1">Tier 1</SelectItem>
                        <SelectItem value="Tier 2">Tier 2</SelectItem>
                        <SelectItem value="Tier 3">Tier 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="coach">Coach</Label>
                    <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a coach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Coach</SelectItem>
                        {coaches.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>
                            {coach.name} ({coach.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleCreateTeam} disabled={formLoading} className="flex-1">
                      {formLoading ? "Creating..." : "Create Team"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-muted-foreground">Loading teams...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-gray-400" />
                        <p className="text-lg font-medium">No teams found</p>
                        <p className="text-sm">Create your first team to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          {team.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(team.tier || "Unknown")} variant="secondary">
                          {team.tier || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {team.coach ? (
                          <div>
                            <div className="font-medium">{team.coach.name}</div>
                            <div className="text-sm text-muted-foreground">{team.coach.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No coach assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(team.status || "unknown")} variant="secondary">
                          {team.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(team.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {teamPermissions.canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(team)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {teamPermissions.canDelete && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Team Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-tier">Tier</Label>
              <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tier 1">Tier 1</SelectItem>
                  <SelectItem value="Tier 2">Tier 2</SelectItem>
                  <SelectItem value="Tier 3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-coach">Coach</Label>
              <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Coach</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name} ({coach.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleUpdateTeam} disabled={formLoading} className="flex-1">
                {formLoading ? "Updating..." : "Update Team"}
              </Button>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}