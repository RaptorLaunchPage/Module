"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export default function LoginTestPage() {
  const { signIn, loading, error, session, user, profile } = useAuth()
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [testLogs, setTestLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `${timestamp}: ${message}`
    console.log(logMessage)
    setTestLogs(prev => [...prev, logMessage])
  }

  const testLogin = async () => {
    addLog('=== STARTING LOGIN TEST ===')
    addLog(`Email: ${credentials.email}`)
    addLog(`Initial loading state: ${loading}`)
    
    try {
      addLog('Calling signIn...')
      const result = await signIn(credentials.email, credentials.password)
      
      addLog(`SignIn result: ${JSON.stringify(result)}`)
      addLog(`Loading state after signIn: ${loading}`)
      addLog(`Session after signIn: ${!!session}`)
      addLog(`User after signIn: ${!!user}`)
      addLog(`Profile after signIn: ${!!profile}`)
      
      if (result.error) {
        addLog(`❌ Login failed: ${result.error.message}`)
      } else {
        addLog('✅ SignIn call successful, waiting for auth state changes...')
        
        // Monitor state changes for 30 seconds
        let attempts = 0
        const monitor = setInterval(() => {
          attempts++
          addLog(`Monitor ${attempts}: loading=${loading}, session=${!!session}, user=${!!user}, profile=${!!profile}`)
          
          if (!loading && profile) {
            addLog('✅ Auth flow completed successfully!')
            clearInterval(monitor)
          }
          
          if (attempts >= 30) {
            addLog('❌ Monitoring timeout after 30 seconds')
            clearInterval(monitor)
          }
        }, 1000)
      }
    } catch (err: any) {
      addLog(`❌ Login exception: ${err.message}`)
    }
  }

  const testDirectSupabaseAuth = async () => {
    addLog('=== TESTING DIRECT SUPABASE AUTH ===')
    addLog('Calling supabase.auth.signInWithPassword directly...')
    
    const startTime = Date.now()
    
    try {
      // Test with timeout to see if it hangs
      const authPromise = supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth call timeout after 10 seconds')), 10000)
      )
      
      addLog('Racing auth call vs 10-second timeout...')
      
      const result = await Promise.race([authPromise, timeoutPromise])
      const endTime = Date.now()
      
      addLog(`✅ Auth call completed in ${endTime - startTime}ms`)
      addLog(`Result: ${JSON.stringify(result)}`)
      
    } catch (error: any) {
      const endTime = Date.now()
      addLog(`❌ Auth call failed after ${endTime - startTime}ms`)
      addLog(`Error: ${error.message}`)
      
      if (error.message.includes('timeout')) {
        addLog('🚨 CONFIRMED: Supabase auth endpoint is hanging!')
      }
    }
  }

  const testAuthEndpoint = async () => {
    addLog('=== TESTING AUTH ENDPOINT CONNECTIVITY ===')
    
    try {
      addLog('Testing basic auth endpoint...')
      
      // Test if we can reach the auth endpoint at all
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      })
      
      addLog(`Auth endpoint response status: ${response.status}`)
      addLog(`Auth endpoint response ok: ${response.ok}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addLog(`Auth endpoint error: ${errorText}`)
      }
      
    } catch (error: any) {
      addLog(`❌ Auth endpoint test failed: ${error.message}`)
    }
  }

  const testBypassAuth = async () => {
    addLog('=== TESTING AUTH BYPASS ===')
    addLog('This will manually set session state without calling Supabase auth...')
    
    try {
      // Get current user from a working auth session (if any)
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      
      if (currentUser) {
        addLog(`✅ Found existing authenticated user: ${currentUser.email}`)
        addLog('Manually triggering profile fetch...')
        
        // Directly call the profile fetch that we know works
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()
        
        if (profile) {
          addLog(`✅ Profile found via bypass: ${profile.name} (${profile.role})`)
          addLog('🚀 Redirecting to dashboard...')
          
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        } else {
          addLog(`❌ No profile found for user`)
        }
      } else {
        addLog(`❌ No authenticated user found`)
        addLog('Try logging in through Discord first, then test this bypass')
      }
    } catch (error: any) {
      addLog(`❌ Bypass test failed: ${error.message}`)
    }
  }

  const clearLogs = () => {
    setTestLogs([])
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">🧪 Login Flow Test</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Login Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="space-y-2">
              <Button onClick={testLogin} disabled={loading} className="w-full">
                {loading ? 'Testing...' : 'Test Login'}
              </Button>
              <Button onClick={testDirectSupabaseAuth} variant="secondary" className="w-full">
                Test Direct Supabase Auth
              </Button>
              <Button onClick={testAuthEndpoint} variant="outline" className="w-full">
                Test Auth Endpoint
              </Button>
              <Button onClick={testBypassAuth} variant="outline" className="w-full">
                Test Auth Bypass
              </Button>
              <Button onClick={clearLogs} variant="outline" className="w-full">
                Clear Logs
              </Button>
            </div>
            
            <div className="text-sm space-y-1">
              <div><strong>Loading:</strong> {loading ? '🟡 Yes' : '🟢 No'}</div>
              <div><strong>Session:</strong> {session ? '✅ Present' : '❌ None'}</div>
              <div><strong>User:</strong> {user ? `✅ ${user.email}` : '❌ None'}</div>
              <div><strong>Profile:</strong> {profile ? `✅ ${profile.name} (${profile.role})` : '❌ None'}</div>
              <div><strong>Error:</strong> {error || 'None'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
              {testLogs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                testLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>1. Enter your login credentials</p>
            <p>2. Click "Test Login" and watch the logs</p>
            <p>3. The logs will show each step of the authentication process</p>
            <p>4. Look for where the flow gets stuck or fails</p>
            <p>5. Check browser console for additional detailed logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}