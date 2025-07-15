"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, EyeOff, Lock, Unlock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/supabase"
import { UserManagementService } from "@/lib/user-management"
import { SupabaseAdminService } from "@/lib/supabase-admin"
import { SessionManager } from "@/lib/session-manager"
import { ProfileFixer } from "@/lib/profile-fixer"
import { AuthProfileSync } from "@/lib/auth-profile-sync"
import { SecureProfileCreation } from "@/lib/secure-profile-creation"
import { RoleAccess, ROLE_CONFIG } from "@/lib/role-system"
import { EmergencyAdminService, type EmergencyAdminResult } from "@/lib/emergency-admin-service"
import { Input } from "@/components/ui/input"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function UserManagementPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [showManualCreate, setShowManualCreate] = useState(false)
  const [manualEmail, setManualEmail] = useState("")
  const [manualName, setManualName] = useState("")
  const [emergencyLoading, setEmergencyLoading] = useState(false)
  const [emergencyResult, setEmergencyResult] = useState<any>(null)
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
  const [debugUnlocked, setDebugUnlocked] = useState(false)
  const [debugPassword, setDebugPassword] = useState("")
  const [unlockError, setUnlockError] = useState("")
  const [authUsers, setAuthUsers] = useState<any[]>([])
  const [fetchingAuthUsers, setFetchingAuthUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>("");
  // Remove statusFilter and uniqueStatuses

  // Get unique roles from users
  const uniqueRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));

  // List all possible roles for the filter
  const ALL_ROLES = [
    "admin",
    "manager",
    "coach",
    "player",
    "analyst",
    "pending_player",
    "awaiting_approval"
  ];

  // Ensure users and teams are always arrays
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];

  // Filter users based on selected role
  const filteredUsers = safeUsers.filter(user => {
    const roleMatch = roleFilter ? user.role === roleFilter : true;
    return roleMatch;
  });

  // Check unlock state on mount
  useEffect(() => {
    const unlockData = localStorage.getItem("admin_debug_unlock")
    if (unlockData) {
      const { timestamp } = JSON.parse(unlockData)
      if (Date.now() - timestamp < 60 * 60 * 1000) {
        setDebugUnlocked(true)
      } else {
        localStorage.removeItem("admin_debug_unlock")
      }
    }
  }, [])

  // Auto-lock after 1 hour
  useEffect(() => {
    if (debugUnlocked) {
      const timeout = setTimeout(() => {
        setDebugUnlocked(false)
        localStorage.removeItem("admin_debug_unlock")
      }, 60 * 60 * 1000)
      return () => clearTimeout(timeout)
    }
  }, [debugUnlocked])

  const handleUnlock = () => {
    // Use env variable for password
    const envPassword = process.env.NEXT_PUBLIC_ADMIN_DEBUG_PASSWORD
    if (debugPassword === envPassword) {
      setDebugUnlocked(true)
      setUnlockError("")
      localStorage.setItem("admin_debug_unlock", JSON.stringify({ timestamp: Date.now() }))
    } else {
      setUnlockError("Incorrect password.")
    }
  }

  const fetchAuthUsers = async () => {
    setFetchingAuthUsers(true)
    setUnlockError("")
    try {
      // Prompt for password again for extra security
      const envPassword = process.env.NEXT_PUBLIC_ADMIN_DEBUG_PASSWORD
      const password = debugPassword || envPassword
      const { data, error } = await supabase.rpc("admin_get_auth_users", {
        admin_id: profile.id,
        admin_password: password
      })
      if (error) throw error
      setAuthUsers(data || [])
    } catch (err: any) {
      setUnlockError(err.message || "Failed to fetch auth users")
    } finally {
      setFetchingAuthUsers(false)
    }
  }

  useEffect(() => {
    if (profile?.role?.toLowerCase() !== "admin") {
      return
    }

    fetchUsers()
    fetchTeams()
    
    // Set up real-time subscription for user changes
    const subscription = supabase
      .channel('user-management-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'users' 
        }, 
        (payload) => {
          console.log('📡 Real-time user change detected:', payload)
          // Refresh users list when changes occur
          fetchUsers()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [profile])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      // Always run both admin service and direct query
      const adminPromise = SupabaseAdminService.getAllUsers()
      const directPromise = supabase.from("users").select("*").order("created_at", { ascending: false })
      const [{ data: adminData, error: adminError }, { data, error }] = await Promise.all([adminPromise, directPromise])
      // Prefer admin data if available, else fallback to direct query
      if (adminData && adminData.length > 0 && !adminError) {
        setUsers(adminData)
      } else if (data && data.length > 0 && !error) {
        setUsers(data)
      } else {
        setUsers([])
      }
      if (adminError) {
        setError(adminError.message || String(adminError))
      } else if (error) {
        setError(error.message || String(error))
      }
    } catch (error: any) {
      setError(error.message || String(error))
      toast({
        title: "Error",
        description: `Failed to fetch users: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*").order("name")

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const updateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      console.log("🔧 Attempting to update user:", userId, updates)
      
      // If updating role, use admin service
      if (updates.role && profile?.id) {
        const { data, error } = await SupabaseAdminService.updateUserRole(
          userId, 
          updates.role, 
          profile.id
        )
        
        if (error) {
          throw error
        }
        
        console.log("✅ Role updated via admin service")
      }
      
      // For other updates, use the standard service
      if (Object.keys(updates).some(key => key !== 'role')) {
        const result = await UserManagementService.updateUser(userId, updates)
        
        if (!result.success) {
          throw result.error
        }
      }
      
      // Update local state optimistically
      setUsers(users.map((user) => (user.id === userId ? { ...user, ...updates } : user)))
      
      toast({
        title: "Success",
        description: "User updated successfully",
      })
      
      setEditingUser(null)
      
      // Refresh to ensure we have latest data
      setTimeout(() => fetchUsers(), 500)
      
    } catch (error: any) {
      console.error("❌ Error updating user:", error)
      
      const errorMessage = error?.message || "Failed to update user"
      console.error("Detailed error:", {
        message: errorMessage,
        error: error,
        userId,
        updates
      })
      
      toast({
        title: "Error", 
        description: `Failed to update user: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }



  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) throw error

      setUsers(users.filter((user) => user.id !== userId))

      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const runDiagnostics = async () => {
    if (!profile?.id) return
    
    try {
      console.log("🔍 Running comprehensive diagnostics...")
      
      const results = {
        timestamp: new Date().toISOString(),
        currentUser: {
          id: profile.id,
          email: profile.email,
          role: profile.role
        },
        sessionInfo: SessionManager.getSessionStatus(),
        adminPermissions: await SupabaseAdminService.testAdminPermissions(profile.id),
        userCounts: {
          visible: users.length,
          expected: 7 // User mentioned 7 users in database
        },
        profileDiagnostics: await ProfileFixer.getDatabaseDiagnostics(),
        syncStatus: await AuthProfileSync.getSyncStatus(),
        supabaseConnectionTest: await (async () => {
          try {
            const { data, error } = await supabase.from('users').select('count', { count: 'exact' })
            return {
              success: !error,
              error: error?.message,
              count: data?.length || 0
            }
          } catch (e: any) {
            return {
              success: false,
              error: e.message,
              count: 0
            }
          }
        })()
      }
      
      console.log("📊 Diagnostic results:", results)
      setDebugInfo(results)
      setShowDebug(true)
      
    } catch (error) {
      console.error("❌ Diagnostics failed:", error)
      toast({
        title: "Diagnostic Error",
        description: "Failed to run diagnostics",
        variant: "destructive"
      })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "manager":
        return "default"
      case "coach":
        return "secondary"
      case "player":
        return "outline"
      case "analyst":
        return "secondary"
      case "pending_player":
        return "outline" // Yellow/warning style would be ideal
      case "awaiting_approval":
        return "outline" // Orange/warning style would be ideal
      default:
        return "outline"
    }
  }

  // Emergency Admin Functions
  const setupEmergencyAdmin = async () => {
    if (!profile?.id || !profile?.email) {
      toast({
        title: "Error",
        description: "No user profile found",
        variant: "destructive"
      })
      return
    }

    setEmergencyLoading(true)
    setEmergencyResult(null)

    try {
      console.log('🚨 Starting emergency admin setup...')
      
      const result = await EmergencyAdminService.setupAdminAccess(
        profile.id,
        profile.email,
        profile.name || 'Emergency Admin'
      )

      setEmergencyResult(result)

      if (result.success) {
        toast({
          title: "Emergency Admin Setup Complete",
          description: "Admin access has been restored successfully",
          variant: "default"
        })
        
        // Refresh users list
        await fetchUsers()
      } else {
        toast({
          title: "Emergency Admin Setup Failed",
          description: "Some steps failed. Check the details below.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Emergency admin setup error:', error)
      toast({
        title: "Emergency Admin Setup Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setEmergencyLoading(false)
    }
  }

  const getAllUsersEmergency = async () => {
    setEmergencyLoading(true)
    try {
      const emergencyUsers = await EmergencyAdminService.getAllUsers()
      setEmergencyResult({
        success: true,
        type: 'users',
        users: emergencyUsers,
        message: `Found ${emergencyUsers.length} users via emergency access`
      })
      
      toast({
        title: "Emergency Access Successful",
        description: `Retrieved ${emergencyUsers.length} users bypassing RLS`,
        variant: "default"
      })
    } catch (error) {
      console.error('❌ Emergency get users error:', error)
      toast({
        title: "Emergency Access Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setEmergencyLoading(false)
    }
  }

  const enableSafeRLS = async () => {
    setEmergencyLoading(true)
    try {
      const result = await EmergencyAdminService.enableSafeRLS()
      setEmergencyResult({
        success: result.success,
        type: 'policies',
        message: result.message,
        error: result.error
      })
      
              if (result.success) {
          toast({
            title: "Safe RLS Enabled",
            description: "RLS policies have been re-enabled with safe admin access",
            variant: "default"
          })
        } else {
          toast({
            title: "RLS Enable Failed",
            description: result.error || "Failed to enable safe RLS",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('❌ Enable safe RLS error:', error)
        toast({
          title: "RLS Enable Error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        })
    } finally {
      setEmergencyLoading(false)
    }
  }

  const cleanupEmergencyFunctions = async () => {
    setEmergencyLoading(true)
    try {
      const result = await EmergencyAdminService.cleanupEmergencyFunctions()
      setEmergencyResult({
        success: result.success,
        type: 'cleanup',
        message: result.message,
        error: result.error
      })
      
      if (result.success) {
        toast({
          title: "Emergency Functions Cleaned Up",
          description: "All emergency bypass functions have been removed",
          variant: "default"
        })
      } else {
        toast({
          title: "Cleanup Failed",
          description: result.error || "Failed to cleanup emergency functions",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Cleanup emergency functions error:', error)
      toast({
        title: "Cleanup Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setEmergencyLoading(false)
    }
  }

  if (profile?.role?.toLowerCase() !== "admin") {
    return (
      <Alert>
        <AlertDescription>You don't have permission to access this page.</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and team assignments</p>
        {/* Blurred, password-protected debug section */}
        {profile?.role === "admin" && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg relative overflow-hidden">
            {!debugUnlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-10">
                <Lock className="h-8 w-8 text-yellow-700 mb-2" />
                <p className="mb-2 text-yellow-800 font-semibold">Admin Debug Tools Locked</p>
                <input
                  type="password"
                  className="border rounded px-2 py-1 mb-2"
                  placeholder="Enter password"
                  value={debugPassword}
                  onChange={e => setDebugPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUnlock() }}
                />
                <Button size="sm" onClick={handleUnlock}>
                  Unlock
                </Button>
                {unlockError && <div className="text-xs text-red-600 mt-2">{unlockError}</div>}
              </div>
            )}
            <div className={debugUnlocked ? "opacity-100" : "blur-sm pointer-events-none select-none opacity-60"}>
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <EyeOff className="h-4 w-4" /> Debug Tools
                {debugUnlocked && <Unlock className="h-4 w-4 text-green-600 ml-2" />}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => UserManagementService.testRLSPolicies()}
                className="mr-2"
              >
                Test RLS Policies
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const permissions = await UserManagementService.testDatabasePermissions()
                  console.log("Database permissions test:", permissions)
                  toast({
                    title: "Database Permissions Test",
                    description: `Read: ${permissions.canRead}, Update: ${permissions.canUpdate}, Insert: ${permissions.canInsert}, Delete: ${permissions.canDelete}`,
                  })
                }}
                className="mr-2"
              >
                Test DB Permissions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={runDiagnostics}
                className="mr-2"
              >
                Run Full Diagnostics
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/debug/env')
                    const data = await response.json()
                    toast({
                      title: "Environment Check",
                      description: data.message || "Environment status checked",
                      variant: data.success && data.status.hasServiceRoleKey ? "default" : "destructive"
                    })
                    console.log("🔍 Environment Status:", data)
                  } catch (error: any) {
                    console.error("Environment check failed:", error)
                    toast({
                      title: "Environment Check Failed",
                      description: error.message || "Could not check environment",
                      variant: "destructive"
                    })
                  }
                }}
                className="mr-2"
              >
                Check Environment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!profile?.id) {
                    toast({
                      title: "Error",
                      description: "No user profile available",
                      variant: "destructive"
                    })
                    return
                  }
                  try {
                    console.log("🔄 Starting profile sync...")
                    const result = await SupabaseAdminService.createMissingProfiles()
                    if (result.success) {
                      toast({
                        title: "Profile Sync Complete",
                        description: result.message || `Created ${result.created || 0} missing profiles`,
                      })
                      fetchUsers()
                    } else {
                      toast({
                        title: "Profile Sync Failed",
                        description: result.error || "Unknown error",
                        variant: "destructive"
                      })
                    }
                  } catch (error: any) {
                    console.error("Profile sync error:", error)
                    toast({
                      title: "Profile Sync Error",
                      description: error.message || "Failed to sync profiles",
                      variant: "destructive"
                    })
                  }
                }}
                className="mr-2"
              >
                Sync Missing Profiles
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const status = await AuthProfileSync.getSyncStatus()
                    console.log("Sync Status:", status)
                    toast({
                      title: "Sync Status",
                      description: `Profiles: ${status.profiles?.count || 0}, Auth Users: ${status.authUsers?.accessible ? status.authUsers.count : 'Unknown'}`,
                    })
                  } catch (error: any) {
                    toast({
                      title: "Sync Status Error",
                      description: error.message,
                      variant: "destructive"
                    })
                  }
                }}
                className="mr-2"
              >
                Check Sync Status
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowManualCreate(true)}
                className="mr-2"
              >
                Manual Create Profile
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowEmergencyPanel(!showEmergencyPanel)}
                className="mr-2"
              >
                Emergency Admin
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchAuthUsers}
                className="mr-2"
                disabled={fetchingAuthUsers}
              >
                {fetchingAuthUsers ? "Fetching..." : "Fetch Auth Users"}
              </Button>
              {authUsers.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-white border rounded p-2 text-xs">
                  <div className="font-semibold mb-1">auth.users</div>
                  <pre>{JSON.stringify(authUsers, null, 2)}</pre>
                </div>
              )}
              {showDebug && debugInfo && (
                <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold">Debug Info</h5>
                    <Button size="sm" variant="outline" onClick={() => setShowDebug(false)}>Close</Button>
                  </div>
                  <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap bg-gray-100 p-2 rounded">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
              {showManualCreate && (
                <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold">Manual Profile Creation</h5>
                    <Button size="sm" variant="outline" onClick={() => setShowManualCreate(false)}>Close</Button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Email"
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Name"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await AuthProfileSync.createProfileManually(manualEmail, manualName)
                        toast({ title: "Profile Created", description: "Manual profile created successfully" })
                        setShowManualCreate(false)
                        fetchUsers()
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" })
                      }
                    }}
                  >
                    Create Profile
                  </Button>
                </div>
              )}
              {showEmergencyPanel && (
                <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold">Emergency Admin Panel</h5>
                    <Button size="sm" variant="outline" onClick={() => setShowEmergencyPanel(false)}>Close</Button>
                  </div>
                  <Button size="sm" onClick={setupEmergencyAdmin} disabled={emergencyLoading} className="mr-2">
                    {emergencyLoading ? "Setting Up..." : "Setup Emergency Admin"}
                  </Button>
                  <Button size="sm" onClick={getAllUsersEmergency} disabled={emergencyLoading} className="mr-2">
                    {emergencyLoading ? "Loading..." : "Get All Users (Bypass)"}
                  </Button>
                  <Button size="sm" onClick={enableSafeRLS} disabled={emergencyLoading} className="mr-2">
                    {emergencyLoading ? "Enabling..." : "Enable Safe RLS"}
                  </Button>
                  <Button size="sm" onClick={cleanupEmergencyFunctions} disabled={emergencyLoading} className="mr-2">
                    {emergencyLoading ? "Cleaning..." : "Cleanup Emergency Functions"}
                  </Button>
                  {emergencyResult && (
                    <div className="mt-4 p-3 bg-gray-100 border rounded">
                      <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                        {JSON.stringify(emergencyResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            {debugUnlocked && (
              <div className="absolute top-2 right-2 text-xs text-yellow-700">
                <span>Unlocked • Auto-locks in 1 hour</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user roles and team assignments</CardDescription>
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div>
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  {ALL_ROLES.map(role => (
                    <SelectItem key={role} value={role}>{role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id || Math.random()}>
                    <TableCell>{user?.name || "Not set"}</TableCell>
                    <TableCell>{user?.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user?.role)}>{user?.role || "-"}</Badge>
                    </TableCell>
                    <TableCell>{safeTeams.find((t) => t.id === user?.team_id)?.name || "No team"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>Update user role and team assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="pending_player">Pending Player</SelectItem>
                    <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={editingUser.team_id || "none"}
                  onValueChange={(value) =>
                    setEditingUser({
                      ...editingUser,
                      team_id: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  updateUser(editingUser.id, {
                    role: editingUser.role,
                    team_id: editingUser.team_id,
                  })
                }
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  )
}
