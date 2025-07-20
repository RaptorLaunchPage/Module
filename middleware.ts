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

  // Let client-side handle all authentication logic
  // This middleware now only handles very basic routing
  
  console.log(`🛡️  Middleware: ${pathname}`)
  
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