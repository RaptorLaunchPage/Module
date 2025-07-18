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
          
          // Test 3: Query other tables individually
          console.log('🔍 Testing: Simple query on users table')
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, role')
            .limit(5)
          
          if (usersError) {
            console.warn('⚠️ Users query failed:', usersError.message)
          } else {
            console.log('✅ Users query successful:', usersData?.length, 'records')
          }
          
          // Test 4: Query teams table
          console.log('🔍 Testing: Simple query on teams table')
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, name')
            .limit(5)
          
          if (teamsError) {
            console.warn('⚠️ Teams query failed:', teamsError.message)
          } else {
            console.log('✅ Teams query successful:', teamsData?.length, 'records')
          }
          
          // Test 5: Query slots table
          console.log('🔍 Testing: Simple query on slots table')
          const { data: slotsData, error: slotsError } = await supabase
            .from('slots')
            .select('id, time_range, date')
            .limit(5)
          
          if (slotsError) {
            console.warn('⚠️ Slots query failed:', slotsError.message)
          } else {
            console.log('✅ Slots query successful:', slotsData?.length, 'records')
          }
          
          // Test 6: Try simple joins (this is likely where the crash happens)
          console.log('🔍 Testing: Simple join - performances with users')
          
          // Method 1: Manual join using separate queries (safe approach)
          let joinResults: { method1: number; method2: number; method3: number } = { method1: 0, method2: 0, method3: 0 }
          
          try {
            // Get performances with player_id
            const { data: perfWithPlayers, error: joinError1 } = await supabase
              .from('performances')
              .select('id, player_id, team_id, created_at')
              .limit(3)
            
            if (joinError1) {
              console.warn('⚠️ Performances for join failed:', joinError1.message)
            } else {
              console.log('✅ Performances for join successful:', perfWithPlayers?.length, 'records')
              joinResults.method1 = perfWithPlayers?.length || 0
            }
          } catch (err) {
            console.error('❌ Method 1 (manual join) failed:', err)
          }
          
          // Test 7: Try PostgreSQL-style join (might work)
          try {
            console.log('🔍 Testing: PostgreSQL-style join with users table')
            const { data: pgJoinData, error: pgJoinError } = await supabase
              .from('performances')
              .select(`
                id,
                player_id,
                users!player_id (
                  id,
                  name
                )
              `)
              .limit(2)
            
            if (pgJoinError) {
              console.warn('⚠️ PostgreSQL join failed:', pgJoinError.message)
            } else {
              console.log('✅ PostgreSQL join successful:', pgJoinData?.length, 'records')
              joinResults.method2 = pgJoinData?.length || 0
            }
          } catch (err) {
            console.error('❌ Method 2 (PostgreSQL join) failed:', err)
          }
          
          // Test 8: Try the broken foreign key syntax that was causing crashes
          try {
            console.log('🔍 Testing: The broken foreign key syntax (expect this to fail)')
            const { data: brokenJoinData, error: brokenJoinError } = await supabase
              .from('performances')
              .select(`
                *,
                slots!performances_slot_fkey(organizer)
              `)
              .limit(1)
            
            if (brokenJoinError) {
              console.warn('⚠️ Broken join failed as expected:', brokenJoinError.message)
            } else {
              console.log('✅ Broken join somehow worked:', brokenJoinData?.length, 'records')
              joinResults.method3 = brokenJoinData?.length || 0
            }
          } catch (err) {
            console.error('❌ Method 3 (broken join) failed as expected:', err)
          }
          
          setDbResults({
            totalCount: count,
            sampleRecords: perfData?.length || 0,
            firstRecord: perfData?.[0] || null,
            usersCount: usersData?.length || 0,
            teamsCount: teamsData?.length || 0,
            slotsCount: slotsData?.length || 0,
            joinTests: joinResults
          })
          
          setTestData('Join queries testing completed!')
          console.log('✅ Join testing completed')
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
              Join query testing completed! 🔍
            </p>
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p><strong>Profile ID:</strong> {profile?.id || 'None'}</p>
              <p><strong>Role:</strong> {profile?.role || 'None'}</p>
              <p><strong>Test Data:</strong> {testData}</p>
              <p><strong>Total Performances:</strong> {dbResults?.totalCount ?? 'Unknown'}</p>
              <p><strong>Sample Records:</strong> {dbResults?.sampleRecords ?? 'Unknown'}</p>
              <p><strong>First Record ID:</strong> {dbResults?.firstRecord?.id ?? 'None'}</p>
              <p><strong>Users Found:</strong> {dbResults?.usersCount ?? 'Unknown'}</p>
              <p><strong>Teams Found:</strong> {dbResults?.teamsCount ?? 'Unknown'}</p>
              <p><strong>Slots Found:</strong> {dbResults?.slotsCount ?? 'Unknown'}</p>
              <p><strong>Manual Join:</strong> {dbResults?.joinTests?.method1 ?? 'Unknown'}</p>
              <p><strong>PostgreSQL Join:</strong> {dbResults?.joinTests?.method2 ?? 'Unknown'}</p>
              <p><strong>Broken Join:</strong> {dbResults?.joinTests?.method3 ?? 'Unknown'}</p>
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