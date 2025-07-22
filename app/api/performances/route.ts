import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with anon key (safer for development)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create a client with the user's token for RLS
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  // Get user data using the authenticated client
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

// GET - Fetch performances
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // First check if performances table exists and is accessible
    const { data: testQuery, error: testError } = await userSupabase!
      .from("performances")
      .select("id")
      .limit(1)

    if (testError) {
      console.error('Performances table access error:', testError)
      // If table doesn't exist or no access, return empty array instead of error
      if (testError.code === 'PGRST116' || testError.message?.includes('relation') || testError.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      return NextResponse.json(
        { error: `Database error: ${testError.message}` },
        { status: 500 }
      )
    }

    // Try a simplified query first without relationships
    let query = userSupabase!
      .from("performances")
      .select("*")

    // Apply role-based filtering
    if (userData!.role === "player") {
      // Players can see their own performance AND their team's performance
      if (userData!.team_id) {
        query = query.or(`player_id.eq.${userData!.id},team_id.eq.${userData!.team_id}`)
      } else {
        query = query.eq("player_id", userData!.id)
      }
    } else if (userData!.role === "coach" && userData!.team_id) {
      query = query.eq("team_id", userData!.team_id)
    }
    // Admin, manager, and analyst can see all performances (no filtering)

    const { data, error: queryError } = await query.order("created_at", { ascending: false })

    if (queryError) {
      console.error('Error fetching performances:', queryError)
      return NextResponse.json(
        { error: `Query error: ${queryError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Error in performances API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Submit performance data
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const performanceData = await request.json()

    // Validate required fields
    const requiredFields = ['match_date', 'map', 'placement']
    const missingFields = requiredFields.filter(field => !performanceData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Ensure player can only submit their own performance
    if (userData!.role === 'player') {
      performanceData.player_id = userData!.id
      performanceData.team_id = userData!.team_id
    }

    // Validate team assignment
    if (!performanceData.team_id && userData!.team_id) {
      performanceData.team_id = userData!.team_id
    }

    if (!performanceData.team_id) {
      return NextResponse.json(
        { error: 'Player must be assigned to a team to submit performance' },
        { status: 400 }
      )
    }

    // Insert performance data
    const { data: newPerformance, error: insertError } = await userSupabase!
      .from('performances')
      .insert({
        player_id: performanceData.player_id || userData!.id,
        team_id: performanceData.team_id,
        match_date: performanceData.match_date,
        map: performanceData.map,
        placement: performanceData.placement,
        kills: performanceData.kills || 0,
        damage: performanceData.damage || 0,
        survival_time: performanceData.survival_time || 0,
        assists: performanceData.assists || 0,
        revives: performanceData.revives || 0,
        match_type: performanceData.match_type || 'Scrims',
        notes: performanceData.notes || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting performance:', insertError)
      return NextResponse.json(
        { error: `Failed to submit performance: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Auto-create match attendance (Scrims session)
    try {
      await createMatchAttendance(userSupabase!, newPerformance, userData!)
    } catch (attendanceError) {
      console.warn('Failed to create match attendance:', attendanceError)
      // Don't fail the performance submission if attendance creation fails
    }

    return NextResponse.json({
      success: true,
      performance: newPerformance,
      message: 'Performance submitted successfully'
    })

  } catch (error) {
    console.error('Error in performance submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create match attendance
async function createMatchAttendance(userSupabase: any, performance: any, userData: any) {
  // Check if session already exists for this match
  const { data: existingSession, error: sessionCheckError } = await userSupabase
    .from('sessions')
    .select('id')
    .eq('team_id', performance.team_id)
    .eq('date', performance.match_date)
    .eq('session_type', 'tournament')
    .eq('session_subtype', 'Scrims')
    .single()

  let sessionId = existingSession?.id

  // Create session if it doesn't exist
  if (!sessionId) {
    const matchDate = new Date(performance.match_date)
    const sessionTitle = `${performance.match_type || 'Scrims'} - ${performance.map}`
    
    const { data: newSession, error: sessionCreateError } = await userSupabase
      .from('sessions')
      .insert({
        team_id: performance.team_id,
        session_type: 'tournament',
        session_subtype: 'Scrims',
        date: performance.match_date,
        start_time: '18:00:00', // Default match time
        end_time: '22:00:00',
        cutoff_time: null, // No cutoff for match sessions
        title: sessionTitle,
        is_mandatory: false,
        created_by: userData.id
      })
      .select()
      .single()

    if (sessionCreateError) {
      throw new Error(`Failed to create session: ${sessionCreateError.message}`)
    }

    sessionId = newSession.id
  }

  // Check if attendance already exists
  const { data: existingAttendance, error: attendanceCheckError } = await userSupabase
    .from('attendances')
    .select('id')
    .eq('session_id', sessionId)
    .eq('player_id', performance.player_id)
    .single()

  if (!existingAttendance) {
    // Create attendance record
    const { error: attendanceCreateError } = await userSupabase
      .from('attendances')
      .insert({
        player_id: performance.player_id,
        team_id: performance.team_id,
        date: performance.match_date,
        session_time: 'Scrims', // Keep for compatibility
        session_id: sessionId,
        status: 'present',
        source: 'auto',
        marked_by: userData.id
      })

    if (attendanceCreateError) {
      throw new Error(`Failed to create attendance: ${attendanceCreateError.message}`)
    }
  }
}