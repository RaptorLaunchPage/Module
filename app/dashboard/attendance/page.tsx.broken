"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { RoleBasedAttendanceDashboard } from "@/components/attendance/role-based-attendance-dashboard"

export default function AttendancePage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      // Simulate loading time for smooth transition
      const timer = setTimeout(() => {
        setLoading(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [profile])

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white/80">Loading attendance dashboard...</p>
            </div>
          </div>
        ) : (
          <RoleBasedAttendanceDashboard userProfile={profile} />
        )}
      </div>
    </div>
  )
}