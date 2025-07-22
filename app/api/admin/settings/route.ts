import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/admin/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all admin config settings
    const { data: settings, error: settingsError } = await supabase
      .from('admin_config')
      .select('key, value')

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Convert to key-value object
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ settings: settingsMap })

  } catch (error) {
    console.error('Admin settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/settings - Update system settings
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
    }

    // Update each setting
    const updates = []
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        supabase
          .from('admin_config')
          .upsert({ key, value: String(value) }, { onConflict: 'key' })
      )
    }

    const results = await Promise.allSettled(updates)
    const failures = results.filter(result => result.status === 'rejected')

    if (failures.length > 0) {
      console.error('Settings update failures:', failures)
      return NextResponse.json({ error: 'Some settings failed to update' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Settings updated successfully' })

  } catch (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
