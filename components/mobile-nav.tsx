"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Users, User, BarChart3, LogOut, Shield, CalendarCheck, DollarSign, Trophy, Crown, Clock } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    roles: ["admin", "manager", "coach", "player", "analyst", "pending_player", "awaiting_approval"],
  },
  {
    title: "User Management",
    url: "/dashboard/user-management",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Team Management",
    url: "/dashboard/team-management/teams",
    icon: Shield,
    roles: ["admin", "manager", "coach", "player"],
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
    roles: ["admin", "manager", "coach", "player", "analyst", "pending_player", "awaiting_approval"],
  },
]

export function MobileNav() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const getRoleDisplay = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { label: 'Admin', icon: Crown, className: 'bg-purple-100 text-purple-800 border-purple-200' }
      case 'manager':
        return { label: 'Manager', icon: Shield, className: 'bg-blue-100 text-blue-800 border-blue-200' }
      case 'coach':
        return { label: 'Coach', icon: User, className: 'bg-green-100 text-green-800 border-green-200' }
      case 'player':
        return { label: 'Player', icon: User, className: 'bg-orange-100 text-orange-800 border-orange-200' }
      case 'analyst':
        return { label: 'Analyst', icon: BarChart3, className: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
      case 'pending_player':
      case 'awaiting_approval':
        return { label: 'Awaiting Approval', icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      default:
        return { label: role || 'Unknown', icon: User, className: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
  }

  const filteredMenuItems = menuItems.filter((item) => 
    profile?.role && item.roles.includes(profile.role.toLowerCase())
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Raptor Hub</span>
          </div>
          
          <nav className="flex-1 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.url
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
          
          <div className="border-t pt-4 space-y-3">
            {profile?.role && (
              <div>
                {(() => {
                  const roleInfo = getRoleDisplay(profile.role)
                  const RoleIcon = roleInfo.icon
                  return (
                    <Badge 
                      variant="outline" 
                      className={`w-full justify-start text-xs font-medium ${roleInfo.className}`}
                    >
                      <RoleIcon className="h-3 w-3 mr-2" />
                      {roleInfo.label}
                    </Badge>
                  )
                })()}
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start" 
              onClick={async () => {
                await signOut()
                setOpen(false)
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}