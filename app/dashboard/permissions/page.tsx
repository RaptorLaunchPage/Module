"use client"

import { useEffect, useState } from 'react'

interface Permission {
  id: number
  role: string
  module: string
  can_access: boolean
}

const roles = ['admin', 'manager', 'coach', 'player', 'analyst']
const modules = ['team_management', 'user_management', 'performance', 'profile']

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exception, setException] = useState<any>(null)

  useEffect(() => {
    try {
      fetch('/api/permissions')
        .then(res => res.json())
        .then(data => {
          if (!data.permissions) {
            setError('API did not return permissions array. Raw response: ' + JSON.stringify(data))
            setLoading(false)
            return
          }
          setPermissions(data.permissions)
          setLoading(false)
        })
        .catch(err => {
          setError('Failed to load permissions: ' + err.message)
          setLoading(false)
        })
    } catch (e) {
      setException(e)
      setLoading(false)
    }
  }, [])

  const handleToggle = (role: string, module: string) => {
    setPermissions(perms =>
      perms.map(p =>
        p.role === role && p.module === module
          ? { ...p, can_access: !p.can_access }
          : p
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const perm of permissions) {
        await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: perm.role, module: perm.module, can_access: perm.can_access })
        })
      }
    } catch (e) {
      if (e instanceof Error) {
        setError('Failed to save changes: ' + e.message)
      } else {
        setError('Failed to save changes: ' + String(e))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading permissions...</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (exception) return <div className="text-red-500">Exception: {exception?.message || JSON.stringify(exception)}</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Module Permissions Management</h1>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Module</th>
            {roles.map(role => (
              <th key={role} className="border px-2 py-1">{role}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map(module => (
            <tr key={module}>
              <td className="border px-2 py-1">{module}</td>
              {roles.map(role => {
                const perm = permissions.find(p => p.role === role && p.module === module)
                return (
                  <td key={role} className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={perm?.can_access || false}
                      onChange={() => handleToggle(role, module)}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {exception && <div className="text-red-500 mt-2">Exception: {exception?.message || JSON.stringify(exception)}</div>}
    </div>
  )
}