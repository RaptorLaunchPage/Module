"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { ProfileHeader } from "@/components/profile/profile-header"
import { BGMIGamingSection } from "@/components/profile/bgmi-gaming-section"
import { ProfileSearch } from "@/components/profile/profile-search"
import { UserProfile, canViewProfile, canEditProfile } from "@/lib/profile-utils"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { COMPONENT_STYLES } from "@/lib/global-theme"
import { 
  User, 
  Gamepad2, 
  Smartphone, 
  Users, 
  Settings, 
  Search,
  Shield,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react"

// Field configuration for data analysis and form validation
const FIELD_CONFIG = {
  // Required fields for data analysis
  required: {
    full_name: "Essential for player identification and records",
    display_name: "Required for team rosters and public display",
    contact_number: "Critical for team communication and emergencies",
    date_of_birth: "Required for age verification and tournaments",
    device_model: "Essential for performance analysis and team planning"
  },
  // Optional but valuable for analytics
  analytics: {
    bio: "Helps with team matching and player profiles",
    address: "Useful for regional tournaments and logistics",
    emergency_contact_name: "Important for safety but not mandatory",
    emergency_contact_number: "Important for safety but not mandatory",
    instagram_handle: "Valuable for social media analytics",
    discord_id: "Important for team communication",
    ram: "Critical for device performance analysis",
    fps: "Essential for gameplay optimization analysis",
    storage: "Useful for device capability assessment",
    device_info: "Additional context for performance analysis"
  },
  // Privacy/Settings fields
  settings: {
    profile_visibility: "Controls who can view your profile"
  }
}

const RequiredBadge = () => (
  <Badge variant="destructive" className="ml-2 text-xs">
    <AlertCircle className="h-3 w-3 mr-1" />
    Required
  </Badge>
)

const AnalyticsBadge = () => (
  <Badge variant="secondary" className="ml-2 text-xs">
    <CheckCircle className="h-3 w-3 mr-1" />
    Analytics
  </Badge>
)

export default function ProfileSettingsPage() {
  const { profile: currentProfile, isLoading: authLoading, getToken, updateProfile } = useAuth()
  const { toast } = useToast()
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
        const token = await getToken()
        if (!token) {
          throw new Error('Authentication token not available')
        }

        const response = await fetch(`/api/profile?userId=${targetUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
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
  }, [targetUserId, currentProfile, getToken, toast])

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
    
    setLoading(true)
    
    try {
      const token = await getToken()
      if (!token) {
        toast({
          title: "Update Failed", 
          description: "Authentication token not available. Please try signing out and back in.",
          variant: "destructive"
        })
        return
      }
      
      console.log('Sending profile update:', { 
        userId: displayProfile.id, 
        updates,
        currentUserRole: currentProfile.role,
        canEdit: canEdit
      })
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        // Update current profile in auth context and local state
        await updateProfile(data.profile)
        // For own profile, we need to trigger a re-render by updating targetProfile if it exists
        if (targetProfile) {
          setTargetProfile(data.profile)
        }
      } else {
        setTargetProfile(data.profile)
      }
      
      toast({
        title: "Profile Updated",
        description: "Changes have been saved successfully. No page reload needed!"
      })
      
      setIsEditing(false)
      
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePersonalSave = () => {
    // Validate required fields
    const missingRequired = Object.keys(FIELD_CONFIG.required).filter(field => 
      !personalData[field as keyof typeof personalData]?.trim()
    )
    
    if (missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingRequired.map(f => f.replace('_', ' ')).join(', ')}`,
        variant: "destructive"
      })
      return
    }
    
    handleProfileUpdate(personalData)
  }

  const handleDeviceSave = () => {
    // Validate required device fields
    if (!deviceData.device_model?.trim()) {
      toast({
        title: "Missing Required Field",
        description: "Device Model is required for performance analysis",
        variant: "destructive"
      })
      return
    }
    
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
      <div className={COMPONENT_STYLES.loadingContainer}>
        <div className={COMPONENT_STYLES.loadingCard}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white font-medium">Loading profile settings...</p>
        </div>
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <Alert className="max-w-md mx-auto mt-8">
        <AlertDescription>
          Please log in to access profile settings.
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-white/70 mt-1">
            {isOwnProfile ? 'Manage your profile information' : `Viewing ${displayProfile.display_name || displayProfile.full_name}'s profile`}
          </p>
        </div>
        {currentProfile.role === 'admin' && (
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            <Shield className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
        )}
      </div>

      {/* Profile Header */}
      <ProfileHeader
        profile={displayProfile}
        viewerProfile={currentProfile}
        onEdit={() => setIsEditing(!isEditing)}
        isEditing={isEditing}
        showAvatarUpload={true}
      />

      {/* Main Content */}
      <ResponsiveTabs 
        tabs={[
          {
            value: "profile",
            label: "Personal",
            icon: User
          },
          {
            value: "gaming",
            label: "Gaming",
            icon: Gamepad2
          },
          {
            value: "device",
            label: "Device",
            icon: Smartphone
          },
          {
            value: "search",
            label: "Search",
            icon: Search,
            hidden: !canSearchAll
          },
          {
            value: "settings",
            label: "Privacy",
            icon: Settings
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="profile"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="w-full"
      >

        {/* Personal Information Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
                <Badge variant="outline" className="ml-auto">
                  Data Analysis Fields
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && canEdit ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="flex items-center">
                        Full Name
                        <RequiredBadge />
                      </Label>
                      <Input
                        id="full_name"
                        value={personalData.full_name}
                        onChange={(e) => setPersonalData({ ...personalData, full_name: e.target.value })}
                        placeholder="Enter your full legal name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.required.full_name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name" className="flex items-center">
                        Display Name / IGN
                        <RequiredBadge />
                      </Label>
                      <Input
                        id="display_name"
                        value={personalData.display_name}
                        onChange={(e) => setPersonalData({ ...personalData, display_name: e.target.value })}
                        placeholder="Your in-game name or preferred display name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.required.display_name}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="flex items-center">
                      Bio
                      <AnalyticsBadge />
                    </Label>
                    <Textarea
                      id="bio"
                      value={personalData.bio}
                      onChange={(e) => setPersonalData({ ...personalData, bio: e.target.value })}
                      placeholder="Tell us about yourself, your gaming experience, achievements..."
                      rows={3}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.bio}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_number" className="flex items-center">
                        Contact Number
                        <RequiredBadge />
                      </Label>
                      <Input
                        id="contact_number"
                        value={personalData.contact_number}
                        onChange={(e) => setPersonalData({ ...personalData, contact_number: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.required.contact_number}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth" className="flex items-center">
                        Date of Birth
                        <RequiredBadge />
                      </Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={personalData.date_of_birth}
                        onChange={(e) => setPersonalData({ ...personalData, date_of_birth: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.required.date_of_birth}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center">
                      Address
                      <AnalyticsBadge />
                    </Label>
                    <Textarea
                      id="address"
                      value={personalData.address}
                      onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
                      placeholder="Your current address (used for regional tournaments and logistics)"
                      rows={2}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.address}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name" className="flex items-center">
                        Emergency Contact Name
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="emergency_contact_name"
                        value={personalData.emergency_contact_name}
                        onChange={(e) => setPersonalData({ ...personalData, emergency_contact_name: e.target.value })}
                        placeholder="Emergency contact person's name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.emergency_contact_name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_number" className="flex items-center">
                        Emergency Contact Number
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="emergency_contact_number"
                        value={personalData.emergency_contact_number}
                        onChange={(e) => setPersonalData({ ...personalData, emergency_contact_number: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.emergency_contact_number}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram_handle" className="flex items-center">
                        Instagram Handle
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="instagram_handle"
                        value={personalData.instagram_handle}
                        onChange={(e) => setPersonalData({ ...personalData, instagram_handle: e.target.value })}
                        placeholder="@username"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.instagram_handle}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discord_id" className="flex items-center">
                        Discord ID
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="discord_id"
                        value={personalData.discord_id}
                        onChange={(e) => setPersonalData({ ...personalData, discord_id: e.target.value })}
                        placeholder="username#1234 or @username"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.discord_id}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handlePersonalSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-white/60">Full Name</p>
                    <p className="font-medium text-white">{displayProfile.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Display Name / IGN</p>
                    <p className="font-medium text-white">{displayProfile.display_name || 'Not set'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-white/60">Bio</p>
                    <p className="font-medium text-white">{displayProfile.bio || 'No bio available'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Contact Number</p>
                    <p className="font-medium text-white">{displayProfile.contact_number || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Date of Birth</p>
                    <p className="font-medium text-white">
                      {displayProfile.date_of_birth ? new Date(displayProfile.date_of_birth).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  {displayProfile.address && (
                    <div className="md:col-span-2">
                      <p className="text-white/60">Address</p>
                      <p className="font-medium text-white">{displayProfile.address}</p>
                    </div>
                  )}
                  {displayProfile.instagram_handle && (
                    <div>
                      <p className="text-white/60">Instagram</p>
                      <p className="font-medium text-white">{displayProfile.instagram_handle}</p>
                    </div>
                  )}
                  {displayProfile.discord_id && (
                    <div>
                      <p className="text-white/60">Discord</p>
                      <p className="font-medium text-white">{displayProfile.discord_id}</p>
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
                <Badge variant="outline" className="ml-auto">
                  Performance Analysis
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && canEdit ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="device_model" className="flex items-center">
                        Device Model
                        <RequiredBadge />
                      </Label>
                      <Input
                        id="device_model"
                        value={deviceData.device_model}
                        onChange={(e) => setDeviceData({ ...deviceData, device_model: e.target.value })}
                        placeholder="e.g., iPhone 13 Pro, OnePlus 9, Samsung Galaxy S21"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.required.device_model}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ram" className="flex items-center">
                        RAM
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="ram"
                        value={deviceData.ram}
                        onChange={(e) => setDeviceData({ ...deviceData, ram: e.target.value })}
                        placeholder="e.g., 8GB, 12GB, 16GB"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.ram}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fps" className="flex items-center">
                        FPS Setting
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="fps"
                        value={deviceData.fps}
                        onChange={(e) => setDeviceData({ ...deviceData, fps: e.target.value })}
                        placeholder="e.g., 60fps, 90fps, 120fps"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.fps}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storage" className="flex items-center">
                        Storage
                        <AnalyticsBadge />
                      </Label>
                      <Input
                        id="storage"
                        value={deviceData.storage}
                        onChange={(e) => setDeviceData({ ...deviceData, storage: e.target.value })}
                        placeholder="e.g., 128GB, 256GB, 512GB"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.storage}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="device_info" className="flex items-center">
                      Additional Device Info
                      <AnalyticsBadge />
                    </Label>
                    <Textarea
                      id="device_info"
                      value={deviceData.device_info}
                      onChange={(e) => setDeviceData({ ...deviceData, device_info: e.target.value })}
                      placeholder="Any additional device specifications, accessories, or performance notes..."
                      rows={3}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <p className="text-xs text-white/60">{FIELD_CONFIG.analytics.device_info}</p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleDeviceSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-white/60">Device Model</p>
                    <p className="font-medium text-white">{displayProfile.device_model || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">RAM</p>
                    <p className="font-medium text-white">{displayProfile.ram || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">FPS Setting</p>
                    <p className="font-medium text-white">{displayProfile.fps || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Storage</p>
                    <p className="font-medium text-white">{displayProfile.storage || 'Not set'}</p>
                  </div>
                  {displayProfile.device_info && (
                    <div className="md:col-span-2">
                      <p className="text-white/60">Additional Info</p>
                      <p className="font-medium text-white">{displayProfile.device_info}</p>
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

        {/* Privacy Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Privacy & Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing && canEdit ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile_visibility">Profile Visibility</Label>
                    <Select 
                      value={personalData.profile_visibility} 
                      onValueChange={(value) => setPersonalData({ ...personalData, profile_visibility: value as 'public' | 'team' | 'private' })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Anyone can view your profile</SelectItem>
                        <SelectItem value="team">Team - Only team members can view</SelectItem>
                        <SelectItem value="private">Private - Only you and admins can view</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/60">{FIELD_CONFIG.settings.profile_visibility}</p>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handlePersonalSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-white/60">Profile Visibility</p>
                    <p className="font-medium text-white capitalize">{displayProfile.profile_visibility || 'Team'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Auto-sync Tryout Data</p>
                    <p className="font-medium text-white">{displayProfile.auto_sync_tryout_data ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Preferred Language</p>
                    <p className="font-medium text-white">{displayProfile.preferred_language || 'English'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Timezone</p>
                    <p className="font-medium text-white">{displayProfile.timezone || 'Asia/Kolkata'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Last Profile Update</p>
                    <p className="font-medium text-white">
                      {displayProfile.last_profile_update 
                        ? new Date(displayProfile.last_profile_update).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </ResponsiveTabs>
    </div>
  )
}
