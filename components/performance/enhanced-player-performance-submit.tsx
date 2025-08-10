"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SmartSlotSelector } from "./smart-slot-selector"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Clock, Users } from "lucide-react"

const MAPS = ["Erangle", "Miramar", "Sanhok", "Vikendi", "Rondo"]

interface SlotWithMatches {
  id: string
  organizer: string
  time_range: string
  date: string
  match_count: number
  team_id: string
}

interface ExistingPerformance {
  match_number: number
  kills: number
  damage: number
  placement: number
  id: string
}

export function EnhancedPlayerPerformanceSubmit({ onPerformanceAdded }: { onPerformanceAdded: () => void }) {
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
    player_id: "", // For staff to select player
    team_id: "", // For staff to select team
  })
  const [team, setTeam] = useState<any>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotWithMatches | null>(null)
  const [availableMatches, setAvailableMatches] = useState<number[]>([])
  const [existingPerformances, setExistingPerformances] = useState<ExistingPerformance[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  
  // For staff members
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const isStaff = profile?.role && ['admin', 'manager', 'coach'].includes(profile.role)
  const isPlayer = profile?.role === 'player'

  // Fetch initial data based on role
  useEffect(() => {
    const fetchInitialData = async () => {
      if (isPlayer && profile?.team_id) {
        // For players - just fetch their team
        const { data: teamData } = await supabase.from("teams").select("*").eq("id", profile.team_id).single()
        setTeam(teamData || null)
        setFormData(prev => ({ 
          ...prev, 
          player_id: profile.id || "",
          team_id: profile.team_id || ""
        }))
      } else if (isStaff) {
        // For staff - fetch teams and players based on permissions
        if (profile?.role === 'coach' && profile?.team_id) {
          // Coaches see their team only
          const { data: teamData } = await supabase.from("teams").select("*").eq("id", profile.team_id).single()
          setTeams(teamData ? [teamData] : [])
          const { data: playersData } = await supabase.from("users").select("*").eq("team_id", profile.team_id).eq("role", "player")
          setPlayers(playersData || [])
        } else if (['admin', 'manager'].includes(profile?.role || '')) {
          // Admins and managers see all teams
          const { data: teamsData } = await supabase.from("teams").select("*").order("name")
          setTeams(teamsData || [])
        }
      }
    }
    
    if (profile) {
      fetchInitialData()
    }
  }, [profile, isPlayer, isStaff])

  // Fetch slot details and existing performances when slot is selected
  useEffect(() => {
    if (!formData.slot) {
      setSelectedSlot(null)
      setAvailableMatches([])
      setExistingPerformances([])
      return
    }

    const fetchSlotDetails = async () => {
      setSlotsLoading(true)
      try {
        // Fetch slot details including match_count
        const { data: slotData, error: slotError } = await supabase
          .from("slots")
          .select("id, organizer, time_range, date, match_count, team_id")
          .eq("id", formData.slot)
          .single()

        if (slotError) throw slotError
        
        setSelectedSlot(slotData)

        // Generate available match numbers based on match_count
        const matches = Array.from({ length: slotData.match_count }, (_, i) => i + 1)
        setAvailableMatches(matches)

        // Fetch existing performances for this slot and player
        const { data: performanceData, error: performanceError } = await supabase
          .from("performances")
          .select("match_number, kills, damage, placement, id")
          .eq("slot", formData.slot)
          .eq("player_id", profile.id)
          .order("match_number")

        if (performanceError) throw performanceError

        setExistingPerformances(performanceData || [])

      } catch (error) {
        console.error('Error fetching slot details:', error)
        toast({ 
          title: "Error", 
          description: "Failed to load slot details", 
          variant: "destructive" 
        })
      } finally {
        setSlotsLoading(false)
      }
    }

    fetchSlotDetails()
  }, [formData.slot, profile.id])

  // Reset match number when slot changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, match_number: "" }))
  }, [formData.slot])

  // Defensive: Only allow players with valid profile
  if (!profile || profile.role !== "player") return null
  if (!profile?.id) {
    return <div className="text-center text-red-500 py-8">Your player profile is incomplete. Please contact support.</div>;
  }
  if (!profile?.team_id) {
    return <div className="text-center text-yellow-600 py-8">You are not assigned to a team. Please contact your coach or admin.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLastError(null)
    
    try {
      // Validate required fields
      if (!profile.id || !profile.team_id) throw new Error("Missing player or team information.")
      if (!formData.match_number || !formData.slot || !formData.map) throw new Error("Please fill all required fields.")
      
      const match_number = Number(formData.match_number)
      
      // Check if performance already exists for this match
      const existingMatch = existingPerformances.find(p => p.match_number === match_number)
      if (existingMatch) {
        throw new Error(`Performance data already exists for Match ${match_number}. Please select a different match or edit the existing entry.`)
      }

      // Validate match number is within slot's match count
      if (!selectedSlot || match_number < 1 || match_number > selectedSlot.match_count) {
        throw new Error(`Invalid match number. Please select a match between 1 and ${selectedSlot?.match_count || 0}.`)
      }

      // Coerce all numeric fields
      const placement = formData.placement ? Number(formData.placement) : null
      const kills = formData.kills ? Number(formData.kills) : 0
      const assists = formData.assists ? Number(formData.assists) : 0
      const damage = formData.damage ? Number(formData.damage) : 0
      const survival_time = formData.survival_time ? Number(formData.survival_time) : 0

      // Prepare payload
      const payload = {
        player_id: profile.id,
        team_id: profile.team_id,
        match_number,
        slot: formData.slot,
        map: formData.map,
        placement,
        kills,
        assists,
        damage,
        survival_time,
        added_by: profile.id,
      }

      // Submit performance
      const { error } = await supabase.from("performances").insert(payload)
      if (error) throw error

      toast({ 
        title: "Success!", 
        description: `Performance for Match ${match_number} submitted successfully`,
        variant: "default"
      })

      // Reset form but keep slot selected
      setFormData(prev => ({ 
        ...prev, 
        match_number: "", 
        map: "", 
        placement: "", 
        kills: "", 
        assists: "", 
        damage: "", 
        survival_time: "" 
      }))
      
      onPerformanceAdded()

    } catch (error: any) {
      setLastError(error.message || "Failed to submit performance data")
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit performance data", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const getMatchStatus = (matchNumber: number) => {
    const existing = existingPerformances.find(p => p.match_number === matchNumber)
    if (existing) {
      return {
        status: 'completed',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800',
        label: `✓ ${existing.kills}K ${existing.damage}D`
      }
    }
    return {
      status: 'available',
      icon: Clock,
      color: 'bg-blue-100 text-blue-800',
      label: 'Available'
    }
  }

  const getAvailableMatchOptions = () => {
    if (!selectedSlot) return []
    
    return availableMatches.map(matchNum => {
      const existing = existingPerformances.find(p => p.match_number === matchNum)
      const isCompleted = !!existing
      
      return {
        value: matchNum.toString(),
        label: `Match ${matchNum}`,
        disabled: isCompleted,
        subtitle: isCompleted ? `Already submitted (${existing.kills}K, ${existing.damage}D)` : 'Available'
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Performance</CardTitle>
        <CardDescription>Record your match statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">Player: <span className="font-semibold">{profile.name || profile.email}</span></div>
          <div className="text-sm text-muted-foreground">Team: <span className="font-semibold">{team ? team.name : "Loading..."}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SmartSlotSelector 
              value={formData.slot} 
              onValueChange={(val) => setFormData({ ...formData, slot: val })} 
              required 
            />
            
            {selectedSlot && (
              <div className="space-y-2">
                <Label>Slot Details</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">{selectedSlot.organizer}</div>
                  <div className="text-sm text-muted-foreground">{selectedSlot.time_range}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSlot.match_count} matches • {selectedSlot.date}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedSlot && availableMatches.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="match_number">Select Match</Label>
                <Select 
                  value={formData.match_number} 
                  onValueChange={val => setFormData({ ...formData, match_number: val })} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select which match to submit" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMatchOptions().map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {option.subtitle}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Match Status Overview */}
              <div className="space-y-2">
                <Label>Match Status Overview</Label>
                <div className="flex flex-wrap gap-2">
                  {availableMatches.map(matchNum => {
                    const status = getMatchStatus(matchNum)
                    const StatusIcon = status.icon
                    return (
                      <Badge key={matchNum} className={status.color} variant="secondary">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        Match {matchNum}: {status.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {formData.match_number && (
            <div className="grid gap-4 md:grid-cols-2">
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
                <Input 
                  id="placement" 
                  type="number" 
                  value={formData.placement} 
                  onChange={e => setFormData({ ...formData, placement: e.target.value })} 
                  placeholder="Team placement (1-16)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kills">Kills</Label>
                <Input 
                  id="kills" 
                  type="number" 
                  value={formData.kills} 
                  onChange={e => setFormData({ ...formData, kills: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assists">Assists</Label>
                <Input 
                  id="assists" 
                  type="number" 
                  value={formData.assists} 
                  onChange={e => setFormData({ ...formData, assists: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="damage">Damage</Label>
                <Input 
                  id="damage" 
                  type="number" 
                  value={formData.damage} 
                  onChange={e => setFormData({ ...formData, damage: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survival_time">Survival Time (min)</Label>
                <Input 
                  id="survival_time" 
                  type="number" 
                  value={formData.survival_time} 
                  onChange={e => setFormData({ ...formData, survival_time: e.target.value })} 
                  required 
                />
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || slotsLoading || !formData.match_number || !selectedSlot}
            className="w-full"
          >
            {loading ? "Submitting..." : `Submit Performance for Match ${formData.match_number || '?'}`}
          </Button>
          
          {lastError && (
            <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded-md">
              {lastError}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}