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

// GET - Fetch users
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

    // Check permissions - only specific roles can view users
    const allowedRoles = ['admin', 'manager', 'coach', 'analyst']
    if (!allowedRoles.includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view users' },
        { status: 403 }
      )
    }

    let query = userSupabase!
      .from('users')
      .select('*')
      .order('name', { ascending: true })

    // Role-based filtering
    if (userData!.role === 'coach' && userData!.team_id) {
      // Coaches can only see users in their team
      query = query.eq('team_id', userData!.team_id)
    }
    // Admin, manager, and analyst can see all users

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json(users || [])

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}