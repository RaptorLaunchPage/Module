import { NextRequest, NextResponse } from 'next/server'
import { getUserWithProfile } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'
import { canViewProfile, canEditProfile } from '@/lib/profile-utils'

// GET /api/profile - Get current user's profile or specific user profile
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getUserWithProfile(request)
    
    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId')
    
    // If no userId specified, return current user's profile
    if (!targetUserId) {
      return NextResponse.json({ profile })
    }
    
    // Fetch target user's profile
    const { data: targetProfile, error } = await supabase
      .from('users')
      .select(`
        *,
        team:team_id(id, name, tier),
        roster:rosters!inner(in_game_role, contact_number, device_info)
      `)
      .eq('id', targetUserId)
      .single()
    
    if (error || !targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Check permissions
    const hasAccess = canViewProfile(
      profile.role as any,
      profile.team_id,
      targetUserId,
      targetProfile.team_id,
      targetProfile.profile_visibility as any,
      profile.id
    )
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    return NextResponse.json({ profile: targetProfile })
    
  } catch (error: any) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/profile - Update profile
export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await getUserWithProfile(request)
    
    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, updates } = body
    
    const targetUserId = userId || profile.id
    
    // Check edit permissions
    let targetProfile = profile
    if (targetUserId !== profile.id) {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, team_id')
        .eq('id', targetUserId)
        .single()
        
      if (error || !data) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
      }
      
      targetProfile = data
    }
    
    const hasEditAccess = canEditProfile(
      profile.role as any,
      profile.team_id,
      targetUserId,
      targetProfile.team_id,
      profile.id
    )
    
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Edit access denied' }, { status: 403 })
    }
    
    // Sanitize updates based on role permissions
    const allowedUpdates = sanitizeUpdates(updates, profile.role as any, targetUserId === profile.id)
    
    // Add timestamp
    allowedUpdates.last_profile_update = new Date().toISOString()
    allowedUpdates.updated_at = new Date().toISOString()
    
    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(allowedUpdates)
      .eq('id', targetUserId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      profile: updatedProfile,
      message: 'Profile updated successfully' 
    })
    
  } catch (error: any) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Sanitize updates based on role permissions
function sanitizeUpdates(updates: any, role: string, isOwnProfile: boolean) {
  const allowedFields = new Set<string>()
  
  // Basic fields all users can edit on their own profile
  if (isOwnProfile) {
    allowedFields.add('full_name')
    allowedFields.add('display_name')
    allowedFields.add('bio')
    allowedFields.add('contact_number')
    allowedFields.add('date_of_birth')
    allowedFields.add('address')
    allowedFields.add('bgmi_id')
    allowedFields.add('bgmi_tier')
    allowedFields.add('bgmi_points')
    allowedFields.add('preferred_role')
    allowedFields.add('in_game_role')
    allowedFields.add('control_layout')
    allowedFields.add('sensitivity_settings')
    allowedFields.add('hud_layout_code')
    allowedFields.add('game_stats')
    allowedFields.add('achievements')
    allowedFields.add('device_info')
    allowedFields.add('device_model')
    allowedFields.add('ram')
    allowedFields.add('fps')
    allowedFields.add('storage')
    allowedFields.add('gyroscope_enabled')
    allowedFields.add('instagram_handle')
    allowedFields.add('discord_id')
    allowedFields.add('social_links')
    allowedFields.add('emergency_contact_name')
    allowedFields.add('emergency_contact_number')
    allowedFields.add('profile_visibility')
    allowedFields.add('auto_sync_tryout_data')
    allowedFields.add('preferred_language')
    allowedFields.add('timezone')
    allowedFields.add('experience')
    allowedFields.add('gaming_experience')
    allowedFields.add('favorite_game')
    allowedFields.add('favorite_games')
  }
  
  // Admin and manager can edit everything
  if (role === 'admin' || role === 'manager') {
    Object.keys(updates).forEach(key => allowedFields.add(key))
  }
  
  // Coach can edit limited fields for team members
  if (role === 'coach' && !isOwnProfile) {
    allowedFields.clear()
    allowedFields.add('full_name')
    allowedFields.add('display_name')
    allowedFields.add('in_game_role')
    allowedFields.add('preferred_role')
    allowedFields.add('contact_number')
    allowedFields.add('emergency_contact_name')
    allowedFields.add('emergency_contact_number')
  }
  
  // Filter updates to only allowed fields
  const sanitized: any = {}
  Object.keys(updates).forEach(key => {
    if (allowedFields.has(key)) {
      sanitized[key] = updates[key]
    }
  })
  
  return sanitized
}
