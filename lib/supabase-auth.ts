import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// Client-side Supabase client (for use in components)
export const createSupabaseClient = () => {
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

// Server-side Supabase client (for use in API routes and server components)
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient({
    cookies: () => cookieStore,
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

// Admin client with service role key (for server-side admin operations)
export const createSupabaseAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Legacy client for backward compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// Export environment info for debugging
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceRoleKey: !!supabaseServiceRoleKey,
  environment: process.env.NODE_ENV,
} as const
