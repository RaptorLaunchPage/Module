"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TestAuthPage() {
  const [email, setEmail] = useState("test@example.com")
  const [password, setPassword] = useState("test123456")
  const [name, setName] = useState("Test User")
  const { signIn, signUp, signOut, user, profile, loading, error } = useAuth()

  const handleSignUp = async () => {
    console.log('Testing sign up...')
    const result = await signUp(email, password, name)
    console.log('Sign up result:', result)
  }

  const handleSignIn = async () => {
    console.log('Testing sign in...')
    const result = await signIn(email, password)
    console.log('Sign in result:', result)
  }

  const handleSignOut = async () => {
    console.log('Testing sign out...')
    await signOut()
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Authentication Test</h1>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth State */}
          <Card>
            <CardHeader>
              <CardTitle>Current State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
              <div><strong>User:</strong> {user ? user.email : 'None'}</div>
              <div><strong>Profile:</strong> {profile ? `${profile.name} (${profile.role})` : 'None'}</div>
              <div><strong>Error:</strong> {error || 'None'}</div>
            </CardContent>
          </Card>

          {/* Auth Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
              <CardDescription>Test authentication functions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Button onClick={handleSignUp} disabled={loading} className="w-full">
                  Test Sign Up
                </Button>
                <Button onClick={handleSignIn} disabled={loading} className="w-full">
                  Test Sign In
                </Button>
                <Button onClick={handleSignOut} disabled={loading} variant="outline" className="w-full">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open browser console (F12) to see detailed logs</li>
              <li>Try signing up with a new email first</li>
              <li>Check your email for confirmation (or use the /debug-auth page)</li>
              <li>Then try signing in with the same credentials</li>
              <li>Watch the console for any errors in profile creation</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}