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

const MAPS = ["Ascent", "Bind", "Breeze", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset"]

export function PlayerPerformanceSubmit({ onPerformanceAdded }: { onPerformanceAdded: () => void }) {
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
  const [teamSlots, setTeamSlots] = useState<any[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Only allow players with valid profile
  if (!profile || profile.role !== "player") return null;

  if (!profile?.id) {
    return <div className="text-center text-red-500 py-8">Your player profile is incomplete. Please contact support.</div>;
  }
  if (!profile?.team_id) {
    return <div className="text-center text-yellow-600 py-8">You are not assigned to a team. Please contact your coach or admin.</div>;
  }

  // Fetch slots for player's team
  useEffect(() => {
    const fetchSlots = async () => {
      setSlotsLoading(true)
      setTeamSlots([])
      if (!profile.team_id) {
        setSlotsLoading(false)
        return
      }
      const { data, error } = await supabase.from("slots").select("id, time_range, date").eq("team_id", profile.team_id)
      setTeamSlots(error ? [] : data || [])
      setSlotsLoading(false)
    }
    fetchSlots()
  }, [profile.team_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLastError(null)
    try {
      if (!profile.id || !profile.team_id) throw new Error("Missing player or team information.")
      const payload = {
        player_id: profile.id,
        team_id: profile.team_id,
        match_number: Number(formData.match_number),
        slot: Number(formData.slot),
        map: formData.map,
        placement: formData.placement ? Number(formData.placement) : null,
        kills: Number(formData.kills) || 0,
        assists: Number(formData.assists) || 0,
        damage: Number(formData.damage) || 0,
        survival_time: Number(formData.survival_time) || 0,
        added_by: profile.id,
      }
      const { error } = await supabase.from("performances").insert(payload)
      if (error) throw error
      toast({ title: "Performance Submitted!", description: "Performance recorded successfully" })
      setFormData({ match_number: "", slot: "", map: "", placement: "", kills: "", assists: "", damage: "", survival_time: "" })
      onPerformanceAdded()
    } catch (error: any) {
      setLastError(error.message || "Failed to submit performance data")
      toast({ title: "Error", description: error.message || "Failed to submit performance data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Performance</CardTitle>
        <CardDescription>Record your match statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number</Label>
              <Input id="match_number" type="number" value={formData.match_number} onChange={e => setFormData({ ...formData, match_number: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot">Slot</Label>
              <Select value={formData.slot} onValueChange={val => setFormData({ ...formData, slot: val })} required>
                <SelectTrigger><SelectValue placeholder={slotsLoading ? "Loading slots..." : teamSlots.length ? "Select slot" : "No slots assigned"} /></SelectTrigger>
                <SelectContent>
                  {slotsLoading && <SelectItem value="" disabled>Loading...</SelectItem>}
                  {!slotsLoading && teamSlots.length === 0 && <SelectItem value="" disabled>No slots assigned</SelectItem>}
                  {!slotsLoading && teamSlots.map(slot => (
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
          <Button type="submit" disabled={loading || slotsLoading}>{loading ? "Submitting..." : "Submit Performance"}</Button>
          {lastError && <div className="text-red-500 text-sm mt-2">{lastError}</div>}
        </form>
      </CardContent>
    </Card>
  )
}