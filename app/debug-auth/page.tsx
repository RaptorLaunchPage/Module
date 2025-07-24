"use client"

import { useAuthV2 } from "@/hooks/use-auth-v2"

export default function DebugAuthPage() {
  const authState = useAuthV2()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Auth State:</h2>
        <pre className="text-sm">
          {JSON.stringify({
            isAuthenticated: authState.isAuthenticated,
            isInitialized: authState.isInitialized,
            isLoading: authState.isLoading,
            hasUser: !!authState.user,
            hasProfile: !!authState.profile,
            userRole: authState.user?.role,
            error: authState.error
          }, null, 2)}
        </pre>
      </div>
      {authState.error && (
        <div className="mt-4 p-4 bg-red-100 rounded">
          <h3 className="text-lg font-semibold text-red-800">Error:</h3>
          <p className="text-red-700">{authState.error}</p>
        </div>
      )}
    </div>
  )
}