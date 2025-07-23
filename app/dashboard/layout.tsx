'use client'

import { useAuth } from '@/hooks/use-auth-provider'
import { NewDashboardLayout } from '@/components/dashboard/new-dashboard-layout'
import { FullPageLoader } from '@/components/ui/full-page-loader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, isInitialized } = useAuth()

  // Show loading while auth is initializing or profile is loading
  if (!isInitialized || loading || (user && !profile)) {
    return <FullPageLoader state="loading-profile" customDescription="Loading dashboard..." />
  }

  // Auth and route checking is handled by AgreementRouteGuard
  // If we reach here, user is authenticated and has access

  return (
    <NewDashboardLayout>
      {children}
    </NewDashboardLayout>
  )
}