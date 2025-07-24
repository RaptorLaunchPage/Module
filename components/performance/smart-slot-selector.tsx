"use client"

import { useState, useEffect } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { supabase } from '@/lib/supabase'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase'

type Slot = Database["public"]["Tables"]["slots"]["Row"] & { team?: { name: string } }
type Team = Database["public"]["Tables"]["teams"]["Row"]

interface SmartSlotSelectorProps {
  value: string
  onValueChange: (value: string) => void
  required?: boolean
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

export function SmartSlotSelector({ value, onValueChange, required }: SmartSlotSelectorProps) {
  const { profile } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  
  // Quick add form state
  const [quickAddData, setQuickAddData] = useState({
    organizer: '',
    time_range: '',
    date: undefined as Date | undefined,
    team_id: '',
    slot_rate: 0
  })

  const userRole = profile?.role as UserRole
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)
  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  useEffect(() => {
    fetchSlots()
    if (isAdminOrManager) {
      fetchTeams()
    }
  }, [profile])

  const fetchSlots = async () => {
    try {
      let query = supabase.from("slots")
        .select("*, team:team_id(name)")
        .order("date", { ascending: false })

      // Filter based on role
      if (!shouldSeeAllData) {
        if (userRole === "coach" || userRole === "player") {
          query = query.eq("team_id", profile?.team_id!)
        }
      }

      const { data, error } = await query
      if (error) throw error
      setSlots(data || [])
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name")
      
      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleQuickAdd = async () => {
    try {
      if (!quickAddData.organizer || !quickAddData.time_range || !quickAddData.date || !quickAddData.team_id) {
        return
      }

      const { data, error } = await supabase.from("slots").insert({
        organizer: quickAddData.organizer,
        time_range: quickAddData.time_range,
        date: format(quickAddData.date, 'yyyy-MM-dd'),
        team_id: quickAddData.team_id,
        slot_rate: quickAddData.slot_rate
      }).select("*, team:team_id(name)").single()

      if (error) throw error

      // Add to slots list and select it
      setSlots(prev => [data, ...prev])
      onValueChange(data.id)
      setShowQuickAdd(false)
      
      // Reset form
      setQuickAddData({
        organizer: '',
        time_range: '',
        date: undefined,
        team_id: '',
        slot_rate: 0
      })
    } catch (error) {
      console.error('Error creating slot:', error)
    }
  }

  // Filter slots for search (admin/manager only)
  const filteredSlots = searchTerm
    ? slots.filter(slot => 
        slot.organizer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.time_range?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.team?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.date?.includes(searchTerm)
      )
    : slots

  // For players and coaches with limited slots, use dropdown
  if (!isAdminOrManager || slots.length <= 20) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slot">Slot</Label>
          {isAdminOrManager && (
            <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Quick Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Add Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Organizer</Label>
                    <Input 
                      value={quickAddData.organizer}
                      onChange={(e) => setQuickAddData(prev => ({ ...prev, organizer: e.target.value }))}
                      placeholder="Tournament/League name"
                    />
                  </div>
                  <div>
                    <Label>Time Range</Label>
                    <Select 
                      value={quickAddData.time_range} 
                      onValueChange={(value) => setQuickAddData(prev => ({ ...prev, time_range: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time range" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_RANGES.map(range => (
                          <SelectItem key={range} value={range}>{range}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {quickAddData.date ? format(quickAddData.date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={quickAddData.date}
                          onSelect={(date) => setQuickAddData(prev => ({ ...prev, date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Team</Label>
                    <Select 
                      value={quickAddData.team_id} 
                      onValueChange={(value) => setQuickAddData(prev => ({ ...prev, team_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Slot Rate</Label>
                    <Input 
                      type="number"
                      value={quickAddData.slot_rate}
                      onChange={(e) => setQuickAddData(prev => ({ ...prev, slot_rate: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                  <Button onClick={handleQuickAdd} className="w-full">
                    Create Slot
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {loading ? (
          <Input disabled value="Loading slots..." />
        ) : slots.length > 0 ? (
          <Select value={value} onValueChange={onValueChange} required={required}>
            <SelectTrigger>
              <SelectValue placeholder="Select slot" />
            </SelectTrigger>
            <SelectContent>
              {slots.map(slot => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.organizer} - {slot.time_range} ({slot.date})
                  {slot.team && ` - ${slot.team.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-red-500 text-sm">
            No slots available. {isAdminOrManager ? 'Click Quick Add to create one.' : 'Please contact your coach or admin.'}
          </div>
        )}
      </div>
    )
  }

  // For admin/manager with many slots, use search interface
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="slot">Slot</Label>
        <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Quick Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick Add Slot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Organizer</Label>
                <Input 
                  value={quickAddData.organizer}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, organizer: e.target.value }))}
                  placeholder="Tournament/League name"
                />
              </div>
              <div>
                <Label>Time Range</Label>
                <Select 
                  value={quickAddData.time_range} 
                  onValueChange={(value) => setQuickAddData(prev => ({ ...prev, time_range: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGES.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {quickAddData.date ? format(quickAddData.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={quickAddData.date}
                      onSelect={(date) => setQuickAddData(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Team</Label>
                <Select 
                  value={quickAddData.team_id} 
                  onValueChange={(value) => setQuickAddData(prev => ({ ...prev, team_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Slot Rate</Label>
                <Input 
                  type="number"
                  value={quickAddData.slot_rate}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, slot_rate: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleQuickAdd} className="w-full">
                Create Slot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search slots by organizer, time, team, or date..."
          className="pl-10"
        />
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-md">
        {filteredSlots.length > 0 ? (
          <div className="p-2 space-y-1">
            {filteredSlots.slice(0, 50).map(slot => (
              <Card 
                key={slot.id} 
                className={cn(
                  "cursor-pointer transition-colors p-2 hover:bg-black/40 hover:backdrop-blur-lg",
                  value === slot.id && "ring-2 ring-blue-400/60 bg-blue-900/40 backdrop-blur-lg border-blue-400/40"
                )}
                onClick={() => onValueChange(slot.id)}
              >
                <div className="text-sm">
                  <div className="font-medium">{slot.organizer}</div>
                  <div className="text-gray-600">
                    {slot.time_range} • {slot.date}
                    {slot.team && ` • ${slot.team.name}`}
                  </div>
                </div>
              </Card>
            ))}
            {filteredSlots.length > 50 && (
              <div className="text-center text-sm text-gray-500 p-2">
                Showing first 50 results. Use search to narrow down.
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No slots match your search.' : 'No slots available.'}
          </div>
        )}
      </div>
    </div>
  )
}