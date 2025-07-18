"use client"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"

export default function DebugData() {
  const { profile } = useAuth()
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const results = await Promise.allSettled([
          supabase.from('users').select('*').limit(5),
          supabase.from('teams').select('*').limit(5),
          supabase.from('performances').select('*').limit(5),
          supabase.from('slots').select('*').limit(5),
          supabase.from('rosters').select('*').limit(5),
        ])

        setData({
          users: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason },
          teams: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason },
          performances: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason },
          slots: results[3].status === 'fulfilled' ? results[3].value : { error: results[3].reason },
          rosters: results[4].status === 'fulfilled' ? results[4].value : { error: results[4].reason },
        })
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  if (loading) {
    return <div className="p-8">Loading database data...</div>
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold">🗄️ Database Data Check</h1>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        <p><strong>Role:</strong> {profile?.role}</p>
        <p><strong>Email:</strong> {profile?.email}</p>
        <p><strong>ID:</strong> {profile?.id}</p>
      </div>

      {Object.entries(data).map(([table, result]: [string, any]) => (
        <div key={table} className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📋 {table.toUpperCase()} Table</h2>
          {result.error ? (
            <div className="text-red-600">
              <p><strong>Error:</strong> {result.error.message || JSON.stringify(result.error)}</p>
            </div>
          ) : (
            <div>
              <p><strong>Records Found:</strong> {result.data?.length || 0}</p>
              {result.data && result.data.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Sample Records:</h3>
                  <div className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}