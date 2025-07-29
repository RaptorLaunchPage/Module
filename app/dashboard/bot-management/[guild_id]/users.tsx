'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Crown,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  MoreHorizontal,
  Link,
  Unlink,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface DiscordUser {
  id: string
  discord_id: string
  username: string
  discriminator: string
  avatar: string | null
  nickname: string | null
  joined_at: string
  roles: DiscordRole[]
  bot_permissions: BotPermission[]
  linked_crm_user?: {
    id: string
    name: string
    role: string
    team_id: string | null
  }
  is_active: boolean
  last_activity: string | null
}

interface DiscordRole {
  id: string
  name: string
  color: string
  position: number
  permissions: string[]
  is_bot_managed: boolean
}

interface BotPermission {
  module: string
  permission: 'view' | 'use' | 'manage'
  granted_by: string
  granted_at: string
}

interface CRMUser {
  id: string
  name: string
  email: string
  role: string
  team_id: string | null
  is_linked: boolean
}

export default function UsersPage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<DiscordUser[]>([])
  const [crmUsers, setCrmUsers] = useState<CRMUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<DiscordUser | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<DiscordRole[]>([])

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit

  const BOT_MANAGED_ROLES = [
    { name: 'Coach', description: 'Team coaching permissions', color: '#3B82F6' },
    { name: 'Analyst', description: 'Performance analysis access', color: '#8B5CF6' },
    { name: 'Tryout Moderator', description: 'Tryout management permissions', color: '#10B981' },
    { name: 'Tournament Admin', description: 'Tournament organization access', color: '#F59E0B' },
    { name: 'Performance Tracker', description: 'Performance data upload access', color: '#EF4444' }
  ]

  const BOT_MODULES = [
    { id: 'performance', name: 'Performance Tracking', description: 'Upload and view performance data' },
    { id: 'attendance', name: 'Attendance System', description: 'Mark and view attendance' },
    { id: 'tournaments', name: 'Tournament System', description: 'Create and manage tournaments' },
    { id: 'ai_insights', name: 'AI Insights', description: 'Access AI analysis and recommendations' },
    { id: 'digest', name: 'Daily Digest', description: 'Configure and receive digest reports' }
  ]

  useEffect(() => {
    if (guildId) {
      fetchUsers()
      fetchCRMUsers()
      fetchAvailableRoles()
    }
  }, [guildId])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('discord_users')
        .select(`
          *,
          user_roles(
            role_id,
            discord_roles(*)
          ),
          bot_permissions(*),
          users(
            id,
            name,
            role,
            team_id
          )
        `)
        .eq('guild_id', guildId)
        .order('username')

      if (error) throw error

      // Transform data to match interface
      const transformedUsers: DiscordUser[] = (data || []).map(user => ({
        id: user.id,
        discord_id: user.discord_id,
        username: user.username,
        discriminator: user.discriminator || '0000',
        avatar: user.avatar_url,
        nickname: user.nickname,
        joined_at: user.joined_at,
        roles: user.user_roles?.map((ur: any) => ur.discord_roles) || [],
        bot_permissions: user.bot_permissions || [],
        linked_crm_user: user.users ? {
          id: user.users.id,
          name: user.users.name,
          role: user.users.role,
          team_id: user.users.team_id
        } : undefined,
        is_active: user.is_active !== false,
        last_activity: user.last_activity
      }))

      setUsers(transformedUsers)

    } catch (error) {
      console.error('Error fetching Discord users:', error)
      toast.error('Failed to load Discord users')
    } finally {
      setLoading(false)
    }
  }

  const fetchCRMUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, team_id')
        .order('name')

      if (error) throw error

      // Check which CRM users are already linked
      const { data: linkedUsers } = await supabase
        .from('discord_users')
        .select('user_id')
        .not('user_id', 'is', null)

      const linkedUserIds = new Set(linkedUsers?.map(u => u.user_id) || [])

      const crmUsersWithLinkStatus: CRMUser[] = (data || []).map(user => ({
        ...user,
        is_linked: linkedUserIds.has(user.id)
      }))

      setCrmUsers(crmUsersWithLinkStatus)

    } catch (error) {
      console.error('Error fetching CRM users:', error)
    }
  }

  const fetchAvailableRoles = async () => {
    // Mock Discord roles - in reality this would come from Discord API
    const mockRoles: DiscordRole[] = [
      { id: '1', name: 'Admin', color: '#FF0000', position: 10, permissions: ['administrator'], is_bot_managed: false },
      { id: '2', name: 'Coach', color: '#3B82F6', position: 8, permissions: ['manage_messages'], is_bot_managed: true },
      { id: '3', name: 'Analyst', color: '#8B5CF6', position: 6, permissions: ['read_messages'], is_bot_managed: true },
      { id: '4', name: 'Player', color: '#10B981', position: 4, permissions: ['read_messages'], is_bot_managed: false },
      { id: '5', name: 'Tryout', color: '#F59E0B', position: 2, permissions: ['read_messages'], is_bot_managed: true }
    ]
    
    setAvailableRoles(mockRoles)
  }

  const handleAssignRole = async (userId: string, roleId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to assign roles')
      return
    }

    try {
      // In reality, this would call Discord API
      toast.success('Role assigned successfully')
      await fetchUsers()
    } catch (error) {
      console.error('Error assigning role:', error)
      toast.error('Failed to assign role')
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to remove roles')
      return
    }

    try {
      // In reality, this would call Discord API
      toast.success('Role removed successfully')
      await fetchUsers()
    } catch (error) {
      console.error('Error removing role:', error)
      toast.error('Failed to remove role')
    }
  }

  const handleLinkCRMUser = async (discordUserId: string, crmUserId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to link users')
      return
    }

    try {
      const { error } = await supabase
        .from('discord_users')
        .update({ user_id: crmUserId })
        .eq('id', discordUserId)

      if (error) throw error

      toast.success('User linked successfully')
      await fetchUsers()
      await fetchCRMUsers()
      setShowLinkDialog(false)

    } catch (error) {
      console.error('Error linking user:', error)
      toast.error('Failed to link user')
    }
  }

  const handleUnlinkUser = async (discordUserId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to unlink users')
      return
    }

    try {
      const { error } = await supabase
        .from('discord_users')
        .update({ user_id: null })
        .eq('id', discordUserId)

      if (error) throw error

      toast.success('User unlinked successfully')
      await fetchUsers()
      await fetchCRMUsers()

    } catch (error) {
      console.error('Error unlinking user:', error)
      toast.error('Failed to unlink user')
    }
  }

  const handleToggleBotPermission = async (userId: string, module: string, permission: string) => {
    if (!canManage) {
      toast.error('You do not have permission to modify bot permissions')
      return
    }

    try {
      // Check if permission exists
      const user = users.find(u => u.id === userId)
      const existingPermission = user?.bot_permissions.find(p => p.module === module && p.permission === permission)

      if (existingPermission) {
        // Remove permission
        const { error } = await supabase
          .from('bot_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('module', module)
          .eq('permission', permission)

        if (error) throw error
        toast.success('Permission removed')
      } else {
        // Add permission
        const { error } = await supabase
          .from('bot_permissions')
          .insert({
            user_id: userId,
            module,
            permission,
            granted_by: profile?.id,
            granted_at: new Date().toISOString()
          })

        if (error) throw error
        toast.success('Permission granted')
      }

      await fetchUsers()

    } catch (error) {
      console.error('Error toggling bot permission:', error)
      toast.error('Failed to update permission')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.linked_crm_user?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || 
                       user.roles.some(role => role.name.toLowerCase() === selectedRole.toLowerCase()) ||
                       (selectedRole === 'unlinked' && !user.linked_crm_user) ||
                       (selectedRole === 'linked' && user.linked_crm_user)

    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: DiscordRole) => {
    return role.color || '#6B7280'
  }

  const hasPermission = (user: DiscordUser, module: string, permission: string) => {
    return user.bot_permissions.some(p => p.module === module && p.permission === permission)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Discord User Management
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Manage Discord users, roles, and bot permissions for this server.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {users.length} members
              </Badge>
              <Badge variant="outline">
                {users.filter(u => u.linked_crm_user).length} linked
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="linked">Linked to CRM</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
                <Separator />
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: role.color }}
                      />
                      {role.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discord Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>CRM Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {user.nickname || user.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.username}#{user.discriminator}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: getRoleColor(role),
                            color: getRoleColor(role)
                          }}
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.linked_crm_user ? (
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="font-medium text-sm">
                            {user.linked_crm_user.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.linked_crm_user.role}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Unlink className="w-4 h-4" />
                        <span className="text-sm">Not linked</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm">Active</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="text-sm">Inactive</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowEditDialog(true)
                        }}
                        disabled={!canManage}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {!user.linked_crm_user ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowLinkDialog(true)
                          }}
                          disabled={!canManage}
                        >
                          <Link className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlinkUser(user.id)}
                          disabled={!canManage}
                        >
                          <Unlink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit User: {selectedUser.username}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="roles" className="space-y-4">
              <TabsList>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="permissions">Bot Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="roles" className="space-y-4">
                <div className="space-y-4">
                  <Label>Discord Roles</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {availableRoles.map((role) => {
                      const hasRole = selectedUser.roles.some(r => r.id === role.id)
                      return (
                        <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: role.color }}
                            />
                            <div>
                              <div className="font-medium">{role.name}</div>
                              {role.is_bot_managed && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Bot Managed
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={hasRole}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleAssignRole(selectedUser.id, role.id)
                              } else {
                                handleRemoveRole(selectedUser.id, role.id)
                              }
                            }}
                            disabled={!canManage}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-4">
                  <Label>Bot Module Permissions</Label>
                  <div className="space-y-4">
                    {BOT_MODULES.map((module) => (
                      <div key={module.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{module.name}</h4>
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {['view', 'use', 'manage'].map((permission) => (
                            <div key={permission} className="flex items-center justify-between">
                              <Label className="text-sm capitalize">{permission}</Label>
                              <Switch
                                checked={hasPermission(selectedUser, module.id, permission)}
                                onCheckedChange={(checked) => 
                                  handleToggleBotPermission(selectedUser.id, module.id, permission)
                                }
                                disabled={!canManage}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Link User Dialog */}
      {selectedUser && (
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Link Discord User to CRM
              </DialogTitle>
              <DialogDescription>
                Link {selectedUser.username} to a CRM user account.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Label>Select CRM User</Label>
              <Select onValueChange={(userId) => handleLinkCRMUser(selectedUser.id, userId)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a CRM user to link" />
                </SelectTrigger>
                <SelectContent>
                  {crmUsers
                    .filter(user => !user.is_linked)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{user.name}</span>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {crmUsers.filter(user => !user.is_linked).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No unlinked CRM users available.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Permissions Notice */}
      {!canManage && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            You have read-only access to user management. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}