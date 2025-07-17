"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, User, Clock, Database, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function TestRefreshPage() {
  const { user, profile, loading, session } = useAuth()
  const [refreshCount, setRefreshCount] = useState(0)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [storageInfo, setStorageInfo] = useState<any>(null)
  const [refreshHistory, setRefreshHistory] = useState<any[]>([])

  useEffect(() => {
    // Track page loads and refreshes
    const loadTime = new Date().toLocaleTimeString()
    const currentCount = parseInt(localStorage.getItem('refresh-test-count') || '0') + 1
    
    setRefreshCount(currentCount)
    localStorage.setItem('refresh-test-count', currentCount.toString())

    // Log this refresh
    const refreshData = {
      count: currentCount,
      time: loadTime,
      hasUser: !!user,
      hasProfile: !!profile,
      loading,
      userEmail: user?.email,
      profileRole: profile?.role
    }

    const history = JSON.parse(localStorage.getItem('refresh-history') || '[]')
    history.push(refreshData)
    if (history.length > 10) history.shift() // Keep last 10
    localStorage.setItem('refresh-history', JSON.stringify(history))
    setRefreshHistory(history)

    console.log('🔄 Page refresh #' + currentCount, refreshData)
  }, [user, profile, loading])

  useEffect(() => {
    // Monitor session and storage
    const checkStorage = () => {
      const authData = localStorage.getItem('raptor-auth-token')
      const sessionData = localStorage.getItem('raptor-session-info')
      const activityData = localStorage.getItem('raptor-last-activity')
      
      setStorageInfo({
        authToken: authData ? 'Present' : 'Missing',
        sessionInfo: sessionData ? 'Present' : 'Missing', 
        lastActivity: activityData ? new Date(parseInt(activityData)).toLocaleTimeString() : 'None',
        authDataSize: authData ? authData.length : 0
      })
    }

    const getSessionInfo = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      setSessionInfo({
        hasSession: !!session,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString() : 'N/A',
        accessToken: session?.access_token ? 'Present' : 'Missing',
        refreshToken: session?.refresh_token ? 'Present' : 'Missing',
        error: error?.message
      })
    }

    checkStorage()
    getSessionInfo()

    // Update every second
    const interval = setInterval(() => {
      checkStorage()
      getSessionInfo()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const forceRefresh = () => {
    window.location.reload()
  }

  const clearRefreshData = () => {
    localStorage.removeItem('refresh-test-count')
    localStorage.removeItem('refresh-history')
    setRefreshCount(0)
    setRefreshHistory([])
  }

  const testSessionPersistence = async () => {
    console.log('🧪 Testing session persistence...')
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Current session:', { session, error })
    
    // Test storage
    const authData = localStorage.getItem('raptor-auth-token')
    console.log('Auth storage:', authData ? 'Present' : 'Missing')
    
    // Force a token refresh
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    console.log('Refresh result:', { data, refreshError })
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Session Refresh Test
            </CardTitle>
            <CardDescription>
              Monitor authentication state during page refreshes to diagnose logout issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                Refresh Count: {refreshCount}
              </Badge>
              <Button onClick={forceRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Refresh
              </Button>
              <Button onClick={clearRefreshData} variant="outline" size="sm">
                Clear Data
              </Button>
              <Button onClick={testSessionPersistence} variant="outline" size="sm">
                Test Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Auth State */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Current Auth State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {loading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : user ? (
                  <Badge variant="default" className="bg-green-600">Authenticated</Badge>
                ) : (
                  <Badge variant="destructive">Not Authenticated</Badge>
                )}
              </div>
              
              <div className="text-sm space-y-1">
                <div>User: {user?.email || 'None'}</div>
                <div>Profile: {profile ? `${profile.first_name} ${profile.last_name}` : 'None'}</div>
                <div>Role: {profile?.role || 'None'}</div>
                <div>Loading: {loading ? 'Yes' : 'No'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Session Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessionInfo && (
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    {sessionInfo.hasSession ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    Session: {sessionInfo.hasSession ? 'Active' : 'None'}
                  </div>
                  <div>Email: {sessionInfo.userEmail || 'None'}</div>
                  <div>Expires: {sessionInfo.expiresAt}</div>
                  <div>Access Token: {sessionInfo.accessToken}</div>
                  <div>Refresh Token: {sessionInfo.refreshToken}</div>
                  {sessionInfo.error && (
                    <div className="text-red-600">Error: {sessionInfo.error}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Storage Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Browser Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storageInfo && (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div>Auth Token: {storageInfo.authToken}</div>
                  <div>Session Info: {storageInfo.sessionInfo}</div>
                </div>
                <div>
                  <div>Last Activity: {storageInfo.lastActivity}</div>
                  <div>Auth Data Size: {storageInfo.authDataSize} chars</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refresh History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Refresh History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {refreshHistory.reverse().map((refresh, index) => (
                <div 
                  key={index} 
                  className={`p-2 border rounded text-sm ${
                    refresh.hasUser ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>#{refresh.count} - {refresh.time}</div>
                    <div className="flex items-center gap-2">
                      {refresh.hasUser ? (
                        <Badge variant="default" className="bg-green-600">Logged In</Badge>
                      ) : (
                        <Badge variant="destructive">Logged Out</Badge>
                      )}
                      {refresh.loading && <Badge variant="secondary">Loading</Badge>}
                    </div>
                  </div>
                  {refresh.userEmail && (
                    <div className="text-xs text-gray-600 mt-1">
                      {refresh.userEmail} - {refresh.profileRole}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>Expected:</strong> User should remain logged in after page refresh</p>
              <p>• <strong>Problem:</strong> If user shows as "Logged Out" after refresh, session persistence is broken</p>
              <p>• <strong>Test:</strong> Refresh this page multiple times and check the history</p>
              <p>• <strong>Storage:</strong> Auth tokens should persist in localStorage</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}