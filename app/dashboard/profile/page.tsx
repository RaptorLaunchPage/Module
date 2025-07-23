"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileHeader } from "@/components/profile/profile-header"
import { BGMIGamingSection } from "@/components/profile/bgmi-gaming-section"
import { ProfileSearch } from "@/components/profile/profile-search"
import { UserProfile, canViewProfile, canEditProfile } from "@/lib/profile-utils"
import { useToast } from "@/hooks/use-toast"
import { useAuthToken } from "@/hooks/use-auth-token"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Gamepad2, 
  Smartphone, 
  Users, 
  Settings, 
  Search,
  Shield,
  Save,
  X
} from "lucide-react"

export default function ProfilePage() {
  const { profile: currentProfile, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const authToken = useAuthToken()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('userId')
  
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [personalData, setPersonalData] = useState({
    full_name: '',
    display_name: '',
    bio: '',
    contact_number: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    date_of_birth: '',
    address: '',
    instagram_handle: '',
    discord_id: '',
    profile_visibility: 'team' as 'public' | 'team' | 'private'
  })
  const [deviceData, setDeviceData] = useState({
    device_info: '',
    device_model: '',
    ram: '',
    fps: '',
    storage: '',
    gyroscope_enabled: true
  })

  const displayProfile = targetProfile || currentProfile
  const isOwnProfile = !targetUserId || targetUserId === currentProfile?.id
  
  // Load target profile if specified
  useEffect(() => {
    const loadTargetProfile = async () => {
      if (!targetUserId || !currentProfile) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/profile?userId=${targetUserId}`, {
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You don\'t have permission to view this profile')
          }
          throw new Error('Profile not found')
        }
        
        const data = await response.json()
        setTargetProfile(data.profile)
        
      } catch (error: any) {
        console.error('Profile load error:', error)
        toast({
          title: "Access Error",
          description: error.message,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadTargetProfile()
  }, [targetUserId, currentProfile])

  // Initialize form data
  useEffect(() => {
    if (displayProfile) {
      setPersonalData({
        full_name: displayProfile.full_name || '',
        display_name: displayProfile.display_name || '',
        bio: displayProfile.bio || '',
        contact_number: displayProfile.contact_number || '',
        emergency_contact_name: displayProfile.emergency_contact_name || '',
        emergency_contact_number: displayProfile.emergency_contact_number || '',
        date_of_birth: displayProfile.date_of_birth || '',
        address: displayProfile.address || '',
        instagram_handle: displayProfile.instagram_handle || '',
        discord_id: displayProfile.discord_id || '',
        profile_visibility: (displayProfile.profile_visibility as 'public' | 'team' | 'private') || 'team'
      })
      
      setDeviceData({
        device_info: displayProfile.device_info || '',
        device_model: displayProfile.device_model || '',
        ram: displayProfile.ram || '',
        fps: displayProfile.fps || '',
        storage: displayProfile.storage || '',
        gyroscope_enabled: displayProfile.gyroscope_enabled ?? true
      })
    }
  }, [displayProfile])

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!displayProfile || !currentProfile) {
      toast({
        title: "Update Failed",
        description: "Profile data not available",
        variant: "destructive"
      })
      return
    }
    
    if (!authToken) {
      toast({
        title: "Update Failed", 
        description: "Authentication token not available",
        variant: "destructive"
      })
      return
    }
    
    try {
      console.log('Sending profile update:', { 
        userId: displayProfile.id, 
        updates,
        currentUserRole: currentProfile.role,
        canEdit: canEdit
      })
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: displayProfile.id,
          updates
        })
      })
      
      const data = await response.json()
      console.log('API response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      
      if (isOwnProfile) {
        // Update current profile in auth context
        window.location.reload()
      } else {
        setTargetProfile(data.profile)
      }
      
      toast({
        title: "Profile Updated",
        description: "Changes have been saved successfully"
      })
      
      setIsEditing(false)
      
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      })
    }
  }

  const handlePersonalSave = () => {
    handleProfileUpdate(personalData)
  }

  const handleDeviceSave = () => {
    handleProfileUpdate(deviceData)
  }

  const canEdit = currentProfile && displayProfile ? canEditProfile(
    currentProfile.role as any,
    currentProfile.team_id,
    displayProfile.id,
    displayProfile.team_id,
    currentProfile.id
  ) : false

  const canSearchAll = currentProfile && ['admin', 'manager'].includes(currentProfile.role)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <Alert className="max-w-md mx-auto mt-8">
        <AlertDescription>
          Please log in to view profiles.
        </AlertDescription>
      </Alert>
    )
  }

  if (!displayProfile) {
    return (
      <Alert className="max-w-md mx-auto mt-8">
        <AlertDescription>
          Profile not found or access denied.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* Profile Header */}
      <ProfileHeader
        profile={displayProfile}
        viewerProfile={currentProfile}
        onEdit={() => setIsEditing(!isEditing)}
        isEditing={isEditing}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="gaming" className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">Gaming</span>
          </TabsTrigger>
          <TabsTrigger value="device" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Device</span>
          </TabsTrigger>
          {canSearchAll && (
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && canEdit ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={personalData.full_name}
                        onChange={(e) => setPersonalData({ ...personalData, full_name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={personalData.display_name}
                        onChange={(e) => setPersonalData({ ...personalData, display_name: e.target.value })}
                        placeholder="Enter your display name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={personalData.bio}
                      onChange={(e) => setPersonalData({ ...personalData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_number">Contact Number</Label>
                      <Input
                        id="contact_number"
                        value={personalData.contact_number}
                        onChange={(e) => setPersonalData({ ...personalData, contact_number: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={personalData.date_of_birth}
                        onChange={(e) => setPersonalData({ ...personalData, date_of_birth: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={personalData.address}
                      onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
                      placeholder="Enter your address..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={personalData.emergency_contact_name}
                        onChange={(e) => setPersonalData({ ...personalData, emergency_contact_name: e.target.value })}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                      <Input
                        id="emergency_contact_number"
                        value={personalData.emergency_contact_number}
                        onChange={(e) => setPersonalData({ ...personalData, emergency_contact_number: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram_handle">Instagram Handle</Label>
                      <Input
                        id="instagram_handle"
                        value={personalData.instagram_handle}
                        onChange={(e) => setPersonalData({ ...personalData, instagram_handle: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discord_id">Discord ID</Label>
                      <Input
                        id="discord_id"
                        value={personalData.discord_id}
                        onChange={(e) => setPersonalData({ ...personalData, discord_id: e.target.value })}
                        placeholder="username#1234"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile_visibility">Profile Visibility</Label>
                    <Select 
                      value={personalData.profile_visibility} 
                      onValueChange={(value) => setPersonalData({ ...personalData, profile_visibility: value as 'public' | 'team' | 'private' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Anyone can view</SelectItem>
                        <SelectItem value="team">Team - Only team members can view</SelectItem>
                        <SelectItem value="private">Private - Only you and admins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handlePersonalSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-gray-600">Full Name</p>
                    <p className="font-medium">{displayProfile.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Display Name</p>
                    <p className="font-medium">{displayProfile.display_name || 'Not set'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-600">Bio</p>
                    <p className="font-medium">{displayProfile.bio || 'No bio available'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Contact Number</p>
                    <p className="font-medium">{displayProfile.contact_number || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {displayProfile.date_of_birth ? new Date(displayProfile.date_of_birth).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  {displayProfile.address && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600">Address</p>
                      <p className="font-medium">{displayProfile.address}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaming Tab */}
        <TabsContent value="gaming">
          <BGMIGamingSection
            profile={displayProfile}
            isEditing={isEditing}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Device Tab */}
        <TabsContent value="device" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && canEdit ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="device_model">Device Model</Label>
                      <Input
                        id="device_model"
                        value={deviceData.device_model}
                        onChange={(e) => setDeviceData({ ...deviceData, device_model: e.target.value })}
                        placeholder="e.g., iPhone 13 Pro, OnePlus 9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ram">RAM</Label>
                      <Input
                        id="ram"
                        value={deviceData.ram}
                        onChange={(e) => setDeviceData({ ...deviceData, ram: e.target.value })}
                        placeholder="e.g., 8GB, 12GB"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fps">FPS Setting</Label>
                      <Input
                        id="fps"
                        value={deviceData.fps}
                        onChange={(e) => setDeviceData({ ...deviceData, fps: e.target.value })}
                        placeholder="e.g., 60fps, 90fps"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storage">Storage</Label>
                      <Input
                        id="storage"
                        value={deviceData.storage}
                        onChange={(e) => setDeviceData({ ...deviceData, storage: e.target.value })}
                        placeholder="e.g., 128GB, 256GB"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="device_info">Additional Device Info</Label>
                    <Textarea
                      id="device_info"
                      value={deviceData.device_info}
                      onChange={(e) => setDeviceData({ ...deviceData, device_info: e.target.value })}
                      placeholder="Any additional device specifications or notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleDeviceSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-gray-600">Device Model</p>
                    <p className="font-medium">{displayProfile.device_model || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">RAM</p>
                    <p className="font-medium">{displayProfile.ram || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">FPS Setting</p>
                    <p className="font-medium">{displayProfile.fps || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Storage</p>
                    <p className="font-medium">{displayProfile.storage || 'Not set'}</p>
                  </div>
                  {displayProfile.device_info && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600">Additional Info</p>
                      <p className="font-medium">{displayProfile.device_info}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab (Admin/Manager only) */}
        {canSearchAll && (
          <TabsContent value="search">
            <ProfileSearch
              onSelectProfile={(profile) => {
                window.location.href = `/dashboard/profile?userId=${profile.id}`
              }}
              currentUserRole={currentProfile.role}
            />
          </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-600">Profile Visibility</p>
                  <p className="font-medium capitalize">{displayProfile.profile_visibility || 'Team'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Auto-sync Tryout Data</p>
                  <p className="font-medium">{displayProfile.auto_sync_tryout_data ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Preferred Language</p>
                  <p className="font-medium">{displayProfile.preferred_language || 'English'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Timezone</p>
                  <p className="font-medium">{displayProfile.timezone || 'Asia/Kolkata'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Profile Update</p>
                  <p className="font-medium">
                    {displayProfile.last_profile_update 
                      ? new Date(displayProfile.last_profile_update).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
