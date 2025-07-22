import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view tryouts
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, team_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admin, manager, coach can view tryouts
    if (!['admin', 'manager', 'coach'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch tryouts with counts
    const { data: tryouts, error } = await supabase
      .from('tryouts')
      .select(`
        *,
        creator:created_by(name, email),
        _count:tryout_applications(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch tryouts' }, { status: 500 })
    }

    return NextResponse.json({ tryouts })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'manager', 'coach'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      purpose,
      target_roles = [],
      team_ids = [],
      type,
      open_to_public = true,
      application_deadline,
      evaluation_method = 'manual',
      requirements,
      additional_links = []
    } = body

    if (!name || !purpose || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: tryout, error } = await supabase
      .from('tryouts')
      .insert({
        name,
        description,
        purpose,
        target_roles,
        team_ids,
        type,
        open_to_public,
        application_deadline,
        evaluation_method,
        requirements,
        additional_links,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create tryout' }, { status: 500 })
    }

    return NextResponse.json({ tryout }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
