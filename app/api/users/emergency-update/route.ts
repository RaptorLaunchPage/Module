import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - emergency endpoint unavailable')
}

// PUT - Emergency user role update with service role
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service unavailable - missing credentials' },
        { status: 503 }
      )
    }

    // Create service role client (bypasses RLS)
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request data
    const { userId, role, team_id, adminSecret } = await request.json()

    // Simple admin verification (you should set this in your environment)
    const expectedSecret = process.env.EMERGENCY_ADMIN_SECRET || 'emergency-admin-123'
    if (adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid admin secret' },
        { status: 403 }
      )
    }

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

    console.log('Emergency update:', { userId, role, team_id })

    // Prepare update data
    const updateData: any = { 
      role,
      updated_at: new Date().toISOString()
    }

    // Handle team assignment
    if (role === 'admin' || role === 'manager') {
      updateData.team_id = null
    } else if (team_id !== undefined) {
      updateData.team_id = team_id
    }

    console.log('Update data:', updateData)

    // Use service role to bypass all constraints
    const { data: updatedUser, error: updateError } = await serviceSupabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Emergency update failed:', updateError)
      return NextResponse.json(
        { error: `Emergency update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('Emergency update succeeded:', updatedUser)

    return NextResponse.json({
      success: true,
      user: updatedUser,
      method: 'emergency-service-role'
    })

  } catch (error: any) {
    console.error('Emergency update error:', error)
    return NextResponse.json(
      { error: `Emergency update error: ${error.message}` },
      { status: 500 }
    )
  }
}