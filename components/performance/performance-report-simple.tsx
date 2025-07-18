"use client"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function PerformanceReportSimple() {
  console.log('🎯 PerformanceReportSimple rendering - TESTING useAuth')
  
  try {
    const { profile } = useAuth()
    console.log('✅ useAuth hook called successfully, profile:', profile?.id, profile?.role)
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Report
            </CardTitle>
            <CardDescription>
              Testing useAuth hook - {profile ? `Logged in as ${profile.name || profile.email}` : 'Not logged in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-muted-foreground">
              useAuth hook works! 🎉
            </p>
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p><strong>Profile ID:</strong> {profile?.id || 'None'}</p>
              <p><strong>Role:</strong> {profile?.role || 'None'}</p>
              <p><strong>Name:</strong> {profile?.name || 'None'}</p>
              <p><strong>Email:</strong> {profile?.email || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (err) {
    console.error('💥 Error in useAuth test:', err)
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">useAuth Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Error with useAuth hook: {err instanceof Error ? err.message : String(err)}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
}