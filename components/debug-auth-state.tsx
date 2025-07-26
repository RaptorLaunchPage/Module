"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function DebugAuthState() {
  const pathname = usePathname()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check various auth states
        const sessionStorage = typeof window !== 'undefined' ? {
          hasRaptorSession: !!localStorage.getItem('raptor-session-data'),
          hasRaptorToken: !!localStorage.getItem('raptor-access-token'),
          lastActive: localStorage.getItem('raptor-last-active')
        } : null

        // Check Supabase session
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()

        // Check auth flow state
        const { default: authFlowV2 } = await import('@/lib/auth-flow-v2')
        const authState = authFlowV2.getState()

        setDebugInfo({
          timestamp: new Date().toISOString(),
          pathname,
          sessionStorage,
          supabaseSession: session ? {
            hasUser: !!session.user,
            userEmail: session.user?.email,
            expiresAt: session.expires_at
          } : null,
          authFlowState: {
            isAuthenticated: authState.isAuthenticated,
            isInitialized: authState.isInitialized,
            isLoading: authState.isLoading,
            hasUser: !!authState.user,
            hasProfile: !!authState.profile,
            error: authState.error
          }
        })
      } catch (error) {
        console.error('Debug auth state error:', error)
      }
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [pathname])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md max-h-96 overflow-auto z-50 font-mono">
      <div className="font-bold mb-2">🐛 Auth Debug Info</div>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  )
}