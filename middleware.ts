import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  console.log(`🛡️ Middleware: ${pathname}`)

  // Skip middleware for static files, API routes, and specific auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/confirm') ||
    pathname.startsWith('/auth/reset') ||
    pathname.includes('.') // Skip files with extensions
  ) {
    return res
  }

  try {
    // Create supabase server client
    const supabase = createServerComponentClient<Database>({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    // Handle authentication redirects
    if (session) {
      // Redirect authenticated users away from auth pages (except callbacks)
      if (pathname.startsWith('/auth/') && !pathname.includes('/callback')) {
        console.log('🔄 Redirecting authenticated user away from auth page')
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    } else {
      // Redirect unauthenticated users away from protected routes
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
        console.log('🔄 Redirecting unauthenticated user to login')
        return NextResponse.redirect(new URL('/auth/login', req.url))
      }
    }

  } catch (error) {
    console.error('❌ Middleware error:', error)
    // On error, let the request through and let client-side auth handle it
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}