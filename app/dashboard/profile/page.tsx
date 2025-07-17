"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { EmergencyAdminService } from "@/lib/emergency-admin-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Upload, User } from "lucide-react"

export default function ProfilePage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    contact_number: profile?.contact_number || "",
    in_game_role: profile?.in_game_role || "",
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
      if (profile?.team_id) {
        const { data, error } = await supabase
          .from("teams")
          .select("name, tier, created_at")
          .eq("id", profile.team_id)
          .single()
        
        if (!error && data) {
          setTeamInfo(data)
        }
      }
    }
    fetchTeamInfo()

    // Parse device_info if it exists
    if (profile?.device_info) {
      try {
        const deviceInfo = JSON.parse(profile.device_info)
        setFormData(prev => ({
          ...prev,
          device_model: deviceInfo.device_model || "",
          ram: deviceInfo.ram || "",
          fps: deviceInfo.fps || "",
          storage: deviceInfo.storage || "",
        }))
      } catch {
        // If parsing fails, keep empty values
      }
    }

    // Update form data when profile changes
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || "",
        contact_number: profile.contact_number || "",
        in_game_role: profile.in_game_role || "",
        status: profile.status || "Active",
        gyroscope_enabled: profile.gyroscope_enabled !== undefined ? profile.gyroscope_enabled : true,
        instagram_handle: profile.instagram_handle || "",
        discord_id: profile.discord_id || "",
      }))
    }
  }, [profile])

  const updateProfile = async () => {
    if (!profile) return

    setLoading(true)
    try {
      // Construct device_info as JSON
      const deviceInfo = {
        device_model: formData.device_model,
        ram: formData.ram,
        fps: formData.fps,
        storage: formData.storage,
      }

      const { error } = await supabase
        .from("users")
        .update({
          name: formData.name,
          contact_number: formData.contact_number,
          in_game_role: formData.in_game_role,
          device_info: JSON.stringify(deviceInfo),
          status: formData.status,
          gyroscope_enabled: formData.gyroscope_enabled,
          instagram_handle: formData.instagram_handle,
          discord_id: formData.discord_id,
        })
        .eq("id", profile.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: data.publicUrl })
        .eq("id", profile.id)

      if (updateError) throw updateError

      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={profile.role} disabled />
            </div>
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input value={teamInfo?.name || "No team assigned"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Team Tier</Label>
              <Input value={teamInfo?.tier || "N/A"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Input 
                value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"} 
                disabled 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>Upload your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mb-2">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Avatar"}
                </Button>
                <p className="text-sm text-muted-foreground">JPG, PNG up to 2MB</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">In-Game Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your in-game name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="Enter your contact number"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="in_game_role">In-Game Role</Label>
              <Input
                id="in_game_role"
                value={formData.in_game_role}
                onChange={(e) => setFormData({ ...formData, in_game_role: e.target.value })}
                placeholder="e.g., IGL, Support, Entry Fragger"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Benched">Benched</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Device Information</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="device_model">Device Model</Label>
                <Input
                  id="device_model"
                  value={formData.device_model}
                  onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                  placeholder="e.g., iPhone 14 Pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ram">RAM</Label>
                <Input
                  id="ram"
                  value={formData.ram}
                  onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                  placeholder="e.g., 8GB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fps">FPS</Label>
                <Input
                  id="fps"
                  value={formData.fps}
                  onChange={(e) => setFormData({ ...formData, fps: e.target.value })}
                  placeholder="e.g., 60 FPS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage">Storage</Label>
                <Input
                  id="storage"
                  value={formData.storage}
                  onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                  placeholder="e.g., 256GB"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Game Settings</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="gyroscope"
                checked={formData.gyroscope_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, gyroscope_enabled: checked })}
              />
              <Label htmlFor="gyroscope">Gyroscope Enabled</Label>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Social Links</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input
                  id="instagram"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord">Discord ID</Label>
                <Input
                  id="discord"
                  value={formData.discord_id}
                  onChange={(e) => setFormData({ ...formData, discord_id: e.target.value })}
                  placeholder="username#1234"
                />
              </div>
            </div>
          </div>

          <Button onClick={updateProfile} disabled={loading}>
            {loading ? "Updating..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
