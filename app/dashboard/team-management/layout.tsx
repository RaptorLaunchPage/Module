"use client"

import type React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function TeamManagementLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const getActiveTab = () => {
    if (pathname.includes("/team-management/teams")) return "teams"
    if (pathname.includes("/team-management/roster")) return "roster"
    if (pathname.includes("/team-management/slots")) return "slots"
    return "teams" // Default to teams
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage your teams, rosters, and slot bookings</p>
      </div>

      <Tabs value={getActiveTab()} className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams" asChild>
            <Link href="/dashboard/team-management/teams">Teams</Link>
          </TabsTrigger>
          <TabsTrigger value="roster" asChild>
            <Link href="/dashboard/team-management/roster">Roster</Link>
          </TabsTrigger>
          <TabsTrigger value="slots" asChild>
            <Link href="/dashboard/team-management/slots">Slot Booking</Link>
          </TabsTrigger>
        </TabsList>
        {children}
      </Tabs>
    </div>
  )
}
