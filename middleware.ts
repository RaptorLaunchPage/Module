import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files, API routes, and auth callbacks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/confirm') ||
    pathname.startsWith('/auth/callback') ||
    pathname.includes('.') // Skip files with extensions
  ) {
    return res
  }

  // Simple route protection without server-side session checking
  // The client-side auth will handle the actual authentication
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/forgot', '/auth/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // Dashboard routes that require authentication
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')

  // Get auth token from cookies for basic check
  const authToken = req.cookies.get('sb-access-token')?.value ||
                   req.cookies.get('supabase-auth-token')?.value ||
                   req.cookies.get('sb-auth-token')?.value

  if (!authToken && isDashboardRoute) {
    // Redirect to login if trying to access protected route without token
    console.log(`🔒 Redirecting ${pathname} to login (no auth token)`)
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Don't redirect authenticated users away from auth pages on the server
  // Let the client-side handle this to avoid conflicts
  
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