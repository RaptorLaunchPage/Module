"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function PerformanceReportSimple() {
  console.log('🎯 PerformanceReportSimple rendering - TESTING Database Queries')
  
  try {
    const { profile } = useAuth()
    console.log('✅ useAuth hook called successfully')
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [testData, setTestData] = useState<string>('Initial state')
    const [dbResults, setDbResults] = useState<any>(null)
    
    console.log('✅ useState hooks initialized successfully')

    useEffect(() => {
      console.log('🚀 useEffect triggered')
      
      const testDatabaseQueries = async () => {
        try {
          console.log('⏳ Starting database query test...')
          setLoading(true)
          setError(null)
          
          if (!profile) {
            console.log('⏸️ No profile yet, skipping database queries')
            setTestData('Waiting for profile...')
            return
          }
          
          console.log('👤 Profile found:', profile.id, profile.role)
          
          // Test 1: Simple count query (safest)
          console.log('🔍 Testing: Simple count query on performances table')
          const { count, error: countError } = await supabase
            .from('performances')
            .select('*', { count: 'exact', head: true })
          
          if (countError) {
            throw new Error(`Count query failed: ${countError.message}`)
          }
          
          console.log('✅ Count query successful:', count, 'total performances')
          
          // Test 2: Simple select without joins
          console.log('🔍 Testing: Simple select on performances table')
          const { data: perfData, error: perfError } = await supabase
            .from('performances')
            .select('id, player_id, team_id, created_at')
            .limit(5)
          
          if (perfError) {
            throw new Error(`Simple select failed: ${perfError.message}`)
          }
          
          console.log('✅ Simple select successful:', perfData?.length, 'records')
          
          setDbResults({
            totalCount: count,
            sampleRecords: perfData?.length || 0,
            firstRecord: perfData?.[0] || null
          })
          
          setTestData('Basic database queries completed successfully!')
          console.log('✅ Database test completed')
        } catch (err) {
          console.error('❌ Error in database test:', err)
          setError(err instanceof Error ? err.message : String(err))
        } finally {
          setLoading(false)
          console.log('✅ Loading state set to false')
        }
      }
      
      testDatabaseQueries()
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
              <CardDescription>Testing database queries - Loading...</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Testing basic database queries... ⏳
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
              <CardTitle className="text-red-600">Database Query Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">Error: {error}</p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Profile ID:</strong> {profile?.id || 'None'}</p>
                <p><strong>Role:</strong> {profile?.role || 'None'}</p>
              </div>
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
              Database query test completed - {profile ? `Logged in as ${profile.name || profile.email}` : 'Not logged in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-muted-foreground">
              Basic database queries work! 🎉
            </p>
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p><strong>Profile ID:</strong> {profile?.id || 'None'}</p>
              <p><strong>Role:</strong> {profile?.role || 'None'}</p>
              <p><strong>Test Data:</strong> {testData}</p>
              <p><strong>Total Performances:</strong> {dbResults?.totalCount ?? 'Unknown'}</p>
              <p><strong>Sample Records:</strong> {dbResults?.sampleRecords ?? 'Unknown'}</p>
              <p><strong>First Record ID:</strong> {dbResults?.firstRecord?.id ?? 'None'}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (err) {
    console.error('💥 Error in database query test:', err)
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Critical Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Critical error with database queries: {err instanceof Error ? err.message : String(err)}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
}