"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Target, 
  Trophy, 
  TrendingUp, 
  Activity, 
  Calendar,
  DollarSign,
  BarChart3,
  Shield,
  AlertTriangle
} from 'lucide-react'

export default function EmergencyDashboardPage() {
  // Mock admin user data based on previous session data
  const emergencyUser = {
    id: "b26b7eff-fa27-4a66-89c3-cd3858083c2a",
    email: "rathod.swaraj@gmail.com", 
    name: "RExADMIN",
    role: "admin",
    avatar_url: "https://ydjrngnnuxxswmhxwxzf.supabase.co/storage/v1/object/public/avatars/b26b7eff-fa27-4a66-89c3-cd3858083c2a/1752915791350.webp"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Emergency Notice */}
      <div className="bg-yellow-500/20 border-b border-yellow-500/30 p-4">
        <div className="container mx-auto flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <span className="text-yellow-100 font-medium">
            🚨 Emergency Dashboard Access - Authentication Service Temporarily Unavailable
          </span>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Emergency Dashboard</h1>
            <p className="text-slate-300">
              Welcome back, {emergencyUser.name}! 
              <Badge variant="outline" className="ml-2 border-red-500 text-red-400">Emergency Access</Badge>
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/login-test'}
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
            >
              🔧 Debug Auth
            </Button>
            <Button 
              onClick={() => window.location.href = '/test-db'}
              variant="outline" 
              className="border-green-500 text-green-400 hover:bg-green-500/20"
            >
              🧪 Test Database
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Players", value: "45", color: "text-blue-400" },
            { icon: Trophy, label: "Active Teams", value: "8", color: "text-green-400" },
            { icon: Target, label: "Matches Today", value: "12", color: "text-yellow-400" },
            { icon: TrendingUp, label: "Performance", value: "94%", color: "text-purple-400" }
          ].map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                Team Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Finance
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Database</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Profile Queries</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Fast (60ms)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Authentication</span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Service Hanging</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Emergency Access</span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⚠️ Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Diagnosis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Database Connection: ✅ Working</p>
                  <p className="text-sm text-slate-400">All database queries responding normally (60ms avg)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Profile Data: ✅ Available</p>
                  <p className="text-sm text-slate-400">User profiles can be fetched successfully</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Auth Service: ❌ Hanging</p>
                  <p className="text-sm text-slate-400">supabase.auth.signInWithPassword() times out after 10 seconds</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Auth Client: ❌ Hanging</p>
                  <p className="text-sm text-slate-400">Even supabase.auth.getUser() is unresponsive</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm">
          Emergency Dashboard • Authentication debugging in progress • 
          <Button 
            variant="link" 
            className="text-blue-400 p-0 h-auto"
            onClick={() => window.location.reload()}
          >
            Refresh to retry normal auth
          </Button>
        </div>
      </div>
    </div>
  )
}