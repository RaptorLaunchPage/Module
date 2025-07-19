import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name } = await request.json()
    
    console.log('🧪 Testing profile creation with:', { userId, email, name })
    
    // Test 1: Check if profile exists
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    console.log('🧪 Existing profile check:', { existing, checkError })
    
    if (checkError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check existing profile',
        details: checkError
      })
    }
    
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existing
      })
    }
    
    // Test 2: Try to create profile
    const profileData = {
      id: userId,
      email: email,
      name: name || 'Test User',
      role: 'pending_player',
      role_level: 10,
      created_at: new Date().toISOString()
    }
    
    console.log('🧪 Creating profile with data:', profileData)
    
    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert(profileData)
      .select()
      .single()
    
    console.log('🧪 Profile creation result:', { newProfile, createError })
    
    if (createError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create profile',
        details: createError
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    })
    
  } catch (error) {
    console.error('🧪 Test API error:', error)
    return NextResponse.json({
      success: false,
      error: 'API exception',
      details: error
    })
  }
}