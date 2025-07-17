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
import { Textarea } from "@/components/ui/textarea"
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
  })
  // Add state for debug logs
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [teamName, setTeamName] = useState<string>("")

  useEffect(() => {
    const fetchTeamName = async () => {
      if (profile?.team_id) {
        const { data, error } = await supabase.from("teams").select("name").eq("id", profile.team_id).single()
        if (!error && data?.name) setTeamName(data.name)
        else setTeamName("")
      } else {
        setTeamName("")
      }
    }
    fetchTeamName()

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
  }, [profile?.team_id, profile?.device_info])

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
              <Label>Team</Label>
              <Input value={teamName || profile.team_id || "No team assigned"} disabled />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="in_game_role">In-Game Role</Label>
            <Input
              id="in_game_role"
              value={formData.in_game_role}
              onChange={(e) => setFormData({ ...formData, in_game_role: e.target.value })}
              placeholder="e.g., IGL, Support, Entry Fragger"
            />
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

          <Button onClick={updateProfile} disabled={loading}>
            {loading ? "Updating..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
