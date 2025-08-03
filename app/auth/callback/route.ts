import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

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
    const supabase = createSupabaseRouteHandlerClient()
    
    try {
      console.log('🔄 Exchanging code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Code exchange error:', exchangeError)
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=auth_failed`)
      }

      if (data.user && data.session) {
        console.log('✅ Session established for user:', data.user.email)
        
        // Create or update user profile and get it
        const profile = await createOrUpdateUserProfile(supabase, data.user, data.session)
        
        // Determine redirect destination based on profile
        const redirectTo = determineRedirectPath(profile)
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

async function createOrUpdateUserProfile(supabase: any, user: any, session: any): Promise<any> {
  try {
    console.log('🔄 Creating/updating user profile for:', user.email);

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', fetchError);
      throw new Error('Failed to check for existing user.');
    }

    if (!existingUser) {
      console.log('📝 Creating new user profile...');
      const userData = {
        id: user.id,
        email: user.email,
        name: extractUserName(user),
        avatar_url: user.user_metadata?.avatar_url || null,
        provider: user.app_metadata?.provider || 'email',
        discord_id: user.app_metadata?.provider === 'discord' ? user.user_metadata?.provider_id : null,
        role: 'pending_player', // New users start with a pending role
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating user profile:', insertError);
        throw new Error('Failed to create user profile.');
      }
      
      console.log('✅ User profile created successfully');
      return newUser;
    } else {
      console.log('🔄 Updating existing user login time...');
      const updateData: any = {
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!existingUser.avatar_url && user.user_metadata?.avatar_url) {
        updateData.avatar_url = user.user_metadata.avatar_url;
      }
      if (!existingUser.name) {
        const extractedName = extractUserName(user);
        if (extractedName) {
          updateData.name = extractedName;
        }
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user profile:', updateError);
        // Continue with existing user data even if update fails
      } else {
        console.log('✅ User profile updated successfully');
        return updatedUser;
      }
      return existingUser;
    }
  } catch (error) {
    console.error('❌ Profile creation/update error:', error);
    // Re-throw the error to be caught by the main handler
    throw error;
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

function determineRedirectPath(profile: any): string {
  // If there's no profile, something went wrong. Redirect to login.
  if (!profile) {
    return '/auth/login?error=profile_not_found';
  }

  // New users who need to complete onboarding
  // We can identify new users by the default 'pending_player' role.
  if (profile.role === 'pending_player') {
    console.log('👤 New user detected, redirecting to onboarding.');
    return '/onboarding';
  }

  // Returning users are sent to their dashboard
  console.log(`✅ Returning user (${profile.role}) detected, redirecting to dashboard.`);
  return '/dashboard';
}