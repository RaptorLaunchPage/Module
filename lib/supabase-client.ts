import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database.types'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase environment variables.\n' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file'
  )
}

// Validate URL format
let validatedUrl = supabaseUrl
if (supabaseUrl) {
  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error('❌ Invalid Supabase URL format:', supabaseUrl)
    validatedUrl = undefined
  }
}

// Client-side Supabase client (for use in React components)
export const createSupabaseClient = () => {
  if (!validatedUrl || !supabaseAnonKey) {
    throw new Error('Missing or invalid Supabase configuration')
  }
  
  return createClientComponentClient<Database>()
}

// Legacy client for backward compatibility (updated with better error handling)
export const supabase = (() => {
  if (!validatedUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase client created with missing configuration - auth will fail gracefully')
    // Return a dummy client that won't crash but will fail auth operations
    return createClient('https://dummy.supabase.co', 'dummy-key', {
      auth: { persistSession: false }
    })
  }

  return createClient<Database>(validatedUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'raptor-auth-token',
      debug: process.env.NODE_ENV === 'development'
    },
    global: {
      headers: {
        'x-application': 'raptor-esports-crm'
      }
    }
  })
})()

// Export configuration info for debugging
export const SUPABASE_CONFIG = {
  url: validatedUrl || 'not-configured',
  hasAnonKey: !!supabaseAnonKey,
  hasServiceRoleKey: false, // Not available in client config
  environment: process.env.NODE_ENV || 'development',
  isConfigured: !!(validatedUrl && supabaseAnonKey),
} as const

// Health check function
export const checkSupabaseConnection = async (): Promise<{
  success: boolean
  error?: string
  config: typeof SUPABASE_CONFIG
}> => {
  try {
    if (!SUPABASE_CONFIG.isConfigured) {
      return {
        success: false,
        error: 'Supabase is not properly configured',
        config: SUPABASE_CONFIG
      }
    }

    // Test connection with a simple query
    const client = createSupabaseClient()
    const { error } = await client.from('users').select('id').limit(1)
    
    if (error && error.code !== 'PGRST116') {
      return {
        success: false,
        error: error.message,
        config: SUPABASE_CONFIG
      }
    }

    return {
      success: true,
      config: SUPABASE_CONFIG
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown connection error',
      config: SUPABASE_CONFIG
    }
  }
}