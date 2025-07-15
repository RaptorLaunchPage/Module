"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, Trash2, Settings } from "lucide-react"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Database } from "@/lib/supabase"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type Slot = Database["public"]["Tables"]["slots"]["Row"] & { team: Team | null }
type TierDefault = {
  id: string
  tier: string
  default_slot_rate: number
  created_at: string
  updated_at: string
}

const TIME_RANGES = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "1:00 PM - 3:00 PM",
  "3:00 PM - 5:00 PM",
  "5:00 PM - 7:00 PM",
  "7:00 PM - 9:00 PM",
  "9:00 PM - 11:00 PM",
]

export default function SlotsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [tierDefaults, setTierDefaults] = useState<TierDefault[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [newSlotData, setNewSlotData] = useState({
    team_id: "",
    organizer: "",
    time_range: "",
    number_of_slots: 1,
    slot_rate: 0,
    match_count: 0,
    notes: "",
    date: new Date(),
  })

  useEffect(() => {
    fetchTeams()
    fetchSlots()
    fetchTierDefaults()
  }, [profile])

  const fetchTeams = async () => {
    try {
      let query = supabase.from("teams").select("*").order("name")

      if (profile?.role === "coach") {
        query = query.eq("coach_id", profile.id)
      } else if (profile?.role === "player") {
        query = query.eq("id", profile.team_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setTeams(data || [])
      if (data && data.length > 0 && !newSlotData.team_id) {
        setNewSlotData((prev) => ({ ...prev, team_id: data[0].id }))
        // Auto-fill slot rate based on team tier
        const selectedTeam = data[0]
        const tierDefault = tierDefaults.find((td) => td.tier === selectedTeam.tier)
        if (tierDefault) {
          setNewSlotData((prev) => ({ ...prev, slot_rate: tierDefault.default_slot_rate }))
        }
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSlots = async () => {
    setLoading(true)
    try {
      let query = supabase.from("slots").select("*, team:team_id(name, tier)").order("date", { ascending: false })

      if (profile?.role === "coach") {
        query = query.eq("team_id", profile.team_id!)
      } else if (profile?.role === "player") {
        query = query.eq("team_id", profile.team_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setSlots(data || [])
    } catch (error: any) {
      console.error("Error fetching slots:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch slots.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTierDefaults = async () => {
    try {
      const { data, error } = await supabase.from("tier_defaults").select("*").order("tier")
      if (error) throw error
      setTierDefaults(data || [])
    } catch (error) {
      console.error("Error fetching tier defaults:", error)
    }
  }

  const handleTeamChange = (teamId: string) => {
    setNewSlotData((prev) => ({ ...prev, team_id: teamId }))

    // Auto-fill slot rate based on selected team's tier
    const selectedTeam = teams.find((t) => t.id === teamId)
    if (selectedTeam) {
      const tierDefault = tierDefaults.find((td) => td.tier === selectedTeam.tier)
      if (tierDefault) {
        setNewSlotData((prev) => ({ ...prev, slot_rate: tierDefault.default_slot_rate }))
      }
    }
  }

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      const selectedTeam = teams.find((t) => t.id === newSlotData.team_id)
      if (!selectedTeam) {
        toast({ title: "Error", description: "Selected team not found.", variant: "destructive" })
        return
      }

      if (newSlotData.slot_rate <= 0) {
        toast({ title: "Error", description: "Slot rate must be greater than 0.", variant: "destructive" })
        return
      }

      if (newSlotData.number_of_slots <= 0) {
        toast({ title: "Error", description: "Number of slots must be greater than 0.", variant: "destructive" })
        return
      }

      const { data: slotInsertData, error: slotError } = await supabase.from("slots").insert({
        team_id: newSlotData.team_id,
        organizer: newSlotData.organizer,
        time_range: newSlotData.time_range,
        number_of_slots: newSlotData.number_of_slots,
        slot_rate: newSlotData.slot_rate,
        match_count: newSlotData.match_count || 0,
        notes: newSlotData.notes,
        date: format(newSlotData.date, "yyyy-MM-dd"),
      }).select()

      if (slotError) throw slotError

      // Insert into slot_expenses
      const newSlot = slotInsertData && slotInsertData[0]
      if (newSlot && newSlot.id) {
        const { error: expenseError } = await supabase.from("slot_expenses").insert({
          slot_id: newSlot.id,
          team_id: newSlot.team_id,
          rate: newSlot.slot_rate,
          total: newSlot.slot_rate * newSlot.number_of_slots,
        })
        if (expenseError) {
          toast({
            title: "Warning",
            description: "Slot booked, but failed to add to expenses.",
            variant: "destructive",
          })
        }
      }

      toast({
        title: "Success",
        description: `Slot booked successfully! Total cost: ₹${newSlotData.number_of_slots * newSlotData.slot_rate}`,
      })

      setNewSlotData({
        team_id: teams[0]?.id || "",
        organizer: "",
        time_range: "",
        number_of_slots: 1,
        slot_rate: tierDefaults.find((td) => td.tier === teams[0]?.tier)?.default_slot_rate || 0,
        match_count: 0,
        notes: "",
        date: new Date(),
      })
      fetchSlots()
    } catch (error: any) {
      console.error("Error booking slot:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to book slot.",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this slot? This will also delete associated expenses.")) {
      return
    }
    setFormLoading(true)
    try {
      const { error } = await supabase.from("slots").delete().eq("id", slotId)
      if (error) throw error
      toast({ title: "Success", description: "Slot deleted successfully." })
      fetchSlots()
    } catch (error: any) {
      console.error("Error deleting slot:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete slot.",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const updateTierDefault = async (tier: string, rate: number) => {
    try {
      const { error } = await supabase
        .from("tier_defaults")
        .update({ default_slot_rate: rate, updated_at: new Date().toISOString() })
        .eq("tier", tier)

      if (error) throw error

      toast({ title: "Success", description: `Default rate for ${tier} updated to ₹${rate}` })
      fetchTierDefaults()
    } catch (error: any) {
      console.error("Error updating tier default:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update tier default.",
        variant: "destructive",
      })
    }
  }

  const canManage = profile?.role && ["admin", "manager", "coach"].includes(profile.role.toLowerCase())
  const canManageSettings = profile?.role && ["admin", "manager"].includes(profile.role.toLowerCase())

  // Check if user has access to team management
  if (!profile?.role || !["admin", "manager", "coach"].includes(profile.role.toLowerCase())) {
    return (
      <div className="space-y-6">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access team management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div>Loading slots...</div>
  }

  return (
    <Tabs defaultValue="booking" className="space-y-6">
      <TabsList>
        <TabsTrigger value="booking">Slot Booking</TabsTrigger>
        <TabsTrigger value="list">Booked Slots</TabsTrigger>
        {canManageSettings && <TabsTrigger value="settings">Tier Settings</TabsTrigger>}
      </TabsList>

      <TabsContent value="booking">
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Book New Slot</CardTitle>
              <CardDescription>
                Schedule practice or match slots for your teams with slot-based billing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookSlot} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="team">Assigned Team</Label>
                  <Select value={newSlotData.team_id} onValueChange={handleTeamChange} required>
                    <SelectTrigger id="team">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizer">Organizer Name</Label>
                  <Input
                    id="organizer"
                    value={newSlotData.organizer}
                    onChange={(e) => setNewSlotData({ ...newSlotData, organizer: e.target.value })}
                    placeholder="e.g., ESL, FaceIt, BGMI"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newSlotData.date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newSlotData.date ? format(newSlotData.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newSlotData.date}
                        onSelect={(date) => date && setNewSlotData({ ...newSlotData, date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeRange">Time Range</Label>
                  <Select
                    value={newSlotData.time_range}
                    onValueChange={(value) => setNewSlotData({ ...newSlotData, time_range: value })}
                    required
                  >
                    <SelectTrigger id="timeRange">
                      <SelectValue placeholder="Select Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_RANGES.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfSlots">Number of Slots Booked</Label>
                  <Input
                    id="numberOfSlots"
                    type="number"
                    min="1"
                    value={newSlotData.number_of_slots}
                    onChange={(e) =>
                      setNewSlotData({ ...newSlotData, number_of_slots: Number.parseInt(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slotRate">Rate per Slot (₹)</Label>
                  <Input
                    id="slotRate"
                    type="number"
                    min="1"
                    value={newSlotData.slot_rate}
                    onChange={(e) => setNewSlotData({ ...newSlotData, slot_rate: Number.parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Total Cost: ₹{newSlotData.number_of_slots * newSlotData.slot_rate}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matchCount">Match Count (Optional)</Label>
                  <Input
                    id="matchCount"
                    type="number"
                    min="0"
                    value={newSlotData.match_count}
                    onChange={(e) => setNewSlotData({ ...newSlotData, match_count: Number.parseInt(e.target.value) })}
                    placeholder="Number of matches (for reference only)"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newSlotData.notes}
                    onChange={(e) => setNewSlotData({ ...newSlotData, notes: e.target.value })}
                    placeholder="Additional notes or comments"
                    rows={3}
                  />
                </div>

                <div className="col-span-2 flex gap-2">
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? "Booking..." : `Book Slot (₹${newSlotData.number_of_slots * newSlotData.slot_rate})`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="list">
        <Card>
          <CardHeader>
            <CardTitle>Booked Slots</CardTitle>
            <CardDescription>Overview of all scheduled slots with slot-based billing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Range</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead>Rate/Slot</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Matches</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-medium">{slot.team?.name || "N/A"}</TableCell>
                    <TableCell>{slot.organizer}</TableCell>
                    <TableCell>{format(new Date(slot.date), "PPP")}</TableCell>
                    <TableCell>{slot.time_range}</TableCell>
                    <TableCell>{slot.number_of_slots || 1}</TableCell>
                    <TableCell>₹{slot.slot_rate || 0}</TableCell>
                    <TableCell className="font-bold">₹{(slot.number_of_slots || 1) * (slot.slot_rate || 0)}</TableCell>
                    <TableCell>{slot.match_count || 0}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteSlot(slot.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {slots.length === 0 && <div className="text-center py-8 text-muted-foreground">No slots booked yet.</div>}
          </CardContent>
        </Card>
      </TabsContent>

      {canManageSettings && (
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tier Default Rates
              </CardTitle>
              <CardDescription>
                Set default slot rates for each team tier. These will auto-fill when creating slots but can be
                overridden manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tierDefaults.map((tierDefault) => (
                  <div key={tierDefault.id} className="space-y-2">
                    <Label htmlFor={`tier-${tierDefault.tier}`}>{tierDefault.tier} Tier Default Rate (₹)</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`tier-${tierDefault.tier}`}
                        type="number"
                        min="0"
                        defaultValue={tierDefault.default_slot_rate}
                        onBlur={(e) => {
                          const newRate = Number.parseInt(e.target.value)
                          if (newRate !== tierDefault.default_slot_rate) {
                            updateTierDefault(tierDefault.tier, newRate)
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These default rates are suggestions based on team tiers. Users can always
                  override these rates when booking slots.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  )
}
