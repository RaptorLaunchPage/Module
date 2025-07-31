import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Server-side Supabase client (for use in Server Components)
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })
}

// Route handler client (for use in API routes)
export const createSupabaseRouteHandlerClient = () => {
  const cookieStore = cookies()
  return createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })
}

// Admin client with service role key (for server-side admin operations)
export const createSupabaseAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}