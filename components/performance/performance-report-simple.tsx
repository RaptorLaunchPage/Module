"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function PerformanceReportSimple() {
  console.log('🎯 PerformanceReportSimple rendering - TESTING React Hooks')
  
  try {
    const { profile } = useAuth()
    console.log('✅ useAuth hook called successfully')
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [testData, setTestData] = useState<string>('Initial state')
    
    console.log('✅ useState hooks initialized successfully')

    useEffect(() => {
      console.log('🚀 useEffect triggered')
      
      const testAsyncFunction = async () => {
        try {
          console.log('⏳ Starting async test...')
          setLoading(true)
          setError(null)
          
          // Simulate async work without database calls
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          setTestData('useEffect completed successfully!')
          console.log('✅ Async test completed')
        } catch (err) {
          console.error('❌ Error in async test:', err)
          setError(err instanceof Error ? err.message : String(err))
        } finally {
          setLoading(false)
          console.log('✅ Loading state set to false')
        }
      }
      
      testAsyncFunction()
    }, [profile?.id]) // Test dependency array
    
    console.log('✅ useEffect hook setup successfully')
    
    if (loading) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Report
              </CardTitle>
              <CardDescription>Testing React hooks - Loading...</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Testing useState and useEffect... ⏳
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    if (error) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">React Hooks Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">Error: {error}</p>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Report
            </CardTitle>
            <CardDescription>
              React hooks test completed - {profile ? `Logged in as ${profile.name || profile.email}` : 'Not logged in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-muted-foreground">
              React hooks work! 🎉
            </p>
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p><strong>Profile ID:</strong> {profile?.id || 'None'}</p>
              <p><strong>Role:</strong> {profile?.role || 'None'}</p>
              <p><strong>Test Data:</strong> {testData}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (err) {
    console.error('💥 Error in React hooks test:', err)
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Critical Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Error with React hooks: {err instanceof Error ? err.message : String(err)}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
}