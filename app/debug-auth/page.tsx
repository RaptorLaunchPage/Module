"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export default function DebugAuthPage() {
  const { session, user, profile, loading, error, signIn } = useAuth()
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [testCredentials, setTestCredentials] = useState({ email: '', password: '' })
  const [directSupabaseSession, setDirectSupabaseSession] = useState<any>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev, `${timestamp}: ${message}`])
    console.log(`DEBUG: ${message}`)
  }

  useEffect(() => {
    addLog('Debug page mounted')
    addLog(`Auth loading: ${loading}`)
    addLog(`User exists: ${!!user}`)
    addLog(`Profile exists: ${!!profile}`)
    addLog(`Session exists: ${!!session}`)
    
    // Check direct Supabase session
    const checkDirectSession = async () => {
      try {
        const { data: { session: directSession }, error } = await supabase.auth.getSession()
        setDirectSupabaseSession(directSession)
        addLog(`Direct Supabase session exists: ${!!directSession}`)
        if (error) addLog(`Direct session error: ${error.message}`)
      } catch (err: any) {
        addLog(`Direct session check failed: ${err.message}`)
      }
    }
    
    checkDirectSession()
  }, [loading, user, profile, session])

  useEffect(() => {
    if (error) {
      addLog(`Auth error: ${error}`)
    }
  }, [error])

  const testLogin = async () => {
    addLog('=== STARTING TEST LOGIN ===')
    try {
      addLog('Calling signIn function...')
      const result = await signIn(testCredentials.email, testCredentials.password)
      addLog(`SignIn result: ${JSON.stringify(result)}`)
      
      if (result.error) {
        addLog(`Login failed: ${result.error.message}`)
      } else {
        addLog('Login appeared successful, waiting for auth state changes...')
      }
    } catch (err: any) {
      addLog(`Login exception: ${err.message}`)
    }
  }

  const testDirectSupabaseLogin = async () => {
    addLog('=== TESTING DIRECT SUPABASE LOGIN ===')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testCredentials.email,
        password: testCredentials.password
      })
      
      addLog(`Direct Supabase login result: ${JSON.stringify(data)}`)
      if (error) addLog(`Direct login error: ${error.message}`)
      
      // Check session immediately after
      const { data: { session } } = await supabase.auth.getSession()
      addLog(`Session after direct login: ${!!session}`)
    } catch (err: any) {
      addLog(`Direct login exception: ${err.message}`)
    }
  }

  const clearLogs = () => {
    setDebugLogs([])
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">🔍 Authentication Debug Center</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current State */}
        <Card>
          <CardHeader>
            <CardTitle>Current Auth State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Loading:</strong> {loading ? "🟡 Yes" : "🟢 No"}</div>
            <div><strong>Session:</strong> {session ? "✅ Present" : "❌ None"}</div>
            <div><strong>User:</strong> {user ? `✅ ${user.email}` : "❌ None"}</div>
            <div><strong>Profile:</strong> {profile ? `✅ ${profile.role}` : "❌ None"}</div>
            <div><strong>Error:</strong> {error || "None"}</div>
            <div><strong>Direct Supabase Session:</strong> {directSupabaseSession ? "✅ Present" : "❌ None"}</div>
          </CardContent>
        </Card>

        {/* Test Login */}
        <Card>
          <CardHeader>
            <CardTitle>Test Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={testCredentials.email}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={testCredentials.password}
                onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={testLogin} disabled={loading}>
                Test Auth Hook Login
              </Button>
              <Button onClick={testDirectSupabaseLogin} variant="outline">
                Test Direct Supabase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Debug Logs
            <Button onClick={clearLogs} variant="outline" size="sm">Clear</Button>
          </CardTitle>
          <CardDescription>Real-time authentication flow tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Raw Data */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-64">
              {session ? JSON.stringify(session, null, 2) : "No session"}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-64">
              {profile ? JSON.stringify(profile, null, 2) : "No profile"}
            </pre>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => window.location.href = '/auth/login'}>
          Go to Login Page
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
          Try Dashboard
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    </div>
  )
}