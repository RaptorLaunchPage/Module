"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestDbPage() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    console.log(message)
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setResults([])
  }

  const testBasicConnection = async () => {
    setLoading(true)
    addResult("🧪 Testing basic Supabase connection...")
    
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      if (error) {
        addResult(`❌ Basic connection failed: ${error.message}`)
      } else {
        addResult(`✅ Basic connection successful`)
      }
    } catch (err: any) {
      addResult(`❌ Connection exception: ${err.message}`)
    }
    setLoading(false)
  }

  const testAuthUser = async () => {
    setLoading(true)
    addResult("🔐 Testing current auth user...")
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        addResult(`❌ Auth user error: ${error.message}`)
      } else if (user) {
        addResult(`✅ Auth user found: ${user.email} (ID: ${user.id})`)
      } else {
        addResult(`❌ No authenticated user`)
      }
    } catch (err: any) {
      addResult(`❌ Auth exception: ${err.message}`)
    }
    setLoading(false)
  }

  const testUserQuery = async () => {
    setLoading(true)
    addResult("🔍 Testing user profile query...")
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addResult(`❌ No authenticated user for query`)
        setLoading(false)
        return
      }
      
      addResult(`🔍 Querying for user ID: ${user.id}`)
      
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      const endTime = Date.now()
      
      addResult(`🔍 Query completed in ${endTime - startTime}ms`)
      
      if (error) {
        addResult(`❌ Query error: ${error.message}`)
        addResult(`❌ Error code: ${error.code}`)
        addResult(`❌ Error details: ${error.details || 'None'}`)
        addResult(`❌ Error hint: ${error.hint || 'None'}`)
      } else if (data) {
        addResult(`✅ Profile found: ${data.name} (${data.role})`)
      } else {
        addResult(`ℹ️ No profile found for user`)
      }
    } catch (err: any) {
      addResult(`❌ Query exception: ${err.message}`)
    }
    setLoading(false)
  }

  const testPublicQuery = async () => {
    setLoading(true)
    addResult("🌐 Testing public table query (if any)...")
    
    try {
      // Try to query a potentially public table or view
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (error) {
        addResult(`❌ Public query error: ${error.message}`)
        addResult(`❌ This suggests RLS policies are blocking access`)
      } else {
        addResult(`✅ Public query successful`)
      }
    } catch (err: any) {
      addResult(`❌ Public query exception: ${err.message}`)
    }
    setLoading(false)
  }

  const testWithTimeout = async () => {
    setLoading(true)
    addResult("⏱️ Testing query with 5-second timeout...")
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addResult(`❌ No authenticated user`)
        setLoading(false)
        return
      }
      
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
      )
      
      const result = await Promise.race([queryPromise, timeoutPromise])
      addResult(`✅ Query completed successfully`)
      
    } catch (err: any) {
      if (err.message.includes('timeout')) {
        addResult(`❌ Query timed out - this indicates a database connectivity issue`)
      } else {
        addResult(`❌ Query error: ${err.message}`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">🧪 Database Connection Test</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testBasicConnection} disabled={loading} className="w-full">
              Test Basic Connection
            </Button>
            <Button onClick={testAuthUser} disabled={loading} className="w-full">
              Test Auth User
            </Button>
            <Button onClick={testUserQuery} disabled={loading} className="w-full">
              Test User Query
            </Button>
            <Button onClick={testPublicQuery} disabled={loading} className="w-full">
              Test Public Query
            </Button>
            <Button onClick={testWithTimeout} disabled={loading} className="w-full">
              Test With Timeout
            </Button>
            <Button onClick={clearResults} variant="outline" className="w-full">
              Clear Results
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-gray-500">No results yet...</div>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="mb-1">{result}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>If basic connection fails:</strong> Check environment variables and Supabase project status</p>
            <p><strong>If auth user fails:</strong> Login first at /auth/login</p>
            <p><strong>If user query fails with permission error:</strong> Check RLS policies on users table</p>
            <p><strong>If query times out:</strong> Check database connectivity and performance</p>
            <p><strong>If all tests pass:</strong> The issue is in the auth hook logic</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}