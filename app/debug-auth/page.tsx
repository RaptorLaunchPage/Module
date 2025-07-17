"use client"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugAuthPage() {
  const { session, user, profile, loading, error } = useAuth()
  const [authEvents, setAuthEvents] = useState<string[]>([])
  const [supabaseSession, setSupabaseSession] = useState<any>(null)

  useEffect(() => {
    // Listen to auth events for debugging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const timestamp = new Date().toLocaleTimeString()
        setAuthEvents(prev => [...prev, `${timestamp}: ${event} - ${session?.user?.email || 'no user'}`])
      }
    )

    // Get current session directly from Supabase
    const getCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSupabaseSession(session)
    }
    
    getCurrentSession()

    return () => subscription.unsubscribe()
  }, [])

  const testLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123'
      })
      console.log('Direct Supabase login:', { error })
    } catch (err) {
      console.error('Direct login error:', err)
    }
  }

  const clearEvents = () => {
    setAuthEvents([])
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Authentication Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* useAuth Hook State */}
          <Card>
            <CardHeader>
              <CardTitle>useAuth Hook State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Session:</strong> {session ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>User:</strong> {user ? user.email : 'None'}
              </div>
              <div>
                <strong>Profile:</strong> {profile ? `${profile.name} (${profile.role})` : 'None'}
              </div>
              <div>
                <strong>Error:</strong> {error || 'None'}
              </div>
            </CardContent>
          </Card>

          {/* Direct Supabase Session */}
          <Card>
            <CardHeader>
              <CardTitle>Direct Supabase Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong>Session exists:</strong> {supabaseSession ? 'Yes' : 'No'}
              </div>
              {supabaseSession && (
                <>
                  <div>
                    <strong>User ID:</strong> {supabaseSession.user?.id}
                  </div>
                  <div>
                    <strong>Email:</strong> {supabaseSession.user?.email}
                  </div>
                  <div>
                    <strong>Provider:</strong> {supabaseSession.user?.app_metadata?.provider}
                  </div>
                  <div>
                    <strong>Access Token:</strong> {supabaseSession.access_token ? 'Present' : 'Missing'}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Auth Events Log */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Auth Events Log</CardTitle>
              <CardDescription>Real-time authentication events from Supabase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={clearEvents} variant="outline">Clear Events</Button>
                <Button onClick={testLogin} variant="outline">Test Direct Login</Button>
              </div>
              
              <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                {authEvents.length === 0 ? (
                  <p className="text-muted-foreground">No events yet...</p>
                ) : (
                  <div className="space-y-1 font-mono text-sm">
                    {authEvents.map((event, index) => (
                      <div key={index}>{event}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Environment Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Environment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
              </div>
              <div>
                <strong>Site URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL || 'Not set'}
              </div>
              <div>
                <strong>Vercel URL:</strong> {process.env.NEXT_PUBLIC_VERCEL_URL || 'Not set'}
              </div>
              <div>
                <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}