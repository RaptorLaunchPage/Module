"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { throttledNavigate } from "@/lib/navigation-throttle"

export default function TeamManagementHomePage() {
  const router = useRouter()

  useEffect(() => {
    // Use setTimeout to prevent rapid navigation calls
    const timeout = setTimeout(() => {
      throttledNavigate(router, "/dashboard/team-management/teams", "replace")
    }, 100)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
    </div>
  )
}
