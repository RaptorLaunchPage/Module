import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

function getDatesForTimeframe(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  const { data: userData, error: userError } = await userSupabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData, userSupabase }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) {
      return NextResponse.json({ error: error || 'Service unavailable' }, { status: status || 500 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '30')
    const { start, end } = getDatesForTimeframe(timeframe)

    // Performances
    let perfQuery = userSupabase
      .from('performances')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // Role-based filter
    if (userData.role === 'player') {
      if (userData.team_id) {
        perfQuery = perfQuery.or(`player_id.eq.${userData.id},team_id.eq.${userData.team_id}`)
      } else {
        perfQuery = perfQuery.eq('player_id', userData.id)
      }
    } else if (['coach', 'analyst'].includes(userData.role) && userData.team_id) {
      perfQuery = perfQuery.eq('team_id', userData.team_id)
    }

    const { data: performances, error: perfError } = await perfQuery
    if (perfError) throw perfError

    const totalMatches = performances?.length || 0
    const totalKills = performances?.reduce((s, p) => s + (p.kills || 0), 0) || 0
    const totalDamage = performances?.reduce((s, p) => s + (p.damage || 0), 0) || 0
    const totalSurvival = performances?.reduce((s, p) => s + (p.survival_time || 0), 0) || 0

    const today = new Date(); today.setHours(0,0,0,0)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const todayMatches = performances?.filter(p => new Date(p.created_at) >= today).length || 0
    const weekMatches = performances?.filter(p => new Date(p.created_at) >= weekAgo).length || 0
    const placements = performances?.map(p => p.placement).filter(p => (p ?? 0) > 0) || []
    const avgPlacement = placements.length > 0 ? Math.round(placements.reduce((a, b) => a + (b || 0), 0) / placements.length) : 0

    // Finance summary
    let expenseQuery = userSupabase
      .from('slot_expenses')
      .select('total, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    let winningsQuery = userSupabase
      .from('winnings')
      .select('amount_won, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (['coach', 'analyst', 'player'].includes(userData.role) && userData.team_id) {
      expenseQuery = expenseQuery.eq('team_id', userData.team_id)
      winningsQuery = winningsQuery.eq('team_id', userData.team_id)
    }

    const [{ data: expenses }, { data: winnings }] = await Promise.all([
      expenseQuery,
      winningsQuery
    ])

    const totalExpense = (expenses || []).reduce((sum, e: any) => sum + (e.total || 0), 0)
    const totalWinnings = (winnings || []).reduce((sum, w: any) => sum + (w.amount_won || 0), 0)
    const totalProfitLoss = totalWinnings - totalExpense

    // Active teams and players (admins/managers only)
    let activeTeams = 0
    let activePlayers = 0
    if (['admin', 'manager'].includes(userData.role)) {
      const [{ data: teams }, { data: users }] = await Promise.all([
        userSupabase.from('teams').select('id').eq('status', 'active'),
        userSupabase.from('users').select('id').neq('role', 'pending_player').neq('role', 'awaiting_approval')
      ])
      activeTeams = teams?.length || 0
      activePlayers = users?.length || 0
    }

    // Attendance rate
    let attendanceQuery = userSupabase
      .from('attendances')
      .select('status, team_id, created_at, date')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (['coach', 'analyst', 'player'].includes(userData.role) && userData.team_id) {
      attendanceQuery = attendanceQuery.eq('team_id', userData.team_id)
    }

    const { data: attendanceRows } = await attendanceQuery
    const totalSessions = attendanceRows?.length || 0
    const attended = (attendanceRows || []).filter(a => ['present', 'late', 'auto'].includes(a.status)).length
    const overallAttendanceRate = totalSessions > 0 ? (attended / totalSessions) * 100 : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalMatches,
        totalKills,
        avgDamage: totalMatches ? totalDamage / totalMatches : 0,
        avgSurvival: totalMatches ? totalSurvival / totalMatches : 0,
        kdRatio: totalMatches ? totalKills / totalMatches : 0,
        avgPlacement,
        todayMatches,
        weekMatches,
        totalExpense,
        totalProfitLoss,
        activeTeams,
        activePlayers,
        overallAttendanceRate
      }
    })
  } catch (error: any) {
    console.error('Error in dashboard overview API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}