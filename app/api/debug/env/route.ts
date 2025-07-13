import { NextResponse } from 'next/server'
import { getEnvironmentStatus } from '@/lib/env-debug'

export async function GET() {
  try {
    const status = getEnvironmentStatus()
    
    // Don't expose actual values, just whether they exist
    const safeStatus = {
      hasSupabaseUrl: status.hasSupabaseUrl,
      hasAnonKey: status.hasAnonKey,
      hasServiceRoleKey: status.hasServiceRoleKey,
      environment: status.environment,
      isServer: status.isServer,
      timestamp: new Date().toISOString(),
      // Safe partial values for debugging
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
    }

    return NextResponse.json({
      success: true,
      status: safeStatus,
      message: status.hasServiceRoleKey 
        ? '✅ All environment variables found' 
        : '❌ Service role key missing - add to Vercel environment variables'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to check environment status'
    }, { status: 500 })
  }
}