import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const host = request.headers.get('host') || ''
  const domain = process.env.PUBLIC_LANDING_DOMAIN || 'mydomain.in'
  const { pathname } = new URL(request.url)

  // Rewrite root to /raptor for public domain only
  if (host.includes(domain) && pathname === '/') {
    return NextResponse.rewrite(new URL('/raptor', request.url))
  }

  // Security headers (keep existing if present)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!_next|api/|favicon.ico|assets|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)'
  ]
}