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

    console.log('Attempting user update:', { userId, role, team_id })
    
    // Method 1: Try the bulletproof update function (should always work)
    try {
      console.log('Calling bulletproof_user_update with:', { userId, role, team_id })
      
      const { data: bulletproofResult, error: bulletproofError } = await userSupabase!
        .rpc('bulletproof_user_update', {
          p_user_id: userId,
          p_role: role,
          p_team_id: team_id || null
        })

      console.log('Bulletproof function response:', { bulletproofResult, bulletproofError })

      if (!bulletproofError && bulletproofResult) {
        console.log('Bulletproof function result:', bulletproofResult)
        
        // Check if the function returned an error internally
        if (bulletproofResult.error) {
          console.warn('Bulletproof function internal error:', bulletproofResult.error)
          // Continue to backup method
        } else {
          // Success! Return the result
          return NextResponse.json({
            success: true,
            user: bulletproofResult,
            method: 'bulletproof_function'
          })
        }
      } else {
        console.warn('Bulletproof function failed:', bulletproofError?.message)
        console.warn('Full error object:', bulletproofError)
      }
    } catch (bulletproofErr: any) {
      console.warn('Bulletproof function error:', bulletproofErr.message)
      console.warn('Full error:', bulletproofErr)
    }

    // Method 2: Try the minimal update function (backup)
    try {
      console.log('Calling minimal_user_update with:', { userId, role })
      
      const { data: minimalResult, error: minimalError } = await userSupabase!
        .rpc('minimal_user_update', {
          p_user_id: userId,
          p_role: role
        })

      console.log('Minimal function response:', { minimalResult, minimalError })

      if (!minimalError && minimalResult === 'SUCCESS') {
        console.log('Minimal function succeeded')
        
        // Manually update team_id if needed (since minimal function only updates role)
        if (role === 'admin' || role === 'manager') {
          await userSupabase!.from('users').update({ team_id: null }).eq('id', userId)
        } else if (team_id !== undefined) {
          await userSupabase!.from('users').update({ team_id: team_id }).eq('id', userId)
        }
        
        // Fetch the updated user data to return
        const { data: updatedUserData } = await userSupabase!
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        
        return NextResponse.json({
          success: true,
          user: updatedUserData,
          method: 'minimal_function'
        })
      }

      console.warn('Minimal function failed:', minimalError?.message || minimalResult)
      console.warn('Full minimal error object:', minimalError)
    } catch (minimalErr: any) {
      console.warn('Minimal function error:', minimalErr.message)
      console.warn('Full minimal error:', minimalErr)
    }

    // Method 3: Emergency fallback - direct table update (no functions)
    try {
      console.log('Trying emergency direct update as last resort')
      
      const updateData: any = { role, updated_at: new Date().toISOString() }
      
      // Handle team assignment
      if (role === 'admin' || role === 'manager') {
        updateData.team_id = null
      } else if (team_id !== undefined) {
        updateData.team_id = team_id
      }
      
      const { data: directUpdate, error: directError } = await userSupabase!
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (!directError && directUpdate) {
        console.log('Emergency direct update succeeded:', directUpdate)
        return NextResponse.json({
          success: true,
          user: directUpdate,
          method: 'emergency_direct_update'
        })
      }

      console.error('Emergency direct update failed:', directError?.message)
      console.error('Direct update error details:', directError)
    } catch (directErr: any) {
      console.error('Emergency direct update error:', directErr.message)
    }

    // If even direct update failed, return error
    console.error('ALL update methods failed! User ID:', userId, 'Role:', role)
    return NextResponse.json(
      { error: 'Failed to update user: All update methods failed including direct update' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error in users PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}