"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"

interface TestResult {
  name: string
  status: 'success' | 'error' | 'loading' | 'pending'
  message: string
  details?: any
}

export default function DebugPage() {
  const { profile, getToken } = useAuth()
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Authentication', status: 'pending', message: 'Not tested' },
    { name: 'Teams API', status: 'pending', message: 'Not tested' },
    { name: 'Users API', status: 'pending', message: 'Not tested' },
    { name: 'User Role Update', status: 'pending', message: 'Not tested' },
    { name: 'Performances API', status: 'pending', message: 'Not tested' },
    { name: 'Discord Portal APIs', status: 'pending', message: 'Not tested' }
  ])

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, details } : test
    ))
  }

  const testAuth = async () => {
    updateTest('Authentication', 'loading', 'Testing...')
    try {
      if (!profile) {
        updateTest('Authentication', 'error', 'No profile found')
        return
      }
      
      const token = await getToken()
      if (!token) {
        updateTest('Authentication', 'error', 'No auth token available')
        return
      }

      updateTest('Authentication', 'success', `Authenticated as ${profile.name} (${profile.role})`, {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        teamId: profile.team_id
      })
    } catch (error: any) {
      updateTest('Authentication', 'error', error.message)
    }
  }

  const testAPI = async (endpoint: string, testName: string) => {
    updateTest(testName, 'loading', 'Testing...')
    try {
      const token = await getToken()
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      if (response.ok) {
        updateTest(testName, 'success', `${response.status} - ${Array.isArray(responseData) ? responseData.length : 'OK'} items`, {
          status: response.status,
          data: Array.isArray(responseData) ? responseData.slice(0, 3) : responseData
        })
      } else {
        updateTest(testName, 'error', `${response.status} - ${responseText}`, {
          status: response.status,
          error: responseData
        })
      }
    } catch (error: any) {
      updateTest(testName, 'error', error.message)
    }
  }

  const testUserRoleUpdate = async () => {
    updateTest('User Role Update', 'loading', 'Testing role update...')
    try {
      const token = await getToken()
      if (!token) {
        updateTest('User Role Update', 'error', 'No auth token')
        return
      }

      // Test with current user - safe test using same role
      const updateResponse = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: profile?.id,
          role: profile?.role, // Same role, safe test
          team_id: profile?.team_id
        })
      })

      const updateResult = await updateResponse.json()

      if (!updateResponse.ok) {
        updateTest('User Role Update', 'error', `Role update failed: ${updateResult.error}`, {
          statusCode: updateResponse.status,
          errorDetails: updateResult
        })
        return
      }

      updateTest('User Role Update', 'success', `Role update successful!`, {
        result: updateResult
      })
    } catch (error: any) {
      updateTest('User Role Update', 'error', `Test failed: ${error.message}`, {
        error: error.toString()
      })
    }
  }

  const runAllTests = async () => {
    await testAuth()
    await testAPI('/api/teams', 'Teams API')
    await testAPI('/api/users', 'Users API')
    await testUserRoleUpdate()
    await testAPI('/api/performances', 'Performances API')
    await testAPI('/api/discord-portal/webhooks', 'Discord Portal APIs')
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case 'loading':
        return <Badge className="bg-blue-100 text-blue-800">Testing...</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Debug Dashboard</h1>
          <p className="text-muted-foreground">
            Test API connectivity and troubleshoot data loading issues
          </p>
        </div>
        <Button onClick={runAllTests}>
          Run All Tests
        </Button>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>NEXT_PUBLIC_SUPABASE_URL:</span>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
            </code>
          </div>
          <div className="flex justify-between">
            <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>API Tests</CardTitle>
          <CardDescription>
            Test each API endpoint to identify issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => (
            <div key={test.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <h3 className="font-medium">{test.name}</h3>
                  <p className="text-sm text-muted-foreground">{test.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(test.status)}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (test.name === 'Authentication') {
                      testAuth()
                    } else if (test.name === 'Teams API') {
                      testAPI('/api/teams', 'Teams API')
                    } else if (test.name === 'Users API') {
                      testAPI('/api/users', 'Users API')
                    } else if (test.name === 'Performances API') {
                      testAPI('/api/performances', 'Performances API')
                    } else if (test.name === 'Discord Portal APIs') {
                      testAPI('/api/discord-portal/webhooks', 'Discord Portal APIs')
                    }
                  }}
                >
                  Test
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {tests.some(test => test.details) && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-white/10 backdrop-blur-md border-white/20 p-4 rounded overflow-auto text-white/90">
              {JSON.stringify(
                tests.filter(test => test.details).reduce((acc, test) => {
                  acc[test.name] = test.details
                  return acc
                }, {} as any),
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}