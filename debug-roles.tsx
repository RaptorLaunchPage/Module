"use client"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"

export default function DebugRoles() {
  const { profile, user, loading } = useAuth()
  const [dbUsers, setDbUsers] = useState<any[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, role')
          .in('role', ['admin', 'manager'])
          .limit(10)
        
        if (error) {
          setDbError(error.message)
        } else {
          setDbUsers(data || [])
        }
      } catch (err: any) {
        setDbError(err.message)
      } finally {
        setDbLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold">🔍 Role Debug Information</h1>
      
      {/* Auth State */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🔐 Authentication State</h2>
        <div className="space-y-2">
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
          <p><strong>Profile:</strong> {profile ? 'Loaded' : 'Not loaded'}</p>
          <p><strong>Profile ID:</strong> {profile?.id || 'N/A'}</p>
          <p><strong>Profile Email:</strong> {profile?.email || 'N/A'}</p>
          <p><strong>Profile Name:</strong> {profile?.name || 'N/A'}</p>
          <p><strong>Profile Role:</strong> {profile?.role || 'N/A'}</p>
          <p><strong>Profile Role (lowercase):</strong> {profile?.role?.toLowerCase() || 'N/A'}</p>
          <p><strong>Profile Team ID:</strong> {profile?.team_id || 'N/A'}</p>
        </div>
      </div>

      {/* Role Checks */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🎭 Role Checks</h2>
        <div className="space-y-2">
          <p><strong>Is Admin:</strong> {profile?.role === "admin" ? 'Yes' : 'No'}</p>
          <p><strong>Is Manager:</strong> {profile?.role === "manager" ? 'Yes' : 'No'}</p>
          <p><strong>Is Admin (lowercase):</strong> {profile?.role?.toLowerCase() === "admin" ? 'Yes' : 'No'}</p>
          <p><strong>Is Manager (lowercase):</strong> {profile?.role?.toLowerCase() === "manager" ? 'Yes' : 'No'}</p>
          <p><strong>Is AdminOrManager:</strong> {profile?.role === "admin" || profile?.role === "manager" ? 'Yes' : 'No'}</p>
          <p><strong>Has Full Access (Performance):</strong> {profile?.role && ["admin", "manager", "analyst"].includes(profile.role.toLowerCase()) ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Menu Access */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📋 Menu Access</h2>
        <div className="space-y-2">
          {[
            { title: "Dashboard", roles: ["admin", "manager", "coach", "player", "analyst"] },
            { title: "User Management", roles: ["admin"] },
            { title: "Team Management", roles: ["admin", "manager", "coach"] },
            { title: "Performance", roles: ["admin", "manager", "coach", "player", "analyst"] },
            { title: "Performance Report", roles: ["admin", "manager", "coach", "player", "analyst"] },
          ].map(item => (
            <p key={item.title}>
              <strong>{item.title}:</strong> {profile?.role && item.roles.includes(profile.role.toLowerCase()) ? '✅ Has Access' : '❌ No Access'}
            </p>
          ))}
        </div>
      </div>

      {/* Database Users */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">💾 Database Admin/Manager Users</h2>
        {dbLoading ? (
          <p>Loading database users...</p>
        ) : dbError ? (
          <p className="text-red-600">Error: {dbError}</p>
        ) : dbUsers.length === 0 ? (
          <p className="text-yellow-600">No admin or manager users found in database</p>
        ) : (
          <div className="space-y-2">
            {dbUsers.map(user => (
              <div key={user.id} className="border p-2 rounded">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Is Current User:</strong> {user.id === profile?.id ? 'Yes' : 'No'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Data */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🔍 Raw Data</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">User Object:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold">Profile Object:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}