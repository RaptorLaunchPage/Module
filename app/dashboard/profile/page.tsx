"use client"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Upload, User, Shield, Calendar, Star, ToggleLeft, Instagram, MessageSquare } from "lucide-react"

export default function ProfilePage() {
  const { profile, loading, refreshProfile } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    device_model: "",
    ram: "",
    fps: "",
    storage: "",
    status: profile?.status || "Active",
    gyroscope_enabled: profile?.gyroscope_enabled !== undefined ? profile.gyroscope_enabled : true,
    instagram_handle: profile?.instagram_handle || "",
    discord_id: profile?.discord_id || "",
  })
  const [teamInfo, setTeamInfo] = useState<any>(null)

  useEffect(() => {
    const fetchTeamInfo = async () => {
      if (profile?.team_id && !['admin', 'manager'].includes(profile.role)) {
        try {
          const { data, error } = await supabase
            .from("teams")
            .select("name, tier, created_at")
            .eq("id", profile.team_id)
            .single()
          
          if (!error && data) {
            setTeamInfo(data)
          }
        } catch (error) {
          console.error("Error fetching team info:", error)
        }
      }
    }

    if (profile) {
      setFormData({
        name: profile.name || "",
        device_model: profile.device_model || "",
        ram: profile.ram || "",
        fps: profile.fps || "",
        storage: profile.storage || "",
        status: profile.status || "Active",
        gyroscope_enabled: profile.gyroscope_enabled !== undefined ? profile.gyroscope_enabled : true,
        instagram_handle: profile.instagram_handle || "",
        discord_id: profile.discord_id || "",
      })
      fetchTeamInfo()
    }
  }, [profile])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setUpdating(true)
    try {
      console.log('🔄 Updating profile...', formData)
      
      const { error } = await supabase
        .from("users")
        .update({
          name: formData.name,
          device_model: formData.device_model,
          ram: formData.ram,
          fps: formData.fps,
          storage: formData.storage,
          status: formData.status,
          gyroscope_enabled: formData.gyroscope_enabled,
          instagram_handle: formData.instagram_handle,
          discord_id: formData.discord_id,
        })
        .eq("id", profile.id)

      if (error) {
        console.error("❌ Profile update error:", error)
        throw error
      }

      console.log('✅ Profile updated successfully')
      toast.success("Profile updated successfully!")
      
      // Refresh profile data without navigation
      await refreshProfile()
      console.log('✅ Profile refresh completed - staying on profile page')
      
    } catch (error: any) {
      console.error("❌ Error updating profile:", error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setUpdating(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }

    setUploading(true)
    try {
      console.log('🔄 Starting avatar upload...')
      
      // Delete existing avatar if it exists
      if (profile.avatar_url) {
        try {
          const oldFileName = profile.avatar_url.split('/').pop()
          if (oldFileName && oldFileName !== 'undefined') {
            console.log('🗑️ Deleting old avatar:', oldFileName)
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([`${profile.id}/${oldFileName}`])
            
            if (deleteError) {
              console.warn('⚠️ Warning: Could not delete old avatar:', deleteError)
              // Continue with upload even if deletion fails
            }
          }
        } catch (deleteErr) {
          console.warn('⚠️ Warning: Error during old avatar deletion:', deleteErr)
          // Continue with upload even if deletion fails
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      console.log('📤 Uploading to path:', filePath)
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        console.error('❌ Upload error details:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('✅ Upload successful, getting public URL...')
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image')
      }

      console.log('🔗 Public URL generated:', publicUrl)

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) {
        console.error('❌ Database update error:', updateError)
        throw new Error(`Database update failed: ${updateError.message}`)
      }

      console.log('✅ Avatar updated successfully!')
      toast.success("Avatar updated successfully!")
      
      // Refresh profile data without navigation
      await refreshProfile()
      console.log('✅ Avatar update completed - staying on profile page')
      
      // Clear the file input
      if (event.target) {
        event.target.value = ''
      }
      
    } catch (error: any) {
      console.error("❌ Error uploading avatar:", error)
      toast.error(error.message || "Failed to upload avatar")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
      </div>
    )
  }

  // All roles in menuItems can access profile, but if you want to restrict further, add logic here.
  if (!profile) {
    return null
  }

  // Format join date
  const joinDate = teamInfo?.created_at ? new Date(teamInfo.created_at).toLocaleDateString() : "N/A"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        
        {/* Avatar Upload Section */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || ""} alt={profile.name || "User"} />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="avatar-upload" 
              className="absolute -bottom-2 -right-2 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-3 w-3" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
          <div className="text-sm">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Update Avatar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Information (Non-editable) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Team Information
            </CardTitle>
            <CardDescription>Your current team details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Team Name</Label>
                <p className="text-sm font-medium">{teamInfo?.name || "No team assigned"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Join Date</Label>
                <p className="text-sm font-medium">{joinDate}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Team Tier</Label>
                <p className="text-sm font-medium">{teamInfo?.tier || "N/A"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <p className="text-sm font-medium">{formData.status}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <p className="text-sm font-medium capitalize">{profile.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information (Editable) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">In-Game Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter your in-game name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="gyroscope"
                  checked={formData.gyroscope_enabled}
                  onCheckedChange={(checked) => handleInputChange("gyroscope_enabled", checked)}
                />
                <Label htmlFor="gyroscope" className="flex items-center gap-2">
                  <ToggleLeft className="h-4 w-4" />
                  Gyroscope Enabled
                </Label>
              </div>

              <Button type="submit" disabled={updating} className="w-full">
                {updating ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
            <CardDescription>Your gaming device specifications</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="device_model">Device Model</Label>
                <Input
                  id="device_model"
                  value={formData.device_model}
                  onChange={(e) => handleInputChange("device_model", e.target.value)}
                  placeholder="e.g., iPhone 13 Pro, Samsung Galaxy S21"
                />
              </div>

              <div>
                <Label htmlFor="ram">RAM</Label>
                <Input
                  id="ram"
                  value={formData.ram}
                  onChange={(e) => handleInputChange("ram", e.target.value)}
                  placeholder="e.g., 8GB, 12GB"
                />
              </div>

              <div>
                <Label htmlFor="fps">FPS</Label>
                <Input
                  id="fps"
                  value={formData.fps}
                  onChange={(e) => handleInputChange("fps", e.target.value)}
                  placeholder="e.g., 60, 90, 120"
                />
              </div>

              <div>
                <Label htmlFor="storage">Storage</Label>
                <Input
                  id="storage"
                  value={formData.storage}
                  onChange={(e) => handleInputChange("storage", e.target.value)}
                  placeholder="e.g., 128GB, 256GB"
                />
              </div>

              <Button type="submit" disabled={updating} className="w-full">
                {updating ? "Updating..." : "Update Device Info"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>Connect your social media accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram Handle
                </Label>
                <Input
                  id="instagram_handle"
                  value={formData.instagram_handle}
                  onChange={(e) => handleInputChange("instagram_handle", e.target.value)}
                  placeholder="@username (without @)"
                />
              </div>

              <div>
                <Label htmlFor="discord_id" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discord ID
                </Label>
                <Input
                  id="discord_id"
                  value={formData.discord_id}
                  onChange={(e) => handleInputChange("discord_id", e.target.value)}
                  placeholder="username#1234"
                />
              </div>

              <Button type="submit" disabled={updating} className="w-full">
                {updating ? "Updating..." : "Update Social Links"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
