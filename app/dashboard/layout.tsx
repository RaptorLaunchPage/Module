'use client'

import { useAuth } from '@/hooks/use-auth'
import { NewDashboardLayout } from '@/components/dashboard/new-dashboard-layout'
import { FullPageLoader } from '@/components/ui/full-page-loader'
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
    return <FullPageLoader state="initializing" customDescription="Loading dashboard" />
  }

  // Redirect to login if no user
  if (!user) {
    return <FullPageLoader state="redirecting" customDescription="Redirecting to login" />
  }

  // Show loading if user exists but profile is still loading
  if (user && !profile) {
    return <FullPageLoader state="loading-profile" />
  }

  return (
    <NewDashboardLayout>
      {children}
    </NewDashboardLayout>
  )
}