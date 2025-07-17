"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { LogOut, User, AlertCircle } from "lucide-react"

export default function TestLogoutPage() {
  const { user, profile, loading, error, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    console.log('🔄 Testing logout...')
    try {
      await signOut()
      console.log('✅ Logout completed, should redirect to login')
    } catch (err) {
      console.error('❌ Logout failed:', err)
    }
  }

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Logout Test
          </CardTitle>
          <CardDescription>
            Test logout functionality to ensure it redirects properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>User: {user ? user.email : 'Not logged in'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Profile: {profile ? `${profile.first_name} ${profile.last_name}` : 'No profile'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Loading: {loading ? 'Yes' : 'No'}</span>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Error: {error}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleLogout} 
              disabled={!user}
              variant="destructive" 
              className="w-full"
            >
              Test Logout
            </Button>
            <Button 
              onClick={goToDashboard} 
              variant="outline" 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Click "Test Logout" to test logout flow</p>
            <p>• Should immediately redirect to login page</p>
            <p>• Should NOT show "Setting up profile" screen</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}