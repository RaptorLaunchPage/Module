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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, Users, User, BarChart3, LogOut, Shield, CalendarCheck, IndianRupee, Trophy, Crown, UserCheck, Clock, UsersRound, Calendar, Coins, Award } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

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
    icon: UserCheck,
    roles: ["admin"],
  },
  {
    title: "Team Management",
    url: "/dashboard/team-management/teams",
    icon: Shield,
    roles: ["admin", "manager", "coach"],
  },
  {
    title: "Performance",
    url: "/dashboard/performance",
    icon: BarChart3,
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "Performance Report",
    url: "/dashboard/performance-report",
    icon: Trophy,
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User,
    roles: ["admin", "manager", "coach", "player", "analyst"],
  },
]

// Move getRoleDisplay to module scope so it can be used by both AppSidebar and SidebarFooterContent
function getRoleDisplay(role: string) {
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const { state } = useSidebar();

  const filteredMenuItems = menuItems.filter((item) => profile?.role && item.roles.includes(profile.role.toLowerCase()))

  return (
    <Sidebar 
      collapsible="icon" 
      className="hidden md:block"
      {...props}
    >
      <SidebarContent>
        {/* Sidebar Branding */}
        <div className="flex items-center justify-center py-1">
          <img src="/RLogo.ico" alt="Raptor Hub Logo" width={48} height={48} className="rounded-full" style={{ minWidth: 32, minHeight: 32 }} />
          {state !== "collapsed" && (
            <span className="ml-3 esports-heading text-xl font-bold text-black tracking-widest">Raptor Hub</span>
          )}
        </div>
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
                      (item.title === "Team Management" &&
                        pathname.startsWith("/dashboard/team-management")) ||
                      (item.title === "User Management" &&
                        pathname.startsWith("/dashboard/user-management"))
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarFooterContent profile={profile} signOut={signOut} />
      </SidebarFooter>
    </Sidebar>
  )
}

function SidebarFooterContent({ profile, signOut }: { profile: any, signOut: () => void }) {
  const { state } = useSidebar();
  if (state === "collapsed") {
    // Only show icon in collapsed mode
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    );
  }
  // Show full badge and signout in expanded mode
  return (
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
  );
}
