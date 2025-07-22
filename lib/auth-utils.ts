import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function getUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    
    // For now, we'll use a simplified approach
    // In a real app, you'd validate the JWT token properly
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile fetch error:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Profile error:', error)
    return null
  }
}
