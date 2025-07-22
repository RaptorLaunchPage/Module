"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null)
  
  useEffect(() => {
    const getToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          setToken(session.access_token)
        }
      } catch (error) {
        console.error('Error getting auth token:', error)
      }
    }
    
    getToken()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        setToken(session.access_token)
      } else {
        setToken(null)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  return token
}
