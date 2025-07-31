import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔄 Auth callback received:', { code: !!code, error, error_description })

  if (error) {
    console.error('❌ OAuth error:', error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    try {
      console.log('🔄 Exchanging code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Code exchange error:', exchangeError)
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=auth_failed`)
      }

      if (data.user && data.session) {
        console.log('✅ Session established for user:', data.user.email)
        
        // Create or update user profile
        await createOrUpdateUserProfile(supabase, data.user, data.session)
        
        // Determine redirect destination
        const redirectTo = determineRedirectPath(data.user)
        console.log('🎯 Redirecting to:', redirectTo)
        
        return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`)
      }
    } catch (error: any) {
      console.error('❌ Callback processing error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=callback_failed`)
    }
  }

  // No code provided, redirect to login
  console.log('⚠️ No code provided, redirecting to login')
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}

async function createOrUpdateUserProfile(supabase: any, user: any, session: any) {
  try {
    console.log('🔄 Creating/updating user profile for:', user.email)
    
    // Check if user profile exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', fetchError)
      return
    }

    if (!existingUser) {
      console.log('📝 Creating new user profile...')
      
      // Extract user data from different providers
      const userData = {
        id: user.id,
        email: user.email,
        name: extractUserName(user),
        avatar_url: user.user_metadata?.avatar_url || null,
        provider: user.app_metadata?.provider || 'email',
        discord_id: user.app_metadata?.provider === 'discord' ? user.user_metadata?.provider_id : null,
        role: 'pending_player',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert([userData])

      if (insertError) {
        console.error('❌ Error creating user profile:', insertError)
      } else {
        console.log('✅ User profile created successfully')
      }
    } else {
      console.log('🔄 Updating existing user login time...')
      
      // Update last login and any missing fields
      const updateData: any = {
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Update avatar if missing and available
      if (!existingUser.avatar_url && user.user_metadata?.avatar_url) {
        updateData.avatar_url = user.user_metadata.avatar_url
      }

      // Update name if missing and available
      if (!existingUser.name) {
        const extractedName = extractUserName(user)
        if (extractedName) {
          updateData.name = extractedName
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        console.error('❌ Error updating user profile:', updateError)
      } else {
        console.log('✅ User profile updated successfully')
      }
    }
  } catch (error: any) {
    console.error('❌ Profile creation/update error:', error)
  }
}

function extractUserName(user: any): string | null {
  // Try different sources for user name
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.username ||
    null
  )
}

function determineRedirectPath(user: any): string {
  // Default redirect path
  let redirectPath = '/dashboard'
  
  // Check if user needs onboarding (you can customize this logic)
  // For now, redirect all new users to dashboard
  
  return redirectPath
}