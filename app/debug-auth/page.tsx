"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugAuthPage() {
  const { session, user, profile, loading, error } = useAuth()

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Authentication Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Auth State</CardTitle>
          <CardDescription>Current authentication state values</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Loading:</strong> {loading ? "true" : "false"}
          </div>
          <div>
            <strong>Session:</strong> {session ? "✅ Present" : "❌ None"}
          </div>
          <div>
            <strong>User:</strong> {user ? `✅ ${user.email}` : "❌ None"}
          </div>
          <div>
            <strong>Profile:</strong> {profile ? `✅ ${profile.role}` : "❌ None"}
          </div>
          <div>
            <strong>Error:</strong> {error || "None"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {session ? JSON.stringify(session, null, 2) : "No session"}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {profile ? JSON.stringify(profile, null, 2) : "No profile"}
          </pre>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => window.location.href = '/auth/login'}>
          Go to Login
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    </div>
  )
}