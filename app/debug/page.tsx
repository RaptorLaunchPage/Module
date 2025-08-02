"use client"

import { useState, useEffect } from 'react'
import { useAuthV2 } from '@/hooks/use-auth-v2'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function DebugPage() {
  const { user, profile, isLoading, isAuthenticated, agreementStatus, signInWithDiscord } = useAuthV2()
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    // Get current path
    setCurrentPath(window.location.pathname)

    // Add initial debug log
    addDebugLog('🔍 Debug page loaded')
    addDebugLog(`📍 Current path: ${window.location.pathname}`)

    // Listen for auth state changes and Discord OAuth debug info
    const interval = setInterval(() => {
      addDebugLog(`🔄 Auth state check - Authenticated: ${isAuthenticated}, Loading: ${isLoading}`)
      
      // Check for Discord OAuth debug info
      if (typeof window !== 'undefined' && (window as any).discordOAuthDebug) {
        const debug = (window as any).discordOAuthDebug
        addDebugLog(`🎯 Discord OAuth Debug: ${JSON.stringify(debug, null, 2)}`)
        // Clear the debug info after logging it
        delete (window as any).discordOAuthDebug
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isAuthenticated, isLoading])

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]) // Keep last 20 logs
  }

  const handleDiscordLogin = async () => {
    addDebugLog('🚀 Starting Discord OAuth...')
    try {
      await signInWithDiscord()
      addDebugLog('✅ Discord OAuth initiated')
    } catch (error) {
      addDebugLog(`❌ Discord OAuth error: ${error}`)
    }
  }

  const clearLogs = () => {
    setDebugLogs([])
    addDebugLog('🧹 Logs cleared')
  }

  const copyLogs = () => {
    const logText = debugLogs.join('\n')
    navigator.clipboard.writeText(logText)
    addDebugLog('📋 Logs copied to clipboard')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-400 mb-2">🔧 Auth Debug Page</h1>
          <p className="text-gray-300">Real-time authentication state and redirect debugging</p>
        </div>

        {/* Current State */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-green-400">📊 Current Auth State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Badge variant={isAuthenticated ? "default" : "secondary"} className="mb-2">
                  {isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}
                </Badge>
                <p className="text-sm text-gray-300">Authentication Status</p>
              </div>
              <div>
                <Badge variant={isLoading ? "default" : "secondary"} className="mb-2">
                  {isLoading ? "⏳ Loading" : "✅ Ready"}
                </Badge>
                <p className="text-sm text-gray-300">Loading State</p>
              </div>
            </div>
            
            <Separator className="bg-gray-600" />
            
            <div className="space-y-2">
              <p className="text-sm"><strong>Current Path:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{currentPath}</code></p>
              <p className="text-sm"><strong>User ID:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{user?.id || 'None'}</code></p>
              <p className="text-sm"><strong>User Email:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{user?.email || 'None'}</code></p>
              <p className="text-sm"><strong>User Role:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{user?.role || 'None'}</code></p>
              <p className="text-sm"><strong>Profile ID:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{profile?.id || 'None'}</code></p>
              <p className="text-sm"><strong>Profile Role:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{profile?.role || 'None'}</code></p>
              <p className="text-sm"><strong>Agreement Required:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{agreementStatus?.requiresAgreement ? 'Yes' : 'No'}</code></p>
              <p className="text-sm"><strong>Agreement Status:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{agreementStatus?.status || 'None'}</code></p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400">🎮 Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={handleDiscordLogin}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                🔗 Test Discord OAuth
              </Button>
              <Button 
                onClick={clearLogs}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                🧹 Clear Logs
              </Button>
              <Button 
                onClick={copyLogs}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                📋 Copy Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Logs */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-yellow-400">📝 Debug Logs</CardTitle>
            <CardDescription className="text-gray-300">
              Real-time logs showing auth state changes and redirect attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {debugLogs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Try the Discord OAuth to see what happens!</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="text-green-300 mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-purple-400">📋 How to Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-300">
            <p>1. <strong>Click "Test Discord OAuth"</strong> to start the authentication flow</p>
            <p>2. <strong>Watch the logs</strong> to see what happens during the process</p>
            <p>3. <strong>Check the auth state</strong> to see if authentication succeeds</p>
            <p>4. <strong>Look for redirect attempts</strong> in the logs</p>
            <p>5. <strong>Copy the logs</strong> and share them if you need help</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}