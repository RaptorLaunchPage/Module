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
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <NewDashboardLayout>
      {children}
    </NewDashboardLayout>
  )
}