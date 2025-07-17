"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { LogOut, RefreshCw, Home, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function TestFixesPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()

  const testLogout = async () => {
    console.log('🧪 Testing logout functionality...')
    try {
      await signOut()
      console.log('✅ Logout test completed')
    } catch (err) {
      console.error('❌ Logout test failed:', err)
    }
  }

  const forceRefresh = () => {
    console.log('🧪 Testing page refresh...')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Fix Verification Tests
            </CardTitle>
            <CardDescription>
              Test all the fixes for logout, navigation, and loading issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Current Auth State */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Current Auth State</h3>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : user ? (
                  <Badge variant="default" className="bg-green-600">Authenticated</Badge>
                ) : (
                  <Badge variant="outline">Not Authenticated</Badge>
                )}
              </div>
              
              {user && (
                <div className="text-sm text-muted-foreground">
                  <div>User: {user.email}</div>
                  <div>Profile: {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}</div>
                  <div>Role: {profile?.role || 'N/A'}</div>
                </div>
              )}
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                onClick={testLogout} 
                disabled={!user}
                variant="destructive" 
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Test Logout
              </Button>
              
              <Button 
                onClick={forceRefresh} 
                variant="outline" 
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Refresh
              </Button>

              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>

            {/* Navigation Tests */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Navigation Tests</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/auth/login">
                  <Button variant="outline" size="sm" className="w-full">
                    Login Page
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="outline" size="sm" className="w-full">
                    Signup Page
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                ✅ Both login and signup pages should have "Home" button in top-left corner
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expected Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expected Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span><strong>Logout Test:</strong> Should immediately redirect to homepage (no stuck screen)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span><strong>Refresh Test:</strong> Should maintain auth state, no stuck loading</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span><strong>Navigation:</strong> Login/Signup pages should have visible "Home" button</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span><strong>Homepage:</strong> Signup button should be visible (dark bg, white text)</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
              <Link href="/debug-auth">
                <Button variant="outline" size="sm">Debug Auth</Button>
              </Link>
              <Link href="/test-refresh">
                <Button variant="outline" size="sm">Test Refresh</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}