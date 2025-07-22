import { NextRequest, NextResponse } from 'next/server'
import { getUserWithProfile } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'

// GET /api/profile/debug - Debug profile issues
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getUserWithProfile(request)
    
    return NextResponse.json({
      auth: {
        hasUser: !!user,
        hasProfile: !!profile,
        userId: user?.id,
        profileId: profile?.id,
        role: profile?.role
      },
      request: {
        hasAuthHeader: !!request.headers.get('authorization'),
        authHeader: request.headers.get('authorization')?.substring(0, 20) + '...',
        userAgent: request.headers.get('user-agent')
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

// POST /api/profile/debug - Test profile update
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getUserWithProfile(request)
    
    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Test a simple update
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({ 
        bio: body.testBio || 'Debug test update',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json({
        error: 'Update failed',
        details: updateError,
        profile: profile
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      originalProfile: profile,
      updatedProfile: updatedProfile,
      message: 'Debug update successful'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
