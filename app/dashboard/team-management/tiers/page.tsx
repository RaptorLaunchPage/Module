"use client"

import { useEffect, useMemo, useState } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import type { Database } from '@/lib/supabase'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

const TIERS = ['godtier','T1','T2','T3','T4']
const TRIAL_PHASES = ['none','trial','extended']

type Team = Database['public']['Tables']['teams']['Row']

type MonthlyRow = {
  id?: string
  team_id: string
  month: string
  current_tier: string
  slots_played: number
  slots_won: number
  slot_price_per_slot: number
  trial_phase: string
  trial_weeks_used: number
  tournament_winnings: number
  win_percentage: number
  updated_tier: string
  status_update: string
  sponsorship_status: string
  trial_extension_granted: boolean
  trial_extension_weeks: number
  monthly_prize_pool: number
  monthly_cost: number
  surplus: number
  org_share: number
  team_share: number
  split_rule: string
}

export default function TeamTierManagementPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [rows, setRows] = useState<MonthlyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [filters, setFilters] = useState({ tier: 'all', status: 'all', sponsorship: 'all' })
  const [sort, setSort] = useState<{ by: 'win'|'org'|'team'|'tier'|'name', dir: 'asc'|'desc' }>({ by: 'win', dir: 'desc' })
  const [tierDefaults, setTierDefaults] = useState<{ tier: string, default_slot_rate: number }[]>([])

  const userRole = (profile?.role || 'pending_player') as UserRole
  const canView = DashboardPermissions.getDataPermissions(userRole, 'teams').canView && ['admin','manager'].includes(userRole)
  const canEdit = DashboardPermissions.getDataPermissions(userRole, 'teams').canEdit && ['admin','manager'].includes(userRole)

  useEffect(() => {
    if (!profile) return
    fetchTeams()
  }, [profile])

  useEffect(() => {
    if (!profile) return
    fetchMonthly()
  }, [profile, filterMonth])

  useEffect(() => {
    if (!profile) return
    fetchTierDefaults()
  }, [profile])

  async function fetchTeams() {
    try {
      let query = supabase.from('teams').select('*').order('name')
      if (userRole === 'coach') {
        query = query.eq('coach_id', profile!.id)
      }
      const { data, error } = await query
      if (error) throw error
      setTeams(data || [])
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to fetch teams', variant: 'destructive' })
    }
  }

  async function fetchMonthly() {
    try {
      setLoading(true)
      const res = await fetch(`/api/teams/monthly?month=${filterMonth}`, {
        headers: await authHeader(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch monthly stats')
      setRows(data || [])
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to fetch monthly stats', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchTierDefaults() {
    try {
      const { data, error } = await supabase.from('tier_defaults').select('tier, default_slot_rate')
      if (error) throw error
      setTierDefaults(data || [])
    } catch (e) {
      // non-fatal
    }
  }

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const [form, setForm] = useState({
    teamId: '',
    month: format(new Date(), 'yyyy-MM'),
    currentTier: 'T4',
    slotsPlayed: 0,
    slotsWon: 0,
    slotPricePerSlot: 0,
    slotCostPerSlot: 0,
    trialPhase: 'none',
    trialWeeksUsed: 0,
    tournamentWinnings: 0,
  })

  function startNew(teamId?: string) {
    setForm({
      teamId: teamId || teams[0]?.id || '',
      month: filterMonth,
      currentTier: (teams.find(t => t.id === teamId)?.tier || 'T4') as string,
      slotsPlayed: 0,
      slotsWon: 0,
      slotPricePerSlot: 0,
      slotCostPerSlot: 0,
      trialPhase: 'none',
      trialWeeksUsed: 0,
      tournamentWinnings: 0,
    })
  }

  async function submit() {
    try {
      if (!canEdit) return
      const res = await fetch('/api/teams/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({ title: 'Saved', description: 'Monthly stats saved and recalculated.' })
      fetchMonthly()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' })
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const tierOk = filters.tier === 'all' || r.updated_tier === filters.tier
      const statusOk = filters.status === 'all' || r.status_update === filters.status
      const sponsorOk = filters.sponsorship === 'all' || r.sponsorship_status === filters.sponsorship
      return tierOk && statusOk && sponsorOk
    })
  }, [rows, filters])

  if (!profile) return <div>Loading...</div>
  if (!canView) return <div className="p-6">Access denied</div>

  return (
    <Tabs defaultValue="manage" className="space-y-6">
      <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1">
        <TabsTrigger value="manage" className="text-xs sm:text-sm">Monthly Management</TabsTrigger>
        <TabsTrigger value="list" className="text-xs sm:text-sm">Records</TabsTrigger>
      </TabsList>

      <TabsContent value="manage">
        <Card>
          <CardHeader>
            <CardTitle>Enter Monthly Data</CardTitle>
            <CardDescription>Input per-team monthly stats and compute outcomes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={form.teamId} onValueChange={(v) => {
                  const team = teams.find(t => t.id === v)
                  setForm(f => ({
                    ...f,
                    teamId: v,
                    currentTier: (team?.tier || f.currentTier) as string,
                    slotCostPerSlot: (() => {
                      const td = tierDefaults.find(td => td.tier === (team?.tier || f.currentTier))
                      return td ? td.default_slot_rate : f.slotCostPerSlot
                    })()
                  }))
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Current Tier</Label>
                <Select value={form.currentTier} onValueChange={(v) => setForm(f => ({ 
                  ...f, 
                  currentTier: v,
                  slotCostPerSlot: (() => { const td = tierDefaults.find(td => td.tier === v); return td ? td.default_slot_rate : f.slotCostPerSlot })()
                }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Total Slots Played</Label>
                <Input type="number" min={0} value={form.slotsPlayed} onChange={e => setForm(f => ({ ...f, slotsPlayed: Number(e.target.value) }))} />
              </div>

              <div className="space-y-2">
                <Label>Total Slots Won</Label>
                <Input type="number" min={0} value={form.slotsWon} onChange={e => setForm(f => ({ ...f, slotsWon: Number(e.target.value) }))} />
              </div>

              <div className="space-y-2">
                <Label>Slot Price per Slot (₹)</Label>
                <Input type="number" min={0} value={form.slotPricePerSlot} onChange={e => setForm(f => ({ ...f, slotPricePerSlot: Number(e.target.value) }))} />
              </div>

              <div className="space-y-2">
                <Label>Slot Cost per Slot (₹)</Label>
                <Input type="number" min={0} value={form.slotCostPerSlot} onChange={e => setForm(f => ({ ...f, slotCostPerSlot: Number(e.target.value) }))} />
              </div>

              <div className="space-y-2">
                <Label>Trial Phase</Label>
                <Select value={form.trialPhase} onValueChange={(v) => setForm(f => ({ ...f, trialPhase: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIAL_PHASES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trial Weeks Used</Label>
                <Input type="number" min={0} max={3} value={form.trialWeeksUsed} onChange={e => setForm(f => ({ ...f, trialWeeksUsed: Number(e.target.value) }))} />
              </div>

              <div className="space-y-2">
                <Label>Tournament Winnings (₹)</Label>
                <Input type="number" min={0} value={form.tournamentWinnings} onChange={e => setForm(f => ({ ...f, tournamentWinnings: Number(e.target.value) }))} />
              </div>

              <div className="col-span-3">
                <Button onClick={submit} disabled={!canEdit || !form.teamId}>Recalculate & Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="list">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Outcomes</CardTitle>
            <CardDescription>Review computed tiers and incentives. Use filters to narrow results.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3 mb-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={filters.tier} onValueChange={(v) => setFilters(f => ({ ...f, tier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all','promoted','retained','demoted','exited'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sponsorship</Label>
                <Select value={filters.sponsorship} onValueChange={(v) => setFilters(f => ({ ...f, sponsorship: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all','none','trial','sponsored','exited'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort</Label>
                <Select value={`${sort.by}:${sort.dir}`} onValueChange={(v) => {
                  const [by, dir] = v.split(':') as any
                  setSort({ by, dir })
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="win:desc">Win% (High → Low)</SelectItem>
                    <SelectItem value="win:asc">Win% (Low → High)</SelectItem>
                    <SelectItem value="org:desc">Org Share (High → Low)</SelectItem>
                    <SelectItem value="org:asc">Org Share (Low → High)</SelectItem>
                    <SelectItem value="team:desc">Team Share (High → Low)</SelectItem>
                    <SelectItem value="team:asc">Team Share (Low → High)</SelectItem>
                    <SelectItem value="tier:asc">Tier (A → Z)</SelectItem>
                    <SelectItem value="tier:desc">Tier (Z → A)</SelectItem>
                    <SelectItem value="name:asc">Team Name (A → Z)</SelectItem>
                    <SelectItem value="name:desc">Team Name (Z → A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Played</TableHead>
                    <TableHead>Won</TableHead>
                    <TableHead>Win%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sponsorship</TableHead>
                    <TableHead>Org Share</TableHead>
                    <TableHead>Team Share</TableHead>
                    {canEdit && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows
                    .slice()
                    .sort((a, b) => {
                      const teamA = teams.find(t => t.id === a.team_id)?.name || ''
                      const teamB = teams.find(t => t.id === b.team_id)?.name || ''
                      const dir = sort.dir === 'asc' ? 1 : -1
                      switch (sort.by) {
                        case 'win': return (a.win_percentage - b.win_percentage) * dir
                        case 'org': return (a.org_share - b.org_share) * dir
                        case 'team': return (a.team_share - b.team_share) * dir
                        case 'tier': return a.updated_tier.localeCompare(b.updated_tier) * dir
                        case 'name': return teamA.localeCompare(teamB) * dir
                        default: return 0
                      }
                    })
                    .map(r => (
                    <TableRow key={`${r.team_id}-${r.month}`}>
                      <TableCell>{teams.find(t => t.id === r.team_id)?.name || r.team_id}</TableCell>
                      <TableCell>{r.month}</TableCell>
                      <TableCell>{r.updated_tier}</TableCell>
                      <TableCell>{r.slots_played}</TableCell>
                      <TableCell>{r.slots_won}</TableCell>
                      <TableCell>{r.win_percentage.toFixed(2)}%</TableCell>
                      <TableCell className={r.status_update === 'promoted' ? 'text-green-500' : r.status_update === 'demoted' ? 'text-amber-500' : r.status_update === 'exited' ? 'text-red-500' : ''}>{r.status_update}</TableCell>
                      <TableCell>{r.sponsorship_status}</TableCell>
                      <TableCell>₹{r.org_share}</TableCell>
                      <TableCell>₹{r.team_share}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="px-2">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/10 backdrop-blur-md border-white/20">
                              <DropdownMenuItem className="text-white" onClick={async () => {
                                // Grant 1-week extension
                                const payload = {
                                  teamId: r.team_id,
                                  month: r.month,
                                  currentTier: r.current_tier,
                                  slotsPlayed: r.slots_played,
                                  slotsWon: r.slots_won,
                                  slotPricePerSlot: r.slot_price_per_slot,
                                  slotCostPerSlot: (r as any).slot_cost_per_slot || r.slot_price_per_slot,
                                  trialPhase: r.trial_phase === 'trial' ? 'extended' : 'trial',
                                  trialWeeksUsed: r.trial_weeks_used + 1,
                                  tournamentWinnings: r.tournament_winnings,
                                }
                                try {
                                  const res = await fetch('/api/teams/monthly', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
                                    body: JSON.stringify(payload)
                                  })
                                  const data = await res.json()
                                  if (!res.ok) throw new Error(data.error || 'Failed to grant extension')
                                  toast({ title: 'Extension Granted', description: 'Trial extended by 1 week.' })
                                  fetchMonthly()
                                } catch (e: any) {
                                  toast({ title: 'Error', description: e.message || 'Failed to grant extension', variant: 'destructive' })
                                }
                              }}>
                                Grant 1-week Extension
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-white" onClick={async () => {
                                // Manual tier adjust: promote one tier
                                const current = (r.updated_tier || r.current_tier) as string
                                const order = ['T4','T3','T2','T1','godtier']
                                const idx = Math.min(order.indexOf(current) + 1, order.length - 1)
                                const newTier = order[idx]
                                try {
                                  const { error } = await supabase.from('teams').update({ tier: newTier }).eq('id', r.team_id)
                                  if (error) throw error
                                  toast({ title: 'Tier Updated', description: `Team tier set to ${newTier}` })
                                  fetchMonthly()
                                } catch (e: any) {
                                  toast({ title: 'Error', description: e.message || 'Failed to update tier', variant: 'destructive' })
                                }
                              }}>
                                Promote One Tier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-white" onClick={async () => {
                                // Manual tier adjust: demote one tier
                                const current = (r.updated_tier || r.current_tier) as string
                                const order = ['T4','T3','T2','T1','godtier']
                                const idx = Math.max(order.indexOf(current) - 1, 0)
                                const newTier = order[idx]
                                try {
                                  const { error } = await supabase.from('teams').update({ tier: newTier }).eq('id', r.team_id)
                                  if (error) throw error
                                  toast({ title: 'Tier Updated', description: `Team tier set to ${newTier}` })
                                  fetchMonthly()
                                } catch (e: any) {
                                  toast({ title: 'Error', description: e.message || 'Failed to update tier', variant: 'destructive' })
                                }
                              }}>
                                Demote One Tier
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredRows.length === 0 && <div className="text-center py-8 text-muted-foreground">No records.</div>}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}