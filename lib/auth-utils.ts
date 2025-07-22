import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function getUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting user from token:', error)
    return null
  }
}

export async function getUserWithProfile(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return { user: null, profile: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return { user, profile: null }
    }

    return { user, profile }
  } catch (error) {
    console.error('Error getting user with profile:', error)
    return { user: null, profile: null }
  }
}
