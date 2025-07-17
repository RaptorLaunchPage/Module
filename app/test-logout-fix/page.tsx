"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogOut, CheckCircle, Home } from "lucide-react"
import Link from "next/link"

export default function TestLogoutFixPage() {
  const { user, profile, loading, signOut } = useAuth()

  const testLogout = async () => {
    console.log('🧪 Testing logout fix - should go directly to homepage without any redirecting screens')
    try {
      await signOut()
      console.log('✅ Logout initiated')
    } catch (err) {
      console.error('❌ Logout test failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Logout Fix Test
            </CardTitle>
            <CardDescription>
              Test the logout redirect fix - should go directly to homepage without getting stuck
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Current Auth State */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Current State</h3>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : user ? (
                  <Badge variant="default" className="bg-green-600">Logged In</Badge>
                ) : (
                  <Badge variant="outline">Not Logged In</Badge>
                )}
              </div>
              
              {user && (
                <div className="text-sm text-muted-foreground">
                  <div>User: {user.email}</div>
                  <div>Profile: {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}</div>
                </div>
              )}
            </div>

            {/* Test Button */}
            <div className="space-y-3">
              <Button 
                onClick={testLogout} 
                disabled={!user}
                variant="destructive" 
                className="w-full"
                size="lg"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Test Logout (Should Go to Homepage)
              </Button>

              <div className="text-xs text-muted-foreground p-3 bg-slate-100 rounded border">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Expected Result:</strong>
                    <ul className="mt-1 ml-2 space-y-1">
                      <li>• Click logout button</li>
                      <li>• Should immediately redirect to homepage</li>
                      <li>• Should NOT show "Redirecting to login..." screen</li>
                      <li>• Should NOT get stuck on any loading screen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {!user && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                <h3 className="font-medium">Not Logged In</h3>
                <p className="text-sm text-muted-foreground">
                  You need to be logged in to test the logout functionality.
                </p>
                <div className="pt-2">
                  <Link href="/auth/login">
                    <Button size="sm">Login to Test</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}