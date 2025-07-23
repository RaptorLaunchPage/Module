'use client'

import { useAuth } from '@/hooks/use-auth'
import { useAgreement } from '@/hooks/use-agreement'
import { NewDashboardLayout } from '@/components/dashboard/new-dashboard-layout'
import { AgreementModal } from '@/components/agreement/agreement-modal'
import { ImprovedLoader } from '@/components/ui/improved-loader'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, isInitialized } = useAuth()
  const { isChecking, needsAgreement, acceptAgreement } = useAgreement()
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
    return <ImprovedLoader type="auth" message="Initializing your session..." />
  }

  // Redirect to login if no user
  if (!user) {
    return <ImprovedLoader type="auth" message="Redirecting to login..." />
  }

  // Show loading if user exists but profile is still loading
  if (user && !profile) {
    return <ImprovedLoader type="profile" message="Loading your profile data..." />
  }

  // Show agreement checking
  if (isChecking) {
    return <ImprovedLoader type="agreement" message="Checking role agreements..." />
  }

  return (
    <>
      <NewDashboardLayout>
        {children}
      </NewDashboardLayout>
      
      {/* Agreement Modal - only shown when needed */}
      <AgreementModal
        isOpen={needsAgreement}
        onAccept={acceptAgreement}
      />
    </>
  )
}