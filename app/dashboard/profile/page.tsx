"use client"

import React, { useState, useEffect } from "react"
import { useAuthV3 as useAuth } from "@/hooks/use-auth-v3"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { ProfileHeader } from "@/components/profile/profile-header"
import { BGMIGamingSection } from "@/components/profile/bgmi-gaming-section"
import { ProfileSearch } from "@/components/profile/profile-search"
import { PersonalInformationSection, GamingInformationSection, DeviceInformationSection } from "@/components/profile/profile-sections"
import { UserProfile, canViewProfile, canEditProfile } from "@/lib/profile-utils"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Gamepad2, 
  Smartphone, 
  Users, 
  Settings, 
  Search,
  Shield,
  AlertCircle
} from "lucide-react"

export default function ProfilePage() {
  const { profile: currentProfile, updateProfile, getToken } = useAuth()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('user')
  const { toast } = useToast()

  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("personal")

  // Profile to display - either target user or current user
  const displayProfile = targetProfile || currentProfile
  const isOwnProfile = !targetUserId || targetUserId === currentProfile?.id

  // Permissions
  const canView = displayProfile && currentProfile ? canViewProfile(
    currentProfile.role as any,
    currentProfile.team_id || null,
    displayProfile.id,
    displayProfile.team_id || null,
    displayProfile.profile_visibility as any,
    currentProfile.id
  ) : false
  const canEdit = displayProfile && currentProfile ? canEditProfile(
    currentProfile.role as any,
    currentProfile.team_id || null,
    displayProfile.id,
    displayProfile.team_id || null,
    currentProfile.id
  ) : false
  const canSearchAll = ['admin', 'manager'].includes(currentProfile?.role || '')

  // Load target profile if specified
  useEffect(() => {
    const loadTargetProfile = async () => {
      if (!targetUserId || targetUserId === currentProfile?.id) {
        setTargetProfile(null)
        return
      }

      if (!currentProfile) return

      setLoading(true)
      setError(null)

      try {
        const token = await getToken()
        if (!token) throw new Error('No authentication token')

        const response = await fetch(`/api/profile?userId=${targetUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        setTargetProfile(data.profile)
      } catch (error: any) {
        console.error('Failed to load target profile:', error)
        setError(error.message)
        toast({
          title: 'Profile Load Failed',
          description: error.message,
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadTargetProfile()
  }, [targetUserId, currentProfile, getToken, toast])

  // Handle profile updates
  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!displayProfile || !currentProfile) return

    try {
      setLoading(true)

      const token = await getToken()
      if (!token) throw new Error('No authentication token')

      console.log('Sending profile update:', { 
        userId: displayProfile.id, 
        updates,
        currentUserRole: currentProfile.role,
        canEdit: canEdit,
        isOwnProfile
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
      console.log('Updated profile data:', data.profile)
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (isOwnProfile) {
        // Update current profile in auth context
        await updateProfile(data.profile)
        // For own profile, also update targetProfile if it exists
        if (targetProfile) {
          setTargetProfile(data.profile)
        }
      } else {
        setTargetProfile(data.profile)
      }
      
    } catch (error: any) {
      console.error('Profile update failed:', error)
      throw error // Re-throw so the section component can handle it
    } finally {
      setLoading(false)
    }
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (loading && !displayProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white">Loading target profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-red-900/40 backdrop-blur-lg border border-red-400/60 shadow-xl text-white rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200 drop-shadow-md">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!displayProfile || !canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 shadow-xl text-white rounded-lg">
          <Shield className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200 drop-shadow-md">
            You don't have permission to view this profile.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <ProfileHeader 
        profile={displayProfile ? {
          ...displayProfile,
          // Add missing properties that ProfileHeader might need with default values
          role_level: (displayProfile as any).role_level || null,
          avatar_url: (displayProfile as any).avatar_url || null,
          created_at: (displayProfile as any).created_at || '',
          provider: (displayProfile as any).provider || '',
          phone: (displayProfile as any).phone || null,
          gaming_stats: (displayProfile as any).gaming_stats || null,
          achievements: (displayProfile as any).achievements || null,
          last_seen: (displayProfile as any).last_seen || null,
          agreement_status: (displayProfile as any).agreement_status || '',
          agreement_version: (displayProfile as any).agreement_version || null,
          agreement_signed_at: (displayProfile as any).agreement_signed_at || null,
          preferred_slot_times: (displayProfile as any).preferred_slot_times || null,
          preferred_game_modes: (displayProfile as any).preferred_game_modes || null,
          performance_goals: (displayProfile as any).performance_goals || null,
          performance_notes: (displayProfile as any).performance_notes || null,
          coach_notes: (displayProfile as any).coach_notes || null,
          team_role: (displayProfile as any).team_role || null,
          onboarding_completed: (displayProfile as any).onboarding_completed || false,
          updated_at: (displayProfile as any).updated_at || null,
          last_profile_update: (displayProfile as any).last_profile_update || null,
          discord_id: (displayProfile as any).discord_id || null,
          timezone: (displayProfile as any).timezone || null,
          practice_schedule: (displayProfile as any).practice_schedule || null,
          availability: (displayProfile as any).availability || null,
          emergency_contact: (displayProfile as any).emergency_contact || null,
          date_of_birth: (displayProfile as any).date_of_birth || null,
          guardian_contact: (displayProfile as any).guardian_contact || null,
          medical_info: (displayProfile as any).medical_info || null,
          dietary_restrictions: (displayProfile as any).dietary_restrictions || null,
          experience_level: (displayProfile as any).experience_level || null,
          previous_teams: (displayProfile as any).previous_teams || null,
          goals: (displayProfile as any).goals || null,
          referral_source: (displayProfile as any).referral_source || null,
          social_media: (displayProfile as any).social_media || null,
          streaming_info: (displayProfile as any).streaming_info || null,
          hardware_info: (displayProfile as any).hardware_info || null,
          internet_speed: (displayProfile as any).internet_speed || null,
          language_preferences: (displayProfile as any).language_preferences || null,
          communication_preferences: (displayProfile as any).communication_preferences || null,
          training_focus: (displayProfile as any).training_focus || null,
          improvement_areas: (displayProfile as any).improvement_areas || null,
          // Additional properties that might be used by ProfileHeader
          full_name: (displayProfile as any).full_name || null,
          display_name: (displayProfile as any).display_name || null,
          bio: (displayProfile as any).bio || null,
          bgmi_id: (displayProfile as any).bgmi_id || null,
          bgmi_tier: (displayProfile as any).bgmi_tier || null,
          profile_visibility: (displayProfile as any).profile_visibility || 'team',
          contact_number: (displayProfile as any).contact_number || null,
          address: (displayProfile as any).address || null
        } : null} 
        viewerProfile={currentProfile ? {
          ...currentProfile,
          // Add missing properties for currentProfile too
          role_level: (currentProfile as any).role_level || null,
          avatar_url: (currentProfile as any).avatar_url || null,
          created_at: (currentProfile as any).created_at || '',
          provider: (currentProfile as any).provider || '',
          phone: (currentProfile as any).phone || null,
          gaming_stats: (currentProfile as any).gaming_stats || null,
          achievements: (currentProfile as any).achievements || null,
          last_seen: (currentProfile as any).last_seen || null,
          agreement_status: (currentProfile as any).agreement_status || '',
          agreement_version: (currentProfile as any).agreement_version || null,
          agreement_signed_at: (currentProfile as any).agreement_signed_at || null,
          preferred_slot_times: (currentProfile as any).preferred_slot_times || null,
          preferred_game_modes: (currentProfile as any).preferred_game_modes || null,
          performance_goals: (currentProfile as any).performance_goals || null,
          performance_notes: (currentProfile as any).performance_notes || null,
          coach_notes: (currentProfile as any).coach_notes || null,
          team_role: (currentProfile as any).team_role || null,
          onboarding_completed: (currentProfile as any).onboarding_completed || false,
          updated_at: (currentProfile as any).updated_at || null,
          last_profile_update: (currentProfile as any).last_profile_update || null,
          discord_id: (currentProfile as any).discord_id || null,
          timezone: (currentProfile as any).timezone || null,
          practice_schedule: (currentProfile as any).practice_schedule || null,
          availability: (currentProfile as any).availability || null,
          emergency_contact: (currentProfile as any).emergency_contact || null,
          date_of_birth: (currentProfile as any).date_of_birth || null,
          guardian_contact: (currentProfile as any).guardian_contact || null,
          medical_info: (currentProfile as any).medical_info || null,
          dietary_restrictions: (currentProfile as any).dietary_restrictions || null,
          experience_level: (currentProfile as any).experience_level || null,
          previous_teams: (currentProfile as any).previous_teams || null,
          goals: (currentProfile as any).goals || null,
          referral_source: (currentProfile as any).referral_source || null,
          social_media: (currentProfile as any).social_media || null,
          streaming_info: (currentProfile as any).streaming_info || null,
          hardware_info: (currentProfile as any).hardware_info || null,
          internet_speed: (currentProfile as any).internet_speed || null,
          language_preferences: (currentProfile as any).language_preferences || null,
          communication_preferences: (currentProfile as any).communication_preferences || null,
          training_focus: (currentProfile as any).training_focus || null,
          improvement_areas: (currentProfile as any).improvement_areas || null,
          // Additional properties
          full_name: (currentProfile as any).full_name || null,
          display_name: (currentProfile as any).display_name || null,
          bio: (currentProfile as any).bio || null,
          bgmi_id: (currentProfile as any).bgmi_id || null,
          bgmi_tier: (currentProfile as any).bgmi_tier || null,
          profile_visibility: (currentProfile as any).profile_visibility || 'team',
          contact_number: (currentProfile as any).contact_number || null,
          address: (currentProfile as any).address || null
        } : null}
        onEdit={() => setActiveTab('personal')}
        isEditing={false}
        showAvatarUpload={isOwnProfile && canEdit}
      />

      {/* Profile Sections */}
      <ResponsiveTabs
        tabs={[
          {
            value: "personal",
            label: "Personal Info",
            icon: User
          },
          {
            value: "gaming", 
            label: "Gaming Info",
            icon: Gamepad2
          },
          {
            value: "device",
            label: "Device Info", 
            icon: Smartphone
          },
          {
            value: "bgmi",
            label: "BGMI Profile",
            icon: Gamepad2
          },
          {
            value: "search",
            label: "Search Profiles",
            icon: Search,
            hidden: !canSearchAll
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="personal"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="w-full"
      >
        {/* Personal Information Section */}
        <TabsContent value="personal" className="space-y-6">
          <PersonalInformationSection
            profile={displayProfile}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Gaming Information Section */}
        <TabsContent value="gaming" className="space-y-6">
          <GamingInformationSection
            profile={displayProfile}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Device Information Section */}
        <TabsContent value="device" className="space-y-6">
          <DeviceInformationSection
            profile={displayProfile}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* BGMI Gaming Section */}
        <TabsContent value="bgmi" className="space-y-6">
          <BGMIGamingSection 
            profile={displayProfile}
            isEditing={false}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Profile Search Section */}
        <TabsContent value="search" className="space-y-6">
          <ProfileSearch />
        </TabsContent>
      </ResponsiveTabs>
    </div>
  )
}
