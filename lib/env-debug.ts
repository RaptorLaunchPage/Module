// Production-safe environment debugging
export function getEnvironmentStatus() {
  const status = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    environment: process.env.NODE_ENV || 'unknown',
    isServer: typeof window === 'undefined'
  }

  return status
}

export function logEnvironmentStatus() {
  const status = getEnvironmentStatus()
  
  console.log('🔍 Environment Status Check:')
  console.log('- Environment:', status.environment)
  console.log('- Running on:', status.isServer ? 'Server' : 'Client')
  console.log('- Supabase URL:', status.hasSupabaseUrl ? '✅' : '❌')
  console.log('- Anon Key:', status.hasAnonKey ? '✅' : '❌')
  console.log('- Service Role Key:', status.hasServiceRoleKey ? '✅' : '❌')

  if (!status.hasServiceRoleKey) {
    console.log('⚠️  SERVICE ROLE KEY MISSING!')
    console.log('   For local: Add to .env.local')
    console.log('   For Vercel: Add to Environment Variables in dashboard')
  }

  return status
}