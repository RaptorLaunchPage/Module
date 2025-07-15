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

export function PlayerPerformanceSubmit({ onPerformanceAdded, users }: { onPerformanceAdded: () => void, users: any[] }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    player_id: profile?.id || "",
    match_number: "",
    slot: "",
    map: "",
    placement: "",
    kills: "",
    assists: "",
    damage: "",
    survival_time: "",
  })
  const [teamName, setTeamName] = useState("")
  const [teamId, setTeamId] = useState(profile?.team_id || "")
  const [teamSlots, setTeamSlots] = useState<any[]>([])
  const [lastError, setLastError] = useState<any>(null)

  // Hide for analysts
  if (profile?.role === "analyst") return null

  // For staff, allow selecting player
  const isStaff = ["admin", "manager", "coach"].includes(profile?.role || "")
  const eligiblePlayers = isStaff
    ? users.filter(u => u.role === "player" && (profile?.role === "admin" || profile?.role === "manager" || u.team_id === profile?.team_id))
    : users.filter(u => u.id === profile?.id)

  if (!eligiblePlayers.length) {
    return <div className="text-center py-8 text-red-500">No eligible player profile found. Please contact support.</div>;
  }

  useEffect(() => {
    // For staff, update teamId and slots when player changes
    if (isStaff && formData.player_id) {
      const selected = users.find(u => u.id === formData.player_id)
      setTeamId(selected?.team_id || "")
      setTeamName(selected?.team_id || "")
      fetchSlots(selected?.team_id)
    } else if (!isStaff && profile?.team_id) {
      setTeamId(profile.team_id)
      setTeamName(profile.team_id)
      fetchSlots(profile.team_id)
    }
    // eslint-disable-next-line
  }, [formData.player_id, profile?.team_id])

  const fetchSlots = async (teamId: string | undefined) => {
    if (!teamId) return setTeamSlots([])
    const { data, error } = await supabase.from("slots").select("id, time_range, date").eq("team_id", teamId)
    setTeamSlots(error ? [] : data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLastError(null)
    try {
      const payload = {
        player_id: formData.player_id,
        team_id: teamId,
        match_number: Number(formData.match_number),
        slot: Number(formData.slot),
        map: formData.map,
        placement: formData.placement ? Number(formData.placement) : null,
        kills: Number(formData.kills) || 0,
        assists: Number(formData.assists) || 0,
        damage: Number(formData.damage) || 0,
        survival_time: Number(formData.survival_time) || 0,
        added_by: profile?.id,
      }
      const { error } = await supabase.from("performances").insert(payload)
      if (error) throw error
      toast({ title: "Performance Submitted!", description: "Performance recorded successfully" })
      setFormData({ ...formData, match_number: "", slot: "", map: "", placement: "", kills: "", assists: "", damage: "", survival_time: "" })
      onPerformanceAdded()
    } catch (error: any) {
      setLastError(error)
      toast({ title: "Error", description: error.message || "Failed to submit performance data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Performance</CardTitle>
        <CardDescription>Record match statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {isStaff && (
              <div className="space-y-2">
                <Label htmlFor="player_id">Player</Label>
                <Select
                  value={formData.player_id}
                  onValueChange={val => setFormData({ ...formData, player_id: val })}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                  <SelectContent>
                    {eligiblePlayers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number</Label>
              <Input id="match_number" type="number" value={formData.match_number} onChange={e => setFormData({ ...formData, match_number: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot">Slot</Label>
              <Select value={formData.slot} onValueChange={val => setFormData({ ...formData, slot: val })} required>
                <SelectTrigger><SelectValue placeholder={teamSlots.length ? "Select slot" : "No slots assigned"} /></SelectTrigger>
                <SelectContent>
                  {teamSlots.length === 0 && <SelectItem value="" disabled>No slots assigned</SelectItem>}
                  {teamSlots.map(slot => (
                    <SelectItem key={slot.id} value={slot.id}>{slot.time_range} ({slot.date})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="map">Map</Label>
              <Select value={formData.map} onValueChange={val => setFormData({ ...formData, map: val })} required>
                <SelectTrigger><SelectValue placeholder="Select map" /></SelectTrigger>
                <SelectContent>
                  {MAPS.map(map => <SelectItem key={map} value={map}>{map}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="placement">Placement</Label>
              <Input id="placement" type="number" value={formData.placement} onChange={e => setFormData({ ...formData, placement: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kills">Kills</Label>
              <Input id="kills" type="number" value={formData.kills} onChange={e => setFormData({ ...formData, kills: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assists">Assists</Label>
              <Input id="assists" type="number" value={formData.assists} onChange={e => setFormData({ ...formData, assists: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="damage">Damage</Label>
              <Input id="damage" type="number" value={formData.damage} onChange={e => setFormData({ ...formData, damage: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="survival_time">Survival Time (min)</Label>
              <Input id="survival_time" type="number" value={formData.survival_time} onChange={e => setFormData({ ...formData, survival_time: e.target.value })} required />
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Performance"}</Button>
          {lastError && <div className="text-red-500 text-sm mt-2">{lastError.message || "Submission failed."}</div>}
        </form>
      </CardContent>
    </Card>
  )
}