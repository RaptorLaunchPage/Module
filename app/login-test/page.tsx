"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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