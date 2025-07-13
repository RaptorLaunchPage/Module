// Environment variable test for debugging
export function testEnvironmentVariables() {
  console.log('🔍 Environment Variable Check:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing')
  
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Service role key is loaded! Admin operations should work.')
    return true
  } else {
    console.log('❌ Service role key not found! This will cause permission errors.')
    return false
  }
}

// Test during module load
if (typeof window === 'undefined') {
  // Server-side only
  testEnvironmentVariables()
}