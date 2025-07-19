"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { profile, loading } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    favorite_game: '',
    gaming_experience: '',
  })

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        favorite_game: profile.favorite_game || '',
        gaming_experience: profile.gaming_experience || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          bio: formData.bio,
          favorite_game: formData.favorite_game,
          gaming_experience: formData.gaming_experience,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      // Refresh the page to get updated profile
      window.location.reload()
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })
      
      setIsEditing(false)
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        favorite_game: profile.favorite_game || '',
        gaming_experience: profile.gaming_experience || '',
      })
    }
    setIsEditing(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white'
      case 'team_manager': return 'bg-blue-500 text-white'
      case 'player': return 'bg-green-500 text-white'
      case 'pending_player': return 'bg-yellow-500 text-black'
      default: return 'bg-gray-500 text-white'
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <Alert className="max-w-md mx-auto mt-8">
        <AlertDescription>
          No profile found. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account information and gaming preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your account details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
            </div>
            
            <div>
              <Label>Role</Label>
              <div className="mt-1">
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {formatRole(profile.role)}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Member Since</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>

            {profile.last_login && (
              <div>
                <Label>Last Login</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(profile.last_login).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gaming Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Gaming Profile
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={saving}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </CardTitle>
            <CardDescription>
              Your gaming preferences and experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Display Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your display name"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{profile.name || 'Not set'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="favorite_game">Favorite Game</Label>
              {isEditing ? (
                <Input
                  id="favorite_game"
                  value={formData.favorite_game}
                  onChange={(e) => setFormData({ ...formData, favorite_game: e.target.value })}
                  placeholder="e.g., Valorant, League of Legends"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{profile.favorite_game || 'Not set'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="gaming_experience">Gaming Experience</Label>
              {isEditing ? (
                <Textarea
                  id="gaming_experience"
                  value={formData.gaming_experience}
                  onChange={(e) => setFormData({ ...formData, gaming_experience: e.target.value })}
                  placeholder="Describe your gaming background and achievements"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{profile.gaming_experience || 'Not set'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{profile.bio || 'Not set'}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
