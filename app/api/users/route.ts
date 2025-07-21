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

// PUT - Update user role and team
export async function PUT(request: NextRequest) {
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

    // Check permissions - only admin can update user roles
    if (userData!.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can update user roles' },
        { status: 403 }
      )
    }

    const { userId, role, team_id } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'coach', 'analyst', 'player', 'pending_player']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    const updateData: any = { role }

    // Handle team assignment based on role
    if (role === 'admin' || role === 'manager') {
      updateData.team_id = null
    } else if (team_id !== undefined) {
      updateData.team_id = team_id
    }

    // Use a more direct approach to avoid ON CONFLICT issues
    console.log('Attempting user update with data:', updateData)
    
    // Method 1: Try using the emergency update function (no env vars needed)
    try {
      const { data: emergencyResult, error: emergencyError } = await userSupabase!
        .rpc('emergency_user_update', {
          user_id_param: userId,
          role_param: role,
          team_id_param: team_id || 'null'
        })

      if (!emergencyError && emergencyResult) {
        console.log('Emergency function succeeded:', emergencyResult)
        
        // Fetch the updated user data
        const { data: updatedUserData } = await userSupabase!
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        
        return NextResponse.json({
          success: true,
          user: updatedUserData,
          method: 'emergency_function'
        })
      }

      console.warn('Emergency function failed:', emergencyError?.message)
    } catch (emergencyErr: any) {
      console.warn('Emergency function error:', emergencyErr.message)
    }

    // Method 1b: Try using the raw SQL update function
    try {
      const { data: rawResult, error: rawError } = await userSupabase!
        .rpc('update_user_role_raw', {
          p_user_id: userId,
          p_role: role,
          p_team_id: team_id
        })

      if (!rawError && rawResult) {
        console.log('Raw SQL function succeeded:', rawResult)
        return NextResponse.json({
          success: true,
          user: rawResult
        })
      }

      console.warn('Raw SQL function failed:', rawError?.message)
    } catch (rawErr: any) {
      console.warn('Raw SQL function error:', rawErr.message)
    }

    // Method 1b: Try using the simple update function
    try {
      const { data: functionResult, error: functionError } = await userSupabase!
        .rpc('simple_user_update', {
          target_user_id: userId,
          new_role: role,
          new_team_id: team_id
        })

      if (!functionError && functionResult) {
        console.log('Database function succeeded:', functionResult)
        return NextResponse.json({
          success: true,
          user: functionResult
        })
      }

      console.warn('Database function failed:', functionError?.message)
    } catch (funcErr: any) {
      console.warn('Database function error:', funcErr.message)
    }

    // Method 2: Try a basic update without any special options
    try {
      console.log('Trying basic update for user:', userId)
      const { data: basicUpdate, error: basicError } = await userSupabase!
        .from('users')
        .update({ 
          role: role,
          ...(role === 'admin' || role === 'manager' ? { team_id: null } : {}),
          ...(team_id !== undefined && role !== 'admin' && role !== 'manager' ? { team_id: team_id } : {})
        })
        .eq('id', userId)
        .select()
        .single()

      if (!basicError && basicUpdate) {
        console.log('Basic update succeeded:', basicUpdate)
        return NextResponse.json({
          success: true,
          user: basicUpdate
        })
      }

      console.warn('Basic update failed:', basicError?.message)
    } catch (basicErr: any) {
      console.warn('Basic update error:', basicErr.message)
    }

    // Method 3: Fallback to the original update method
    const { data: updatedUser, error: updateError } = await userSupabase!
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: `Failed to update user: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Error in users PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}