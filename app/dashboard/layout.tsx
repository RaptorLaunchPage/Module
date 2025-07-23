'use client'

import { useAuth } from '@/hooks/use-auth'
import { NewDashboardLayout } from '@/components/dashboard/new-dashboard-layout'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if auth is initialized and we don't have a user
    if (isInitialized && !loading && !user) {
      console.log('🔒 Dashboard: No user found, redirecting to login')
      router.push('/auth/login')
    }
  }, [user, loading, isInitialized, router])

  // Show loading while auth is initializing
  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Show loading if user exists but profile is still loading
  if (user && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <NewDashboardLayout>
      {children}
    </NewDashboardLayout>
  )
}