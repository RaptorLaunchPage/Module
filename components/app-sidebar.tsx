"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, Users, User, BarChart3, LogOut, Shield, CalendarCheck, DollarSign, Trophy, Crown, UserCheck, Clock } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "User Management",
    url: "/dashboard/user-management",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Team Management",
    url: "/dashboard/team-management/teams", // Base route for team management
    icon: Shield,
    roles: ["admin", "manager", "coach"],
    subItems: [
      {
        title: "Teams",
        url: "/dashboard/team-management/teams",
        icon: Shield,
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Roster",
        url: "/dashboard/team-management/roster",
        icon: Users,
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Slot Booking",
        url: "/dashboard/team-management/slots",
        icon: CalendarCheck,
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Slot Expenses",
        url: "/dashboard/team-management/expenses",
        icon: DollarSign,
        roles: ["admin", "manager", "coach"],
      },
      {
        title: "Prize Pool",
        url: "/dashboard/team-management/prize-pool",
        icon: Trophy,
        roles: ["admin", "manager", "coach"],
      },
    ],
  },
  {
    title: "Performance",
    url: "/dashboard/performance",
    icon: BarChart3,
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User,
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Add props to AppSidebar
  const { profile, signOut } = useAuth()
  const pathname = usePathname()

  const filteredMenuItems = menuItems.filter((item) => profile?.role && item.roles.includes(profile.role.toLowerCase()))

  const getRoleDisplay = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { label: 'Admin', icon: Crown, variant: 'default', className: 'bg-purple-100 text-purple-800 border-purple-200' }
      case 'manager':
        return { label: 'Manager', icon: Shield, variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200' }
      case 'coach':
        return { label: 'Coach', icon: User, variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' }
      case 'player':
        return { label: 'Player', icon: User, variant: 'default', className: 'bg-orange-100 text-orange-800 border-orange-200' }
      case 'analyst':
        return { label: 'Analyst', icon: BarChart3, variant: 'default', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
      case 'pending_player':
      case 'awaiting_approval':
        return { label: 'Awaiting Approval', icon: Clock, variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      default:
        return { label: role || 'Unknown', icon: User, variant: 'outline', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
  }

  return (
    <Sidebar 
      collapsible="icon" 
      className="hidden md:block"
      {...props}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.subItems &&
                        pathname.startsWith(
                          item.url.split("/")[0] + "/" + item.url.split("/")[1] + "/" + item.url.split("/")[2],
                        ))
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.subItems && (
                    <SidebarMenu>
                      {item.subItems
                        .filter((subItem) => profile?.role && subItem.roles.includes(profile.role.toLowerCase()))
                        .map((subItem) => (
                          <SidebarMenuItem key={subItem.title}>
                            <SidebarMenuButton asChild isActive={pathname === subItem.url}>
                              <Link href={subItem.url}>
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="p-3">
          {profile?.role && (
            <div className="mb-3">
              {(() => {
                const roleInfo = getRoleDisplay(profile.role)
                const RoleIcon = roleInfo.icon
                return (
                  <Badge 
                    variant={roleInfo.variant as any} 
                    className={`w-full justify-start text-xs font-medium ${roleInfo.className}`}
                  >
                    <RoleIcon className="h-3 w-3 mr-2" />
                    {roleInfo.label}
                  </Badge>
                )
              })()}
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
