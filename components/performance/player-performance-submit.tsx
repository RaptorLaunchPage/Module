"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { GamepadIcon, Trophy, Target, Timer } from "lucide-react"

interface PlayerPerformanceSubmitProps {
  onPerformanceAdded: () => void
}

const MAPS = ["Ascent", "Bind", "Breeze", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset"]

export function PlayerPerformanceSubmit({ onPerformanceAdded }: PlayerPerformanceSubmitProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    match_number: "",
    slot: "",
    map: "",
    placement: "",
    kills: "",
    assists: "",
    damage: "",
    survival_time: "",
  })
  const [teamName, setTeamName] = useState<string>("")
  const [teamSlots, setTeamSlots] = useState<any[]>([])
  const [debugOpen, setDebugOpen] = useState(false)
  const [lastError, setLastError] = useState<any>(null)

  useEffect(() => {
    const fetchTeamNameAndSlots = async () => {
      if (profile?.team_id) {
        // Fetch team name
        const { data: teamData, error: teamError } = await supabase.from("teams").select("name").eq("id", profile.team_id).single()
        if (!teamError && teamData?.name) setTeamName(teamData.name)
        else setTeamName("")
        // Fetch slots for this team
        const { data: slotsData, error: slotsError } = await supabase.from("slots").select("id, time_range, date").eq("team_id", profile.team_id)
        if (!slotsError && slotsData) setTeamSlots(slotsData)
        else setTeamSlots([])
      } else {
        setTeamName("")
        setTeamSlots([])
      }
    }
    fetchTeamNameAndSlots()
  }, [profile?.team_id])

  // Only show this component for players
  if (profile?.role !== "player") {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    try {
      const { error } = await supabase.from("performances").insert({
        player_id: profile.id, // Always use current player's ID
        team_id: profile.team_id,
        match_number: Number.parseInt(formData.match_number),
        slot: Number.parseInt(formData.slot),
        map: formData.map,
        placement: formData.placement ? Number.parseInt(formData.placement) : null,
        kills: Number.parseInt(formData.kills) || 0,
        assists: Number.parseInt(formData.assists) || 0,
        damage: Number.parseFloat(formData.damage) || 0,
        survival_time: Number.parseFloat(formData.survival_time) || 0,
        added_by: profile.id,
      })

      if (error) throw error

      toast({
        title: "Performance Submitted!",
        description: "Your match performance has been recorded successfully",
      })

      // Reset form
      setFormData({
        match_number: "",
        slot: "",
        map: "",
        placement: "",
        kills: "",
        assists: "",
        damage: "",
        survival_time: "",
      })

      onPerformanceAdded()
    } catch (error: any) {
      console.error("Error submitting performance:", error)
      setLastError(error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit performance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GamepadIcon className="h-5 w-5" />
          Submit Your Performance
        </CardTitle>
        <CardDescription>
          Record your match statistics - only you can submit your own performance data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Info (Read-only) */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">Player Info</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Name:</strong> {profile.name || profile.email}</p>
              <p><strong>Team:</strong> {teamName || profile.team_id || "Not assigned"}</p>
            </div>
          </div>

          {/* Match Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4" />
              <span className="font-medium">Match Information</span>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="match_number">Match Number</Label>
                <Input
                  id="match_number"
                  type="number"
                  value={formData.match_number}
                  onChange={(e) => setFormData({ ...formData, match_number: e.target.value })}
                  placeholder="Enter match number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot">Slot</Label>
                <Select
                  value={formData.slot}
                  onValueChange={(value) => setFormData({ ...formData, slot: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={teamSlots.length ? "Select slot" : "No slots assigned"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamSlots.length === 0 && (
                      <SelectItem value="" disabled>No slots assigned</SelectItem>
                    )}
                    {teamSlots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.time_range} ({slot.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="map">Map</Label>
                <Select
                  value={formData.map}
                  onValueChange={(value) => setFormData({ ...formData, map: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select map" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAPS.map((map) => (
                      <SelectItem key={map} value={map}>
                        {map}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="h-4 w-4" />
              <span className="font-medium">Your Performance</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="placement">Placement</Label>
                <Input
                  id="placement"
                  type="number"
                  value={formData.placement}
                  onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                  placeholder="Final placement"
                  min="1"
                  max="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kills">Kills</Label>
                <Input
                  id="kills"
                  type="number"
                  value={formData.kills}
                  onChange={(e) => setFormData({ ...formData, kills: e.target.value })}
                  placeholder="Total kills"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assists">Assists</Label>
                <Input
                  id="assists"
                  type="number"
                  value={formData.assists}
                  onChange={(e) => setFormData({ ...formData, assists: e.target.value })}
                  placeholder="Total assists"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="damage">Damage</Label>
                <Input
                  id="damage"
                  type="number"
                  value={formData.damage}
                  onChange={(e) => setFormData({ ...formData, damage: e.target.value })}
                  placeholder="Total damage"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="survival_time">Survival Time (minutes)</Label>
              <Input
                id="survival_time"
                type="number"
                step="0.1"
                value={formData.survival_time}
                onChange={(e) => setFormData({ ...formData, survival_time: e.target.value })}
                placeholder="Survival time in minutes"
                min="0"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Performance Data"}
          </Button>
        </form>
        {/* Debug Panel */}
        <div className="mt-6">
          <Button size="sm" variant="outline" onClick={() => setDebugOpen((v) => !v)}>
            {debugOpen ? "Hide Debug Panel" : "Show Debug Panel"}
          </Button>
          {debugOpen && (
            <div className="mt-2 p-3 bg-gray-100 border rounded text-xs overflow-auto">
              <div className="mb-2 font-semibold">Form Data</div>
              <pre>{JSON.stringify(formData, null, 2)}</pre>
              <div className="mb-2 font-semibold mt-2">Profile</div>
              <pre>{JSON.stringify(profile, null, 2)}</pre>
              {lastError && (
                <>
                  <div className="mb-2 font-semibold mt-2 text-red-600">Last Error</div>
                  <pre className="text-red-600">{JSON.stringify(lastError, null, 2)}</pre>
                </>
              )}
              <div className="mb-2 font-semibold mt-2">Team Name</div>
              <pre>{JSON.stringify(teamName, null, 2)}</pre>
              <div className="mb-2 font-semibold mt-2">Team Slots</div>
              <pre>{JSON.stringify(teamSlots, null, 2)}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}