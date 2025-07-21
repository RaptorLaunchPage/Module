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