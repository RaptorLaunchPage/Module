"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, DollarSign } from "lucide-react"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

export default function FinancePage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [winnings, setWinnings] = useState<any[]>([])

  const userRole = profile?.role as UserRole
  const financePermissions = DashboardPermissions.getDataPermissions(userRole, 'finance')

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev, `${timestamp}: ${message}`])
  }

  const testDatabaseConnection = async () => {
    addDebugInfo("Testing database connection...")
    
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .limit(1)

      if (error) {
        addDebugInfo(`Database error: ${error.message}`)
        return false
      }
      
      addDebugInfo(`Database connection successful. Found ${data?.length || 0} teams`)
      return true
    } catch (error: any) {
      addDebugInfo(`Database connection failed: ${error.message}`)
      return false
    }
  }

  const fetchSimpleData = async () => {
    addDebugInfo("Starting simple data fetch...")
    setLoading(true)
    setError(null)

    try {
      // Test database connection first
      const connectionOk = await testDatabaseConnection()
      if (!connectionOk) {
        throw new Error("Database connection failed")
      }

      // Fetch teams
      addDebugInfo("Fetching teams...")
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .limit(10)

      if (teamsError) {
        addDebugInfo(`Teams error: ${teamsError.message}`)
      } else {
        addDebugInfo(`Teams fetched: ${teamsData?.length || 0} records`)
        setTeams(teamsData || [])
      }

      // Try to fetch expenses
      addDebugInfo("Fetching expenses...")
      const { data: expensesData, error: expensesError } = await supabase
        .from("slot_expenses")
        .select("*")
        .limit(10)

      if (expensesError) {
        addDebugInfo(`Expenses error: ${expensesError.message}`)
      } else {
        addDebugInfo(`Expenses fetched: ${expensesData?.length || 0} records`)
        setExpenses(expensesData || [])
      }

      // Try to fetch winnings
      addDebugInfo("Fetching winnings...")
      const { data: winningsData, error: winningsError } = await supabase
        .from("winnings")
        .select("*")
        .limit(10)

      if (winningsError) {
        addDebugInfo(`Winnings error: ${winningsError.message}`)
      } else {
        addDebugInfo(`Winnings fetched: ${winningsData?.length || 0} records`)
        setWinnings(winningsData || [])
      }

      addDebugInfo("Data fetch completed successfully!")

    } catch (error: any) {
      addDebugInfo(`Fatal error: ${error.message}`)
      setError(error.message)
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      addDebugInfo("Setting loading to false...")
      setLoading(false)
    }
  }

  useEffect(() => {
    addDebugInfo("Component mounted, checking profile...")
    
    if (profile) {
      addDebugInfo(`Profile found: ${profile.role}`)
      
      if (financePermissions.canView) {
        addDebugInfo("Finance permissions granted, starting data fetch")
        fetchSimpleData()
      } else {
        addDebugInfo("Finance permissions denied")
        setError(`Access denied: ${profile.role} role cannot access finance module. Required: admin or manager role.`)
        setLoading(false)
      }
    } else {
      addDebugInfo("No profile found, waiting...")
      
      // Set timeout for profile loading
      const profileTimeout = setTimeout(() => {
        if (!profile) {
          addDebugInfo("Profile loading timeout!")
          setError('Profile loading timeout. Please refresh the page.')
          setLoading(false)
        }
      }, 10000)
      
      return () => clearTimeout(profileTimeout)
    }
  }, [profile, financePermissions])

  const handleRefresh = () => {
    setDebugInfo([])
    addDebugInfo("Manual refresh triggered")
    fetchSimpleData()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Profile</h3>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!financePermissions.canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <DollarSign className="h-16 w-16 text-red-500 mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access financial data.</p>
            <p className="text-sm text-gray-500 mt-2">Current role: {profile?.role}</p>
            <p className="text-xs text-gray-400">Required: admin or manager role</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finance Management - Debug Mode</h1>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <div>
              <h3 className="text-lg font-semibold">Loading Finance Data</h3>
              <p className="text-gray-600">Fetching financial information...</p>
            </div>
          </div>
        </div>

        {/* Debug Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Real-time loading progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {info}
                </div>
              ))}
              {debugInfo.length === 0 && (
                <div className="text-sm text-gray-500">Waiting for debug information...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finance Management - Debug Mode</h1>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <DollarSign className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Failed to Load Financial Data</h3>
                <p className="text-gray-600 mt-2">{error}</p>
                <Button onClick={handleRefresh} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Error diagnosis details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {info}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance Management - Debug Mode</h1>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success State - Show Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{teams.length}</p>
            <p className="text-sm text-gray-600">Teams available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expenses.length}</p>
            <p className="text-sm text-gray-600">Expense records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Winnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{winnings.length}</p>
            <p className="text-sm text-gray-600">Winning records</p>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>Loading process details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 p-4 rounded max-h-60 overflow-y-auto">
            {debugInfo.map((info, index) => (
              <div key={index} className="text-sm font-mono mb-1 text-green-800">
                {info}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Raw Data Display */}
      {teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teams Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(teams.slice(0, 3), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(expenses.slice(0, 3), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {winnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Winnings Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(winnings.slice(0, 3), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}