"use client"

import type React from "react"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: "🏠",
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "User Management",
    url: "/dashboard/user-management",
    icon: "👥",
    roles: ["admin"],
  },
  {
    title: "Team Management",
    url: "/dashboard/team-management/teams",
    icon: "🛡️",
    roles: ["admin", "manager", "coach"],
    subItems: [
      {
        title: "Teams",
        url: "/dashboard/team-management/teams",
        icon: "🛡️",
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Roster",
        url: "/dashboard/team-management/roster",
        icon: "👥",
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Slot Booking",
        url: "/dashboard/team-management/slots",
        icon: "📅",
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Slot Expenses",
        url: "/dashboard/team-management/expenses",
        icon: "₹",
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Prize Pool",
        url: "/dashboard/team-management/prize-pool",
        icon: "🏆",
        roles: ["admin", "manager", "coach"],
      },
    ],
  },
  {
    title: "Performance",
    url: "/dashboard/performance",
    icon: "📊",
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "Performance Report",
    url: "/dashboard/performance-report",
    icon: "🏆",
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: "👤",
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
]

export function AppTopbar() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="w-full flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg">Raptor Hub</span>
        {menuItems.map((item) => (
          <div key={item.title} className="relative group">
            <Link
              href={item.url}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                pathname.startsWith(item.url) ? "font-bold text-blue-600" : ""
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.title}</span>
            </Link>
            {item.subItems && (
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border rounded shadow z-10 min-w-max">
                {item.subItems
                  .map((sub) => (
                    <Link
                      key={sub.title}
                      href={sub.url}
                      className={`flex items-center gap-1 px-3 py-2 hover:bg-gray-100 ${
                        pathname === sub.url ? "font-bold text-blue-600" : ""
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.title}</span>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
          title="Refresh Dashboard"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{profile?.name || profile?.email}</span>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" /> Sign Out
        </Button>
      </div>
    </nav>
  )
}